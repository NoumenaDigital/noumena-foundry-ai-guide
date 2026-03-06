# 04 - Frontend Setup

## ⚠️ CRITICAL: You Must Complete Phase 1 First

**This guide is for PHASE 2 of the development workflow.**

Before starting this guide, you MUST have completed Phase 1 (Backend):

```
┌─────────────────────────────────────────────────────────────────┐
│ ⛔ STOP: Have you completed these steps?                        │
├─────────────────────────────────────────────────────────────────┤
│ ✅ NPL protocols written with @api annotations                  │
│ ✅ NPL compiled successfully: cd npl && mvn package             │
│ ✅ OpenAPI exists: ls npl/target/generated-sources/openapi/     │
│ ✅ Backend services running: make infra && make provision       │
└─────────────────────────────────────────────────────────────────┘
```

See [02-NPL-DEVELOPMENT.md](./02-NPL-DEVELOPMENT.md) for NPL development.

## Prerequisites

Before generating the frontend, ensure you have:

1. **NPL Protocols** - Complete NPL codebase with `@api` protocols *(Phase 1)*
2. **Generated API** - OpenAPI specification generated from NPL compilation *(Phase 1)*
3. **Node.js 18+** and **npm** installed
4. **TypeScript** knowledge
5. **React** knowledge

## Frontend Project Structure

Create a new frontend project with this structure:

```
frontend/
├── package.json
├── tsconfig.json
├── vite.config.ts
├── index.html
└── src/
    ├── main.tsx                    # Entry point
    ├── App.tsx                     # Root component
    ├── Router.tsx                  # Route definitions
    ├── ServiceProvider.tsx         # API service provider
    ├── AuthProvider.tsx            # Authentication provider
    ├── theme.ts                    # Material-UI theme
    ├── vite-env.d.ts               # Vite environment types
    ├── components/
    │   ├── shared/
    │   │   ├── Layout.tsx          # Main layout with sidebar
    │   │   ├── ProtectedRoute.tsx  # Route protection component
    │   │   └── Header.tsx
    │   └── pages/                  # Page components
    ├── hooks/                      # Custom React hooks
    ├── i18n/                       # Internationalization
    └── generated/                  # Auto-generated from OpenAPI — do not edit
        ├── core/
        │   ├── OpenAPI.ts
        │   └── request.ts
        ├── services/
        │   └── DefaultService.ts
        ├── models/
        └── index.ts
```

## Package Dependencies

Install these dependencies:

```json
{
  "dependencies": {
    "@mui/material": "^5.15.0",
    "@mui/icons-material": "^5.15.0",
    "@emotion/react": "^11.11.0",
    "@emotion/styled": "^11.11.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.20.0",
    "react-hook-form": "^7.48.0",
    "keycloak-js": "^23.0.0",
    "react-i18next": "^13.5.0",
    "i18next": "^23.7.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "@types/node": "^20.10.0",
    "@typescript-eslint/eslint-plugin": "^6.13.0",
    "@typescript-eslint/parser": "^6.13.0",
    "@vitejs/plugin-react": "^4.2.0",
    "typescript": "^5.3.0",
    "vite": "^5.0.0"
  }
}
```

## Environment Variables

Three variables are required at runtime:

| Variable | Value |
|---|---|
| `VITE_KEYCLOAK_URL` | `http://host.docker.internal:11000` |
| `VITE_NC_KC_REALM` | your app slug (e.g. `goldprovenance`) |
| `VITE_NC_KC_CLIENT_ID` | your app slug (e.g. `goldprovenance`) |

`host.docker.internal` is used because Keycloak embeds this hostname in JWT tokens as the issuer. It must be resolvable by both the browser (Windows/Mac Docker Desktop resolves it to 127.0.0.1) and backend containers (Docker Desktop provides this DNS entry). Do not change it to `localhost` — that breaks token validation inside Docker containers.

### Local dev (`npm run dev`)

**Vite does NOT read the root `.env`.** You MUST create a separate `frontend/.env`:

```env
VITE_ENGINE_URL=http://localhost:12001
VITE_KEYCLOAK_URL=http://host.docker.internal:11000
VITE_NC_KC_REALM=goldprovenance
VITE_NC_KC_CLIENT_ID=goldprovenance
```

Without this file the app throws "Missing Keycloak environment variables." on load.

### Docker dev (`docker-compose`)

Environment is passed via `docker-compose.yml` — no separate file needed:

```yaml
frontend:
  environment:
    VITE_ENGINE_URL: ${VITE_ENGINE_URL}
    VITE_KEYCLOAK_URL: ${VITE_KEYCLOAK_URL}
    VITE_NC_KC_REALM: ${VITE_NC_KC_REALM}
    VITE_NC_KC_CLIENT_ID: ${VITE_NC_KC_CLIENT_ID}
```

Values come from the root `.env` which Docker Compose reads automatically.

> **Why port 12001?** The engine (port 12000) has strict CORS filtering. The nginx proxy (port 12001) adds CORS headers. Always use 12001 for frontend API calls.

