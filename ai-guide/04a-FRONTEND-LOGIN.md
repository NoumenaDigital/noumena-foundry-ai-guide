# 04a - Frontend Login (Copy/Paste Implementation Guide)

This file is a **from-scratch recipe** for implementing login in a new generated app with the same local architecture:

- Browser frontend: `http://localhost:5173`
- Engine API via nginx: `http://localhost:12001`
- Keycloak in Docker: `http://host.docker.internal:11000`

The approach below is intentionally explicit so an agent can execute it without guessing.

---

## 0) Why This Pattern

Use **direct token endpoint login** (password + refresh token) for local dev stability.

Do **not** rely on browser redirect login-actions for this stack, because mixed hostnames (`localhost` vs `host.docker.internal`) can cause intermittent Keycloak auth-cookie failures (`cookie_not_found`).

---

## 1) Required Config (must exist before frontend auth)

### 1.1 Root `.env` and `frontend/.env`

**CRITICAL:** Vite only reads `.env` files from its own working directory. The root `.env` is NOT read by `npm run dev`. You MUST create both files.

Root `.env`:

```env
VITE_NC_KC_REALM=goldprovenance
VITE_NC_KC_CLIENT_ID=goldprovenance
VITE_KEYCLOAK_URL=http://host.docker.internal:11000
VITE_ENGINE_URL=http://localhost:12001
KC_INITIAL_USER_PASSWORD=welcome
DEV_MODE=false
```

`frontend/.env` (required for local dev server — copy the VITE_ vars):

```env
VITE_NC_KC_REALM=goldprovenance
VITE_NC_KC_CLIENT_ID=goldprovenance
VITE_KEYCLOAK_URL=http://host.docker.internal:11000
VITE_ENGINE_URL=http://localhost:12001
```

Without `frontend/.env`, the app throws "Missing Keycloak environment variables." immediately on load.

### 1.2 `docker-compose.yml` (critical auth values)

Engine issuer allow-list:

```yaml
ENGINE_ALLOWED_ISSUERS: http://keycloak:11000/realms/${VITE_NC_KC_REALM},http://localhost:11000/realms/${VITE_NC_KC_REALM},http://host.docker.internal:11000/realms/${VITE_NC_KC_REALM}
```

Keycloak host identity:

```yaml
KC_HOSTNAME: host.docker.internal
KC_HOSTNAME_PORT: 11000
```

Important:

- Do **not** set `KC_SPI_COOKIE_DEFAULT_SAME_SITE_ATTRIBUTE` to `""`.
- Keep `DEV_MODE=false` for engine/history.

---

## 2) Files to Create/Update

Create:

- `frontend/src/auth/AuthProvider.tsx`
- `frontend/src/components/LoginPage.tsx`

Update:

- `frontend/src/main.tsx`
- `frontend/src/App.tsx`
- `frontend/src/services/apiClient.ts`
- `frontend/src/components/Layout.tsx`

---

## 3) Auth Provider (copy this)

Create `frontend/src/auth/AuthProvider.tsx`:

```tsx
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

type AuthStatus = "loading" | "authenticated" | "unauthenticated";

interface AuthContextValue {
  status: AuthStatus;
  accessToken: string;
  username: string;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const KEYCLOAK_URL = (import.meta.env.VITE_KEYCLOAK_URL ?? "http://host.docker.internal:11000").replace(/\/$/, "");
const KEYCLOAK_REALM = import.meta.env.VITE_NC_KC_REALM ?? "goldprovenance";
const KEYCLOAK_CLIENT_ID = import.meta.env.VITE_NC_KC_CLIENT_ID ?? "goldprovenance";
const STORAGE_KEY = "gp-auth-session";

interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
}

interface StoredSession {
  username: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

async function requestToken(payload: URLSearchParams): Promise<TokenResponse> {
  const response = await fetch(`${KEYCLOAK_URL}/realms/${KEYCLOAK_REALM}/protocol/openid-connect/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: payload,
  });

  if (!response.ok) {
    throw new Error("Invalid credentials or Keycloak unavailable");
  }

  return (await response.json()) as TokenResponse;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}

