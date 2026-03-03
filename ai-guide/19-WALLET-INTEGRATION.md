# 19 - Wallet Integration & On-Chain Signing (Stellar)

## Overview

This guide covers integrating **Stellar wallet signing** into an NPL frontend application. It enables end users to sign Soroban smart contract transactions directly from the browser — attestations, deposits, distributions, ownership transfers, and any function requiring `require_auth()`.

**Prerequisite guides:**
- [04-FRONTEND-SETUP.md](./04-FRONTEND-SETUP.md) — React frontend must already exist
- [18-BLOCKCHAIN-CONNECTOR.md](./18-BLOCKCHAIN-CONNECTOR.md) — Soroban contract must be deployed via the blockchain connector

**What this guide produces:**
- `frontend/src/wallet.ts` — Multi-provider wallet connection manager
- `frontend/src/stellar.ts` — Soroban transaction building and submission utilities
- UI integration patterns for on-chain actions in React components

---

## 1. Install Dependencies

From the `frontend/` directory:

```bash
# Stellar SDK and WalletConnect
npm install @walletconnect/sign-client @walletconnect/types @stellar/stellar-sdk

# Browser extension wallet APIs (optional — add only the ones you want to support)
npm install @stellar/freighter-api @lobstrco/signer-extension-api

# Required: Node.js polyfills for WalletConnect in the browser
npm install --save-dev vite-plugin-node-polyfills
```

---

## 2. Vite Configuration

WalletConnect depends on Node.js built-ins (Buffer, process, events) that don't exist in the browser. Add polyfills to `vite.config.ts`:

```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

export default defineConfig({
  plugins: [
    react(),
    nodePolyfills({
      include: ['buffer', 'process', 'util', 'stream', 'events'],
      globals: { Buffer: true, process: true },
    }),
  ],
  // ... rest of config
});
```

> **Without this:** WalletConnect fails at runtime with `Buffer is not defined` or `process is not defined`.

---

## 3. Environment Variables

Add to `frontend/.env`:

```bash
# WalletConnect Cloud project ID (register free at https://cloud.walletconnect.com)
VITE_WC_PROJECT_ID=<your-project-id>

# Stellar testnet configuration
VITE_STELLAR_RPC_URL=https://soroban-testnet.stellar.org
VITE_STELLAR_NETWORK_PASSPHRASE=Test SDF Network ; September 2015

# XLM Stellar Asset Contract address (testnet) — used for native XLM transfers in Soroban
VITE_XLM_SAC_ADDRESS=CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC
```

---

## 4. Create `frontend/src/stellar.ts`

This file provides Soroban transaction building, argument conversion, and submission. Create it from scratch.

### Full Implementation

