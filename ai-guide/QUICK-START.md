# Quick Start Guide

This guide provides a fast-track workflow for generating a complete NPL application.

## ⚠️ CRITICAL: You MUST Follow These Phases in Order

**The development workflow has THREE PHASES that must be completed sequentially:**

```
┌──────────────────────────────────────────────────────────────────┐
│ PHASE 1: BACKEND                                                 │
│ Create NPL → Compile → Generate OpenAPI                          │
│                                                                  │
│ ⛔ STOP: Do not proceed until OpenAPI exists!                    │
└──────────────────────────────────────────────────────────────────┘
                             ↓
┌──────────────────────────────────────────────────────────────────┐
│ PHASE 2: API CLIENT                                              │
│ Generate TypeScript client from OpenAPI                          │
│                                                                  │
│ ⛔ STOP: Do not proceed until api.ts exists!                     │
└──────────────────────────────────────────────────────────────────┘
                             ↓
┌──────────────────────────────────────────────────────────────────┐
│ PHASE 3: FRONTEND                                                │
│ Now develop React components using the generated API client      │
└──────────────────────────────────────────────────────────────────┘
```

**Why this matters:** Frontend components require the generated TypeScript types and API methods. Without them, you would have to use mock data (which is FORBIDDEN) or guess at types (which will break).

---

## PHASE 1: Backend Development

### Step 1: Copy Guide to Project

```bash
# In your project root
cp -r /path/to/ai-guide-npl ./ai-guide-npl
cd ai-guide-npl
```

### Step 2: Setup Infrastructure (5-10 minutes)

**Follow:** [01-PROJECT-SETUP.md](./01-PROJECT-SETUP.md)

**What you'll create:**
- `docker-compose.yml` - All services
- `Makefile` - Build commands
- `.env` - Environment variables
- Service configurations

### Step 3: Develop NPL Protocols (10-30 minutes)

**Follow:** [02-NPL-DEVELOPMENT.md](./02-NPL-DEVELOPMENT.md)

**What you'll create:**
- NPL protocol files in `npl/src/main/npl-1.0/your-package/`
- Protocol definitions with `@api` annotations
- `@frontend` comments for UI generation
- Party declarations

**Example:**
```npl
package yourpackage

@api
protocol[party1, party2] YourProtocol(var name: Text) {
    initial state created;
    final state completed;
    
    @api
    permission[party1] doSomething() | created {
        become completed;
    };
}
```

### Step 4: Generate Keycloak Roles (5 minutes)

**Follow:** [03-KEYCLOAK-PROVISIONING.md](./03-KEYCLOAK-PROVISIONING.md)

**What you'll create:**
- Terraform configuration in `keycloak-provisioning/`
- Role definitions from NPL parties
- User creation

---

## ⛔ PHASE 1 CHECKPOINT: Compile Backend

**Before proceeding to Phase 2, you MUST complete these steps:**

```bash
# 1. Compile NPL and generate OpenAPI
cd npl
mvn package

# 2. VERIFY: OpenAPI specification was generated
ls target/generated-sources/openapi/
# ✅ You should see: *-openapi.yml files
# ❌ If empty or missing: Fix NPL errors and recompile

# 3. Start backend services
cd ..
make up

# 4. VERIFY: Services are running
curl http://localhost:12000/actuator/health
# ✅ Should return: {"status":"UP"}
```

### ❌ DO NOT proceed to Phase 2 until:
- [ ] `mvn package` completes without errors
- [ ] OpenAPI files exist in `npl/target/generated-sources/openapi/`
- [ ] Backend services start successfully

---

## PHASE 2: API Client Generation

### Step 5: Setup Frontend Project (5 minutes)

**Follow:** [04-FRONTEND-SETUP.md](./04-FRONTEND-SETUP.md)

**What you'll create:**
- React project in `frontend/`
- Dependencies installation
- TypeScript configuration

### Step 6: Generate TypeScript API Client

Generate the TypeScript API client from your compiled NPL protocols:

```bash
make generate-api
```

