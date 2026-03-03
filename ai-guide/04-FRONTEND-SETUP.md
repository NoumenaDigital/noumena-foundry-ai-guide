# 04 - Frontend Setup

## 🚨 CRITICAL PRINCIPLE: JWT Token Must Be Passed with ALL Backend Requests

**THIS IS A CORNER PRINCIPLE - NEVER FORGET THIS:**

**Every single API request to the backend MUST include the JWT bearer token in the Authorization header.**

Without the token, you will get:
- `401 Unauthorized` errors
- `503 Service Unavailable` errors  
- `"No Authorization header found on request"` errors

**The ServiceProvider MUST use an axios interceptor to automatically add `Authorization: Bearer <token>` to ALL requests.**

This is not optional. This is mandatory. See the "CRITICAL: API Authentication Headers" section below for implementation details.

---

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
│ ✅ Backend services running: make up                            │
└─────────────────────────────────────────────────────────────────┘
```

**If any of the above are not complete, STOP and complete Phase 1 first.**

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
├── public/
│   ├── silent-check-sso.html  # ⚠️ REQUIRED for Keycloak SSO
│   └── (other static assets)
└── src/
    ├── main.tsx                    # Entry point
    ├── App.tsx                     # Root component
    ├── Router.tsx                   # Route definitions
    ├── ServiceProvider.tsx         # API service provider
    ├── AuthProvider.tsx            # Authentication provider
    ├── theme.ts                    # Material-UI theme
    ├── vite-env.d.ts               # Vite environment types
    ├── components/
    │   ├── LandingPage.tsx         # Public landing page (outside AuthProvider)
    │   ├── shared/
    │   │   ├── AuthenticatedApp.tsx  # Auth wrapper for protected routes
    │   │   ├── Layout.tsx            # Main layout with sidebar
    │   │   ├── ProtectedRoute.tsx    # Route protection component
    │   │   └── ...                   # Other shared components
    │   ├── overview-pages/         # Overview table pages
    │   ├── detail-pages/           # Detail pages
    │   ├── creation-forms/         # Creation forms
    │   └── action-buttons/         # Action button library
    ├── hooks/                      # Custom React hooks
    ├── utils/                       # Utility functions
    ├── i18n/                        # Internationalization
    └── generated/                   # Auto-generated from OpenAPI
        ├── api.ts
        └── models/
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
    "@react-keycloak/web": "^3.4.0",
    "keycloak-js": "^23.0.0",
    "recharts": "^2.10.0",
    "react-i18next": "^13.5.0",
    "i18next": "^23.7.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "@typescript-eslint/eslint-plugin": "^6.13.0",
    "@typescript-eslint/parser": "^6.13.0",
    "@vitejs/plugin-react": "^4.2.0",
    "typescript": "^5.3.0",
    "vite": "^5.0.0",
    "eslint": "^8.54.0",
    "eslint-plugin-react": "^7.33.0",
    "eslint-plugin-react-hooks": "^4.6.0"
  }
}
```

## Environment Variables

**IMPORTANT:** When running in Docker, environment variables are passed via `docker-compose.yml`, not a `.env` file in the frontend folder. The root `.env` file is for Docker Compose substitution only.

### For Docker Development (Recommended)

Configure environment in `docker-compose.yml`:

> **Note:** `VITE_NC_KC_REALM` and `VITE_NC_KC_CLIENT_ID` are hardcoded to the app slug during
> project setup (e.g., `wine`). They do not reference `.env` variables.

```yaml
frontend:
  environment:
    # CRITICAL: Use nginx proxy (12001) for CORS support, NOT direct engine (12000)
    VITE_ENGINE_URL: http://localhost:12001
    VITE_KEYCLOAK_URL: ${VITE_KEYCLOAK_URL:-http://keycloak:11000}
    VITE_NC_KC_REALM: wine          # Hardcoded to app slug
    VITE_NC_KC_CLIENT_ID: wine      # Hardcoded to app slug
```

### For Local Development (without Docker)

Create a `.env` file in the `frontend/` directory:

```env
# API Configuration - Use nginx proxy for CORS support
VITE_ENGINE_URL=http://localhost:12001
# Browser-accessible Keycloak URL (via Docker port mapping on localhost)
VITE_KEYCLOAK_URL=http://localhost:11000
# Keycloak realm and client ID — must match the app slug
VITE_NC_KC_REALM=wine
VITE_NC_KC_CLIENT_ID=wine

# Frontend
FRONTEND_PORT=5173
```

> **Note:** No `/etc/hosts` entry is needed. Keycloak is configured with `--hostname-strict=false`
> and no explicit `--hostname`, so it dynamically uses the request's Host header. The browser
> accesses Keycloak via `localhost:11000` (Docker port mapping), and Keycloak responds with
> `localhost`-based URLs. No hostname resolution workaround is required.

### Why Port 12001 Instead of 12000?

The Noumena engine (port 12000) has strict CORS filtering that rejects cross-origin requests from the frontend. The nginx proxy (port 12001) adds proper CORS headers to all responses, allowing the frontend to communicate with the backend.

## Vite Configuration

Create `vite.config.ts`:

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: parseInt(process.env.FRONTEND_PORT || '5173'),
    proxy: {
      '/api': {
        target: process.env.VITE_ENGINE_URL || 'http://localhost:12000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
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
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

### Vite Environment Types

Create `src/vite-env.d.ts` to enable TypeScript support for `import.meta.env`:

```typescript
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_DEPLOYMENT_TARGET: string;
  readonly VITE_NC_ORG_NAME: string;
  readonly VITE_NC_APP_SLUG: string;
  readonly VITE_NC_KC_REALM: string;
  readonly VITE_ENGINE_URL: string;
  readonly VITE_KEYCLOAK_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
```

Also add `@types/node` to devDependencies in `package.json`:

```json
{
  "devDependencies": {
    "@types/node": "^20.10.0"
  }
}
```

## Generated API Client

### How API Client Generation Works

The TypeScript API client is generated from your compiled NPL protocols using two steps:

1. **Generate OpenAPI YAML** from NPL protocols using the NPL CLI:
   ```bash
   npl openapi --source-dir npl/src/main --output-dir npl/output
   ```

2. **Generate TypeScript fetch client** from the OpenAPI spec:
   ```bash
   npx @openapitools/openapi-generator-cli generate \
     -g typescript-fetch \
     -i npl/output/<package>-openapi.yml \
     -o frontend/src/generated
   ```

3. Output goes to `frontend/src/generated/`

> **Tip:** You can add a `generate-api` Makefile target to automate this (see [01-PROJECT-SETUP.md](./01-PROJECT-SETUP.md)).

### Generated Structure

The OpenAPI client is generated into `src/generated/`:

```
src/generated/
├── core/
│   ├── OpenAPI.ts            # OpenAPI configuration
│   └── request.ts            # HTTP request handler
├── services/
│   └── DefaultService.ts     # All API methods
├── models/
│   ├── index.ts             # All model exports
│   ├── ProtocolName.ts       # Protocol types
│   └── ...
└── index.ts
```

**Important:** The generated API client includes:
- TypeScript types for all protocols
- `actions` field in protocol responses (mapped from `@actions` in API)
- All `@api` permission methods

## ⚠️ CRITICAL: Use the Generated API Client

The API paths are defined by the OpenAPI specification generated from your NPL protocols. **Always use the generated `DefaultService` methods** rather than constructing paths manually.

### Why Use the Generated Client?

1. **Type Safety** - TypeScript types match your NPL protocol definitions
2. **Correct Paths** - The client knows the exact path format for each endpoint
3. **Authentication** - Works with the ServiceProvider's axios interceptor for auth headers
4. **No Guessing** - Path format is handled automatically

### Example Usage

```typescript
// ❌ WRONG - Manual path construction
const response = await axios.get('/npl/cooper/DogProfile/');

// ✅ CORRECT - Use generated service methods
import { DefaultService } from './generated/services/DefaultService';

const dogs = await DefaultService.getDogProfileList({ page: 1, pageSize: 100 });
const dog = await DefaultService.getDogProfileById({ id: dogId });
```

### Path Format Reference

For reference, the NPL Engine uses this path format internally:

```
/npl/{package}/{ProtocolName}/
```

But you should **never need to construct these paths manually** - the generated client handles this.

See [14-TROUBLESHOOTING.md](./14-TROUBLESHOOTING.md) for more details on API issues.

---

## ⛔ CHECKPOINT: Verify API Client Before Component Development

**Before proceeding to develop any frontend components (guides 05-09), you MUST verify:**

```bash
# 1. Check generated files exist
ls src/generated/
# ✅ Should see: api.ts (or similar API client file)

# 2. Check models were generated
ls src/generated/models/
# ✅ Should see TypeScript files for your protocols

# 3. Verify TypeScript compiles
npm run build
# ✅ Should complete without type errors
```

### ❌ DO NOT proceed to component development until:
- [ ] `src/generated/api.ts` exists
- [ ] `src/generated/models/` contains type definitions for your protocols
- [ ] `npm run build` completes without TypeScript errors

### Why This Matters

All frontend components (overview pages, detail pages, forms, action buttons) must:
- Import types from `src/generated/models/`
- Use API methods from `src/generated/api.ts`
- **NEVER use mock or hardcoded data**

If you try to develop components before the API client is generated:
- ❌ No type definitions available
- ❌ No API methods to call
- ❌ Forced to use forbidden mock data
- ❌ Will need complete rewrite when API client exists

---

## ⚠️ CRITICAL: No Mock Data in Frontend

**ALL data displayed in the frontend MUST come from the backend API.** This is a non-negotiable rule.

### Forbidden Patterns

```typescript
// ❌ FORBIDDEN - Hardcoded mock data
const mockDogs = [{ id: '1', name: 'Cooper', breed: 'Golden Retriever' }];

// ❌ FORBIDDEN - Fallback to fake data
const items = apiResponse || [{ id: '1', name: 'Sample' }];

// ❌ FORBIDDEN - Default values that look like real data
const [item, setItem] = useState({ name: 'Example', value: 42 });

// ❌ FORBIDDEN - Demo/sample data anywhere in components
const demoData = { ... };
```

### Required Patterns

```typescript
// ✅ CORRECT - Fetch from API with proper state handling
const [loading, setLoading] = useState(true);
const [items, setItems] = useState<Item[]>([]);
const [error, setError] = useState<string | null>(null);

useEffect(() => {
  fetchItems();
}, []);

const fetchItems = async () => {
  try {
    setLoading(true);
    const response = await services.api.getItemList();
    setItems(response.items || []);
  } catch (e) {
    setError('Failed to load data');
  } finally {
    setLoading(false);
  }
};

// ✅ CORRECT - Empty state when no data
if (items.length === 0) {
  return <EmptyState message="No items found. Create your first item." />;
}
```

### Acceptable Placeholders

- Form field placeholders: `placeholder="e.g., Example Name"` ✅
- Empty state messages: `"No items found"` ✅
- Loading indicators: `<CircularProgress />` ✅
- Error messages: `"Failed to load data"` ✅

### Why This Matters

1. **Data Integrity**: Mock data creates confusion about what's real vs fake
2. **Debugging**: Fake data masks API issues and makes debugging harder
3. **User Trust**: Users must see only their actual data
4. **Testing**: The app should fail obviously if the API is unreachable

## Initial Project Setup

1. **Initialize project:**
   ```bash
   npm init -y
   npm install (all dependencies from above)
   ```

2. **Create directory structure:**
   ```bash
   mkdir -p src/components/{shared,overview-pages,detail-pages,creation-forms,action-buttons}
   mkdir -p src/{hooks,utils,i18n,generated}
   ```

3. **Set up basic files:**
   - `src/main.tsx` - Entry point
   - `src/App.tsx` - Root component
   - `src/theme.ts` - Material-UI theme
   - `src/AuthProvider.tsx` - Keycloak authentication
   - `src/ServiceProvider.tsx` - API service provider

## ⚠️ CRITICAL: Keycloak Silent SSO File

**You MUST create the `silent-check-sso.html` file for proper SSO authentication.**

### Why This File is Required

When using `check-sso` authentication mode with `silentCheckSsoRedirectUri`, Keycloak uses this file for silent SSO checks. This file is **required** for proper authentication flow.

Without this file:
- ❌ Silent SSO check will fail
- ❌ Authentication redirect loops may occur
- ❌ Users will be redirected to login even when already authenticated

### File Location

**File:** `frontend/public/silent-check-sso.html`

This file must be placed in the `public/` directory so it's served as a static asset and accessible at the root URL path.

### File Content

Create `frontend/public/silent-check-sso.html` with this exact content:

```html
<!DOCTYPE html>
<html>
<head>
  <title>Silent Check SSO</title>
</head>
<body>
  <script>
    parent.postMessage(location.href, location.origin);
  </script>
</body>
</html>
```

### AuthProvider Configuration

> ⚠️ **CRITICAL:** Follow this exact configuration to avoid redirect loops.

In your `AuthProvider.tsx`, use these init options:

```typescript
// CRITICAL: Use 'check-sso' instead of 'login-required' to avoid redirect loops
// silentCheckSsoRedirectUri requires the silent-check-sso.html file in public/
kc.init({
  onLoad: 'check-sso',           // ✅ Never use 'login-required'
  checkLoginIframe: false,       // ✅ Set to false to avoid iframe issues
  pkceMethod: 'S256',
  silentCheckSsoRedirectUri: window.location.origin + '/silent-check-sso.html',
})
  .then((auth) => {
    if (auth) {
      // User is authenticated - set up token refresh
    } else {
      // CRITICAL: Login redirect happens HERE, not in a separate useEffect
      // This prevents redirect loops from effect re-runs
      kc.login({
        redirectUri: window.location.href,
      });
    }
  });
```

### Key Implementation Rules

1. **Use `initializingRef`** — Add a `useRef(false)` to prevent React StrictMode from initializing Keycloak twice:
   ```typescript
   const initializingRef = useRef(false);
   
   useEffect(() => {
     if (initializingRef.current) return;
     initializingRef.current = true;
     // ... Keycloak init code
   }, []);
   ```

2. **Never use `login-required`** — Always use `check-sso` mode

3. **Handle login in init callback** — Do NOT use a separate `useEffect` for login redirect. This is the #1 cause of redirect loops.

4. **Set `checkLoginIframe: false`** — Avoids iframe-related issues

5. **Use `silentCheckSsoRedirectUri`** — Points to the silent-check-sso.html file

### How It Works

1. Keycloak `init()` is called with `check-sso` mode
2. Keycloak checks if user is already authenticated (using the silent-check-sso.html file)
3. `init()` resolves with `auth = true` (authenticated) or `auth = false` (not authenticated)
4. If `auth = false`, we call `kc.login()` directly in the callback
5. User is redirected to Keycloak login page
6. After login, Keycloak redirects back to the app
7. `init()` is called again and resolves with `auth = true`

### Common Redirect Loop Causes

| Cause | Solution |
|-------|----------|
| Using `login-required` mode | Use `check-sso` instead |
| Login redirect in separate `useEffect` | Move login to init callback |
| React StrictMode double initialization | Use `initializingRef` guard |
| Missing `silent-check-sso.html` | Create the file in `public/` |
| `checkLoginIframe: true` with CORS issues | Set to `false` |

### Verification

After creating the file, verify it's accessible:

```bash
# In development (Vite)
curl http://localhost:5173/silent-check-sso.html

# Should return the HTML content
```

### Directory Structure

Your `frontend/public/` directory should look like this:

```
frontend/
├── public/
│   ├── silent-check-sso.html  # ✅ REQUIRED for SSO
│   └── (other static assets)
└── src/
    └── ...
```

## Landing Page (Required)

Every application needs a **public landing page** that users see before logging in. This page should:

1. Welcome users to the application
2. Provide a "Sign In" button that triggers Keycloak login
3. Show demo credentials (for development)

### Why Landing Page is Required

With `check-sso` authentication mode:
- The app checks if user is already logged in
- If not, it should display the landing page (NOT auto-redirect to Keycloak)
- User clicks "Sign In" to trigger authentication

### LandingPage Component

**File:** `src/components/LandingPage.tsx`

> ⚠️ **Important:** The LandingPage is **outside** the `AuthProvider` context, so it **cannot** use `useAuth()`. Instead, navigate to a protected route to trigger authentication.

```tsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Container,
  Typography,
  Paper,
  Stack,
  useTheme,
} from '@mui/material';
import PetsIcon from '@mui/icons-material/Pets';
import LoginIcon from '@mui/icons-material/Login';

/**
 * Public landing page - displayed before authentication.
 * 
 * This page is outside the AuthProvider context, so it cannot use useAuth().
 * Instead, it navigates to a protected route which triggers authentication.
 */
export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const theme = useTheme();

  const handleLogin = () => {
    // Navigate to a protected route - this will trigger authentication
    // via the AuthenticatedApp wrapper and ProtectedRoute
    navigate('/dashboard');
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: `linear-gradient(135deg, ${theme.palette.primary.dark} 0%, ${theme.palette.primary.main} 100%)`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Container maxWidth="sm">
        <Paper elevation={12} sx={{ p: 6, textAlign: 'center', borderRadius: 4 }}>
          <Stack spacing={4} alignItems="center">
            <PetsIcon sx={{ fontSize: 80, color: 'primary.main' }} />
            
            <Typography variant="h3" fontWeight="bold" color="primary">
              Your App Name
            </Typography>
            
            <Typography variant="body1" color="text.secondary">
              Your app description here.
            </Typography>

            <Button
              variant="contained"
              size="large"
              startIcon={<LoginIcon />}
              onClick={handleLogin}
              sx={{ px: 6, py: 1.5 }}
            >
              Sign In to Continue
            </Button>

            <Typography variant="caption" color="text.secondary">
              Demo: user@example.com / welcome
            </Typography>
          </Stack>
        </Paper>
      </Container>
    </Box>
  );
};
```

### main.tsx Structure

**File:** `src/main.tsx`

The entry point wraps the entire app with authentication providers. This ensures consistent auth state across all routes.

```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { ThemeProvider as MuiThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { RouterProvider } from 'react-router-dom';
import './index.css';
import './i18n';
import { createAppTheme } from './theme';
import { RuntimeConfigurationProvider } from './RuntimeConfigurationProvider';
import { AuthProvider } from './AuthProvider';
import { ServiceProvider } from './ServiceProvider';
import { UserProvider } from './UserProvider';
import { router } from './Router';
import { ThemeProvider, useColorMode } from './ThemeContext';
import { ErrorBoundary } from './components/shared/ErrorBoundary';

const ThemedApp = () => {
  const { colorMode } = useColorMode();
  const theme = createAppTheme(colorMode);
  
  return (
    <MuiThemeProvider theme={theme}>
      <CssBaseline />
      <RouterProvider router={router()} />
    </MuiThemeProvider>
  );
};

export const App = () => {
  return (
    <React.StrictMode>
      <ThemeProvider>
        <ThemedApp />
      </ThemeProvider>
    </React.StrictMode>
  );
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <ErrorBoundary>
    <RuntimeConfigurationProvider>
      <AuthProvider>
        <ServiceProvider>
          <UserProvider>
            <App />
          </UserProvider>
        </ServiceProvider>
      </AuthProvider>
    </RuntimeConfigurationProvider>
  </ErrorBoundary>
);
```

### Router Configuration

The router defines all application routes:

```tsx
import { createBrowserRouter } from 'react-router-dom';
import { LandingPage } from './components/LandingPage';
import Layout from './components/shared/Layout';
import { ProtectedRoute } from './components/shared/ProtectedRoute';
// ... import your pages

export const router = () => createBrowserRouter([
  // Public landing page
  {
    path: '/',
    element: <LandingPage />
  },
  
  // Protected routes with layout
  {
    element: <Layout />,
    children: [
      {
        path: '/dashboard',
        element: <ProtectedRoute><Dashboard /></ProtectedRoute>
      },
      // ... other protected routes
    ]
  }
]);
```

> **Note:** The `ProtectedRoute` component checks authentication and redirects to login if needed.

## 🚨 CRITICAL: API Authentication Headers - JWT Token Required

**THIS IS A CORNER PRINCIPLE - MANDATORY FOR ALL BACKEND REQUESTS**

**Every single API call to the backend MUST include the Authorization header with the JWT bearer token.**

### Why This Is Critical

The Noumena Engine requires authentication for all API requests. Without the JWT token:
- API calls will fail with `401 Unauthorized`
- API calls will fail with `503 Service Unavailable`
- You'll see errors like `"No Authorization header found on request"`
- The backend cannot identify the user or assign parties in NPL protocols

### Solution: Axios Interceptor in ServiceProvider

**The `ServiceProvider` MUST use an axios request interceptor to automatically add the Authorization header to ALL API requests.**

This is handled centrally so every API call includes the token - you never have to manually add headers in individual API calls.

**Implementation Requirements:**

1. **Use GLOBAL axios interceptor** — Intercepts ALL axios requests (not just ServiceProvider's api instance)
2. **Use a ref for keycloak** — Ensures the interceptor always has access to the current keycloak instance (`keycloakRef.current`)
3. **Auto token refresh** — Calls `kc.updateToken(70)` before each request to keep the token fresh
4. **Centralized** — Auth header logic is in ONE place, not duplicated in every API call
5. **Always add header** — Even if token refresh fails, use the existing token

**Code Pattern:**

```typescript
// In ServiceProvider.tsx
import axios from 'axios';

// CRITICAL: Add interceptor to GLOBAL axios instance
// This ensures ALL axios requests get the token
axios.interceptors.request.use(
  async (config) => {
    const kc = keycloakRef.current; // Use ref to get latest instance
    
    if (!kc || !kc.authenticated) {
      console.warn('[ServiceProvider] Keycloak not authenticated');
      return config;
    }
    
    try {
      // Refresh token if needed (within 70 seconds of expiry)
      await kc.updateToken(70);
      
      const token = kc.token;
      if (token) {
        // CRITICAL: Add Authorization header
        config.headers = config.headers || {};
        config.headers.Authorization = `Bearer ${token}`;
        console.log('[ServiceProvider] Authorization header added');
      }
    } catch (error) {
      // Even if refresh fails, try to use existing token
      const token = kc.token;
      if (token) {
        config.headers = config.headers || {};
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    
    return config;
  }
);
```

### Verification Checklist

After implementing, verify:
- [ ] Interceptor is added to global `axios` instance
- [ ] Interceptor uses `keycloakRef.current` (not direct `keycloak` prop)
- [ ] Token refresh is called before each request (`updateToken(70)`)
- [ ] Authorization header is set: `Authorization: Bearer <token>`
- [ ] Console logs show "Authorization header added" for each request
- [ ] Network tab shows `Authorization` header in request headers
- [ ] No 401/503 errors in API calls

### Common Mistakes

❌ **Wrong:** Adding headers manually in each API call
```typescript
// DON'T DO THIS - it's error-prone and easy to forget
api.get('/endpoint', { headers: { Authorization: `Bearer ${token}` } });
```

✅ **Correct:** Use interceptor (automatic for all requests)
```typescript
// DO THIS - interceptor handles it automatically
api.get('/endpoint'); // Token added automatically by interceptor
```

❌ **Wrong:** Using local axios instance interceptor only
```typescript
// DON'T DO THIS - only catches requests from this instance
api.interceptors.request.use(...);
```

✅ **Correct:** Use global axios interceptor
```typescript
// DO THIS - catches ALL axios requests
axios.interceptors.request.use(...);
```

See [10-CODE-TEMPLATES.md](./10-CODE-TEMPLATES.md) for the complete ServiceProvider implementation.

## Next Steps

### ⛔ STOP: Run `make up` Before Component Development

**Before proceeding to guides 05-09, you MUST start the system and generate the API client:**

```bash
# Start the full system (compiles NPL, generates API client, starts all services)
make up

# Verify API client was generated
ls frontend/src/generated/
# ✅ Should see: index.ts, models/, services/, core/
```

**❌ DO NOT proceed to component guides until `src/generated/` exists.**

### Then proceed to:
1. [05-SIDEBAR-NAVIGATION.md](./05-SIDEBAR-NAVIGATION.md) - Generate sidebar navigation
2. [06-ACTION-BUTTONS.md](./06-ACTION-BUTTONS.md) - Generate action buttons (BEFORE detail pages)
3. [07-DETAIL-PAGES.md](./07-DETAIL-PAGES.md) - Generate detail pages
4. [08-OVERVIEW-PAGES.md](./08-OVERVIEW-PAGES.md) - Generate overview pages
5. [09-CREATION-FORMS.md](./09-CREATION-FORMS.md) - Generate creation forms

