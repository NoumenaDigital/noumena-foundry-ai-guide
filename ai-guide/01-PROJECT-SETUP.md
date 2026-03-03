# 01 - Project Setup

## Overview

This guide covers setting up the **complete application stack**, not just the frontend. This includes:
- Docker Compose configuration
- NPL engine setup
- Database configuration
- Makefile for deployment
- Environment variables
- All supporting services

## Project Structure

```
project-root/
├── docker-compose.yml          # All services
├── Makefile                    # Build and deployment commands
├── .env                        # Environment variables
├── npl/                        # NPL protocols
│   ├── Dockerfile
│   ├── pom.xml
│   └── src/main/
│       ├── npl-1.0/            # NPL source (versioned directory)
│       │   └── your-package/
│       ├── migration.yml       # Migration descriptor
│       └── rules.yml           # Party automation rules
├── frontend/                   # React frontend
│   ├── Dockerfile
│   ├── package.json
│   └── src/
├── keycloak-provisioning/      # Keycloak Terraform
│   ├── Dockerfile
│   ├── terraform.tf
│   └── providers.tf
├── keycloak/                   # Keycloak theme
│   └── theme/
├── nginx/                      # Nginx proxy
│   └── nginx.conf
├── db_init/                    # Database initialization
│   └── db_init.sh
└── rabbitmq/                   # RabbitMQ configuration
    └── Dockerfile
```

## .gitignore

Create a `.gitignore` file to exclude build artifacts and sensitive files:

**File:** `.gitignore`

```gitignore
target
.DS_Store
.idea
*.iml
.env
.env.local

/docs/jb*
/docs/struc*

npl-contrib
npl-contrib.properties
/context/
/frontend/node_modules/
/frontend/generated/
/frontend/src/generated/
/frontend/dist/
/.vscode/
node_modules

# Keycloak provisioning state
keycloak-provisioning/state.tfstate*
keycloak-provisioning/.terraform*
```

## Prerequisites

### Platform Version

**Always use the latest Noumena Platform version.** Check Maven Central for the current release:

- **Maven Central:** https://central.sonatype.com/artifact/com.noumenadigital.platform/npl-maven-plugin
- **Release Notes:** https://documentation.noumenadigital.com/releases/platform/

> ⚠️ **Important:** This guide uses `2025.2.6` as the current latest version. Always check Maven Central for newer releases before starting a new project.

### Maven

The NPL Maven plugin and all dependencies are available on **Maven Central**. No special authentication or custom repositories are required.

**Requirements:**
- Maven 3.6+ installed
- Java 17+ installed

**Verify Maven is installed:**
```bash
mvn --version
```

### Note on Maven Profiles

If you have existing Maven profiles in your `~/.m2/settings.xml` that add GitHub Packages repositories (e.g., `noumena-github`), you may encounter 401 Unauthorized errors. To resolve this, create a local `settings.xml` in your `npl/` directory:

**File:** `npl/settings.xml`
```xml
<?xml version="1.0" encoding="UTF-8"?>
<settings xmlns="http://maven.apache.org/SETTINGS/1.0.0"
          xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
          xsi:schemaLocation="http://maven.apache.org/SETTINGS/1.0.0 https://maven.apache.org/xsd/settings-1.0.0.xsd">
    <!-- Clean settings file that only uses Maven Central -->
    <pluginGroups>
        <pluginGroup>com.noumenadigital.platform</pluginGroup>
    </pluginGroups>
</settings>
```

Then build with:
```bash
cd npl && mvn package --settings settings.xml
```

This bypasses any global profiles and uses only Maven Central.

---

## Step 1: Create Docker Compose Configuration

**File:** `docker-compose.yml`

> **Important:** During project setup, `${VITE_NC_KC_REALM}` and `${VITE_NC_KC_CLIENT_ID}`
> placeholders in the template below are replaced with the **literal app slug** (e.g., `wine`).
> This means the Keycloak realm name and OIDC client ID are hardcoded into `docker-compose.yml`
> and do **not** need to be configured in `.env`. The Terraform provisioner receives the realm
> name via `TF_VAR_app_name`, which is also set to the literal app slug.

