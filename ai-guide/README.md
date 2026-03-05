# AI Application Generation Guide for NPL-Based Applications

## Overview

This guide provides a **complete, step-by-step pattern** for generating a full-stack application from NPL (NOUMENA Protocol Language) protocols.

## ⚠️ CRITICAL: Sequential Development Workflow

**The development MUST happen in strict sequential phases.** Each phase depends on the output of the previous phase. **DO NOT skip ahead or work on multiple phases in parallel.**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  PHASE 1: BACKEND (NPL)                                                     │
│  ─────────────────────                                                      │
│  Create NPL protocols with @api annotations                                 │
│                           ↓                                                 │
│                    ══════════════                                           │
│                    ║ STOP HERE ║  Compile NPL: cd npl && mvn package        │
│                    ══════════════  Verify: ls target/generated-sources/     │
│                           ↓                                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│  PHASE 2: API CLIENT GENERATION                                             │
│  ──────────────────────────────                                             │
│  Generate TypeScript client from OpenAPI specification                      │
│                           ↓                                                 │
│                    ══════════════                                           │
│                    ║ STOP HERE ║  Verify: ls frontend/src/generated/        │
│                    ══════════════  Ensure api.ts and models/ exist          │
│                           ↓                                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│  PHASE 3: FRONTEND DEVELOPMENT                                              │
│  ─────────────────────────────                                              │
│  Now develop frontend components using the GENERATED API client             │
│  Import from: frontend/src/generated/api.ts                                 │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Why This Order Matters

1. **NPL protocols** define your business logic and API structure
2. **OpenAPI specification** is auto-generated from NPL during compilation
3. **TypeScript API client** is generated from OpenAPI - provides types and methods
4. **Frontend components** MUST use the generated client - no mock data allowed

**If you try to develop frontend before generating the API client, you will:**
- ❌ Have no type definitions for your protocols
- ❌ Have no API methods to call
- ❌ Be forced to use mock data (which is FORBIDDEN)
- ❌ Have to rewrite everything when the real API is available

## Guide Structure

Follow the guides in **numerical order** for a complete application:

### Phase 0: Scripts Generation (First Step!)
- **[00-SCRIPTS-GENERATION.md](./00-SCRIPTS-GENERATION.md)** - Build scripts generation
  - Generate project-specific scripts from BusinessLogic.md
  - Progress monitoring script
  - Prompt generator script
  - Must be done BEFORE any other step

### Phase 1: Project Setup
- **[01-PROJECT-SETUP.md](./01-PROJECT-SETUP.md)** - Complete application infrastructure
  - Docker Compose configuration
  - Makefile for build/deployment
  - Environment variables
  - All supporting services (engine, database, Keycloak, RabbitMQ, Nginx)

### Phase 2: NPL Development (Backend)
- **[02-NPL-DEVELOPMENT.md](./02-NPL-DEVELOPMENT.md)** - NPL protocol development
  - Protocol structure and best practices
  - Party declarations (for Keycloak roles)
  - `@api` annotations (for API generation)
  - `@frontend` comments (for UI generation)
  - State management patterns

- **[02a-PARTY-AUTOMATION.md](./02a-PARTY-AUTOMATION.md)** - Party automation rules
  - Automatic party assignment from JWT claims
  - Rule types: extract, set, require
  - Combining automation with explicit @parties
  - Frontend integration patterns
  - Common patterns and best practices

- **[02b-NPL-TESTING.md](./02b-NPL-TESTING.md)** - NPL unit testing
  - Test file organization
  - Test syntax and assertions
  - Running tests with Maven

- **[03-KEYCLOAK-PROVISIONING.md](./03-KEYCLOAK-PROVISIONING.md)** - Automatic role generation
  - Extract parties from NPL protocols
  - Generate Keycloak roles automatically
  - Create users for each role
  - Use context from NPL generation prompt

### Phase 3: Frontend Setup
- **[04-FRONTEND-SETUP.md](./04-FRONTEND-SETUP.md)** - Frontend project initialization
  - Dependencies and configuration
  - Project structure
  - TypeScript setup
  - Vite configuration