```typescript
import * as StellarSdk from "@stellar/stellar-sdk";

const RPC_URL =
  import.meta.env.VITE_STELLAR_RPC_URL || "https://soroban-testnet.stellar.org";
const NETWORK_PASSPHRASE =
  import.meta.env.VITE_STELLAR_NETWORK_PASSPHRASE ||
  "Test SDF Network ; September 2015";

const server = new StellarSdk.rpc.Server(RPC_URL);

// ---------------------------------------------------------------------------
// Transaction Builders
// ---------------------------------------------------------------------------

/**
 * Builds an unsigned Soroban contract invocation transaction.
 * Simulates first to attach authorization entries and resource limits.
 * Returns the XDR (base64) ready for signing via wallet.
 */
export async function buildContractCallTx(
  callerPublicKey: string,
  contractId: string,
  functionName: string,
  args: StellarSdk.xdr.ScVal[] = []
): Promise<string> {
  const sourceAccount = await server.getAccount(callerPublicKey);
  const contract = new StellarSdk.Contract(contractId);
  const call = contract.call(functionName, ...args);

  let tx = new StellarSdk.TransactionBuilder(sourceAccount, {
    fee: StellarSdk.BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(call)
    .setTimeout(300)
    .build();

  const simulated = await server.simulateTransaction(tx);
  if (StellarSdk.rpc.Api.isSimulationError(simulated)) {
    throw new Error(
      `Simulation failed: ${(simulated as StellarSdk.rpc.Api.SimulateTransactionErrorResponse).error}`
    );
  }

  tx = StellarSdk.rpc.assembleTransaction(
    tx,
    simulated as StellarSdk.rpc.Api.SimulateTransactionSuccessResponse
  ).build();

  return tx.toXDR();
}

/**
 * Builds an unsigned native XLM payment (classic, non-Soroban).
 * Useful for satoshi-test wallet verification.
 */
export async function buildPaymentTx(
  senderPublicKey: string,
  destinationPublicKey: string,
  amountXLM: string
): Promise<string> {
  const horizonServer = new StellarSdk.Horizon.Server(
    "https://horizon-testnet.stellar.org"
  );
  const sourceAccount = await horizonServer.loadAccount(senderPublicKey);

  const tx = new StellarSdk.TransactionBuilder(sourceAccount, {
    fee: StellarSdk.BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(
      StellarSdk.Operation.payment({
        destination: destinationPublicKey,
        asset: StellarSdk.Asset.native(),
        amount: Number(amountXLM).toFixed(7),
      })
    )
    .setTimeout(300)
    .build();

  return tx.toXDR();
}

// ---------------------------------------------------------------------------
// Transaction Submission
// ---------------------------------------------------------------------------

/**
 * Submits a signed Soroban transaction and polls until confirmed.
 * Returns the transaction hash.
 */
export async function submitSignedTx(signedXdr: string): Promise<string> {
  const tx = StellarSdk.TransactionBuilder.fromXDR(signedXdr, NETWORK_PASSPHRASE);
  const response = await server.sendTransaction(tx);

  if (response.status === "ERROR") {
    throw new Error(`Transaction submission failed: ${response.status}`);
  }

  const hash = response.hash;
  let result = await server.getTransaction(hash);
  while (result.status === "NOT_FOUND") {
    await new Promise((r) => setTimeout(r, 2000));
    result = await server.getTransaction(hash);
  }

  if (result.status === "FAILED") {
    throw new Error(`Transaction failed on-chain: ${hash}`);
  }
  return hash;
}

/**
 * Submits a signed classic (non-Soroban) transaction to Horizon.
 * Returns the transaction hash.
 */
export async function submitSignedClassicTx(signedXdr: string): Promise<string> {
  const horizonServer = new StellarSdk.Horizon.Server(
    "https://horizon-testnet.stellar.org"
  );
  const tx = StellarSdk.TransactionBuilder.fromXDR(signedXdr, NETWORK_PASSPHRASE);
  const response = await horizonServer.submitTransaction(tx as StellarSdk.Transaction);
  return response.hash;
}

// ---------------------------------------------------------------------------
// ScVal Argument Helpers
// ---------------------------------------------------------------------------

/** Builds an ScVal Address from a Stellar public key string. */
export function nativeToAddress(publicKey: string): StellarSdk.xdr.ScVal {
  return StellarSdk.nativeToScVal(
    new StellarSdk.Address(publicKey),
    { type: "address" }
  );
}

/**
 * Converts a human-readable XLM amount (e.g. "100") to stroops as an i128 ScVal.
 * 1 XLM = 10,000,000 stroops.
 */
export function xlmToI128(xlmAmount: string): StellarSdk.xdr.ScVal {
  const stroops = BigInt(Math.round(parseFloat(xlmAmount) * 1e7));
  return StellarSdk.nativeToScVal(stroops, { type: "i128" });
}

/** Converts a raw bigint to i128 ScVal (no decimal conversion). */
export function toI128(value: bigint): StellarSdk.xdr.ScVal {
  return StellarSdk.nativeToScVal(value, { type: "i128" });
}

/** Converts a number to u32 ScVal. */
export function toU32(value: number): StellarSdk.xdr.ScVal {
  return StellarSdk.nativeToScVal(value, { type: "u32" });
}

/** Builds a Vec<Address> ScVal from an array of Stellar public keys. */
export function addressVec(publicKeys: string[]): StellarSdk.xdr.ScVal {
  const addresses = publicKeys.map((pk) => new StellarSdk.Address(pk).toScVal());
  return StellarSdk.xdr.ScVal.scvVec(addresses);
}

/** Builds a Vec<i128> ScVal from an array of bigint values. */
export function i128Vec(values: bigint[]): StellarSdk.xdr.ScVal {
  const i128Vals = values.map((v) =>
    StellarSdk.nativeToScVal(v, { type: "i128" })
  );
  return StellarSdk.xdr.ScVal.scvVec(i128Vals);
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** XLM Stellar Asset Contract address (testnet). Pass to contract functions that transfer native XLM. */
export const XLM_SAC_ADDRESS =
  import.meta.env.VITE_XLM_SAC_ADDRESS ||
  "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC";
```