## Vite Configuration

Create `vite.config.ts`:

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: parseInt(process.env.FRONTEND_PORT || '5173'),
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
});
```

## TypeScript Configuration

Create `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": false,
    "noUnusedParameters": false,
    "noFallthroughCasesInSwitch": true,
    "types": ["vite/client", "node"],
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  },
  "include": ["src"]
}
```

### Vite Environment Types

Create `src/vite-env.d.ts`:

```typescript
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_NC_KC_REALM: string;
  readonly VITE_NC_KC_CLIENT_ID: string;
  readonly VITE_ENGINE_URL: string;
  readonly VITE_KEYCLOAK_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
```

## Generated API Client

### How API Client Generation Works

The TypeScript API client is generated from your compiled NPL protocols:

```bash
make generate-api
```

This outputs to `frontend/src/generated/`. **Do not edit files in `src/generated/`** — they are overwritten on every regeneration.

### Generated Structure

```
src/generated/
├── core/
│   ├── OpenAPI.ts            # OpenAPI configuration (BASE, TOKEN)
│   └── request.ts            # HTTP request handler
├── services/
│   └── DefaultService.ts     # All API methods
├── models/                   # TypeScript types for your protocols
└── index.ts
```

## ⚠️ CRITICAL: Use the Generated API Client

**Always use the generated `DefaultService` methods** — never construct `/npl/` paths manually.

```typescript
// ❌ WRONG - manual path construction
fetch('/npl/provenance/GoldBar/');

// ✅ CORRECT - use generated service methods
import { DefaultService } from './generated/services/DefaultService';
DefaultService.getGoldBarList({ pageSize: 25, includeCount: true });
DefaultService.getGoldBarById({ id: barId });
```

### Generated Client Pitfalls

- Do not assume wrapper class names like `GoldBarApi` exist — generated code exposes `DefaultService` only.
- Use generated field names exactly: `@id`, `@state`, `@actions`, flattened properties.
- For protocol creation, always include `@parties` in the request payload. With party automation in `rules.yml`, use an empty object: `"@parties": {}`.

---

## ⛔ CHECKPOINT: Verify API Client Before Component Development

**Before writing any page components, verify:**

```bash
ls frontend/src/generated/services/   # should contain DefaultService.ts
ls frontend/src/generated/models/     # should contain your protocol types
cd frontend && npm run build          # should compile without errors
```

Do not proceed to component guides until `src/generated/` is populated.

---

## ⚠️ CRITICAL: No Mock Data in Frontend

**ALL data displayed in the frontend MUST come from the backend API.**

```typescript
// ❌ FORBIDDEN
const mockItems = [{ id: '1', name: 'Example' }];
const items = apiResponse || [{ id: '1', name: 'Sample' }];

// ✅ CORRECT
const [items, setItems] = useState<Item[]>([]);
const [loading, setLoading] = useState(true);
const [error, setError] = useState<string | null>(null);

useEffect(() => {
  if (!authenticated) return;
  api.getItemList()
    .then((res) => setItems(res.items))
    .catch(() => setError('Failed to load data'))
    .finally(() => setLoading(false));
}, [api, authenticated]);
```

---

## ⚠️ CRITICAL: Keycloak AuthProvider

### Do NOT use `silentCheckSsoRedirectUri`

Keycloak 19+ sends a `frame-ancestors 'self'` Content Security Policy header that blocks the hidden iframe used by `silentCheckSsoRedirectUri`:

```
Framing 'http://host.docker.internal:11000/' violates Content Security Policy: "frame-ancestors 'self'"
```

Omit it entirely — keycloak-js falls back to a redirect-based check which works correctly.

### Correct `kc.init()` Configuration

```typescript
kc.init({
  onLoad: "check-sso",
  checkLoginIframe: false,
  pkceMethod: "S256"
  // ❌ NO silentCheckSsoRedirectUri
})
```

### Mandatory Guard: Fail Fast on Missing Config

Validate env vars before calling `new Keycloak(...)`:

```typescript
const keycloakUrl = import.meta.env.VITE_KEYCLOAK_URL;
const realm = import.meta.env.VITE_NC_KC_REALM;
const clientId = import.meta.env.VITE_NC_KC_CLIENT_ID;

if (!keycloakUrl || !realm || !clientId) {
  setConfigError("Missing Keycloak environment variables.");
  setLoading(false);
  return;
}
```

### Key Rules

1. **Always use `check-sso`** — never `login-required`
2. **Use `initializingRef`** — prevents React StrictMode from double-initializing Keycloak:
   ```typescript
   const initRef = useRef(false);
   useEffect(() => {
     if (initRef.current) return;
     initRef.current = true;
     // ... kc.init()
   }, []);
   ```
3. **Set `checkLoginIframe: false`**
4. **No `silentCheckSsoRedirectUri`**
5. **Fail fast on bad env** — never allow `undefined/protocol/openid-connect` redirects

---

## 🚨 CRITICAL: ServiceProvider — Token Injection

Every request to the engine must include `Authorization: Bearer <token>`. The generated `OpenAPI` object controls this via `BASE` and `TOKEN`.

### Rule 1: Set `OpenAPI.BASE` and `OpenAPI.TOKEN` at module level — NOT in `useEffect`

Setting them in `useEffect` causes a race condition: effects run after the first render, but child components may already have fired API calls. Set at module level so they are configured before any component renders:

```typescript
import type Keycloak from "keycloak-js";
import { OpenAPI } from "./generated/core/OpenAPI";
import { DefaultService } from "./generated/services/DefaultService";

