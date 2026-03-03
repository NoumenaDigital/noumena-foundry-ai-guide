# 18 - Blockchain Connector Integration (Stellar Focus)

## Overview

This guide covers integrating the **NOUMENA Blockchain Connector** into an NPL application to deploy and interact with **Soroban smart contracts on Stellar Testnet**. The connector enables NPL protocols to deploy contracts and call on-chain functions via an asynchronous `notify`/`resume` pattern over AMQP.

The connector consists of two Docker services:

| Service | Purpose |
|---------|---------|
| `blockchain-connector` | Deploys smart contracts and executes on-chain function calls |
| `wallet-connector` | Creates wallets and funds them via faucet (testnet) |

Both communicate with the NPL engine via **AMQP 1.0** messages through RabbitMQ, and use **HashiCorp Vault** for secure wallet key storage.

**Supported blockchains:** Stellar (Soroban) and Ethereum (EVM-compatible). This guide focuses on Stellar.

---

## 1. Prerequisites

### RabbitMQ 4.0+ (AMQP 1.0)

The blockchain connector uses the **AMQP 1.0** protocol (via the `rhea` library). RabbitMQ 3.x only supports AMQP 0.9.1 natively. You **must** use RabbitMQ 4.0+.

```dockerfile
# rabbitmq/Dockerfile — must use 4.0+
FROM rabbitmq:4.0-management-alpine
```

> **Common error with RabbitMQ 3.x:** `Error: read ECONNRESET` when the blockchain-connector connects to AMQP.

### NPL Connectors Library

The `npl-connectors-library` provides NPL types (`BlockchainDeploy`, `BlockchainDeployMessage`, `BlockchainDeployResponse`, `BlockchainStatus`, `BlockchainType`, `ArgData`) that your protocol uses to communicate with the connector.

### Soroban SDK 22+

Stellar smart contracts must be compiled with **Soroban SDK version 22 or later**. SDK 21.x produces WASM that is incompatible with Stellar Protocol 22's native constructor support.

> **Common error with SDK < 22:** `"trying to call non-default constructor on a contract that doesn't support constructors (built prior to protocol 22)"`

---

## 2. NPL Connectors Library Setup (pom.xml)

### Add the Dependency

```xml
<properties>
    <npl.connectors.version>1.0.19</npl.connectors.version>
</properties>

<dependencies>
    <dependency>
        <groupId>com.noumenadigital.contrib</groupId>
        <artifactId>npl-connectors-library</artifactId>
        <version>${npl.connectors.version}</version>
        <type>zip</type>
    </dependency>
</dependencies>
```

> **Critical:** The artifact type is `zip`, not `jar`. Maven will fail with `Could not resolve dependencies` if you omit `<type>zip</type>`.

### Unpack into NPL Source Tree

The connector NPL files must be extracted into `src/main/npl-1.0/connector/` so the engine can find them at runtime.

```xml
<plugin>
    <groupId>org.apache.maven.plugins</groupId>
    <artifactId>maven-dependency-plugin</artifactId>
    <executions>
        <execution>
            <id>unzip-npl-connectors</id>
            <goals>
                <goal>unpack-dependencies</goal>
            </goals>
            <phase>generate-sources</phase>
            <configuration>
                <outputDirectory>${project.basedir}/src/main/npl-1.0</outputDirectory>
                <includeArtifactIds>npl-connectors-library</includeArtifactIds>
                <includes>**/*.npl</includes>
                <fileMappers>
                    <fileMapper implementation="org.codehaus.plexus.components.io.filemappers.RegExpFileMapper">
                        <pattern>npl-connectors-library-.*/connector</pattern>
                        <replacement>connector</replacement>
                    </fileMapper>
                </fileMappers>
            </configuration>
        </execution>
    </executions>
</plugin>
```

### Clean Extracted Files on `mvn clean`

```xml
<plugin>
    <groupId>org.apache.maven.plugins</groupId>
    <artifactId>maven-clean-plugin</artifactId>
    <version>3.4.0</version>
    <configuration>
        <filesets>
            <fileset>
                <directory>${project.basedir}/src/main/npl-1.0/connector</directory>
            </fileset>
            <fileset>
                <directory>${project.basedir}</directory>
                <includes>
                    <include>npl-contrib.properties</include>
                </includes>
            </fileset>
        </filesets>
    </configuration>
</plugin>
```

### Update .gitignore

```
npl/src/main/npl-1.0/connector/
npl/npl-contrib.properties
```

> **Common error:** `E0020: Attempt to redefine 'BlockchainType'` — connector types loaded twice. Remove any leftover `npl-contrib/` directory or `npl-contrib.properties` file.

---

## 3. NPL Protocol Integration (Stellar)

### Import Connector Types

```npl
use connector.v1.blockchain.Address
use connector.v1.blockchain.ArgData
use connector.v1.blockchain.BlockchainDeploy
use connector.v1.blockchain.BlockchainDeployMessage
use connector.v1.blockchain.BlockchainDeployResponse
use connector.v1.blockchain.BlockchainStatus
use connector.v1.blockchain.BlockchainType
use connector.v1.blockchain.Int128
use connector.v1.blockchain.Uint32
```

> **Note:** Include `ArgData` — the `args` map type is `Map<Text, ArgData>`, not `Map<Text, Text>`. Import typed wrappers (`Address`, `Int128`, `Uint32`) for non-string constructor arguments.