```yaml
volumes:
  keycloak-db: { }
  kc-provision-state: { }  # Terraform state for keycloak-provisioning (persists between restarts)

services:
  # NPL Engine
  engine:
    image: ghcr.io/noumenadigital/images/engine:${PLATFORM_VERSION}
    build:
      context: npl
    ports:
      - "12000:12000"
    environment:
      # CRITICAL: Engine dev mode MUST be false when using external Keycloak
      # When ENGINE_DEV_MODE=true, the engine runs an embedded OIDC server on port 11000
      # This conflicts with external Keycloak and causes JWKS verification failures
      ENGINE_DEV_MODE: ${DEV_MODE:-false}
      ENGINE_DB_URL: "jdbc:postgresql://engine-db:5432/engine"
      ENGINE_DB_USER: engine
      ENGINE_DB_PASSWORD: secret
      ENGINE_DB_HISTORY_USER: history
      ENGINE_DB_HISTORY_SCHEMA: history
      ENGINE_DB_READ_MODEL_USER: read-model
      ENGINE_DB_READ_MODEL_PASSWORD: secret
      # CRITICAL: Include both Docker network URL and localhost URL
      # Frontend (browser) uses localhost, but engine needs to accept both
      ENGINE_ALLOWED_ISSUERS: http://keycloak:11000/realms/${VITE_NC_KC_REALM},http://localhost:11000/realms/${VITE_NC_KC_REALM}
      SWAGGER_ENGINE_URL: http://localhost:12000
      SWAGGER_SECURITY_AUTH_URL: http://localhost:11000/realms/${VITE_NC_KC_REALM}
      SWAGGER_SECURITY_CLIENT_ID: ${VITE_NC_KC_CLIENT_ID}
      ENGINE_NPL_MIGRATION_RUN_ONLY: local
      FRONTEND_URL: ${FRONTEND_URL}
      AMQP_USERNAME: "${AMQP_USERNAME}"
      AMQP_PASSWORD: "${AMQP_PASSWORD}"
      AMQP_BROKER_URL: "amqp://${AMQP_HOST?}:${AMQP_PORT?}"
      AMQP_USE_SSL: "${AMQP_USE_SSL?}"
      AMQP_QUEUE_NAME: "/queues/${AMQP_ROOT_QUEUE_NAME}"
      AMQP_POLLING_PERIOD_SECONDS: 1
    depends_on:
      engine-db:
        condition: service_started
      keycloak:
        condition: service_healthy
      rabbitmq:
        condition: service_healthy
    healthcheck:
      # NOTE: Use wget, not curl - the engine container doesn't have curl installed
      test: ["CMD", "wget", "-q", "--spider", "http://localhost:12000/actuator/health"]
      interval: 10s
      timeout: 5s
      retries: 15
      start_period: 60s

  # History Service
  history:
    image: ghcr.io/noumenadigital/images/history:${PLATFORM_VERSION}
    ports:
      - "12010:12010"
      - "12711:12711"
    environment:
      HISTORY_DEV_MODE: ${DEV_MODE:-false}
      HISTORY_ADMIN_HOST: 0.0.0.0
      HISTORY_ADMIN_PORT: 12711
      HISTORY_DB_URL: "jdbc:postgresql://engine-db:5432/engine"
      HISTORY_DB_USER: history
      HISTORY_DB_PASSWORD: secret
      HISTORY_DB_SCHEMA: history
      HISTORY_DB_ENGINE_SCHEMA: noumena
      HISTORY_STARTUP_HEALTH_CHECK_ATTEMPTS: 10
    depends_on:
      engine-db:
        condition: service_started
      engine:
        condition: service_healthy

  # Read Model (GraphQL)
  read-model:
    image: ghcr.io/noumenadigital/images/read-model:latest
    ports:
      - "15000:15000"
    environment:
      READ_MODEL_PORT: 15000
      READ_MODEL_DB_URL: postgres://read-model:secret@engine-db:5432/engine
      READ_MODEL_DB_USER: read-model
      READ_MODEL_DB_SCHEMA: noumena
      READ_MODEL_TRUSTED_ISSUERS: "http://keycloak:11000/**"
      READ_MODEL_ENGINE_HEALTH_ENDPOINT: "http://engine:12000/actuator/health"
      READ_MODEL_ENGINE_HEALTH_TIMEOUT_SECONDS: 250
      READ_MODEL_ALLOWED_ISSUERS: >
       http://keycloak:11000/realms/${VITE_NC_KC_REALM},
       http://localhost:11000/realms/${VITE_NC_KC_REALM}
    depends_on:
      engine-db:
        condition: service_started
      keycloak:
        condition: service_healthy

  # Database
  engine-db:
    image: postgres:14.4-alpine
    mem_limit: 256m
    ports:
      - "5432:5432"
    environment:
      POSTGRES_DB: engine
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      ENGINE_DB_USER: engine
      ENGINE_DB_PASSWORD: secret
      HISTORY_DB_USER: history
      HISTORY_DB_PASSWORD: secret
      READ_MODEL_DB_USER: read-model
      READ_MODEL_DB_PASSWORD: secret
    volumes:
      - ./db_init/db_init.sh:/docker-entrypoint-initdb.d/db_init.sh
    healthcheck:
      test: pg_isready -U postgres
      interval: 1s
      timeout: 5s
      retries: 50

  # Keycloak Provisioning
  keycloak-provisioning:
    image: ghcr.io/noumenadigital/your-app/keycloak-provisioning:latest
    build:
      context: keycloak-provisioning
    env_file:
      - .env
    environment:
      KEYCLOAK_USER: ${KEYCLOAK_ADMIN}
      KEYCLOAK_PASSWORD: ${KEYCLOAK_ADMIN_PASSWORD}
      KEYCLOAK_URL: http://keycloak:11000
      TF_VAR_default_password: ${KC_INITIAL_USER_PASSWORD}
      TF_VAR_frontend_port: ${FRONTEND_PORT}
      TF_VAR_app_name: ${VITE_NC_KC_REALM}
    volumes:
      - kc-provision-state:/state  # Persist Terraform state between restarts
    depends_on:
      keycloak:
        condition: service_healthy

  # Keycloak
  # NOTE: Keycloak takes 10-30 seconds to start (database migrations, realm init).
  # The health check must include start_period to avoid premature failures.
  # CRITICAL for LOCAL DEVELOPMENT:
  #   - Use `start-dev` instead of `start` to disable HTTPS requirements
  #   - The admin console REQUIRES SSL disabled even with start-dev for the master realm
  #   - The provisioning script should disable SSL for master realm via API
  keycloak:
    image: ghcr.io/noumenadigital/packages/keycloak:latest
    build:
      context: keycloak
    # Use start-dev for local development (disables HTTPS requirements for most features)
    # For production, use 'start' with proper HTTPS/TLS configuration
    command: |
      start-dev
      --spi-events-listener-jboss-logging-success-level=info
      --spi-events-listener-jboss-logging-error-level=error
      --hostname-strict=false
      --health-enabled=true
      --http-enabled=true
      --metrics-enabled=true
      --db=postgres
    ports:
      - "11000:11000"
      - "9000:9000"
    environment:
      KEYCLOAK_ADMIN: ${KEYCLOAK_ADMIN}
      KEYCLOAK_ADMIN_PASSWORD: ${KEYCLOAK_ADMIN_PASSWORD}
      KC_DB_URL: jdbc:postgresql://keycloak-db/postgres
      KC_DB_USERNAME: postgres
      KC_DB_PASSWORD: testing
      KC_HEALTH_ENABLED: "true"
      KC_HTTP_ENABLED: "true"
      KC_HTTP_PORT: 11000
    depends_on:
      keycloak-db:
        condition: service_started
    # NOTE: Keycloak health check uses curl (installed via multi-stage build in Dockerfile)
    # Health endpoint is on port 11000, use localhost since check runs inside the container
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:11000/health/ready"]
      interval: 10s
      timeout: 5s
      retries: 30
      start_period: 60s

  # Keycloak Database
  keycloak-db:
    image: postgres:14.4-alpine
    mem_limit: 256m
    ports:
      - "11040:5432"
    volumes:
      - keycloak-db:/var/lib/postgresql/data
    environment:
      POSTGRES_PASSWORD: testing
    healthcheck:
      test: pg_isready -U postgres
      interval: 1s
      timeout: 5s
      retries: 50

  # RabbitMQ
  rabbitmq:
    image: ghcr.io/noumenadigital/your-app/rabbitmq:latest
    build:
      context: rabbitmq
    ports:
      - "15672:15672"
      - "5672:5672"
    environment:
      AMQP_QUEUE_NAME: "${AMQP_ROOT_QUEUE_NAME?}"
      AMQP_USERNAME: "${AMQP_USERNAME?}"
      AMQP_PASSWORD: "${AMQP_PASSWORD?}"
    user: rabbitmq
    healthcheck:
      test: rabbitmq-diagnostics ping
      interval: 3s
      timeout: 10s
      retries: 60

  # Nginx Proxy
  nginx-proxy:
    image: nginx:latest
    ports:
      - "12001:12001"  # Gateway: Engine + GraphQL routing with SSE support
      - "15001:15001"  # Direct GraphQL access for debugging
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
    depends_on:
      engine:
        condition: service_healthy
      read-model:
        condition: service_started

  # Frontend (production build served by nginx)
  frontend:
    build:
      context: frontend
      dockerfile: Dockerfile
      args:
        # CRITICAL: VITE_* vars are baked into the bundle at build time.
        # They MUST be passed as build args (not just environment vars).
        VITE_NC_KC_REALM: ${VITE_NC_KC_REALM:-winecellar}
        VITE_NC_KC_CLIENT_ID: ${VITE_NC_KC_CLIENT_ID:-winecellar}
        VITE_LOCAL_API_URL: http://localhost:12001
        VITE_LOCAL_KC_URL: ${VITE_KEYCLOAK_URL:-http://localhost:11000}
    ports:
      - "${FRONTEND_PORT:-5173}:80"
    depends_on:
      - engine
      - read-model
      - keycloak-provisioning
```

