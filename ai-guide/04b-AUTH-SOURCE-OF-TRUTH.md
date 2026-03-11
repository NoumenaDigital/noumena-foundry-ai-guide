# 04b - Auth Source of Truth

This document is the canonical authentication guidance for this repository.

When `04-FRONTEND-SETUP.md`, `04a-FRONTEND-LOGIN.md`, and `10-CODE-TEMPLATES.md` differ, follow this file.

## Scope

This guidance applies to the current stack in this repo:

- `keycloak-js` in the frontend
- generated OpenAPI client (`frontend/src/generated`)
- token injection through `OpenAPI.TOKEN`

## Canonical Rules

1. Use a single Keycloak host in local development:
   - `http://keycloak.localtest.me:11000`
2. Configure `kc.init()` with:
   - `onLoad: "check-sso"`
   - `checkLoginIframe: false`
   - `pkceMethod: "S256"`
3. Do not use `silentCheckSsoRedirectUri` in this repository.
4. Do not use `login-required` as the default init mode.
5. Set `OpenAPI.BASE` and `OpenAPI.TOKEN` at module level (not in `useEffect`).
6. Update the current keycloak reference synchronously before child effects run.
7. Guard page-level API calls with `if (!authenticated) return`.
8. Every `/npl/` request must include `Authorization: Bearer <token>`.

## Required Environment

`frontend/.env` must include:

```env
VITE_ENGINE_URL=http://localhost:12001
VITE_KEYCLOAK_URL=http://keycloak.localtest.me:11000
VITE_NC_KC_REALM=<realm>
VITE_NC_KC_CLIENT_ID=<client-id>
```

Use `http://localhost:12001` for API base (nginx proxy), not direct engine `12000`.

## Decision on Alternative Patterns

- The direct password-grant login flow in `04a-FRONTEND-LOGIN.md` is an optional local troubleshooting path, not the default.
- Axios interceptor patterns in templates are optional only when your app explicitly uses axios for API requests.
- For generated OpenAPI client usage in this repo, `OpenAPI.TOKEN` is mandatory and primary.

## Reconciliation Checklist

- [ ] `VITE_KEYCLOAK_URL` uses `keycloak.localtest.me`
- [ ] `AuthProvider` does not configure `silentCheckSsoRedirectUri`
- [ ] `AuthProvider` initializes once in React StrictMode (init ref guard)
- [ ] `ServiceProvider` sets `OpenAPI.BASE` and `OpenAPI.TOKEN` at module scope
- [ ] `ServiceProvider` updates keycloak reference synchronously (not in effect)
- [ ] Page fetch effects are auth-guarded
- [ ] Browser network shows `Authorization` header on `/npl/` requests