### Add the `connector` Party

The protocol must include a `connector` party so the blockchain connector can call back:

```npl
@api
protocol[myParty, otherParty, connector] MyProtocol(...) {
    ...
};
```

### Deploy a Soroban Smart Contract (notify/resume Pattern)

1. The protocol sends a `BlockchainDeployMessage` via `notify`
2. The connector picks it up from AMQP, deploys the contract on Stellar Testnet
3. The connector calls back the `resume` action with a `BlockchainDeployResponse`

```npl
@api
permission[myParty] deployContract() | created {
    var deployArgs = BlockchainDeploy(
        senderAddress = walletPublicKey,
        compiledContractPath = "stellar/my_contract.wasm",
        blockchainType = BlockchainType.Stellar,
        args = mapOf<Text, ArgData>(
            Pair("param_name", someTextValue)
        )
    );
    notify BlockchainDeployMessage(deployArgs) resume deployCallback;
    become awaitingDeployment;
};

@api
permission[myParty | connector] deployCallback(res: NotifyResult<BlockchainDeployResponse>) | awaitingDeployment {
    match(res) {
        is NotifySuccess<BlockchainDeployResponse> -> match(res.result.status) {
            BlockchainStatus.Success -> {
                // res.result.contractAddress contains the Soroban contract ID
                become deployed;
            }
            BlockchainStatus.Failure -> {
                become deploymentFailed;
            }
        }
        is NotifyFailure -> {
            become deploymentFailed;
        }
    };
};
```

**Key details for Stellar:**

- `senderAddress` must be a funded Stellar public key (starts with `G...`)
- `compiledContractPath` is relative to `SMART_CONTRACTS_ROOT_DIR` (e.g. `"stellar/my_contract.wasm"` → `/alloc/smart-contracts/stellar/my_contract.wasm`)
- `blockchainType = BlockchainType.Stellar`
- `args` map keys must match the Soroban contract `__constructor` parameter names exactly (snake_case)
- The `deployCallback` permission **must** include both the initiating party and `connector` using `|` (OR)
- On success, `res.result.contractAddress` contains the Soroban contract ID (a `C...` address)

> **Common error:** `E0041: Resume action not accessible by all parties that may trigger the notification` — add `connector` to the permission with `|` operator.

### Typed Constructor Arguments

Plain string values are passed directly. For non-string Soroban types, use typed wrappers:

| NPL Wrapper | Soroban Type | Example |
|-------------|-------------|---------|
| `"some text"` (plain string) | `String` | `Pair("name", myTextVar)` |
| `Address(value = ...)` | `Address` | `Pair("owner", Address(value = walletPublicKey))` |
| `Int128(value = ...)` | `i128` | `Pair("amount", Int128(value = 1000))` |
| `Uint32(value = ...)` | `u32` | `Pair("rate_bps", Uint32(value = 250))` |

Example with mixed types:

```npl
args = mapOf<Text, ArgData>(
    Pair("name", protocolData.name),
    Pair("owner", Address(value = protocolData.ownerAddress)),
    Pair("admin", Address(value = protocolData.adminAddress)),
    Pair("total_amount", Int128(value = protocolData.totalAmount)),
    Pair("rate_bps", Uint32(value = protocolData.ratePct * 100))
)
```

> **Note:** `Address` values must be valid Stellar public keys (`G...` addresses). The connector converts them to Soroban `Address` types on-chain.

---

## 4. Party Automation (rules.yml)

The `connector` party must be mapped to the blockchain-connector's Keycloak service account via a `set` rule with a `party` claim:

```yaml
{package}.{Protocol}:
  connector:
    set:
      claims:
        party:
          - blockchain-connector
```

This works because the connector's Keycloak client has a **hardcoded claim protocol mapper** that injects `"party": ["blockchain-connector"]` into its JWT (see Section 5). The engine matches this JWT claim to the party defined here.

> **Critical:** Without the hardcoded claim mapper in Keycloak, the engine returns `404 NOT_FOUND` when the connector tries to call back, because it can't match the connector's JWT to any party on the protocol instance. The error appears as `UnknownProtocolRuntimeErrorException: Unknown protocol / No such StateId` — misleading, because the instance exists but the connector simply has no access.

> **Common error:** `SchemaViolationException: property 'value' is not defined` — wrong format. Must be `set: claims: party: - blockchain-connector`.

---

## 5. Keycloak Service-Account Client

The blockchain connector needs a **confidential** Keycloak client with service accounts enabled **and a hardcoded claim protocol mapper** that injects the `party` claim.

Add to `keycloak-provisioning/terraform.tf`:

```hcl
resource "keycloak_openid_client" "blockchain_connector_client" {
  realm_id                     = keycloak_realm.realm.id
  client_id                    = "blockchain_connector"
  name                         = "Blockchain Connector"
  enabled                      = true
  access_type                  = "CONFIDENTIAL"
  standard_flow_enabled        = false
  direct_access_grants_enabled = true
  service_accounts_enabled     = true
  client_secret                = var.default_password
  valid_redirect_uris          = []
  web_origins                  = []
  full_scope_allowed           = false
  access_token_lifespan        = 300
}

resource "keycloak_openid_client_default_scopes" "blockchain_connector_default_scopes" {
  realm_id       = keycloak_realm.realm.id
  client_id      = keycloak_openid_client.blockchain_connector_client.id
  default_scopes = []
}

resource "keycloak_openid_client_optional_scopes" "blockchain_connector_optional_scopes" {
  realm_id        = keycloak_realm.realm.id
  client_id       = keycloak_openid_client.blockchain_connector_client.id
  optional_scopes = []
}

# CRITICAL: This mapper injects the "party" claim into the connector's JWT.
# Without it, the engine cannot match the connector to the "connector" party
# in the protocol, and callbacks fail with 404.
resource "keycloak_openid_hardcoded_claim_protocol_mapper" "blockchain_connector_party" {
  realm_id         = keycloak_realm.realm.id
  client_id        = keycloak_openid_client.blockchain_connector_client.id
  name             = "Party"
  claim_name       = "party"
  claim_value_type = "JSON"
  claim_value      = "[\"blockchain_connector\"]"
}
```

The resulting JWT will contain:

```json
{
  "party": ["blockchain_connector"],
  "client_id": "blockchain_connector",
  "azp": "blockchain_connector"
}
```

> **Important:** `full_scope_allowed = false` with empty default/optional scopes produces a minimal JWT. The only custom claim is `party`, which is all the engine needs.

> **Important:** After editing `terraform.tf`, you must **rebuild the provisioning Docker image** (`docker compose build keycloak-provisioning`) because the Dockerfile copies the file at build time. Then wipe the Keycloak DB and re-provision for a clean apply.

---

## 6. Soroban Smart Contract (Stellar)

### Directory Structure

```
blockchain/
├── Makefile
└── stellar/
    ├── Cargo.toml              (workspace root)
    └── contracts/
        └── my_contract/
            ├── Cargo.toml      (contract crate)
            └── src/
                └── lib.rs
```

### Workspace Cargo.toml

```toml
[workspace]
resolver = "2"
members = ["contracts/*"]

[workspace.dependencies]
soroban-sdk = "22"

[profile.release]
opt-level = "z"
overflow-checks = true
debug = 0
strip = "symbols"
debug-assertions = false
panic = "abort"
codegen-units = 1
lto = true
```

> **Critical:** Soroban SDK must be version **22 or later**. SDK 21.x compiles WASM without Protocol 22 constructor support, causing deployment to fail with `"trying to call non-default constructor on a contract that doesn't support constructors"`.

### Contract Crate Cargo.toml

```toml
[package]
name = "my_contract"
version = "0.1.0"
edition = "2021"
publish = false

[lib]
crate-type = ["cdylib"]
doctest = false

[dependencies]
soroban-sdk = { workspace = true }
```

### Example Contract (lib.rs)

```rust
#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, Env, String};

#[contracttype]
pub struct MyData {
    pub identifier: String,
    pub name: String,
}

const DATA_KEY: &str = "data";

#[contract]
pub struct MyContract;

#[contractimpl]
impl MyContract {
    pub fn __constructor(env: Env, identifier: String, name: String) {
        let data = MyData { identifier, name };
        env.storage().persistent().set(&String::from_str(&env, DATA_KEY), &data);
    }

    pub fn get_data(env: Env) -> MyData {
        env.storage()
            .persistent()
            .get(&String::from_str(&env, DATA_KEY))
            .unwrap()
    }
}
```

**Constructor naming:** Soroban Protocol 22 uses `__constructor` (double underscore prefix) for contract initialization. The constructor runs automatically during deployment.

**Constructor args mapping:** The `args` map in `BlockchainDeploy` maps directly to the `__constructor` parameters by name. In the example above, the NPL side would pass:

```npl
args = mapOf<Text, ArgData>(
    Pair("identifier", "ABC-123"),
    Pair("name", "My Contract Instance")
)
```

### Smart Contract Authorization

Use `require_auth()` on `Address` parameters to enforce that the caller cryptographically signed the transaction. Combine with constructor-stored addresses for role-based access control:

```rust
#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, token, Address, Env, String, Vec};

#[contracttype]
pub struct ContractData {
    pub owner: Address,
    pub admin: Address,
    pub operator: Address,
    pub total_amount: i128,
    pub rate_bps: u32,
}

const DATA_KEY: &str = "data";

#[contract]
pub struct MyContract;

#[contractimpl]
impl MyContract {
    pub fn __constructor(
        env: Env,
        name: String,
        owner: Address,
        admin: Address,
        operator: Address,
        total_amount: i128,
        rate_bps: u32,
    ) {
        let data = ContractData { owner, admin, operator, total_amount, rate_bps };
        env.storage().persistent().set(&String::from_str(&env, DATA_KEY), &data);
    }

    pub fn restricted_action(env: Env, caller: Address) {
        caller.require_auth();
        let data: ContractData = env.storage().persistent()
            .get(&String::from_str(&env, DATA_KEY)).unwrap();
        assert!(data.admin == caller, "not the authorized admin");
        // ... perform action
    }
}
```

**Authorization pattern:** Every privileged function should:
1. Accept the caller's `Address` as a parameter
2. Call `caller.require_auth()` — this is Soroban's built-in signature verification
3. Assert the caller matches a constructor-stored address for the required role

> **Critical:** `require_auth()` alone only proves the caller signed the transaction. Without the assertion against a stored address, **anyone** with a valid Stellar account could call the function. Always combine both checks.

### XLM Token Transfers via SAC

To transfer native XLM within a Soroban contract, use the **Stellar Asset Contract (SAC)** `token::Client`. The SAC wraps the native XLM asset as a Soroban token:

```rust
use soroban_sdk::token;

pub fn deposit(env: Env, depositor: Address, xlm_token: Address, amount: i128) {
    depositor.require_auth();
    assert!(amount > 0, "amount must be positive");

    let contract_addr = env.current_contract_address();
    token::Client::new(&env, &xlm_token).transfer(&depositor, &contract_addr, &amount);

    // Store deposit amount for later use
    let key = String::from_str(&env, "deposit");
    let existing: i128 = env.storage().persistent().get(&key).unwrap_or(0);
    env.storage().persistent().set(&key, &(existing + amount));
}
```

**Key points:**
- `xlm_token` is the XLM SAC contract address, passed from the frontend
- Amounts are in **stroops** (1 XLM = 10,000,000 stroops = 10^7)
- The depositor must sign the transaction (via WalletConnect) for `require_auth()` to pass
- `token::Client::transfer` moves XLM from the signer to the contract address

The **XLM SAC address on testnet** is: `CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC`

### Proportional Distribution

When distributing funds from a contract to multiple recipients, calculate payouts proportionally from the **actual deposited amount**:

```rust
pub fn distribute(env: Env, caller: Address, xlm_token: Address) {
    caller.require_auth();
    // ... authorization checks ...

    let allocs: Vec<Allocation> = env.storage().persistent()
        .get(&String::from_str(&env, "allocs")).expect("no allocations");

    let deposit: i128 = env.storage().persistent()
        .get(&String::from_str(&env, "deposit")).expect("no deposit");
    assert!(deposit > 0, "no funds deposited");

    let mut total_shares: i128 = 0;
    for i in 0..allocs.len() {
        total_shares += allocs.get(i).unwrap().shares;
    }

    let contract_addr = env.current_contract_address();
    let token_client = token::Client::new(&env, &xlm_token);

    for i in 0..allocs.len() {
        let alloc = allocs.get(i).unwrap();
        let payout = deposit * alloc.shares / total_shares;
        if payout > 0 {
            token_client.transfer(&contract_addr, &alloc.recipient, &payout);
        }
    }
}
```

> **Critical:** Do NOT pre-compute individual payouts using `shares * rate / 10000` — this treats each holder's share count as a principal amount and applies the rate independently, producing far smaller payouts than expected. Always use the proportional formula: `payout = total_deposit * holder_shares / total_shares`. See Section 15 (Smart Contract Design Pitfalls) for details.

### Compile

```bash
cd blockchain/stellar && stellar contract build
```

The compiled WASM ends up at `blockchain/stellar/target/wasm32-unknown-unknown/release/my_contract.wasm`.

> **Prerequisite:** Install the Stellar CLI: `cargo install stellar-cli`

### Contract Immutability

Deployed Soroban contracts are **immutable** — you cannot patch or upgrade a deployed contract. If a bug is found, you must:
1. Fix the Rust source
2. Recompile the WASM
3. Restart the blockchain-connector (WASM is bind-mounted)
4. Deploy a new contract instance through a fresh NPL workflow

The old contract and its funds remain on-chain but cannot be modified.

---

## 7. Vault Key Storage (Static Wallet)

The connector fetches the signing key from Vault. For Stellar, the Vault path includes a `stellar/` subdirectory:

```
secret/data/blockchain/stellar/{PUBLIC_KEY}
```

The key is stored as:

```json
{ "data": { "privateKey": "S..." } }
```

### Vault Init Service (docker-compose.yml)

Use an init container to seed the static wallet and fund it via Stellar Friendbot:

```yaml
vault-init:
  image: curlimages/curl:latest
  entrypoint: ["sh", "-c"]
  command:
    - |
      echo "Seeding Vault with static deploy wallet..." &&
      curl -sf -X PUT "http://vault:8200/v1/secret/data/blockchain/stellar/$${STELLAR_DEPLOY_WALLET_PUBLIC}" \
        -H "X-Vault-Token: $${VAULT_TOKEN}" \
        -H "Content-Type: application/json" \
        -d "{\"data\":{\"privateKey\":\"$${STELLAR_DEPLOY_WALLET_SECRET}\"}}" &&
      echo "Vault seeded successfully." &&
      echo "Funding wallet on Stellar testnet via Friendbot..." &&
      curl -sf "https://friendbot.stellar.org?addr=$${STELLAR_DEPLOY_WALLET_PUBLIC}" > /dev/null 2>&1;
      echo "Wallet init complete."
  environment:
    VAULT_TOKEN: "${VAULT_TOKEN}"
    STELLAR_DEPLOY_WALLET_PUBLIC: "${STELLAR_DEPLOY_WALLET_PUBLIC}"
    STELLAR_DEPLOY_WALLET_SECRET: "${STELLAR_DEPLOY_WALLET_SECRET}"
  profiles:
    - blockchain
  depends_on:
    vault:
      condition: service_healthy
```

> **Critical Vault path:** The connector looks for Stellar keys at `{VAULT_KEY_PATH}/stellar/{publicKey}`. If you store the key at `secret/blockchain/{publicKey}` (without `stellar/`), the connector will fail with a `404` from Vault.

> **`.env` settings for Vault:**
> ```
> VAULT_KEY_PATH=secret/blockchain
> VAULT_KEY_NAME=privateKey
> ```
> The connector internally appends `stellar/` when `blockchainType` is Stellar.