## Step 2: Create Environment Variables Template

**File:** `.env`

> **Note:** This `.env` file contains **local development variables**. Cloud deployment
> variables (e.g., `VITE_NC_ORG_NAME`, `NC_DOMAIN`, `VITE_CLOUD_AUTH_URL`) are **not** included
> here — they are set at deployment time by your CI/CD pipeline or deployment tool.
>
> **Keycloak realm and client ID** are hardcoded directly into `docker-compose.yml` during
> project setup (both equal the app slug). They do **not** need to be in `.env`.

```env
# Platform Version - Check Maven Central for the latest version:
# https://central.sonatype.com/artifact/com.noumenadigital.platform/npl-maven-plugin
PLATFORM_VERSION=2025.2.6

# Frontend Configuration
# Browser-accessible Keycloak URL (via Docker port mapping on localhost)
VITE_KEYCLOAK_URL=http://localhost:11000
# Use nginx proxy (12001) for CORS support, NOT direct engine (12000)
VITE_ENGINE_URL=http://localhost:12001
FRONTEND_PORT=5173
FRONTEND_URL=http://localhost:5173

# Keycloak Configuration
KEYCLOAK_ADMIN=admin
KEYCLOAK_ADMIN_PASSWORD=admin
KC_INITIAL_USER_PASSWORD=welcome

# RabbitMQ Configuration
AMQP_HOST=rabbitmq
AMQP_PORT=5672
AMQP_USERNAME=guest
AMQP_PASSWORD=guest
AMQP_USE_SSL=false
AMQP_ROOT_QUEUE_NAME=your-app-queue

# Development Mode
# WARNING: Set to false when using external Keycloak
# When DEV_MODE=true, the engine runs an embedded OIDC server on port 11000
# which conflicts with external Keycloak and causes JWKS verification failures
DEV_MODE=false
```

> **Cloud Deployment Variables** (added at deployment time for Noumena Cloud):
>
> ```env
> # ── Cloud Deployment (NOT used for local development) ──
> VITE_NC_ORG_NAME=your-org-name
> VITE_NC_APP_NAME=your-app-name
> VITE_NC_APP_SLUG=your-app-slug
> NC_DOMAIN=your-domain.com
> VITE_CLOUD_AUTH_URL=https://keycloak-your-org-your-app.noumena.cloud
> ```

> **Note:** No `/etc/hosts` entry is needed. Keycloak is configured with `--hostname-strict=false`
> and no explicit `--hostname`, so it dynamically uses the request's Host header. The browser
> accesses Keycloak via `localhost:11000` (Docker port mapping), and Keycloak responds with
> `localhost`-based URLs.

## Step 3: Create Makefile

**File:** `Makefile`

> **Note:** The Makefile includes cloud deployment targets (e.g., `clear-deploy`,
> `cloud-keycloak-provision-app`) that use cloud-only variables (`VITE_NC_ORG_NAME`,
> `NC_DOMAIN`, etc.). These variables are **not** present in the `.env` for local development —
> they are set at deployment time when deploying to Noumena Cloud.