### Phase 4: Frontend Generation
- **[05-SIDEBAR-NAVIGATION.md](./05-SIDEBAR-NAVIGATION.md)** - Collapsible sidebar navigation
  - Protocol-based menu structure
  - Collapsible sections and sidebar
  - Role-based visibility
  - Responsive design
- **[06-OVERVIEW-PAGES.md](./06-OVERVIEW-PAGES.md)** - Table pattern with creation buttons
- **[07-DETAIL-PAGES.md](./07-DETAIL-PAGES.md)** - Action buttons + organized variable display
- **[08-CREATION-FORMS.md](./08-CREATION-FORMS.md)** - Form generation from protocol parameters
- **[09-ACTION-BUTTONS.md](./09-ACTION-BUTTONS.md)** - Centralized button components

### Phase 5: Reference & Templates
- **[10-CODE-TEMPLATES.md](./10-CODE-TEMPLATES.md)** - Complete code templates
- **[11-STEP-BY-STEP.md](./11-STEP-BY-STEP.md)** - Complete generation workflow

### Phase 6: Additional Features
- **[12-LOCALIZATION.md](./12-LOCALIZATION.md)** - Internationalization (i18n)
  - react-i18next setup
  - Translation file structure
  - Language switcher component
  - Multi-language support
- **[13-KEYCLOAK-THEMING.md](./13-KEYCLOAK-THEMING.md)** - Keycloak login theme customization
  - Custom theme structure
  - CSS styling
  - Template customization
  - Branding and design

### Phase 7: Troubleshooting
- **[14-TROUBLESHOOTING.md](./14-TROUBLESHOOTING.md)** - Common issues and solutions
  - NPL reserved keywords and compilation errors
  - Docker volume and database state issues
  - API path format (`/npl/package/Protocol/`)
  - Keycloak SSL and provisioning issues
  - Frontend API integration problems

### Phase 8: Optional Features (Client Request Only)
- **[15-SEED-SCRIPTS.md](./15-SEED-SCRIPTS.md)** - Seed scripts generation
  - ⚠️ **ONLY generate when client explicitly requests**
  - Sample data for development and testing
  - Seed script structure and best practices
  - Integration with NOUMENA-ONE
- **[16-CLOUD-DEPLOYMENT.md](./16-CLOUD-DEPLOYMENT.md)** - Noumena Cloud deployment
  - ⚠️ **ONLY generate when client explicitly requests**
  - Deploy NPL protocols to Noumena Cloud
  - Deploy frontend to Noumena Cloud
  - Cloud deployment workflow and configuration

## Complete Workflow (MUST Follow in Order)

### 🔷 PHASE 1: Infrastructure & Backend

#### Step 1: Setup Project Infrastructure
1. Follow [01-PROJECT-SETUP.md](./01-PROJECT-SETUP.md)
2. Create Docker Compose, Makefile, environment variables
3. Verify all services can start

#### Step 2: Develop NPL Protocols
1. Follow [02-NPL-DEVELOPMENT.md](./02-NPL-DEVELOPMENT.md)
2. Write NPL protocols with `@api` annotations
3. Add `@frontend` comments for UI generation
4. Define parties for role-based access

#### Step 3: Generate Keycloak Roles
1. Follow [03-KEYCLOAK-PROVISIONING.md](./03-KEYCLOAK-PROVISIONING.md)
2. Extract parties from NPL protocols
3. Generate Terraform configuration
4. Provision Keycloak with roles and users

---

### ⛔ STOP: Compile Backend & Generate OpenAPI

**Before proceeding to frontend, you MUST:**

```bash
# 1. Compile NPL and generate OpenAPI specification
cd npl && mvn package

# 2. Verify OpenAPI was generated
ls target/generated-sources/openapi/
# Should see: *-openapi.yml files

# 3. Start backend services to verify everything works
cd .. && make up
```

**DO NOT proceed to Phase 2 until:**
- ✅ NPL compiles without errors
- ✅ OpenAPI specification files exist in `npl/target/generated-sources/openapi/`
- ✅ Backend services start successfully