---

## 8. Migration Name (Critical for AMQP Routing)

The connector uses a regex to strip the version prefix from AMQP message names. The migration changeset name in `migration.yml` **must** follow the pattern `{name}-{digits}` (e.g. `npl-1.0`).

**migration.yml:**

```yaml
$schema: https://documentation.noumenadigital.com/schemas/migration-schema-v2.yml

changesets:
  - name: npl-1.0
    changes:
      - migrate:
          sources:
            - npl-1.0
          rules: rules/rules.yml
```

**Engine config** (docker-compose.yml):

```yaml
ENGINE_NPL_MIGRATION_RUN_ONLY: npl-1.0
```

The connector's internal regex `removePathVersionPrefix` expects message names like `/npl-1.0?/connector/v1/blockchain/BlockchainDeployMessage` and strips the `/npl-1.0?/` prefix to identify the message type.

> **Critical:** If the changeset name doesn't match the pattern (e.g. using `local` instead of `npl-1.0`), the connector logs `"Skipping message type"` and then crashes with `ERR_OUT_OF_RANGE` as unacknowledged messages overflow the AMQP session window. Fix: rename the changeset to `npl-1.0`, wipe the engine DB, and purge the RabbitMQ queue.

---

## 9. Docker Compose Services

### HashiCorp Vault

```yaml
vault:
  image: hashicorp/vault:1.15
  cap_add:
    - IPC_LOCK
  ports:
    - "8200:8200"
  environment:
    VAULT_DEV_ROOT_TOKEN_ID: "${VAULT_TOKEN}"
    VAULT_DEV_LISTEN_ADDRESS: "0.0.0.0:8200"
    VAULT_ADDR: "http://127.0.0.1:8200"
  profiles:
    - blockchain
  healthcheck:
    test: ["CMD", "wget", "-q", "--spider", "http://127.0.0.1:8200/v1/sys/health"]
    interval: 5s
    timeout: 5s
    retries: 10
```

### Blockchain Connector (Stellar)

```yaml
blockchain-connector:
  image: ghcr.io/noumenadigital/blockchain-connector/blockchain-connector:1.154
  environment:
    LOG_LEVEL: "debug"
    ENGINE_URL: "http://engine:12000"
    KEYCLOAK_URL: "http://keycloak:11000"
    KEYCLOAK_REALM: "${VITE_NC_KC_REALM}"
    KEYCLOAK_CLIENT_ID: "${BLOCKCHAIN_CONNECTOR_KC_CLIENT_ID}"
    KEYCLOAK_CLIENT_SECRET: "${BLOCKCHAIN_CONNECTOR_KC_CLIENT_SECRET}"
    KEYCLOAK_ADMIN_USER: "${KEYCLOAK_ADMIN}"
    KEYCLOAK_ADMIN_PASSWORD: "${KEYCLOAK_ADMIN_PASSWORD}"
    KEYCLOAK_HOST: "keycloak"
    VAULT_TYPE: "hashicorp"
    VAULT_URL: "http://vault:8200"
    VAULT_TOKEN: "${VAULT_TOKEN}"
    VAULT_KEY_PATH: "${VAULT_KEY_PATH}"
    VAULT_KEY_NAME: "${VAULT_KEY_NAME}"
    AMQP_HOST: "${AMQP_HOST}"
    AMQP_PORT: "${AMQP_PORT}"
    AMQP_USERNAME: "${AMQP_USERNAME}"
    AMQP_PASSWORD: "${AMQP_PASSWORD}"
    AMQP_QUEUE_NAME: "${AMQP_ROOT_QUEUE_NAME}"
    SMART_CONTRACTS_ROOT_DIR: "/alloc/smart-contracts"
    BLOCKCHAIN_PROVIDER_SECRET_URL: "http://hardhat:8545"
    STELLAR_RPC_URL: "https://soroban-testnet.stellar.org/"
    STELLAR_NETWORK_TYPE: "TESTNET"
    AZURE_CLIENT_SECRET: "MISSING"
    AZURE_TENANT_ID: "MISSING"
    AZURE_CLIENT_ID: "MISSING"
    AZURE_HSM_URL: "MISSING"
    IS_PROD: "MISSING"
  volumes:
    - ./blockchain/stellar/target/wasm32-unknown-unknown/release/my_contract.wasm:/alloc/smart-contracts/stellar/my_contract.wasm:ro
  profiles:
    - blockchain
  depends_on:
    engine:
      condition: service_healthy
    vault-init:
      condition: service_completed_successfully
    keycloak:
      condition: service_healthy
    rabbitmq:
      condition: service_healthy
```

**Key configuration notes:**

- `KEYCLOAK_CLIENT_SECRET` must be `${BLOCKCHAIN_CONNECTOR_KC_CLIENT_SECRET}` (matching the Terraform-provisioned client secret), **not** `${KEYCLOAK_ADMIN_PASSWORD}`. A mismatch causes `401 Unauthorized`.
- `AMQP_QUEUE_NAME` must be `"${AMQP_ROOT_QUEUE_NAME}"` (no `/queues/` prefix).
- `STELLAR_NETWORK_TYPE` must be uppercase `"TESTNET"`.
- `BLOCKCHAIN_PROVIDER_SECRET_URL` is still required even for Stellar-only setups (set to Hardhat URL or a dummy).
- Azure env vars are required placeholders even when not using Azure HSM.
- The `depends_on` should reference `vault-init` (not `vault` directly) so the wallet is seeded before the connector starts.
- The WASM volume mount path must match the `compiledContractPath` in NPL.