```makefile
include .env

GITHUB_SHA=HEAD
MAVEN_CLI_OPTS?=--no-transfer-progress
CLI_OS_ARCH=npl_darwin_amd64
CLI_RELEASE_TAG=1.3.0

NC_APP_NAME_CLEAN := $(shell echo ${VITE_NC_APP_NAME} | tr -d '-' | tr -d '_')
NC_ORG := $(VITE_NC_ORG_NAME)
NC_APP := $(VITE_NC_APP_SLUG)

KEYCLOAK_URL=https://keycloak-$(VITE_NC_ORG_NAME)-$(NC_APP_NAME_CLEAN).$(NC_DOMAIN)
ENGINE_URL=https://engine-$(VITE_NC_ORG_NAME)-$(VITE_NC_APP_NAME).$(NC_DOMAIN)
READ_MODEL_URL=https://engine-$(VITE_NC_ORG_NAME)-$(VITE_NC_APP_NAME).$(NC_DOMAIN)/graphql
NPL_SOURCES=$(shell find npl/src/main -name \*npl)
OPENAPI_SOURCES=$(shell find npl/target -name \*openapi.yml)
TF_SOURCES=$(shell find keycloak-provisioning -name \*tf)

## Common commands
.PHONY: install
install: cli

.PHONY: clean
clean:
	docker compose down -v
	cd npl ; mvn $(MAVEN_CLI_OPTS) clean
	rm -rf **/target
	rm -rf target
	rm -rf **/node_modules
	rm -rf **/dist
	rm -rf **/build
	rm -rf **/generated
	rm -rf keycloak-provisioning/state.tfstate*
	rm -rf keycloak-provisioning/.terraform*
	rm -f cli
	rm -f *-openapi.yml

## NOUMENA CLOUD COMMANDS

cli:
	brew install NoumenaDigital/tools/npl
	@touch cli

.PHONY: clear-deploy
clear-deploy:
	@if [ -z "$(NC_APP)" ] ; then echo "App $(NC_APP) not found"; exit 1; fi
	cd npl && mvn clean install; cd -
	-npl cloud clear npl --tenant $(NC_ORG) --app $(NC_APP) || echo "App $(NC_APP) doesn't exist yet, continuing with deployment..."
	npl cloud deploy npl --tenant $(NC_ORG) --app $(NC_APP) --migration npl/src/main/migration.yml
	cd frontend && npm run build; cd -
	npl cloud deploy frontend --tenant $(NC_ORG) --app $(NC_APP) --frontend frontend/dist

.PHONY: cloud-keycloak-provision-app
cloud-keycloak-provision-app:
	docker compose build keycloak-provisioning
	-docker run --rm --network=host \
		-e KEYCLOAK_USER="$(KEYCLOAK_USER)" \
		-e KEYCLOAK_PASSWORD="$(KEYCLOAK_PASSWORD)" \
		-e KEYCLOAK_URL="$(VITE_CLOUD_AUTH_URL)" \
		-e TF_VAR_default_password="$(CLOUD_DEPLOYMENT_PWD)" \
		-e TF_VAR_login_theme=keycloak \
		-e TF_VAR_app_name=$(VITE_NC_KC_REALM) \
		ghcr.io/noumenadigital/your-app/keycloak-provisioning:latest

## NPL SECTION

.PHONY: npl-test
npl-test:
	cd npl ; mvn test

openapi.yml: $(NPL_SOURCES)
	cd npl ; mvn package

.PHONY: npl-docker
npl-docker: ensure-db-init-executable
	@if [ "$(SKIP_TESTS)" = "true" ]; then \
		echo "Skipping tests (SKIP_TESTS=true)"; \
		cd npl ; mvn package -DskipTests; \
	else \
		cd npl ; mvn package; \
	fi
	docker compose up -d --build keycloak-provisioning
	docker compose up --wait --build engine read-model nginx-proxy

## LOCAL DEVELOPMENT

# Ensure database init script is executable (required for PostgreSQL initialization)
.PHONY: ensure-db-init-executable
ensure-db-init-executable:
	chmod +x db_init/db_init.sh

.PHONY: up
up: ensure-db-init-executable npl-docker
	docker compose up -d frontend

.PHONY: down
down:
	docker compose down

# Use this when you need to reset database state (e.g., after NPL package changes)
.PHONY: reset
reset: ensure-db-init-executable
	docker compose down -v
	docker compose up --build -d

.PHONY: logs
logs:
	docker compose logs -f

## FRONTEND SECTION

.PHONY: frontend-install
frontend-install:
	cd frontend && npm install --include=dev

.PHONY: frontend-build
frontend-build:
	cd frontend && npm run build

.PHONY: frontend-dev
frontend-dev:
	cd frontend && npm run dev

# Generate TypeScript API client from OpenAPI specification
# 1. Generate OpenAPI YAML from compiled NPL protocols
# 2. Generate typed TypeScript client from the OpenAPI spec
.PHONY: generate-api
generate-api:
	cd npl && mvn package -q
	npx @openapitools/openapi-generator-cli generate \
		-g typescript-fetch \
		-i npl/target/*-openapi.yml \
		-o frontend/src/generated

.PHONY: frontend-generate-api
frontend-generate-api:
	docker run --rm -v $(PWD):/app -w /app node:20-alpine sh -c "npx @openapitools/openapi-generator-cli generate -g typescript-fetch -i npl/target/*-openapi.yml -o frontend/src/generated"
```

### Frontend Docker Setup

By default, `docker-compose.yml` runs the frontend in **production mode**:
- Builds static assets with `npm run build` (multi-stage Docker build)
- Serves via nginx on port 80 inside the container
- Mapped to `FRONTEND_PORT` (default 5173) on the host
- No source code mounting — optimized for deployment and Docker-in-Docker environments

**To start everything (backend + frontend):**
```bash
make up
```

**For local development with hot reload** (without Docker), run the Vite dev server directly:
```bash
make frontend-dev
# or
cd frontend && npm run dev
```

This starts Vite on your host machine with hot module replacement (HMR) for fast iteration.

### Frontend Production Dockerfile

**File:** `frontend/Dockerfile`

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app

# Build arguments for Vite environment variables
ARG VITE_KC_REALM
ARG VITE_KC_CLIENT_ID
ARG VITE_LOCAL_API_URL=http://localhost:12001
ARG VITE_LOCAL_KC_URL=http://localhost:11000
ARG VITE_DEPLOYMENT_TARGET=LOCAL