let _keycloak: Keycloak | null = null;

OpenAPI.BASE = import.meta.env.VITE_ENGINE_URL || "http://localhost:12001";
OpenAPI.TOKEN = async () => {
  const kc = _keycloak;
  if (!kc?.authenticated) return "";
  try {
    await kc.updateToken(70);
  } catch {
    // keep current token if refresh fails
  }
  return kc.token || "";
};
```

### Rule 2: Update `_keycloak` synchronously in the render body — NOT in `useEffect`

React runs children's effects before parents'. If `ServiceProvider` updates `_keycloak` in a `useEffect`, child page components call the API before the parent has set the latest keycloak instance. Update it in the render body — parents always render before children:

```typescript
export function ServiceProvider({ children }: { children: ReactNode }) {
  const { keycloak } = useAuth();
  _keycloak = keycloak; // ✅ synchronous — runs before any child renders

  return (
    <ServicesContext.Provider value={{ api: DefaultService }}>
      {children}
    </ServicesContext.Provider>
  );
}
```

### Rule 3: Guard all page API calls behind `authenticated`

```typescript
const { authenticated } = useAuth();

useEffect(() => {
  if (!authenticated) return; // ✅ wait for auth
  api.getItemList().then(...);
}, [api, authenticated]);
```

Without this guard, the first render fires an unauthenticated request and the engine responds with `"No Authorization header found on request"`.

---

## Completion Checklist

- [ ] `frontend/.env` exists with `VITE_*` vars (local dev), or env set in `docker-compose.yml` (Docker dev)
- [ ] `VITE_KEYCLOAK_URL` uses `host.docker.internal`, not `localhost`
- [ ] `kc.init()` does not include `silentCheckSsoRedirectUri`
- [ ] `OpenAPI.BASE` and `OpenAPI.TOKEN` set at module level in `ServiceProvider.tsx`
- [ ] `_keycloak` updated in render body (not `useEffect`)
- [ ] All page API `useEffect` calls guarded with `if (!authenticated) return`
- [ ] Network tab shows `Authorization: Bearer ...` on all `/npl/` requests
- [ ] No 401 errors after login
- [ ] `make generate-api` run and `src/generated/` is populated

---

---

## Common Runtime Errors & Fixes

### `Property '@parties' not provided` (500 on protocol creation)

**Symptom:** Creating a protocol instance returns HTTP 500:
```json
{ "message": "Unknown exception: 'Property '@parties' not provided'" }
```

**Cause:** Every `POST` to create a protocol instance **must** include a `@parties` field in the request body, even when party automation (`rules.yml`) is configured to assign parties automatically.

**Fix:** Always pass `"@parties": {}` in the creation payload. The party automation fills it in from the JWT — the field must be present but can be empty:

```typescript
// ❌ WRONG — missing @parties
await api.createGoldBar({
  requestBody: { serialNumber: 'GB-001', weightGrams: 1000, ... }
});

// ✅ CORRECT — include @parties even with party automation
await api.createGoldBar({
  requestBody: {
    '@parties': {},          // required — party automation fills this from JWT
    serialNumber: 'GB-001',
    weightGrams: 1000,
    // ... other fields
  }
});
```

Check the generated `GoldBar_Create` model (in `src/generated/models/`) — it should include `@parties` as a field. If you are constructing the payload manually, always include it.

---

### `pageSize` must be at least 1 and at most 100 (400 on list)

**Symptom:** Fetching a protocol list returns HTTP 400:
```
IllegalArgumentException: `pageSize` must be at least 1 and at most 100.
```

**Cause:** The engine enforces a hard maximum of `pageSize=100`. Passing values higher than 100 (e.g. 200) will always fail.

**Fix:** Keep `pageSize` at 100 or below:

```typescript
// ❌ WRONG
api.getGoldBarList({ pageSize: 200, includeCount: true });

// ✅ CORRECT
api.getGoldBarList({ pageSize: 100, includeCount: true });
```

---

## Next Steps

Run `make generate-api` before writing any page components, then proceed in order:

1. [05-SIDEBAR-NAVIGATION.md](./05-SIDEBAR-NAVIGATION.md)
2. [06-ACTION-BUTTONS.md](./06-ACTION-BUTTONS.md)
3. [07-DETAIL-PAGES.md](./07-DETAIL-PAGES.md)
4. [08-OVERVIEW-PAGES.md](./08-OVERVIEW-PAGES.md)
5. [09-CREATION-FORMS.md](./09-CREATION-FORMS.md)
