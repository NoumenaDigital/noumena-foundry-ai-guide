# AI Guide for NPL Application Generation

This repository provides a comprehensive guide and tooling for generating complete full-stack applications from **NPL (NOUMENA Protocol Language)** protocols using AI assistance.

## Overview

This repository contains:
- **AI Guide** (`/ai-guide`) - Step-by-step documentation for generating NPL-based applications
- **Business Logic Template** (`BusinessLogic.template.md`) - Template for defining your application's business requirements
- **Build Agent** (`.cursor/agents/build_app.md`) - Cursor AI agent configuration for automated application generation

## Purpose

The goal is to **automatically generate a complete, production-ready application** by:
1. Defining your business logic in a `BusinessLogic.md` file (based on the template)
2. Using the Cursor AI agent (`build_app`) to follow the guide and generate all code
3. Following the sequential workflow to build backend (NPL), API client, and frontend

## Quick Start

### 1. Prerequisites

Before starting, ensure you have:
- ✅ Docker & Docker Compose
- ✅ Node.js (v20+)
- ✅ NPL CLI — `brew install NoumenaDigital/tools/npl` (verify: `npl version`)
- ✅ Make (optional but recommended)
- ✅ Checkout git submodules before starting work (required for agents):
  - `git submodule update --init --recursive --remote`

### 2. Create Your Business Logic

1. Copy `BusinessLogic.template.md` to `BusinessLogic.md` in your project root
2. Fill in the template with your application's:
   - Domain concepts and entities
   - Functional capabilities
   - Role model
   - Business rules

### 3. Use the Build Agent

1. The `build_app` agent is configured in `.cursor/agents/build_app.md`
2. The agent will:
   - Familiarize itself with the guide in `/ai-guide`
   - Use the guide to create an application based on your `BusinessLogic.md`

### 4. Follow the Sequential Workflow

The development **MUST** happen in strict sequential phases, which is described in 00-STEP-BY-STEP.md, here a summary:

```
┌─────────────────────────────────────────────────────────────┐
│  PHASE 1: BACKEND (NPL)                                     │
│  Create NPL protocols with @api annotations                 │
│  ⛔ STOP: Compile NPL → Verify OpenAPI exists               │
└─────────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│  PHASE 2: API CLIENT GENERATION                             │
│  Generate TypeScript client from OpenAPI                    │
│  ⛔ STOP: Verify api.ts and models/ exist                   │
└─────────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│  PHASE 3: FRONTEND DEVELOPMENT                              │
│  Develop React components using the GENERATED API client     │
└─────────────────────────────────────────────────────────────┘
```

**Why this order matters:**
- NPL protocols define your business logic and API structure
- OpenAPI specification is auto-generated from NPL during compilation
- TypeScript API client is generated from OpenAPI
- Frontend components MUST use the generated client (no mock data allowed)

## Repository Structure

```
noumena-foundry-ai-guide/
├── ai-guide/                          # Complete AI guide for NPL development
│   ├── 00-STEP-BY-STEP.md             # Complete workflow (start here)
│   ├── 01-LOCAL-CONFIG-FILES.md        # Local config files (.env, npl.yml)
│   ├── 02-NPL-DEVELOPMENT.md          # NPL protocol development
│   ├── 02a-PARTY-AUTOMATION.md        # Party automation rules
│   ├── 02b-NPL-TESTING.md             # NPL unit testing
│   ├── 02c-SPEC-TECHNICAL-REFERENCE.md # NPL type system reference
│   ├── 03-KEYCLOAK-PROVISIONING.md    # Keycloak role generation
│   ├── 03a-KEYCLOAK-THEMING.md        # Keycloak login theme
│   ├── 04-FRONTEND-SETUP.md           # Frontend project setup
│   ├── 04a-FRONTEND-LOGIN.md          # Frontend login (alternative)
│   ├── 04b-AUTH-SOURCE-OF-TRUTH.md    # Canonical auth guidance
│   ├── 06-ACTION-BUTTONS.md           # Action buttons
│   ├── 07-DETAIL-PAGES.md             # Detail pages
│   ├── 08-OVERVIEW-PAGES.md           # Overview pages
│   ├── 09-CREATION-FORMS.md           # Creation forms
│   ├── 10-CODE-TEMPLATES.md           # Code templates
│   ├── 12-LOCALIZATION.md             # Internationalization
│   ├── 14-TROUBLESHOOTING.md          # Troubleshooting guide
│   ├── 15-SEED-SCRIPTS.md             # Seed scripts (optional)
│   ├── 16-RESTYLING.md                # Visual polish (optional)
│   └── 17-CLOUD-DEPLOYMENT.md         # Cloud deployment (optional)
├── frontend/                          # Frontend scaffolding (React/TypeScript)
├── keycloak/                          # Keycloak Dockerfile and theme
├── keycloak-provisioning/             # Terraform provisioning for Keycloak
├── nginx/                             # Nginx proxy configuration
├── db_init/                           # Database initialization scripts
├── docker-compose.yml                 # Docker Compose for local development
├── Makefile                           # Build and run targets
├── BusinessLogic.template.md          # Template for business logic definition
├── .cursor/
│   └── agents/
│       └── build_app.md               # Cursor AI agent configuration
└── README.md                          # This file
```