# Set environment variables for build
ENV VITE_KC_REALM=${VITE_KC_REALM}
ENV VITE_KC_CLIENT_ID=${VITE_KC_CLIENT_ID}
ENV VITE_LOCAL_API_URL=${VITE_LOCAL_API_URL}
ENV VITE_LOCAL_KC_URL=${VITE_LOCAL_KC_URL}
ENV VITE_DEPLOYMENT_TARGET=${VITE_DEPLOYMENT_TARGET}

# Copy only files needed for npm install for better caching
COPY package*.json ./
RUN npm install

# Copy the rest that change more frequently
COPY tsconfig*.json ./
COPY vite.config.ts ./
COPY index.html ./
COPY src/ ./src/
COPY public/ ./public/

# Write .env file for Vite to pick up via envDir: '../' (resolves to / in Docker).
# This ensures build args are always available to Vite regardless of Docker layer caching.
RUN printf "VITE_KC_REALM=%s\nVITE_KC_CLIENT_ID=%s\nVITE_LOCAL_API_URL=%s\nVITE_LOCAL_KC_URL=%s\nVITE_DEPLOYMENT_TARGET=%s\n" \
      "$VITE_KC_REALM" "$VITE_KC_CLIENT_ID" "$VITE_LOCAL_API_URL" "$VITE_LOCAL_KC_URL" "$VITE_DEPLOYMENT_TARGET" \
      > ../.env

# Build the app (Vite outputs to dist/)
RUN npm run build

# Production stage
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:80/health || exit 1

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

> **IMPORTANT:** Vite substitutes `import.meta.env.*` at **build time**, not runtime. The
> `VITE_*` variables must be passed as Docker build `args` in `docker-compose.yml` (not just
> `environment`). The `ARG`/`ENV` declarations above ensure they are available during
> `npm run build`. The `RUN printf ... > ../.env` step explicitly writes a `.env` file at the
> path Vite's `envDir: '../'` resolves to in Docker, guaranteeing the values survive Docker
> layer caching.

### Frontend Nginx Configuration

**File:** `frontend/nginx.conf`

This serves the built SPA with client-side routing support:

```nginx
server {
    listen 80;
    server_name localhost;
    root /usr/share/nginx/html;
    index index.html;

    # Gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;

    # Security headers
    # Note: X-Frame-Options removed to allow embedding in Foundry preview iframe.
    # Re-add for production deployments if needed.
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # SPA routing - serve index.html for all routes
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Health check
    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }
}
```

> **IMPORTANT:** Do NOT add `X-Frame-Options: SAMEORIGIN` or `X-Frame-Options: DENY` to the
> nginx config. The generated frontend must be embeddable in iframes for the Foundry preview
> to work. The Keycloak `security_defenses` block handles framing security at the auth level.

## Step 4: Create NPL Migration Files

The NPL engine requires migration files to load and compile your NPL protocols at runtime.

### Directory Structure

```
npl/
├── Dockerfile
├── pom.xml
└── src/main/
    ├── npl-1.0/           # NPL source directory (versioned as npl-1.0)
    │   └── your-package/
    │       └── *.npl
    ├── migration.yml      # Migration descriptor
    └── rules.yml          # Party automation rules
```

> ⚠️ **Important:** The NPL source directory must be named `npl-1.0` (not just `npl`). This versioned naming is required by the NPL migration system.

### Migration Descriptor

**File:** `npl/src/main/migration.yml`

```yaml
$schema: https://documentation.noumenadigital.com/schemas/migration-schema-v2.yml

changesets:
  - name: 1.0
    changes:
      - migrate:
          sources:
            - npl-1.0
          rules: rules.yml
```

### Party Automation Rules

**File:** `npl/src/main/rules.yml`

Party automation rules enable automatic assignment of parties based on claims from the user's authorization token.

> 📖 **For complete documentation on party automation, see [02a-PARTY-AUTOMATION.md](./02a-PARTY-AUTOMATION.md)**

**Quick reference:**
- Use `package.ProtocolName` format to identify the protocol
- Rule types: `extract` (from JWT), `set` (fixed), `require` (validation)
- Generally, only ONE `extract` per protocol (logged-in user assigned to one party)
- Combine automation with explicit `@parties` in frontend for variable parties

### NPL Dockerfile

**File:** `npl/Dockerfile`

```dockerfile
ARG PLATFORM_VERSION=2025.2.6
FROM ghcr.io/noumenadigital/images/engine:${PLATFORM_VERSION}

# Copy NPL source files and migration to /migrations (where the engine expects them)
# The engine compiles NPL at runtime
COPY src/main/npl-1.0 /migrations/npl-1.0
COPY src/main/migration.yml /migrations/migration.yml
COPY src/main/rules.yml /migrations/rules.yml
```

## Step 5: Create Database Initialization Script

**File:** `db_init/db_init.sh`

```bash
#!/bin/bash
set -e

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    CREATE USER engine WITH PASSWORD 'secret';
    CREATE USER history WITH PASSWORD 'secret';
    CREATE USER "read-model" WITH PASSWORD 'secret';
    
    GRANT ALL PRIVILEGES ON DATABASE engine TO engine;
    GRANT ALL PRIVILEGES ON DATABASE engine TO history;
    GRANT ALL PRIVILEGES ON DATABASE engine TO "read-model";
EOSQL
```

**Note:** The Makefile automatically ensures this script is executable before starting Docker services (via the `ensure-db-init-executable` target). No manual `chmod` is required when using `make up`, `make npl-docker`, or `make reset`.

## Step 6: Create Nginx Configuration

**File:** `nginx/nginx.conf`

**CRITICAL:** Nginx must handle CORS headers for the frontend to communicate with the engine. The frontend uses port 12001 (nginx) instead of port 12000 (direct engine) to avoid CORS issues.