### Wallet Connector

```yaml
wallet-connector:
  image: ghcr.io/noumenadigital/blockchain-connector/wallet-connector:1.154
  environment:
    LOG_LEVEL: "debug"
    ENGINE_URL: "http://engine:12000"
    KEYCLOAK_URL: "http://keycloak:11000"
    KEYCLOAK_REALM: "${VITE_NC_KC_REALM}"
    KEYCLOAK_CLIENT_ID: "${BLOCKCHAIN_CONNECTOR_KC_CLIENT_ID}"
    KEYCLOAK_CLIENT_SECRET: "${BLOCKCHAIN_CONNECTOR_KC_CLIENT_SECRET}"
    KEYCLOAK_ADMIN_USER: "${KEYCLOAK_ADMIN}"
    KEYCLOAK_ADMIN_PASSWORD: "${KEYCLOAK_ADMIN_PASSWORD}"
    KEYCLOAK_HOST: "keycloak"
    VAULT_TYPE: "hashicorp"
    VAULT_URL: "http://vault:8200"
    VAULT_TOKEN: "${VAULT_TOKEN}"
    VAULT_KEY_PATH: "${VAULT_KEY_PATH}"
    VAULT_KEY_NAME: "${VAULT_KEY_NAME}"
    AMQP_HOST: "${AMQP_HOST}"
    AMQP_PORT: "${AMQP_PORT}"
    AMQP_USERNAME: "${AMQP_USERNAME}"
    AMQP_PASSWORD: "${AMQP_PASSWORD}"
    AMQP_QUEUE_NAME: "${AMQP_ROOT_QUEUE_NAME}"
    ETHEREUM_FAUCET_WALLET_PRIVATE_KEY: "${HARDHAT_FAUCET_PRIVATE_KEY}"
    BLOCKCHAIN_PROVIDER_SECRET_URL: "http://hardhat:8545"
    STELLAR_HORIZON_API: "https://horizon-testnet.stellar.org"
    STELLAR_RPC_URL: "https://soroban-testnet.stellar.org/"
    STELLAR_NETWORK_TYPE: "TESTNET"
    STELLAR_FAUCET_WALLET_PRIVATE_KEY: "${STELLAR_FAUCET_PRIVATE_KEY}"
    AZURE_CLIENT_SECRET: "MISSING"
    AZURE_TENANT_ID: "MISSING"
    AZURE_CLIENT_ID: "MISSING"
    AZURE_HSM_URL: "MISSING"
    IS_PROD: "MISSING"
  profiles:
    - blockchain
  depends_on:
    engine:
      condition: service_healthy
    vault:
      condition: service_healthy
    keycloak:
      condition: service_healthy
    rabbitmq:
      condition: service_healthy
```

---

## 10. Environment Variables (.env)

```bash
# Vault (dev mode for local blockchain connector stack)
VAULT_TOKEN=myroot
VAULT_KEY_PATH=secret/blockchain
VAULT_KEY_NAME=privateKey

# Blockchain Connector (Keycloak service-account client)
BLOCKCHAIN_CONNECTOR_KC_CLIENT_ID=blockchain-connector
BLOCKCHAIN_CONNECTOR_KC_CLIENT_SECRET=welcome

# Hardhat local EVM node (required even for Stellar-only setups)
HARDHAT_FAUCET_PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80

# Stellar testnet faucet wallet
STELLAR_FAUCET_PRIVATE_KEY=<your-stellar-testnet-secret-key>

# Static Stellar deployment wallet (pre-seeded into Vault on startup)
STELLAR_DEPLOY_WALLET_PUBLIC=<your-stellar-public-key>
STELLAR_DEPLOY_WALLET_SECRET=<your-stellar-secret-key>
```

> **`VAULT_KEY_PATH`** must be `secret/blockchain` (not `secret/data/blockchain`). The Vault KV v2 API automatically adds `data/` to the HTTP path. If you include `data/` in the env var, the actual request path becomes `secret/data/data/blockchain` which 404s.

> **`VAULT_KEY_NAME`** must be `privateKey` (matching the JSON key name stored in Vault).

> **`BLOCKCHAIN_CONNECTOR_KC_CLIENT_SECRET`** must match the Keycloak client secret set in Terraform (`var.default_password`, typically `welcome`). Using `KEYCLOAK_ADMIN_PASSWORD` (`admin`) causes `401 Unauthorized`.