export function AuthProvider({ children }: { children: ReactNode }): ReactNode {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [accessToken, setAccessToken] = useState("");
  const [refreshToken, setRefreshToken] = useState("");
  const [username, setUsername] = useState("");
  const [expiresAt, setExpiresAt] = useState(0);

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      setStatus("unauthenticated");
      return;
    }
    try {
      const session = JSON.parse(raw) as StoredSession;
      setUsername(session.username);
      setAccessToken(session.accessToken);
      setRefreshToken(session.refreshToken);
      setExpiresAt(session.expiresAt);
      setStatus("authenticated");
    } catch {
      localStorage.removeItem(STORAGE_KEY);
      setStatus("unauthenticated");
    }
  }, []);

  useEffect(() => {
    if (status !== "authenticated") return;

    const interval = window.setInterval(async () => {
      const shouldRefresh = expiresAt > 0 && Date.now() > expiresAt - 60000 && !!refreshToken;
      if (!shouldRefresh) return;

      try {
        const token = await requestToken(
          new URLSearchParams({
            grant_type: "refresh_token",
            client_id: KEYCLOAK_CLIENT_ID,
            refresh_token: refreshToken,
          })
        );

        const nextRefresh = token.refresh_token ?? refreshToken;
        const nextExpiresAt = Date.now() + token.expires_in * 1000;

        setAccessToken(token.access_token);
        setRefreshToken(nextRefresh);
        setExpiresAt(nextExpiresAt);

        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({
            username,
            accessToken: token.access_token,
            refreshToken: nextRefresh,
            expiresAt: nextExpiresAt,
          } satisfies StoredSession)
        );
      } catch {
        setStatus("unauthenticated");
        setAccessToken("");
        setRefreshToken("");
        setExpiresAt(0);
        setUsername("");
        localStorage.removeItem(STORAGE_KEY);
      }
    }, 15000);

    return () => window.clearInterval(interval);
  }, [status, expiresAt, refreshToken, username]);

  const login = async (inputUsername: string, password: string): Promise<void> => {
    const normalizedUsername = inputUsername.trim();

    const token = await requestToken(
      new URLSearchParams({
        grant_type: "password",
        client_id: KEYCLOAK_CLIENT_ID,
        username: normalizedUsername,
        password,
      })
    );

    const nextExpiresAt = Date.now() + token.expires_in * 1000;
    const nextSession: StoredSession = {
      username: normalizedUsername,
      accessToken: token.access_token,
      refreshToken: token.refresh_token ?? "",
      expiresAt: nextExpiresAt,
    };

    setUsername(normalizedUsername);
    setAccessToken(token.access_token);
    setRefreshToken(token.refresh_token ?? "");
    setExpiresAt(nextExpiresAt);
    setStatus("authenticated");
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nextSession));
  };

  const logout = async (): Promise<void> => {
    setStatus("unauthenticated");
    setAccessToken("");
    setRefreshToken("");
    setExpiresAt(0);
    setUsername("");
    localStorage.removeItem(STORAGE_KEY);
  };

  const value = useMemo<AuthContextValue>(
    () => ({ status, accessToken, username, login, logout }),
    [status, accessToken, username]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
```

---

## 4) Login Page (use as template)

Create `frontend/src/components/LoginPage.tsx`:

```tsx
import { useState } from "react";
import { Alert, Box, Button, Paper, Stack, TextField, Typography } from "@mui/material";
import { useAuth } from "../auth/AuthProvider";
import noumenaLogo from "../../../noumena-styleguide/noumenalogo.svg";

export function LoginPage() {
  const { login } = useAuth();
  const [username, setUsername] = useState("client@goldprovenance.local");
  const [password, setPassword] = useState("welcome");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const onSubmit = async (): Promise<void> => {
    setSubmitting(true);
    setError("");
    try {
      await login(username, password);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Login failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box sx={{ minHeight: "100vh", display: "grid", placeItems: "center", px: 2, background: "linear-gradient(to bottom right, #111827, #120a4d)" }}>
      <Paper elevation={8} sx={{ width: "100%", maxWidth: 460, borderRadius: 3, p: 4 }}>
        <Stack spacing={2.5}>
          <img src={noumenaLogo} alt="Noumena Digital" style={{ width: "100%", maxWidth: 260 }} />
          <Typography variant="h5" fontWeight={700}>Gold Provenance</Typography>
          <Typography color="text.secondary">Sign in to manage and browse ESG-certified gold bars.</Typography>
          {error && <Alert severity="error">{error}</Alert>}
          <TextField label="Username" value={username} onChange={(e) => setUsername(e.target.value)} />
          <TextField label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          <Button variant="contained" size="large" disabled={submitting} onClick={() => void onSubmit()}>
            {submitting ? "Signing in..." : "Sign in"}
          </Button>
        </Stack>
      </Paper>
    </Box>
  );
}
```

---

## 5) Wire Auth into App

### 5.1 `frontend/src/main.tsx`

```tsx
import { AuthProvider } from "./auth/AuthProvider";

// inside root render:
<AppThemeProvider>
  <AuthProvider>
    <CssBaseline />
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </AuthProvider>
</AppThemeProvider>
```

### 5.2 `frontend/src/services/apiClient.ts`

```tsx
import { configureGeneratedApis } from "../generated/api";

const baseUrl = import.meta.env.VITE_ENGINE_URL ?? "http://localhost:12001";

export function configureApiClient(accessToken: string): void {
  configureGeneratedApis(baseUrl, accessToken);
}
```

### 5.3 `frontend/src/App.tsx`

**CRITICAL:** Call `configureApiClient` synchronously in the render body, not inside a `useEffect`. React runs children's effects before parents', so if you set the token in a `useEffect`, child components may fire API calls before the token is configured.

```tsx
import { Box, CircularProgress } from "@mui/material";
import { useAuth } from "./auth/AuthProvider";
import { configureApiClient } from "./services/apiClient";
import { LoginPage } from "./components/LoginPage";

export default function App() {
  const { status, accessToken } = useAuth();

  // ✅ Synchronous — runs during render, before any child renders or fires effects
  configureApiClient(accessToken);

  if (status === "loading") {
    return <Box sx={{ minHeight: "100vh", display: "grid", placeItems: "center" }}><CircularProgress /></Box>;
  }

  if (status !== "authenticated") return <LoginPage />;

  return (
    // existing protected app routes/layout
    <YourProtectedLayoutAndRoutes />
  );
}
```

### 5.4 `frontend/src/components/Layout.tsx`

Add logout action:

```tsx
const { username, logout } = useAuth();
<Button variant="outlined" size="small" onClick={() => void logout()}>
  {username || "Logout"}
</Button>
```

---

## 6) Token Injection Verification (non-negotiable)

Generated clients must set bearer token via `configureGeneratedApis(baseUrl, token)`.

Expected behavior in generated request files:

```ts
if (isStringWithValue(token)) {
  headers["Authorization"] = `Bearer ${token}`;
}
```

If this header is missing in browser network tab, backend auth will fail.

---



## 7) Common Mistakes to Avoid

- Using username with trailing whitespace (always trim input).
- Running redirect-based Keycloak browser login in this local mixed-host setup.
- Setting `KC_SPI_COOKIE_DEFAULT_SAME_SITE_ATTRIBUTE: ""`.
- Using `localhost` issuer for tokens while engine runs in Docker.
- Forgetting to call `configureApiClient(accessToken)` when token changes.

---

## 8) Production Note

This pattern is local/dev-focused. For production, use Authorization Code + PKCE with proper callback routes, secure cookies, strict redirect URIs, and no direct password grant in browser.