```nginx
events {
    worker_connections 1024;
}

http {
    upstream engine {
        server engine:12000;
    }

    upstream read-model {
        server read-model:15000;
    }

    # Gateway: Engine + GraphQL with SSE support and CORS
    server {
        listen 12001;
        
        location / {
            # Handle CORS preflight requests
            if ($request_method = 'OPTIONS') {
                add_header 'Access-Control-Allow-Origin' '*' always;
                add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, PATCH, OPTIONS' always;
                add_header 'Access-Control-Allow-Headers' 'Authorization, Content-Type, Accept, X-Requested-With' always;
                add_header 'Access-Control-Max-Age' 86400;
                add_header 'Content-Length' 0;
                return 204;
            }
            
            proxy_pass http://engine;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            
            # CORS headers for all responses
            add_header 'Access-Control-Allow-Origin' '*' always;
            add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, PATCH, OPTIONS' always;
            add_header 'Access-Control-Allow-Headers' 'Authorization, Content-Type, Accept, X-Requested-With' always;
            
            # SSE support
            proxy_buffering off;
            proxy_cache off;
            proxy_read_timeout 24h;
        }
        
        location /graphql {
            # Handle CORS preflight for GraphQL
            if ($request_method = 'OPTIONS') {
                add_header 'Access-Control-Allow-Origin' '*' always;
                add_header 'Access-Control-Allow-Methods' 'GET, POST, OPTIONS' always;
                add_header 'Access-Control-Allow-Headers' 'Authorization, Content-Type, Accept' always;
                add_header 'Access-Control-Max-Age' 86400;
                return 204;
            }
            
            proxy_pass http://read-model/graphql;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            
            # CORS headers
            add_header 'Access-Control-Allow-Origin' '*' always;
            add_header 'Access-Control-Allow-Methods' 'GET, POST, OPTIONS' always;
            add_header 'Access-Control-Allow-Headers' 'Authorization, Content-Type, Accept' always;
            
            # SSE support
            proxy_buffering off;
            proxy_cache off;
            proxy_read_timeout 24h;
        }
    }

    # Direct GraphQL access for debugging
    server {
        listen 15001;
        
        location / {
            proxy_pass http://read-model;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
    }
}
```

## Step 7: Create RabbitMQ Configuration

### Dockerfile

**File:** `rabbitmq/Dockerfile`

```dockerfile
FROM rabbitmq:3-management-alpine

COPY etc/rabbitmq.conf /etc/rabbitmq/rabbitmq.conf
COPY etc/definitions.json /etc/rabbitmq/definitions.json
COPY scripts/entrypoint.sh /usr/local/bin/entrypoint.sh

RUN chmod +x /usr/local/bin/entrypoint.sh

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
CMD ["rabbitmq-server"]
```

### Definitions

**File:** `rabbitmq/etc/definitions.json`

> ⚠️ **Important:** Use `"password"` field, NOT `"password_hash"`. RabbitMQ 3.13+ will hash it automatically. Using `password_hash` with a plain text value causes: `{not_base64,<<"guest">>}`

```json
{
  "rabbit_version": "3.13.0",
  "users": [
    {
      "name": "guest",
      "password": "guest",
      "tags": ["administrator"]
    }
  ],
  "vhosts": [
    {
      "name": "/"
    }
  ],
  "permissions": [
    {
      "user": "guest",
      "vhost": "/",
      "configure": ".*",
      "write": ".*",
      "read": ".*"
    }
  ],
  "queues": [
    {
      "name": "your-queue-name",
      "vhost": "/",
      "durable": true,
      "auto_delete": false,
      "arguments": {}
    }
  ],
  "exchanges": [],
  "bindings": []
}
```

## Step 7.5: Create Keycloak Dockerfile

**File:** `keycloak/Dockerfile`

The Keycloak image is minimal/distroless and doesn't include package managers. We use a multi-stage build to install `curl` for the healthcheck:

```dockerfile
# Multi-stage build to install curl
FROM registry.access.redhat.com/ubi9/ubi-minimal:latest AS curl-builder
RUN microdnf install -y curl-minimal && microdnf clean all
# Copy curl and all its library dependencies
# All curl libraries are in /lib64/ in UBI9
RUN mkdir -p /output/usr/bin /output/lib64 && \
    cp /usr/bin/curl /output/usr/bin/ && \
    # Copy all curl dependencies from /lib64/
    # Use -L to follow symlinks and copy the actual files
    cp -L /lib64/libcurl.so.4* /output/lib64/ 2>/dev/null || true; \
    cp -L /lib64/libssl.so.3* /output/lib64/ 2>/dev/null || true; \
    cp -L /lib64/libcrypto.so.3* /output/lib64/ 2>/dev/null || true; \
    cp -L /lib64/libnghttp2.so.14* /output/lib64/ 2>/dev/null || true; \
    cp -L /lib64/libgssapi_krb5.so.2* /output/lib64/ 2>/dev/null || true; \
    cp -L /lib64/libkrb5.so.3* /output/lib64/ 2>/dev/null || true; \
    cp -L /lib64/libk5crypto.so.3* /output/lib64/ 2>/dev/null || true; \
    cp -L /lib64/libcom_err.so.2* /output/lib64/ 2>/dev/null || true; \
    cp -L /lib64/libkrb5support.so.0* /output/lib64/ 2>/dev/null || true; \
    cp -L /lib64/libkeyutils.so.1* /output/lib64/ 2>/dev/null || true; \
    cp -L /lib64/libpcre2-8.so.0* /output/lib64/ 2>/dev/null || true; \
    cp -L /lib64/libselinux.so.1* /output/lib64/ 2>/dev/null || true; \
    cp -L /lib64/libz.so.1* /output/lib64/ 2>/dev/null || true

FROM quay.io/keycloak/keycloak:24.0

# Copy curl and its dependencies from builder
USER root
COPY --from=curl-builder /output/usr/bin/curl /usr/bin/curl
COPY --from=curl-builder /output/lib64/ /lib64/
USER 1000

# No custom theme for MVP, use default Keycloak theme
# Custom themes can be added later following 13-KEYCLOAK-THEMING.md
```