This uses the NPL CLI to produce the OpenAPI spec, then `openapi-generator-cli` to generate the typed TypeScript fetch client into `frontend/src/generated/`.

---

## ⛔ PHASE 2 CHECKPOINT: Verify API Client

**Before proceeding to Phase 3, you MUST verify:**

```bash
# 1. Check generated files exist
ls src/generated/
# ✅ Should see: api.ts
# ✅ Should see: models/ directory

# 2. Check models were generated
ls src/generated/models/
# ✅ Should see TypeScript files for your protocols

# 3. Verify TypeScript compiles
npm run build
# ✅ Should complete without errors
```

### ❌ DO NOT proceed to Phase 3 until:
- [ ] `frontend/src/generated/api.ts` exists
- [ ] `frontend/src/generated/models/` contains type definitions
- [ ] `npm run build` completes without TypeScript errors

---

## PHASE 3: Frontend Development

**Now and ONLY now should you develop frontend components!**

All frontend components must:
- ✅ Import types from `src/generated/models/`
- ✅ Use API methods from `src/generated/api.ts`
- ❌ NEVER use mock or hardcoded data

### Step 7: Generate Frontend Components (15-30 minutes)

**Follow guides 05-09 in order:**

#### 7.1: Sidebar Navigation
**Follow:** [05-SIDEBAR-NAVIGATION.md](./05-SIDEBAR-NAVIGATION.md)

**What you'll create:**
- `src/components/shared/SidebarNavigation.tsx`
- Navigation structure from NPL packages

#### 7.2: Overview Pages
**Follow:** [06-OVERVIEW-PAGES.md](./06-OVERVIEW-PAGES.md)

**What you'll create:**
- `src/components/overview-pages/ProtocolNameOverview.tsx` (one per protocol)
- Table with search, sorting, pagination
- "Create New" button

#### 7.3: Detail Pages
**Follow:** [07-DETAIL-PAGES.md](./07-DETAIL-PAGES.md)

**What you'll create:**
- `src/components/detail-pages/ProtocolNameDetailPage.tsx` (one per protocol)
- Variable display organized by sections
- Action buttons integration

#### 7.4: Creation Forms
**Follow:** [08-CREATION-FORMS.md](./08-CREATION-FORMS.md)

**What you'll create:**
- `src/components/creation-forms/ProtocolNameCreationForm.tsx` (one per protocol)
- Form fields from protocol parameters
- Validation logic

#### 7.5: Action Buttons
**Follow:** [09-ACTION-BUTTONS.md](./09-ACTION-BUTTONS.md)

**What you'll create:**
- `src/components/action-buttons/ProtocolName/ActionNameButton.tsx` (one per permission)
- Button components with dialogs
- API integration

### Step 8: Configure Router (5 minutes)

**Update:** `src/Router.tsx`

Add routes for all generated components:
- Overview pages
- Detail pages
- Creation forms

**Reference:** [10-CODE-TEMPLATES.md](./10-CODE-TEMPLATES.md) - Router Configuration

### Step 9: Build & Test (5 minutes)

```bash
# Build frontend
cd frontend
npm run build

# Start all services
cd ..
make up

# Access application
open http://localhost:3000  # or your frontend port
```

### Step 10: Required Features (MUST IMPLEMENT - 15-30 minutes)

**⚠️ CRITICAL:** These features are **REQUIRED** and must be implemented before the application is considered complete.

#### 10.1: Configure CORS via Nginx Proxy (5 minutes)

**Action:** Ensure nginx is configured with CORS headers and frontend uses the proxy.