> **Important:** Always call `buildContractCallTx` (which simulates) before signing. The simulation attaches authorization entries and resource limits that Soroban requires.

---

## 5. Create `frontend/src/wallet.ts`

This file manages wallet connections across multiple providers through a unified API. Create it from scratch.

### Supported Providers

| Provider | Type | How Users Connect |
|----------|------|-------------------|
| WalletConnect | Mobile / Desktop wallet | QR code pairing |
| Freighter | Browser extension | Direct API call |
| LOBSTR Signer | Browser extension | Direct API call |
| xBull | Browser extension | Direct API call |

### Full Implementation

```typescript
import SignClient from "@walletconnect/sign-client";
import { SessionTypes } from "@walletconnect/types";
import {
  isConnected as freighterIsConnected,
  requestAccess as freighterRequestAccess,
  signTransaction as freighterSignTransaction,
} from "@stellar/freighter-api";
import {
  isConnected as lobstrIsConnected,
  getPublicKey as lobstrGetPublicKey,
  signTransaction as lobstrSignTransaction,
} from "@lobstrco/signer-extension-api";

const PROJECT_ID = import.meta.env.VITE_WC_PROJECT_ID;
const STELLAR_CHAIN = "stellar:testnet";
const NETWORK_PASSPHRASE =
  import.meta.env.VITE_STELLAR_NETWORK_PASSPHRASE ||
  "Test SDF Network ; September 2015";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type WalletType = "walletconnect" | "freighter" | "lobstr" | "xbull";

export interface WalletConnection {
  id: string;
  type: WalletType;
  publicKey: string;
  label: string;
}

// ---------------------------------------------------------------------------
// Internal State
// ---------------------------------------------------------------------------

let signClient: SignClient | null = null;
let initPromise: Promise<void> | null = null;
let connections: WalletConnection[] = [];
let activeIndex = 0;

const wcTopics = new Map<string, SessionTypes.Struct>();

type Listener = () => void;
const listeners: Set<Listener> = new Set();

export function subscribe(fn: Listener): () => void {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

function notify() {
  listeners.forEach((fn) => fn());
}

// ---------------------------------------------------------------------------
// Internal Helpers
// ---------------------------------------------------------------------------

function wcPubKey(session: SessionTypes.Struct): string | null {
  const accounts = session.namespaces.stellar?.accounts;
  if (!accounts || accounts.length === 0) return null;
  return accounts[0].split(":")[2] ?? null;
}

function wcLabel(session: SessionTypes.Struct): string {
  return (
    (session as any).sessionProperties?.walletName ||
    session.peer?.metadata?.name ||
    "WalletConnect"
  );
}

function addConnection(conn: WalletConnection) {
  const existing = connections.findIndex((c) => c.id === conn.id);
  if (existing !== -1) {
    connections = connections.map((c, i) => (i === existing ? conn : c));
    activeIndex = existing;
  } else {
    connections = [...connections, conn];
    activeIndex = connections.length - 1;
  }
  notify();
}

function removeConnection(id: string) {
  connections = connections.filter((c) => c.id !== id);
  if (activeIndex >= connections.length) {
    activeIndex = Math.max(0, connections.length - 1);
  }
  notify();
}

// ---------------------------------------------------------------------------
// WalletConnect Initialization (Singleton)
// ---------------------------------------------------------------------------

async function ensureSignClient(): Promise<SignClient> {
  if (signClient) return signClient;

  const client = await SignClient.init({
    projectId: PROJECT_ID,
    metadata: {
      name: document.title || "NPL Application",
      description: "NPL application with on-chain signing",
      url: window.location.origin,
      icons: [],
    },
  });

  // Clean up stale pairings that accumulate in IndexedDB
  try {
    const pairings = client.core.pairing.getPairings();
    for (const p of pairings) {
      if (!p.active) {
        await client.core.pairing.disconnect({ topic: p.topic });
      }
    }
  } catch (e) {
    console.warn("Failed to clean stale pairings:", e);
  }

  client.on("session_delete", ({ topic }) => {
    wcTopics.delete(topic);
    removeConnection(`wc:${topic}`);
  });

  // Restore any previously-established sessions
  const existingSessions = client.session.getAll();
  for (const s of existingSessions) {
    const pubKey = wcPubKey(s);
    if (pubKey) {
      wcTopics.set(s.topic, s);
      addConnection({
        id: `wc:${s.topic}`,
        type: "walletconnect",
        publicKey: pubKey,
        label: wcLabel(s),
      });
    }
  }

  signClient = client;
  return client;
}

// ---------------------------------------------------------------------------
// Public API — Initialization
// ---------------------------------------------------------------------------

/** Initialize wallet module. Safe to call multiple times (singleton). */
export async function init(): Promise<void> {
  if (initPromise) return initPromise;
  initPromise = ensureSignClient().then(() => {});
  return initPromise;
}

// ---------------------------------------------------------------------------
// Public API — Connect
// ---------------------------------------------------------------------------

/** Start WalletConnect pairing. Returns a URI to display as QR code. */
export async function connectWalletConnect(): Promise<{ uri: string }> {
  const client = await ensureSignClient();
  const { uri, approval } = await client.connect({
    requiredNamespaces: {
      stellar: {
        chains: [STELLAR_CHAIN],
        methods: ["stellar_signXDR"],
        events: [],
      },
    },
  });

  if (!uri) throw new Error("WalletConnect did not return a URI");

  approval().then((session) => {
    const pubKey = wcPubKey(session);
    if (pubKey) {
      wcTopics.set(session.topic, session);
      addConnection({
        id: `wc:${session.topic}`,
        type: "walletconnect",
        publicKey: pubKey,
        label: wcLabel(session),
      });
    }
  });

  return { uri };
}

/** Connect via Freighter browser extension. */
export async function connectFreighter(): Promise<void> {
  const { isConnected } = await freighterIsConnected();
  if (!isConnected) {
    throw new Error("Freighter extension not found. Install from https://freighter.app");
  }
  const accessResult = await freighterRequestAccess();
  if (accessResult.error) {
    throw new Error(accessResult.error.message || "Freighter access denied");
  }
  addConnection({
    id: "freighter",
    type: "freighter",
    publicKey: accessResult.address,
    label: "Freighter",
  });
}

/** Connect via LOBSTR Signer browser extension. */
export async function connectLobstr(): Promise<void> {
  const connected = await lobstrIsConnected();
  if (!connected) {
    throw new Error("LOBSTR Signer extension not found.");
  }
  const publicKey = await lobstrGetPublicKey();
  if (!publicKey) {
    throw new Error("Could not retrieve public key from LOBSTR");
  }
  addConnection({ id: "lobstr", type: "lobstr", publicKey, label: "LOBSTR" });
}

/** Connect via xBull browser extension. */
export async function connectXBull(): Promise<void> {
  const sdk = (window as any).xBullSDK;
  if (!sdk) {
    throw new Error("xBull extension not found. Install from https://xbull.app");
  }
  const publicKey: string = await sdk.connect();
  if (!publicKey) {
    throw new Error("Could not retrieve public key from xBull");
  }
  addConnection({ id: "xbull", type: "xbull", publicKey, label: "xBull" });
}

// ---------------------------------------------------------------------------
// Public API — Signing (routes to active provider)
// ---------------------------------------------------------------------------

/** Sign a Stellar XDR using the currently active wallet connection. */
export async function signXDR(xdr: string): Promise<string> {
  const conn = connections[activeIndex];
  if (!conn) throw new Error("No active wallet connection");

  switch (conn.type) {
    case "walletconnect": {
      const client = await ensureSignClient();
      const topic = conn.id.replace("wc:", "");
      const session = wcTopics.get(topic);
      if (!session) throw new Error("WalletConnect session not found");
      const result = await client.request<{ signedXDR: string }>({
        topic: session.topic,
        chainId: STELLAR_CHAIN,
        request: { method: "stellar_signXDR", params: { xdr } },
      });
      return result.signedXDR;
    }
    case "freighter": {
      const result = await freighterSignTransaction(xdr, {
        networkPassphrase: NETWORK_PASSPHRASE,
        address: conn.publicKey,
      });
      if (result.error) throw new Error(result.error.message || "Freighter signing failed");
      return result.signedTxXdr;
    }
    case "lobstr": {
      const signed = await lobstrSignTransaction(xdr);
      if (!signed) throw new Error("LOBSTR signing returned empty result");
      return signed;
    }
    case "xbull": {
      const sdk = (window as any).xBullSDK;
      if (!sdk) throw new Error("xBull extension not available");
      const signed: string = await sdk.signXDR(xdr);
      if (!signed) throw new Error("xBull signing returned empty result");
      return signed;
    }
    default:
      throw new Error(`Unknown wallet type: ${conn.type}`);
  }
}

// ---------------------------------------------------------------------------
// Public API — Disconnect
// ---------------------------------------------------------------------------

export async function disconnect(id?: string): Promise<void> {
  const targetId = id ?? connections[activeIndex]?.id;
  if (!targetId) return;

  const conn = connections.find((c) => c.id === targetId);
  if (!conn) return;

  if (conn.type === "walletconnect" && signClient) {
    const topic = targetId.replace("wc:", "");
    try {
      await signClient.disconnect({
        topic,
        reason: { code: 6000, message: "User disconnected" },
      });
    } catch (e) {
      console.warn("WC disconnect error:", e);
    }
    wcTopics.delete(topic);
  }

  removeConnection(targetId);
}

// ---------------------------------------------------------------------------
// Public API — Accessors
// ---------------------------------------------------------------------------

export function getConnections(): WalletConnection[] { return connections; }
export function getActiveIndex(): number { return activeIndex; }
export function getConnection(): WalletConnection | null { return connections[activeIndex] ?? null; }
export function getPublicKey(): string | null { return connections[activeIndex]?.publicKey ?? null; }
export function isConnected(): boolean { return connections.length > 0; }

export function setActiveConnection(index: number): void {
  if (index >= 0 && index < connections.length) {
    activeIndex = index;
    notify();
  }
}

export function setLabel(id: string, label: string): void {
  connections = connections.map((c) => (c.id === id ? { ...c, label } : c));
  notify();
}

export function isExtensionAvailable(
  type: "freighter" | "lobstr" | "xbull"
): Promise<boolean> {
  switch (type) {
    case "freighter":
      return freighterIsConnected().then((r) => r.isConnected).catch(() => false);
    case "lobstr":
      return lobstrIsConnected().catch(() => false);
    case "xbull":
      return Promise.resolve(!!(window as any).xBullSDK);
  }
}
```