**Why multi-stage build:**
- The Keycloak base image is minimal/distroless (no `microdnf`, `dnf`, `apt-get`, etc.)
- Cannot install packages directly in the Keycloak image
- Multi-stage build installs `curl-minimal` in UBI image, then copies it to Keycloak image
- Must copy ALL 13 curl library dependencies from `/lib64/` (not `/usr/lib64/`)
- Use `-L` flag with `cp` to follow symlinks and copy the actual library files

**Healthcheck configuration:**
With curl installed, the healthcheck uses the Keycloak health endpoint:
```yaml
healthcheck:
  test: ["CMD", "curl", "-f", "http://localhost:11000/health/ready"]
  interval: 10s
  timeout: 5s
  retries: 30
  start_period: 60s
```

**Important notes:**
- **Port:** Health endpoint is on port **11000** (HTTP port), NOT port 9000
- **Hostname:** Use `localhost` (not service name) because the health check runs **inside the container**
- **Endpoint:** Use `/health/ready` for readiness check (Keycloak 24.0+ standard)
- **Format:** Use array format `["CMD", "curl", "-f", "..."]` for better Docker compatibility
- **Flags:** `-f` flag makes curl fail on HTTP errors (returns non-zero exit code)
- **Timing:** `start_period: 60s` gives Keycloak time to start (database migrations, realm init)

## Step 8: Create NPL Project Structure

**File:** `npl/pom.xml`

```xml
<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 
         http://maven.apache.org/xsd/maven-4.0.0.xsd">
    <modelVersion>4.0.0</modelVersion>

    <groupId>com.yourcompany.yourapp</groupId>
    <artifactId>npl</artifactId>
    <version>1.0-SNAPSHOT</version>
    <packaging>jar</packaging>

    <properties>
        <maven.compiler.source>17</maven.compiler.source>
        <maven.compiler.target>17</maven.compiler.target>
        <project.build.sourceEncoding>UTF-8</project.build.sourceEncoding>
        <!-- Check Maven Central for the latest version: -->
        <!-- https://central.sonatype.com/artifact/com.noumenadigital.platform/npl-maven-plugin -->
        <noumena.platform.version>2025.2.6</noumena.platform.version>
    </properties>

    <!-- No explicit dependencies needed - the npl-maven-plugin handles NPL compilation -->
    <!-- All NPL artifacts are available on Maven Central -->

    <build>
        <plugins>
            <plugin>
                <groupId>com.noumenadigital.platform</groupId>
                <artifactId>npl-maven-plugin</artifactId>
                <version>${noumena.platform.version}</version>
                <configuration>
                    <!-- IMPORTANT: Point to npl-1.0 directory directly -->
                    <sources>${project.basedir}/src/main/npl-1.0</sources>
                </configuration>
                <executions>
                    <execution>
                        <id>compile-npl</id>
                        <goals>
                            <!-- IMPORTANT: Use npl-prefixed goals, NOT standard Maven goal names -->
                            <goal>npl-compile</goal>
                        </goals>
                    </execution>
                    <execution>
                        <id>generate-openapi</id>
                        <goals>
                            <goal>npl-api</goal>
                        </goals>
                    </execution>
                </executions>
            </plugin>
        </plugins>
    </build>

    <!-- No custom repositories needed - Maven Central is the default -->
</project>
```

### NPL Source Directory Structure

> ⚠️ **Important:** The NPL source directory **must be named `npl-1.0`** to match the migration.yml reference. Do NOT create a separate `npl/` directory - all source files go directly in `npl-1.0/`.

**Required structure:**
```
npl/
├── pom.xml
└── src/main/
    ├── npl-1.0/                # Versioned NPL source directory (required name)
    │   └── your-package/
    │       └── Protocol.npl
    ├── migration.yml           # References npl-1.0
    └── rules.yml               # Party automation rules
```

> ❌ **Common Mistake:** Do NOT create a separate `npl/` directory alongside `npl-1.0/`. There should only be `npl-1.0/`. Configure the Maven plugin to use `npl-1.0` directly via the `<sources>` configuration.

### NPL Maven Plugin Goals

The NPL Maven plugin uses **prefixed goal names**, not standard Maven goals. This is a common source of errors.

| Goal Name | Purpose |
|-----------|---------|
| `npl-compile` | Compile NPL protocols (NOT `compile`) |
| `npl-api` | Generate OpenAPI specification (NOT `generate-openapi`) |
| `npl-test` | Run NPL tests (NOT `test`) |
| `npl-codegen` | Generate code from protocols |
| `npl-puml` | Generate PlantUML diagrams |
| `npl-multigen` | Multi-target code generation |
| `npl-contrib` | Contrib utilities |
| `npl-test-compile` | Compile NPL test files |

⚠️ **Common Error**: Using `compile` instead of `npl-compile` will result in:
```
[ERROR] Could not find goal 'compile' in plugin com.noumenadigital.platform:npl-maven-plugin
```

**File:** `npl/src/main/migration.yml`

```yaml
databaseChangeLog:
  - changeSet:
      id: 1
      author: system
      changes:
        - sqlFile:
            path: npl-1.0/your-package/
            relativeToChangelogFile: true
```

## Step 9: Setup Instructions

1. **Create `.env` file** from the template above
2. **Update environment variables** with your values (defaults work for most local setups)
3. **Build NPL:**
   ```bash
   cd npl && mvn clean install
   ```
4. **Start services:**
   ```bash
   make up
   ```
5. **Verify services:**
   - Engine: http://localhost:12000/actuator/health
   - Keycloak: http://localhost:11000
   - Frontend: http://localhost:5173
   - GraphQL: http://localhost:15001/graphql

## Troubleshooting

> 💡 **For comprehensive troubleshooting**, see [14-TROUBLESHOOTING.md](./14-TROUBLESHOOTING.md).

### Engine Container Unhealthy

**Symptom:** `container coppersappnd-engine-1 is unhealthy`

**Common causes:**

1. **Health check uses curl:** The engine container doesn't have `curl` installed. Use `wget` instead:
   ```yaml
   healthcheck:
     test: ["CMD", "wget", "-q", "--spider", "http://localhost:12000/actuator/health"]
   ```