---

### 🔷 PHASE 2: Frontend API Client Generation

#### Step 4: Setup Frontend Project Structure
1. Follow [04-FRONTEND-SETUP.md](./04-FRONTEND-SETUP.md)
2. Initialize React/TypeScript project
3. Configure dependencies and services

#### Step 5: Generate TypeScript API Client

Generate the TypeScript API client from your compiled NPL protocols:

```bash
make generate-api
```

This uses the NPL CLI to produce the OpenAPI spec, then `openapi-generator-cli` to generate the typed TypeScript fetch client into `frontend/src/generated/`.

---

### ⛔ STOP: Verify API Client Exists

**Before proceeding to frontend development, you MUST:**

```bash
# Verify generated files exist
ls frontend/src/generated/
# Should see: api.ts, models/, etc.

# Verify TypeScript compiles
cd frontend && npm run build
```

**DO NOT proceed to Phase 3 until:**
- ✅ `frontend/src/generated/api.ts` exists
- ✅ `frontend/src/generated/models/` directory exists with type definitions
- ✅ TypeScript compiles without errors

---

### 🔷 PHASE 3: Frontend Development

**Now and ONLY now can you develop frontend components.**

#### Step 6: Generate Frontend Components
1. Follow [05-SIDEBAR-NAVIGATION.md](./05-SIDEBAR-NAVIGATION.md) - Generate collapsible sidebar
2. Follow [06-OVERVIEW-PAGES.md](./06-OVERVIEW-PAGES.md) - Generate overview tables
3. Follow [07-DETAIL-PAGES.md](./07-DETAIL-PAGES.md) - Generate detail pages
4. Follow [08-CREATION-FORMS.md](./08-CREATION-FORMS.md) - Generate creation forms
5. Follow [09-ACTION-BUTTONS.md](./09-ACTION-BUTTONS.md) - Generate action buttons

**All frontend components MUST:**
- Import types from `frontend/src/generated/models/`
- Use API methods from `frontend/src/generated/api.ts`
- ❌ NEVER use mock or hardcoded data

#### Step 7: Reference & Complete
- Use [10-CODE-TEMPLATES.md](./10-CODE-TEMPLATES.md) for code examples
- Follow [11-STEP-BY-STEP.md](./11-STEP-BY-STEP.md) as a complete checklist