## How It Works

### Step 1: Define Business Logic

Create a `BusinessLogic.md` file based on `BusinessLogic.template.md` that describes:
- **Core Domain Concepts** - Your main entities and their attributes
- **Functional Capabilities** - What the application can do
- **Role Model** - Who can do what (permissions and restrictions)
- **Business Rules** - Critical rules that must be enforced
- **Fit with NPL** - Why NPL is appropriate for this domain

### Step 2: Development

The `build_app` agent (configured in `.cursor/agents/build_app.md) will:
1. **Familiarize** itself with the guide in `/ai-guide`
2. **Read** your `BusinessLogic.md` file
3. **Follow** the guide sequentially to generate:
   - NPL protocols (with `@api` annotations)
   - Keycloak provisioning (roles and users)
   - Frontend setup (React/TypeScript project)
   - Frontend components (sidebar, overview pages, detail pages, forms, buttons)
   - Required features (i18n, Keycloak theming, theme toggle)

### Step 3: Manual Verification Steps

At key checkpoints, you must manually verify:

**After Phase 1 (Backend):**
```bash
npl check --source-dir npl/src/main/npl-1.0
npl openapi --source-dir npl/src/main/npl-1.0 --rules npl/src/main/rules.yml --output-dir npl/target
ls npl/target/  # Verify OpenAPI YAML exists
```

**After Phase 2 (API Client):**
```bash
ls frontend/src/generated/  # Verify api.ts and models/ exist
npm run build  # Verify TypeScript compiles
```

## What Gets Generated

### Automatic (System-Generated)
- ✅ **OpenAPI Specification** - From NPL protocols during compilation
- ✅ **TypeScript API Client** - From OpenAPI specification
- ✅ **Keycloak Roles** - From NPL protocol parties (can be automated)

### AI-Generated (Using This Guide)
- ✅ **NPL Protocols** - Business logic based on BusinessLogic.md
- ✅ **Infrastructure** - Docker Compose, Makefile, environment files
- ✅ **Frontend Components** - React components following the guide patterns
- ✅ **Keycloak Provisioning** - Terraform configuration for roles and users

## Complete Workflow

For a detailed step-by-step workflow, see:
- **[QUICK-START.md](./ai-guide/QUICK-START.md)** - Fast-track workflow (45-90 minutes)
- **[00-STEP-BY-STEP.md](./ai-guide/00-STEP-BY-STEP.md)** - Complete detailed workflow

## Key Technologies

### Backend
- **NPL (NOUMENA Protocol Language)** - Protocol definition
- **NPL Engine** - Executes protocols and generates API
- **PostgreSQL** - Database
- **Keycloak** - Authentication and authorization

### Frontend
- **React 18+** with TypeScript
- **Material-UI (MUI)** for components
- **React Router** for navigation
- **React Hook Form** for forms
- **Generated OpenAPI Client** for API calls

## Core Principles

1. **Protocol-Centric Architecture**
   - Overview page = One per protocol (table of instances)
   - Detail page = One per protocol instance (action buttons + variable display)
   - Creation form = One per protocol (based on protocol parameters)

2. **Backend Actions as Source of Truth**
   - Use `protocol.actions` field from API responses to determine button visibility
   - Never check `protocol.state` directly - backend already validates this
   - Never check user roles directly - backend already validates this

3. **Sequential Development**
   - Backend → API Client → Frontend (strict order)
   - No mock data allowed
   - All types come from generated API client

## Required Features (MUST IMPLEMENT)

These features are **REQUIRED** and must be implemented before the application is considered complete:

1. ✅ **CORS Configuration** - Via Nginx proxy (see [TROUBLESHOOTING.md](./ai-guide/14-TROUBLESHOOTING.md#52-cors-errors))
2. ✅ **Engine Allowed Issuers** - Configure for both Docker network and localhost
3. ✅ **Disable Engine Dev Mode** - Required for external Keycloak
4. ✅ **Keycloak Theme Customization** - See [03a-KEYCLOAK-THEMING.md](./ai-guide/03a-KEYCLOAK-THEMING.md)
5. ✅ **Internationalization (i18n)** - See [12-LOCALIZATION.md](./ai-guide/12-LOCALIZATION.md)
6. ✅ **Light/Dark Theme Toggle** - Material-UI theme switching

## Getting Help

### Documentation
- **[README.md](./ai-guide/README.md)** - Complete guide overview
- **[00-STEP-BY-STEP.md](./ai-guide/00-STEP-BY-STEP.md)** - Detailed Step by step guide 
- **[10-CODE-TEMPLATES.md](./ai-guide/10-CODE-TEMPLATES.md)** - All code templates
- **[14-TROUBLESHOOTING.md](./ai-guide/14-TROUBLESHOOTING.md)** - Common issues and solutions

### Common Issues
- **Docker services won't start** - Check ports are available
- **NPL check fails** - Check NPL syntax (`npl check --source-dir npl/src/main/npl-1.0`)
- **OpenAPI not generated** - Ensure `@api` annotations are present
- **Frontend build fails** - Check Node.js version, verify dependencies
- **Keycloak authentication fails** - Verify realm and client ID match
- **"Missing Keycloak environment variables"** - Vite does not read the root `.env`. Create `frontend/.env` with the `VITE_*` variables (see `04-FRONTEND-SETUP.md`)
- **CSP frame-ancestors error on login** - Do not use `silentCheckSsoRedirectUri` in `kc.init()`. Keycloak 19+ blocks iframes via CSP. See `04-FRONTEND-SETUP.md`
- **401 "No Authorization header" after login** - The generated `OpenAPI.BASE` and `OpenAPI.TOKEN` must be set at module level, not in `useEffect`. Page-level API calls must be guarded with `if (!authenticated) return`. See `04-FRONTEND-SETUP.md`
- **Keycloak provisioning shows empty logs / realm missing** - Run `make provision` after `make infra`. If Keycloak DB has stale data, wipe it: `docker compose stop keycloak keycloak-db && docker compose rm -f keycloak keycloak-db && docker volume rm <project>_keycloak-db <project>_kc-provision-state`, then restart and re-provision

## Example Usage

1. **Create BusinessLogic.md:**
   ```bash
   cp BusinessLogic.template.md BusinessLogic.md
   # Edit BusinessLogic.md with your domain requirements
   ```

2. **Use Cursor AI Agent:**
   - The `build_app` agent will automatically use the guide
   - It will read your `BusinessLogic.md` and generate the application

3. **Follow Checkpoints:**
   - After backend: Compile NPL and verify OpenAPI
   - After API client: Verify generated files exist
   - Then proceed to frontend development

## Result

A **complete, production-ready application** with:
- ✅ Full backend infrastructure (Docker Compose, services)
- ✅ NPL protocols with business logic
- ✅ Automatic role-based access control (Keycloak)
- ✅ Complete frontend with all patterns
- ✅ Consistent UI/UX
- ✅ Real-time updates
- ✅ Proper error handling
- ✅ Internationalization
- ✅ Custom Keycloak theme

All generated from your `BusinessLogic.md` file and this guide!

### Out-of-Box First Run (Agent Runbook)

Use this exact sequence from repository root:

1. Start core infrastructure:
   - `make infra`
2. Run one-shot Keycloak provisioning (expected terminal result: success, container exits):
   - `make provision`
3. Build/deploy NPL package:
   - `make npl-deploy`
4. Generate frontend API client:
   - `make generate-api`
5. Start frontend:
   - `make frontend`
6. Verify auth + protected API:
   - `make verify-auth`

One-command path (runs full flow including auth verification):
- `make up`

### Expected Container States

After successful setup, `docker compose ps` should show:
- `engine` healthy
- `keycloak` healthy
- `nginx-proxy` running
- `keycloak-provisioning` `Exited (0)` (this is expected for one-shot provisioning)

### Run Sequence (strict phase order)

1. Infrastructure + provisioning:
   - `make infra`
   - `make provision`
2. Backend deploy + API generation:
   - `make npl-deploy`
   - `make generate-api`
3. Frontend + auth verification:
   - `make frontend`
   - `make verify-auth`