2. **Start period too short:** The engine needs time to compile NPL and run migrations. Ensure `start_period: 60s` or higher.

3. **Check the logs:** Run `docker compose logs engine --tail 100` to see actual errors.

### NPL Type Redefinition Error

**Symptom:** Engine fails with:
```
E0020: Attempt to redefine 'TypeName', already defined at 'file:/migrations/...'
```

**Cause:** The database contains migration state from a previous run with different NPL packages or type definitions.

**Fix:** Remove Docker volumes to clear database state:
```bash
docker compose down -v
docker compose up --build -d
```

> ⚠️ **When to use `docker compose down -v`:**
> - After renaming NPL packages
> - After reorganizing NPL type definitions
> - After significant changes to protocol structure
> - When seeing "redefinition" errors

### Maven Build Fails with "Not a directory: src/main/npl"

**Cause:** The NPL Maven plugin is not configured to use the correct source directory.

**Fix:** Configure the Maven plugin to use `npl-1.0` by adding the `<sources>` configuration in your `pom.xml`:
```xml
<plugin>
    <groupId>com.noumenadigital.platform</groupId>
    <artifactId>npl-maven-plugin</artifactId>
    <version>${noumena.platform.version}</version>
    <configuration>
        <sources>${project.basedir}/src/main/npl-1.0</sources>
    </configuration>
    <!-- ... executions ... -->
</plugin>
```

### Engine Fails with "migration.yml not found"

**Cause:** The migration.yml file is missing or not copied to the container.

**Fix:** Ensure the Dockerfile copies both the NPL sources and migration.yml:
```dockerfile
COPY src/main/npl-1.0 /migrations/npl-1.0
COPY src/main/migration.yml /migrations/migration.yml
```

### Keycloak Container Unhealthy

**Cause:** Keycloak takes 1-2 minutes to start (database migrations, realm initialization).

**Fix:** Use a generous `start_period` and a simple health check:
```yaml
healthcheck:
  test: ["CMD-SHELL", "exit 0"]
  start_period: 120s
```

### Keycloak Admin Console Shows "HTTPS Required"

**Symptom:** Accessing `http://localhost:11000/admin` shows "We are sorry... HTTPS required"

**Cause:** Even in development mode, the Keycloak **master realm** has SSL required by default.

**Fix (2 steps required):**

1. **Use `start-dev`** instead of `start` in docker-compose.yml:
```yaml
command: |
  start-dev
  --health-enabled=true
  --http-enabled=true
  --db=postgres
```

2. **Disable SSL for master realm** via Keycloak Admin CLI or API. Add this to your provisioning script:
```bash
# Get admin token
TOKEN_RESPONSE=$(curl -s -X POST "${KEYCLOAK_URL}/realms/master/protocol/openid-connect/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=admin" -d "password=admin" \
  -d "grant_type=password" -d "client_id=admin-cli")

ACCESS_TOKEN=$(echo "$TOKEN_RESPONSE" | sed 's/.*"access_token":"\([^"]*\)".*/\1/')

# Disable SSL for master realm
curl -s -X PUT "${KEYCLOAK_URL}/admin/realms/master" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"sslRequired": "none"}'
```

**Alternative:** Use the Keycloak CLI from within the container:
```bash
docker exec <keycloak-container> /opt/keycloak/bin/kcadm.sh \
  config credentials --server http://localhost:11000 --realm master --user admin --password admin

docker exec <keycloak-container> /opt/keycloak/bin/kcadm.sh \
  update realms/master -s sslRequired=NONE
```

### RabbitMQ Fails with "not_base64" Error

**Symptom:** `exit:{error,<<"{not_base64,<<\"guest\">>}">>}`

**Cause:** The `definitions.json` uses `password_hash` with a plain text password. RabbitMQ 3.13+ expects a properly hashed value.

**Fix:** Use `password` instead of `password_hash` in `definitions.json`:
```json
{
  "users": [
    {
      "name": "guest",
      "password": "guest",
      "tags": ["administrator"]
    }
  ]
}
```

RabbitMQ will hash the password automatically.

---

## Final Step: Test and Validate Application

### CRITICAL: Always Test After Building

After completing all infrastructure setup, you MUST test the application and fix any issues:

```bash
# Clean start - removes all containers and volumes, rebuilds, and starts
make clean up
```

### Monitor and Fix Until Healthy

**Watch the logs for errors:**
```bash
make logs
```

**If any service fails to start:**
1. Read the error message carefully
2. Fix the underlying issue (configuration, Dockerfile, code)
3. Run `make clean up` again
4. Repeat until ALL services are running and healthy

### Verification Checklist

Run `docker compose ps` and verify:

| Service | Status | Verification URL |
|---------|--------|-----------------|
| engine | healthy | http://localhost:12000/actuator/health |
| keycloak | healthy | http://localhost:11000 |
| engine-db | healthy | N/A (database) |
| keycloak-db | healthy | N/A (database) |
| rabbitmq | healthy | http://localhost:15672 |
| frontend | running | http://localhost:5173 |

**DO NOT proceed to the next phase until all services are healthy!**

### Quick Health Check Script

> **Note:** This script runs on the **host machine** where `curl` is available. Inside Docker containers, some images (like the NPL engine) may not have `curl` installed - use `wget` for container health checks if needed.

```bash
#!/bin/bash
echo "Checking services..."
curl -sf http://localhost:12000/actuator/health && echo "✅ Engine OK" || echo "❌ Engine FAILED"
curl -sf http://localhost:9000/health && echo "✅ Keycloak OK" || echo "❌ Keycloak FAILED"
curl -sf http://localhost:5173 && echo "✅ Frontend OK" || echo "❌ Frontend FAILED"
```

---

## Next Steps

Once the full application infrastructure is set up and ALL services are healthy, proceed to:
- [02-NPL-DEVELOPMENT.md](./02-NPL-DEVELOPMENT.md) - Develop NPL protocols with proper annotations