#### Step 8: Required Features (MUST IMPLEMENT)
- Follow [12-LOCALIZATION.md](./12-LOCALIZATION.md) - Set up internationalization (i18n)
- **⚠️ MANDATORY:** Follow [03a-KEYCLOAK-THEMING.md](./03a-KEYCLOAK-THEMING.md) - **You MUST create a custom Keycloak login theme** (do NOT use the default "keycloak" theme)
- Implement light/dark theme toggle - See [11-STEP-BY-STEP.md](./11-STEP-BY-STEP.md#phase-4-required-features-must-implement)
- Configure `ENGINE_ALLOWED_ISSUERS` - See [14-TROUBLESHOOTING.md](./14-TROUBLESHOOTING.md#43-engine-rejects-jwt-tokens-401-unauthorized)

> ⚠️ **CRITICAL:** These features are **REQUIRED**, not optional. They must be implemented before the application is considered complete. **Keycloak theming is MANDATORY** - the login page is the first impression users have of your application.

## Core Principles

### 1. Protocol-Centric Architecture
- **Sidebar menu** = Protocols organized by packages (sub-menus)
- **Overview page** = One per protocol (table of instances)
- **Detail page** = One per protocol instance (action buttons + variable display)
- **Creation form** = One per protocol (based on protocol parameters)

### 2. Backend Actions as Source of Truth
- Use `protocol.actions` field from API responses to determine button visibility
- Never check `protocol.state` directly - backend already validates this
- Never check user roles directly - backend already validates this
- Only validate `require()` statements from NPL for UX purposes

### 3. Consistent Patterns
- All overview pages follow the same table structure
- All detail pages follow the same layout (action buttons + sections)
- All creation forms follow the same validation pattern
- All action buttons follow the same component structure

## File Structure

```
project-root/
├── docker-compose.yml          # All services
├── Makefile                    # Build/deployment commands
├── .env                        # Environment variables
├── npl/                        # NPL protocols
│   ├── Dockerfile
│   ├── pom.xml
│   └── src/main/npl-1.0/
│       └── your-package/
├── frontend/                   # React frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── overview-pages/
│   │   │   ├── detail-pages/
│   │   │   ├── creation-forms/
│   │   │   ├── action-buttons/
│   │   │   └── shared/
│   │   └── generated/          # Auto-generated from OpenAPI
│   └── package.json
├── keycloak-provisioning/      # Keycloak Terraform
│   ├── terraform.tf
│   └── generated-roles.tf      # Auto-generated from NPL
└── ...
```

## Key Technologies

### Backend
- **NPL (NOUMENA Protocol Language)** - Protocol definition
- **NPL Engine** - Executes protocols and generates API
- **PostgreSQL** - Database
- **Keycloak** - Authentication and authorization
- **RabbitMQ** - Message queue
- **GraphQL** - Read model queries

### Frontend
- **React 18+** with TypeScript
- **Material-UI (MUI)** for components
- **React Router** for navigation
- **React Hook Form** for forms
- **Generated OpenAPI Client** for API calls
- **Server-Sent Events (SSE)** for real-time updates

## Quick Start

1. **Check Prerequisites** - See [PREREQUISITES.md](./PREREQUISITES.md) for required setup
2. **Copy the `/ai-guide-npl` folder** into your clean repository
3. **Follow Quick Start Guide** - See [QUICK-START.md](./QUICK-START.md) for fast-track workflow
4. **Or follow detailed guides** - Use guides 00-10 for step-by-step instructions

### Fast Track (45-90 minutes)

- **[PREREQUISITES.md](./PREREQUISITES.md)** - Verify all requirements
- **[QUICK-START.md](./QUICK-START.md)** - Complete workflow summary
- **[01-PROJECT-SETUP.md](./01-PROJECT-SETUP.md)** - Infrastructure setup
- **[02-NPL-DEVELOPMENT.md](./02-NPL-DEVELOPMENT.md)** - NPL protocol development
- **[03-KEYCLOAK-PROVISIONING.md](./03-KEYCLOAK-PROVISIONING.md)** - Role generation
- **[04-FRONTEND-SETUP.md](./04-FRONTEND-SETUP.md)** - Frontend project setup
- **[05-09 Guides](./05-SIDEBAR-NAVIGATION.md)** - Component generation
- **[10-CODE-TEMPLATES.md](./10-CODE-TEMPLATES.md)** - All code templates
- **[11-STEP-BY-STEP.md](./11-STEP-BY-STEP.md)** - Detailed workflow

## What Gets Generated

### System-Generated (Automatic - No AI Required)

These are automatically generated by tools and require no AI involvement:

1. **OpenAPI Specification**
   - Generated by: NPL Engine (during `mvn package`)
   - From: NPL protocols with `@api` annotations
   - Location: `npl/target/generated-sources/openapi/*-openapi.yml`

2. **TypeScript API Client**
   - Generated by: OpenAPI Generator Maven Plugin
   - From: OpenAPI specification
   - Location: `frontend/src/generated/api.ts` and `frontend/src/generated/models/`
   - Includes: All types, request/response models, API methods

3. **Frontend Components** (Future: NPL Frontend Generator)
   - Generated by: NPL Frontend Generator (to be built)
   - From: NPL protocols + OpenAPI spec + `@frontend` comments
   - Location: `frontend/src/components/`
   - Includes:
     - ✅ Action buttons (one per `@api` permission)
     - ✅ Overview pages (tables from list endpoints)
     - ✅ Detail pages (from protocol variables + `@frontend` comments)
     - ✅ Creation forms (from protocol parameters)
     - ✅ Sidebar navigation (from packages)
     - ✅ Routes configuration

4. **Keycloak Roles** (Can be automated)
   - Generated by: Script or tool
   - From: NPL protocol parties
   - Location: `keycloak-provisioning/generated-roles.tf`

5. **Infrastructure Configs** (Can be automated)
   - Generated by: Template tool
   - From: Project metadata
   - Includes: Docker Compose, Makefile, environment files

### AI-Generated (Requires AI/Manual Work)

These require AI or manual creation because they depend on business context:

1. **NPL Protocols** (Cannot be automated)
   - Written by: AI based on business requirements
   - Contains: Business logic, domain rules, state transitions
   - Guide: [02-NPL-DEVELOPMENT.md](./02-NPL-DEVELOPMENT.md)

2. **`@frontend` Comments** (Optional - can be defaulted)
   - Written by: AI (optional enhancement)
   - Purpose: UI hints for better component generation
   - Can be: System-generated with sensible defaults

3. **Custom Components** (Edge cases only)
   - Written by: AI when needed
   - For: Complex visualizations, non-standard patterns
   - Most components: System-generated

## Generation Workflow (Sequential - Cannot Skip Steps)

```
┌─────────────────────────────────────────────────────────────────┐
│ PHASE 1: BACKEND                                                │
│                                                                 │
│ User/AI writes NPL protocols (business logic)                   │
│     ↓                                                           │
│ System: NPL Engine → OpenAPI specification                      │
│     ↓                                                           │
│ ════════════════════════════════════════════                    │
│ ⛔ STOP: Verify OpenAPI exists before continuing                │
│ ════════════════════════════════════════════                    │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ PHASE 2: API CLIENT                                             │
│                                                                 │
│ System: OpenAPI Generator → TypeScript API client               │
│     ↓                                                           │
│ ════════════════════════════════════════════                    │
│ ⛔ STOP: Verify api.ts and models/ exist before continuing      │
│ ════════════════════════════════════════════                    │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ PHASE 3: FRONTEND (Only after API client exists!)              │
│                                                                 │
│ AI/System: Generate React components                            │
│     ├── Action buttons (from @api permissions)                  │
│     ├── Overview pages (from protocol list endpoints)           │
│     ├── Detail pages (from protocol variables)                  │
│     ├── Creation forms (from protocol parameters)               │
│     └── Sidebar navigation (from packages)                      │
│     ↓                                                           │
│ Complete Application                                            │
└─────────────────────────────────────────────────────────────────┘
```

**⚠️ CRITICAL:** Frontend components cannot be developed until the API client is generated. The API client cannot be generated until NPL is compiled. **This is a strict dependency chain.**

**Note:** Currently, the frontend components are generated by AI following this guide. A future **NPL Frontend Generator** tool will automate this step. See [NPL-FRONTEND-GENERATOR.md](../NPL-FRONTEND-GENERATOR.md) for implementation plan.

## Result

A **complete, production-ready application** with:
- Full backend infrastructure
- Automatic role-based access control
- Complete frontend with all patterns
- Consistent UI/UX
- Real-time updates
- Proper error handling

All generated from NPL protocols and this guide!

## Out-of-Box Completion Gates (Mandatory)

Do not mark setup complete until all gates pass:

1. **Health gates**
   - `engine` health endpoint returns `UP`
   - `keycloak` is healthy
   - `rabbitmq` is healthy
   - `nginx-proxy` is reachable
2. **Provisioning gate**
   - `keycloak-provisioning` finished as one-shot with `Exited (0)`
3. **Auth gates**
   - password grant returns non-empty access token
   - protected `/npl/<package>/<Protocol>/` call succeeds with bearer token
4. **Frontend gates**
   - login redirect works without malformed `undefined/protocol/openid-connect` URL
   - protected route loads without 503
   - public explorer route remains public

## Agent Do/Don't (Predictable Behavior)

**Do:**
- Follow deterministic order: `infra -> provision -> npl-deploy -> generate-api -> frontend -> verify-auth`
- Keep Keycloak/frontend envs aligned and non-empty before auth flow
- Treat provisioning as successful when container exits with code 0

**Don't:**
- Do not declare success before auth token + protected API checks pass
- Do not assume `keycloak-provisioning` must stay running
- Do not proceed with frontend page work while Keycloak env values are unresolved