1. **nginx/nginx.conf** must include CORS headers (see [01-PROJECT-SETUP.md](./01-PROJECT-SETUP.md#step-6-create-nginx-configuration))

2. **docker-compose.yml** frontend service must use nginx proxy URL:
```yaml
frontend:
  environment:
    # CRITICAL: Use nginx proxy (12001) for CORS, NOT direct engine (12000)
    VITE_ENGINE_URL: http://localhost:12001
```

**Why:** The Noumena engine has strict CORS filtering that rejects cross-origin requests. Nginx adds proper CORS headers.

**Reference:** [14-TROUBLESHOOTING.md](./14-TROUBLESHOOTING.md#52-cors-errors)

#### 10.2: Configure Engine Allowed Issuers (2 minutes)

**Action:** Update `docker-compose.yml` to include Docker network, localhost, and host-gateway URLs:

```yaml
ENGINE_ALLOWED_ISSUERS: http://keycloak:11000/realms/${VITE_NC_KC_REALM},http://localhost:11000/realms/${VITE_NC_KC_REALM},http://host.docker.internal:11000/realms/${VITE_NC_KC_REALM}
```

**Why:** Frontend/browser and Docker services may see different hosts for Keycloak. Engine must accept all expected issuers.

**Reference:** [14-TROUBLESHOOTING.md](./14-TROUBLESHOOTING.md#43-engine-rejects-jwt-tokens-401-unauthorized)

#### 10.3: Disable Engine Dev Mode (1 minute)

**Action:** Ensure `ENGINE_DEV_MODE` is set to `false` in `docker-compose.yml`:

```yaml
engine:
  environment:
    ENGINE_DEV_MODE: false
```

**Why:** Dev mode runs an embedded OIDC server on port 11000 which conflicts with external Keycloak.

**Reference:** [14-TROUBLESHOOTING.md](./14-TROUBLESHOOTING.md#46-failed-to-retrieve-jwks-error)

> For local-frontend/Docker-backend auth hostname caveats and JWKS issuer mismatch handling, see `04-FRONTEND-SETUP.md`.

#### 10.4: Keycloak Theme Customization (10-15 minutes) ⚠️ MANDATORY

**⚠️ MANDATORY:** You MUST create a custom Keycloak login theme. Do NOT use the default "keycloak" theme.

**Follow:** [03a-KEYCLOAK-THEMING.md](./03a-KEYCLOAK-THEMING.md)

**What you'll create:**
- Custom Keycloak theme directory structure
- Branded login page templates
- Custom CSS styling

**Why mandatory:** The login page is the first impression users have of your application. A branded login experience is essential for professional applications.

#### 10.5: Internationalization (i18n) (10-15 minutes)

**Follow:** [12-LOCALIZATION.md](./12-LOCALIZATION.md)

**What you'll create:**
- i18n configuration
- Translation files (en.json, de.json, etc.)
- LanguageSwitcher component

#### 10.6: Light/Dark Theme Toggle (10-15 minutes)

**Action:** Implement Material-UI theme switching

**What you'll create:**
- ThemeContext with color mode state
- Light and dark theme palettes
- ThemeToggle component
- Persist theme preference in localStorage

**Reference:** [11-STEP-BY-STEP.md](./11-STEP-BY-STEP.md#43-lightdark-theme-toggle)

---

## Complete Workflow Summary

```
┌─────────────────────────────────────────────────────────────────┐
│ PHASE 1: BACKEND                                                │
├─────────────────────────────────────────────────────────────────┤
│ 1. Copy ai-guide-npl folder                                     │
│ 2. Setup infrastructure (01-PROJECT-SETUP.md)                   │
│ 3. Develop NPL protocols (02-NPL-DEVELOPMENT.md)                │
│ 4. Generate Keycloak roles (03-KEYCLOAK-PROVISIONING.md)        │
│                                                                 │
│ ⛔ CHECKPOINT: Compile NPL → Verify OpenAPI exists              │
│    cd npl && mvn package                                        │
│    ls target/generated-sources/openapi/                         │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ PHASE 2: API CLIENT                                             │
├─────────────────────────────────────────────────────────────────┤
│ 5. Setup frontend project (04-FRONTEND-SETUP.md)                │
│ 6. Generate TypeScript API client                               │
│                                                                 │
│ ⛔ CHECKPOINT: Verify generated client exists                   │
│    ls frontend/src/generated/                                   │
│    npm run build                                                │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ PHASE 3: FRONTEND                                               │
├─────────────────────────────────────────────────────────────────┤
│ 7. Generate components (05-09 guides)                           │
│    ├── Sidebar (05)                                             │
│    ├── Overview pages (06)                                      │
│    ├── Detail pages (07)                                        │
│    ├── Creation forms (08)                                      │
│    └── Action buttons (09)                                      │
│ 8. Configure router                                             │
│ 9. Build & test                                                 │
│                                                                 │
│ ⛔ REQUIRED FEATURES (MUST IMPLEMENT):                          │
│ 10.1 Configure CORS via nginx proxy                             │
│ 10.2 Configure ENGINE_ALLOWED_ISSUERS                           │
│ 10.3 Disable ENGINE_DEV_MODE                                    │
│ 10.4 Keycloak theme customization                               │
│ 10.5 Internationalization (i18n)                                │
│ 10.6 Light/dark theme toggle                                    │
└─────────────────────────────────────────────────────────────────┘
                              ↓
                    ✅ Complete Application
```

## Time Estimates

| Phase | Steps | Time |
|-------|-------|------|
| **Phase 1: Backend** | Infrastructure + NPL + Keycloak | 20-45 min |
| **Checkpoint** | Compile NPL, verify OpenAPI | 2-5 min |
| **Phase 2: API Client** | Frontend setup + generate client | 5-10 min |
| **Checkpoint** | Verify generated files | 2-5 min |
| **Phase 3: Frontend** | Components + router + test | 20-35 min |
| **Required Features** | Keycloak theme + i18n + theme toggle | 15-30 min |
| **Total** | | **~65-130 min** |

## Common Issues & Solutions

### Issue: Docker services won't start
**Solution:** Check ports are available, verify Docker is running

### Issue: NPL compilation fails
**Solution:** Check NPL syntax, verify Maven dependencies

### Issue: OpenAPI not generated
**Solution:** Ensure `@api` annotations are present, check `mvn package` output

### Issue: Frontend build fails
**Solution:** Check Node.js version, verify all dependencies installed

### Issue: Keycloak authentication fails
**Solution:** Verify realm and client ID match, check Keycloak logs

## Final Acceptance Gates (Required)

Before saying "setup complete", verify all of the following:

1. **Health**
   - `docker compose ps` shows `engine`, `keycloak`, `rabbitmq` healthy
   - `nginx-proxy` is running/reachable
2. **Provisioning**
   - `keycloak-provisioning` completed one-shot as `Exited (0)`
3. **Token**
   - password grant returns non-empty `access_token`
4. **Protected API**
   - bearer-authenticated call to `/npl/<package>/<Protocol>/` succeeds
5. **Frontend**
   - login redirect succeeds
   - protected route loads without 503
   - public explorer page remains public

Recommended command sequence:

```bash
make infra
make provision
make npl-deploy
make generate-api
make frontend
make verify-auth
```

## Agent Do/Don't

**Do**
- Keep Keycloak envs (`VITE_KEYCLOAK_URL`, `VITE_NC_KC_REALM`, `VITE_NC_KC_CLIENT_ID`) resolved before login.
- Use auth verification checks before moving to frontend feature development.

**Don't**
- Do not treat running containers alone as completion.
- Do not expect `keycloak-provisioning` to remain running.
- Do not continue when auth envs are missing or produce `undefined` redirect URLs.

## Next Steps

- **Customize UI:** Modify theme in `src/theme.ts`
- **Add Features:** Extend components as needed
- **Deploy:** Follow deployment guide for your platform
- **Monitor:** Set up logging and monitoring

## Reference Documents

- **[README.md](./README.md)** - Complete guide overview
- **[10-CODE-TEMPLATES.md](./10-CODE-TEMPLATES.md)** - All code templates
- **[11-STEP-BY-STEP.md](./11-STEP-BY-STEP.md)** - Detailed step-by-step workflow
- **[PREREQUISITES.md](./PREREQUISITES.md)** - Prerequisites checklist