---

## 6. NPL Side — Accepting Transaction Hashes

NPL actions that correspond to on-chain operations should accept a `txHash` parameter to link the protocol state transition to its on-chain proof:

```npl
@api
permission[myParty] recordOnChainAction(txHash: Text) | awaitingAction {
    require(txHash.length() > 0, "Transaction hash is required");
    this.actionTxHash = optionalOf(txHash);
    become actionRecorded;
};
```

The TX hash is stored on the protocol instance, creating an auditable link between NPL state and the blockchain.

---

## 7. Smart Contract Side — `require_auth()` Pattern

Every contract function that should be signed by an end user's wallet must:

1. Accept the caller's `Address` as a parameter
2. Call `caller.require_auth()` (Soroban's built-in signature verification)
3. Assert the caller matches a constructor-stored address for the expected role

```rust
pub fn perform_action(env: Env, caller: Address) {
    caller.require_auth();
    let data = Self::get_data(env.clone());
    assert!(data.authorized_party == caller, "not authorized");
    // ... perform the action
}
```

> **Critical:** `require_auth()` alone only proves someone signed the TX. Without the assertion against a stored address, **anyone** could call the function. Always combine both.

---

## 8. Frontend Component Integration

### Architecture

```
User Browser  ──>  WalletConnect / Extension  ──>  Wallet App
       │                                               │
       │ 1. Build unsigned Soroban TX                  │
       │ 2. Send XDR via wallet API ────────────────>  │
       │                            3. User signs      │
       │ 4. Receive signed XDR <────────────────────   │
       │ 5. Submit to Stellar testnet
       │ 6. Get TX hash
       │ 7. Send txHash to NPL engine (record on protocol)
```

### General Signing Pattern

Every on-chain action in a React component follows this pattern:

```typescript
import * as wc from '../wallet';
import { buildContractCallTx, submitSignedTx, nativeToAddress, xlmToI128, XLM_SAC_ADDRESS } from '../stellar';

async function handleOnChainAction() {
  const pubKey = wc.getPublicKey();
  if (!pubKey) {
    setError('Connect a wallet first');
    return;
  }

  setLoading(true);
  setError(null);
  try {
    // 1. Build unsigned Soroban TX
    const unsignedXdr = await buildContractCallTx(
      pubKey,
      contractAddress,
      'function_name',
      [nativeToAddress(pubKey), nativeToAddress(XLM_SAC_ADDRESS), xlmToI128("100")]
    );

    // 2. Sign via the active wallet (WC, Freighter, LOBSTR, or xBull)
    const signedXdr = await wc.signXDR(unsignedXdr);

    // 3. Submit to Stellar testnet and wait for confirmation
    const txHash = await submitSignedTx(signedXdr);

    // 4. Record the TX hash on the NPL protocol
    await executeAction('recordOnChainAction', { txHash });
  } catch (err: any) {
    console.error('On-chain action failed:', err);
    setError(err?.message || 'On-chain action failed');
  } finally {
    setLoading(false);
  }
}
```

### Initializing the Wallet Module

Call `wc.init()` once at app startup (e.g., in `App.tsx` or the root layout component):

```typescript
import * as wc from './wallet';

useEffect(() => {
  wc.init();
}, []);
```

### Subscribing to Connection Changes

Use `wc.subscribe()` to re-render when wallet state changes:

```typescript
const [, forceUpdate] = useState(0);

useEffect(() => {
  return wc.subscribe(() => forceUpdate((n) => n + 1));
}, []);

const connected = wc.isConnected();
const pubKey = wc.getPublicKey();
```

### Showing a WalletConnect QR Code

When the user clicks "Connect via WalletConnect", generate a pairing URI and display it as a QR code:

```typescript
import QRCode from 'qrcode.react'; // or any QR library

const [wcUri, setWcUri] = useState<string | null>(null);

async function handleConnect() {
  try {
    const { uri } = await wc.connectWalletConnect();
    setWcUri(uri);
  } catch (err) {
    console.error('WalletConnect connect failed:', err);
  }
}

// In JSX:
{wcUri && (
  <Dialog open onClose={() => setWcUri(null)}>
    <QRCode value={wcUri} size={300} />
    <Typography>Scan with your Stellar wallet app</Typography>
  </Dialog>
)}
```

### Connect Timeout

WalletConnect `connect()` can hang if the relay is unreachable. Wrap with a timeout:

```typescript
async function handleConnect() {
  try {
    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('WalletConnect timed out')), 15000)
    );
    const { uri } = await Promise.race([wc.connectWalletConnect(), timeout]);
    setWcUri(uri);
  } catch (err) {
    console.error('Connect failed:', err);
  }
}
```

---

## 9. Common On-Chain Operations

| Operation | Contract Function | Frontend Args |
|-----------|------------------|---------------|
| Attestation / Validation | `validate_role(caller)` | `[nativeToAddress(pubKey)]` |
| Ownership transfer | `transfer_ownership(current, new)` | `[nativeToAddress(current), nativeToAddress(newOwner)]` |
| Write allocations | `set_allocations(caller, holders, amounts)` | `[nativeToAddress(pubKey), addressVec(holderAddrs), i128Vec(amounts)]` |
| Deposit XLM | `deposit(depositor, xlm_token, amount)` | `[nativeToAddress(pubKey), nativeToAddress(XLM_SAC_ADDRESS), xlmToI128(amount)]` |
| Distribute funds | `distribute(caller, xlm_token)` | `[nativeToAddress(pubKey), nativeToAddress(XLM_SAC_ADDRESS)]` |

### Stroop Conversion

Stellar native amounts are in **stroops** (1 XLM = 10^7 stroops). When passing user-entered values to contract functions:

```typescript
// User enters 250 tokens — convert to stroops for the contract
const amountInStroops = BigInt(Math.round(userEnteredAmount * 1e7));
const args = [nativeToAddress(pubKey), addressVec(holders), i128Vec([amountInStroops])];
```

When displaying amounts from the Horizon API, they're already in XLM (e.g. `"6.2000000"`).

---

## 10. Verifying On-Chain Transactions

Use the Horizon REST API to inspect what actually happened on-chain:

```
GET https://horizon-testnet.stellar.org/transactions/{txHash}/operations
```

The response includes `asset_balance_changes` with `from`, `to`, and `amount` fields. Essential for debugging when distributions produce unexpected amounts.

Display transaction links to the user:

```
https://stellar.expert/explorer/testnet/tx/{txHash}
https://stellar.expert/explorer/testnet/contract/{contractAddress}
https://stellar.expert/explorer/testnet/account/{accountAddress}
```

---

## 11. Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| `"WalletConnect Core is already initialized"` | Multiple `SignClient.init()` calls (React StrictMode) | Use the singleton `ensureSignClient` pattern above |
| WalletConnect connect hangs forever | Stale pairings in IndexedDB blocking relay | The `ensureSignClient` cleanup handles this; if persistent, user must clear browser site data |
| `"WalletConnect timed out"` after 15s | Relay unreachable or mobile wallet not responding | Verify internet connectivity; try disconnecting/reconnecting wallet app |
| `Simulation failed` when building TX | Contract args don't match function signature, or wallet has insufficient XLM | Check arg types exactly match Rust function params; fund wallet via Friendbot |
| `"destination is invalid"` in `buildPaymentTx` | Public key is not a valid `G...` address | Validate addresses start with `G` and are 56 characters |
| `"amount argument must be of type String"` | Raw number passed to Horizon payment amount | Use `Number(amount).toFixed(7)` to format |
| Signed TX rejected on-chain | Authorization entries missing | Ensure `buildContractCallTx` simulates before returning XDR; don't build transactions manually without simulation |
| `"No active wallet connection"` from `signXDR` | No wallet connected or connection dropped | Check `wc.isConnected()` before attempting to sign; re-prompt user to connect |

---

## References

- [WalletConnect v2 Sign Client](https://docs.walletconnect.com/2.0/api/sign)
- [WalletConnect Cloud (Project ID)](https://cloud.walletconnect.com)
- [Stellar SDK for JavaScript](https://stellar.github.io/js-stellar-sdk/)
- [Freighter Wallet Extension](https://freighter.app)
- [LOBSTR Signer Extension](https://lobstr.co/signer/)
- [Stellar Expert Testnet Explorer](https://stellar.expert/explorer/testnet)
- [Stellar Horizon API (Testnet)](https://horizon-testnet.stellar.org)
- [Stellar Laboratory (Keypair Generator)](https://lab.stellar.org/account/fund)