> **Generating a Stellar keypair:** Use [Stellar Laboratory](https://lab.stellar.org/account/fund) or `stellar keys generate --network testnet mykey`.

---

## 11. WASM Volume Mounting (Stellar)

The compiled WASM binary must be mounted into the `blockchain-connector` container at the path matching `compiledContractPath` in NPL.

**NPL side:**

```npl
compiledContractPath = "stellar/my_contract.wasm"
```

**docker-compose.yml side:**

```yaml
volumes:
  - ./blockchain/stellar/target/wasm32-unknown-unknown/release/my_contract.wasm:/alloc/smart-contracts/stellar/my_contract.wasm:ro
```

The connector resolves: `${SMART_CONTRACTS_ROOT_DIR}/${compiledContractPath}` → `/alloc/smart-contracts/stellar/my_contract.wasm`.

### Updating the Contract

Because the WASM is **bind-mounted** (not baked into the Docker image), updating a contract only requires:

1. Edit the Rust source and recompile: `cd blockchain/stellar && stellar contract build`
2. Restart the connector to pick up the new file: `docker compose --profile blockchain restart blockchain-connector`
3. No Docker image rebuild is needed

To verify the connector has the updated WASM:

```bash
# Compare file hash inside container vs local
docker compose --profile blockchain exec blockchain-connector md5sum /alloc/smart-contracts/stellar/my_contract.wasm
# Compare with local file
md5sum blockchain/stellar/target/wasm32-unknown-unknown/release/my_contract.wasm
```

---

## 12. Startup Order

```
1. make infra                    # Base infrastructure (engine, keycloak, rabbitmq, etc.)
2. make provision                # Keycloak realm + blockchain-connector client + party mapper
3. cd npl && mvn package         # Build NPL (extracts connector library, compiles, generates OpenAPI)
4. docker compose up -d engine   # Redeploy engine with new NPL
5. cd blockchain/stellar && stellar contract build   # Compile Soroban contract
6. make blockchain-local         # Starts vault, vault-init, connectors
```

After initial setup, just rebuild the WASM and `make blockchain-local` to bring up the blockchain stack.

---

## 13. Frontend: Linking to Stellar Explorer

Display Stellar addresses and transaction hashes as clickable links to the testnet explorer:

```
https://stellar.expert/explorer/testnet/contract/{contractAddress}
https://stellar.expert/explorer/testnet/tx/{transactionHash}
https://stellar.expert/explorer/testnet/account/{accountAddress}
```

Truncate long addresses for display using a helper like:

```typescript
const truncateHash = (hash: string, prefixLen = 6, suffixLen = 4): string => {
  if (hash.length <= prefixLen + suffixLen + 3) return hash;
  return `${hash.slice(0, prefixLen)}...${hash.slice(-suffixLen)}`;
};
// "GBBMQ3NVUUCQEDGBQN77AW2AUUTW2TKEXW643TM3P7OMGZU5XGTY32U6" → "GBBMQ3...32U6"
```

Show the full address on hover via the `title` attribute.

---

## 14. Frontend Wallet & Stellar Integration

For wallet connection (WalletConnect, Freighter, LOBSTR, xBull), Soroban transaction building, ScVal argument helpers, and frontend signing flows, see **[19-WALLET-INTEGRATION.md](./19-WALLET-INTEGRATION.md)**.

That guide covers creating `frontend/src/wallet.ts` and `frontend/src/stellar.ts` from scratch, including dependencies, Vite configuration, and component integration patterns.

---

## 15. Smart Contract Design Pitfalls

### Proportional Distribution vs Individual Rate Calculation

**Wrong approach** — applying rate to each holder's individual amount:

```rust
// BUG: This gives far less than the deposited total
let interest = holder_nominal * rate_bps / 10000;
```

If the deposit is calculated from a large total (e.g., `total_nominal * rate / 100 = 248 XLM`) but holder nominals are small token counts (e.g., 250 and 100), the sum of individual interests is much smaller than the deposit. Most funds remain stuck in the contract.

**Correct approach** — proportional distribution from actual deposit:

```rust
let payout = total_deposit * holder_shares / total_all_shares;
```

This distributes the **entire** deposited amount proportionally, regardless of the rate or unit system.

### Unit Mismatches Between NPL and Soroban

NPL values (e.g., `nominalValue = 10000`) may represent human-readable amounts while the Soroban contract expects stroops. Keep track of which layer does the conversion:

| Layer | Unit | Example |
|-------|------|---------|
| NPL protocol fields | Human-readable (XLM) | `nominalValue = 10000` |
| Frontend → Contract | Stroops (XLM × 10^7) | `xlmToI128("10000")` → 100,000,000,000 |
| Contract storage | Stroops | `amount: i128 = 100000000000` |
| Horizon API display | XLM (stroops ÷ 10^7) | `"10000.0000000"` |

> **Rule of thumb:** Convert to stroops at the frontend boundary (in `stellar.ts` helpers), and keep everything in stroops inside the contract.

### Integer Division Truncation

Soroban `i128` division truncates. For small values this can lose significant precision:

```rust
// 250 * 248 / 10000 = 6.2 → truncated to 6 (lost 3% of the value)
let interest = 250i128 * 248 / 10000;
```

Mitigate by working in stroops (large numbers) and doing multiplication before division:

```rust
// 2500000000 * 248 / 10000 = 62000000 (no truncation loss)
let interest = 2_500_000_000i128 * 248 / 10000;
```

### Verifying On-Chain Transactions

Use the Horizon REST API to inspect transaction details programmatically:

```
GET https://horizon-testnet.stellar.org/transactions/{txHash}/operations
```

The response includes `asset_balance_changes` showing actual XLM transfers with `from`, `to`, and `amount` fields. This is invaluable for debugging distribution bugs.

---

## 16. Troubleshooting

### Blockchain Connector Issues

| Symptom | Cause | Fix |
|---------|-------|-----|
| `"Skipping message type"` then `ERR_OUT_OF_RANGE` crash | Migration changeset name doesn't match connector's regex | Rename changeset to `npl-1.0` format, set `ENGINE_NPL_MIGRATION_RUN_ONLY: npl-1.0`, wipe engine DB, purge RabbitMQ queue |
| `404 NOT_FOUND` / `UnknownProtocolRuntimeErrorException` on callback | Connector's JWT missing `party` claim | Add `keycloak_openid_hardcoded_claim_protocol_mapper` to Terraform (see Section 5), rebuild provisioning image, wipe Keycloak DB, re-provision |
| `401 Unauthorized` from KeycloakService | Client secret mismatch | Use `BLOCKCHAIN_CONNECTOR_KC_CLIENT_SECRET` (not `KEYCLOAK_ADMIN_PASSWORD`) |
| `"trying to call non-default constructor"` | Soroban SDK < 22 | Upgrade `soroban-sdk` to `"22"` in `Cargo.toml`, recompile WASM |
| Vault `404` when fetching key | Wrong Vault path for Stellar | Store at `secret/data/blockchain/stellar/{publicKey}`, set `VAULT_KEY_PATH=secret/blockchain` |
| `E0062: Unresolved import 'connector.BlockchainDeploy'` | Wrong import path | Use `connector.v1.blockchain.*` |
| `E0020: Attempt to redefine 'BlockchainType'` | Connector types loaded twice | Remove `npl-contrib` goal, delete `npl-contrib/` dir |
| `E0041: Resume action not accessible by all parties` | Missing `connector` in callback permission | Use `permission[myParty \| connector]` |
| `Error: read ECONNRESET` (AMQP) | RabbitMQ 3.x | Upgrade to `rabbitmq:4.0-management-alpine` |
| `SchemaViolationException` in rules.yml | Wrong rules.yml format | Use `set: claims: party: - blockchain-connector` |
| Terraform `409 Conflict` on re-provision | Realm already exists | Wipe Keycloak DB: stop keycloak + keycloak-db, `docker compose rm -f keycloak-db`, `docker volume rm <volume>`, restart, re-provision |
| Provisioning image ignores terraform.tf edits | Dockerfile copies file at build time | Run `docker compose build keycloak-provisioning` after editing |
| Terraform `client with id ... does not exist` | Stale Terraform state after Keycloak DB wipe | Remove keycloak-provisioning container to clear its anonymous volume: `docker compose rm -f keycloak-provisioning`, then re-provision with `docker compose --profile app up -d --force-recreate keycloak-provisioning` |

### Frontend / Wallet Signing Issues

See **[19-WALLET-INTEGRATION.md](./19-WALLET-INTEGRATION.md)** Section 11 for WalletConnect and frontend signing troubleshooting.

| Symptom | Cause | Fix |
|---------|-------|-----|
| Distribution sends far less than deposited | Contract calculates individual `holder * rate / 10000` instead of proportional split | Use `deposit * holder_shares / total_shares` in the distribute function (see Section 15) |
| NPL `R35: allocations must be of type 'List<...>'` | Schema mismatch — engine running stale code with old struct fields | Wipe engine + engine-db volumes, redeploy NPL: `docker compose stop engine engine-db && docker compose rm -f -v engine-db`, then restart |

### Smart Contract Issues

| Symptom | Cause | Fix |
|---------|-------|-----|
| `"not the authorized admin"` assertion failure | Caller address doesn't match constructor-stored address | Verify the correct wallet is connected; the address must exactly match what was passed to the constructor at deploy time |
| Funds stuck in contract after distribution | Distribution formula doesn't use full deposit | Fix distribute function to use proportional formula from actual deposit (see Section 6) |
| Contract behavior differs after recompile | Old contract still deployed on-chain | Soroban contracts are immutable; create a new protocol instance to deploy the updated WASM |

### Nuclear Reset Procedure

When things are deeply broken, do a full clean slate:

```bash
# Stop everything
docker compose --profile blockchain down

# Wipe engine DB (loses all protocol instances)
docker compose stop engine-db && docker compose rm -f engine-db
docker volume rm ai-guide-npl_engine-db

# Wipe Keycloak DB
docker compose stop keycloak && docker compose stop keycloak-db
docker compose rm -f keycloak-db
docker volume rm ai-guide-npl_keycloak-db

# Rebuild provisioning image
docker compose build keycloak-provisioning

# Restart
docker compose up -d keycloak-db keycloak
# Wait ~30s for Keycloak to start
docker compose run --rm keycloak-provisioning
docker compose up -d engine-db engine

# Purge stale AMQP messages
curl -u guest:guest -X DELETE http://localhost:15672/api/queues/%2F/npl-queue/contents

# Start blockchain stack
make blockchain-local
```

---

---

## References

- [19-WALLET-INTEGRATION.md](./19-WALLET-INTEGRATION.md) — Frontend wallet connection, on-chain signing, and Stellar helpers
- [NOUMENA Blockchain Connector Documentation](https://documentation.noumenadigital.com/cloud/connectors/blockchain-connector-integration/)
- [NPL Blockchain Starter](https://github.com/NoumenaDigital/npl-blockchain-starter)
- [crowd-fung Reference Implementation](https://github.com/NoumenaDigital/crowd-fung/tree/dws)
- [Stellar Expert Testnet Explorer](https://stellar.expert/explorer/testnet)
- [Stellar Horizon API (Testnet)](https://horizon-testnet.stellar.org) — REST API for querying transactions, accounts, and operations
- [Soroban SDK Documentation](https://soroban.stellar.org/docs)
- [Stellar Laboratory (Keypair Generator)](https://lab.stellar.org/account/fund)
