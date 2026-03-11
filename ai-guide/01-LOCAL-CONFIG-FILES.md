# 18 - Local Config Files (`.env`, `frontend/.env`, `npl.yml`)

This guide explains how to create the three local config files required for a working local setup:

- root `.env` (used by Docker Compose and Makefile)
- `frontend/.env` (used by Vite/frontend runtime)
- root `npl.yml` (used by NPL CLI deploy)

These files are required for local development and should be set up before running:

- `make infra`
- `make provision`
- `make npl-deploy`
- `make generate-api`

---

## 1) Create root `.env`

Create this file in repository root:

- `.env`

Use this template (replace placeholders for your use case):

```dotenv
PLATFORM_VERSION=2025.2.8
DEV_MODE=false

VITE_ENGINE_URL=http://localhost:12001
VITE_KEYCLOAK_URL=http://keycloak.localtest.me:11000
VITE_NC_KC_REALM=<app-realm-slug>
VITE_NC_KC_CLIENT_ID=<app-client-id>
FRONTEND_PORT=5173

KEYCLOAK_ADMIN=admin
KEYCLOAK_ADMIN_PASSWORD=admin
KC_INITIAL_USER_PASSWORD=welcome

AMQP_HOST=host.docker.internal
AMQP_PORT=5672
AMQP_USE_SSL=false
AMQP_USERNAME=guest
AMQP_PASSWORD=guest
AMQP_ROOT_QUEUE_NAME=noumena
```

### Why this file exists

- Docker Compose interpolates values like `${PLATFORM_VERSION}`, `${KEYCLOAK_ADMIN}`, `${AMQP_HOST}`.
- Without this file, `make infra`/`docker compose` fails with missing variable errors.

---

## 2) Create frontend `.env`

Create this file in frontend folder:

- `frontend/.env`

Use this template (replace placeholders for your use case):

```dotenv
VITE_ENGINE_URL=http://localhost:12001
VITE_KEYCLOAK_URL=http://keycloak.localtest.me:11000
VITE_NC_KC_REALM=<app-realm-slug>
VITE_NC_KC_CLIENT_ID=<app-client-id>
```

### Why this file exists

- Vite only reads env files from the frontend app folder.
- If this file is missing, login and API config fail in browser runtime.

---

## 3) Create root `npl.yml`

Create this file in repository root:

- `npl.yml`

Use this template (replace placeholders for your use case):

```yaml
structure:
  sourceDir: npl/src/main
  migration: npl/src/main/migration.yml

local:
  managementUrl: http://localhost:12400
  authUrl: http://keycloak.localtest.me:11000/realms/<app-realm-slug>
  username: <deployment-username>
  password: <deployment-password>
```

### Why this file exists

- `npl deploy` needs management endpoint, auth issuer URL, and credentials.
- Without `npl.yml`, CLI asks for missing `username`/`password`.

---


## 4) Common mistakes

- **Only creating `frontend/.env`**  
  Root `.env` is still required for Docker Compose.

- **Using `localhost` as `authUrl` in `npl.yml`**  
  Use `keycloak.localtest.me` so browser, CLI, and container issuer validation stay aligned.

- **Wrong deploy source in Makefile**  
  `npl deploy` must point to the parent folder containing `migration.yml` (typically `npl/src/main`).

- **Missing NPL CLI auth client in Keycloak**  
  `npl deploy` requires a Keycloak client with `client_id=paas` for password grant.
  If missing, you can get `Invalid client` / `Invalid client credentials`.
  Ensure `keycloak-provisioning/terraform.tf` provisions this client (see [03-KEYCLOAK-PROVISIONING.md](./03-KEYCLOAK-PROVISIONING.md)).

- **Using an outdated `migration.yml` structure**  
  Newer platform deployments expect migration schema v2 format with `$schema` and `migrate.sources`.
  If the structure is wrong, `npl deploy` can fail with errors like:
  - `required property 'name' not found`
  - `required property 'changes' not found`
  - `required property 'systemUnderAudit' not found`

  Use this working structure:

  ```yaml
  $schema: https://documentation.noumenadigital.com/schemas/migration-schema-v2.yml

  changesets:
    - name: 1.0.0
      changes:
        - migrate:
            sources:
              - npl-1.0
  ```

---

## 5) Security note

These files can contain credentials. Keep them for local development only and avoid committing sensitive real credentials.
