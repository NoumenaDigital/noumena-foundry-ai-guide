# 00 - Step-by-Step Generation Workflow

## Overview

This guide provides a complete, step-by-step workflow for generating a frontend from NPL protocols. Follow these steps in order to create a complete, production-ready frontend application.

> ⚠️ **CRITICAL: Local Config Setup Comes First**
>
> Before running **any** infra, deploy, or generation command, the agent must create and validate:
>
> - root `.env`
> - `frontend/.env`
> - root `npl.yml`
>
> Use **[01-LOCAL-CONFIG-FILES.md](./01-LOCAL-CONFIG-FILES.md)** as the source of truth.  
> If these files are missing or inconsistent, the workflow will fail later with avoidable errors (missing env vars, auth failures, deploy failures).

> ⚠️ **CRITICAL: NPL First, Then TypeScript**
> 
> You **MUST** complete and compile the NPL protocols **BEFORE** working on TypeScript frontend code. The frontend depends on the OpenAPI-generated client which is only available after running `npl openapi` on the NPL project.
>
> If you try to write frontend TypeScript before generating the API client, you will encounter missing type definitions and be forced to use forbidden mock data.

## ⚠️ CRITICAL: Strict Sequential Workflow

**Development MUST proceed in three strict phases. Each phase depends on the outputs of the previous phase.**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ PHASE 1: BACKEND                                                    │   │
│  │                                                                     │   │
│  │ • Setup infrastructure                                              │   │
│  │ • Write NPL protocols                                               │   │
│  │ • Configure Keycloak roles                                          │   │
│  │                                                                     │   │
│  │ OUTPUT: NPL source files                                            │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                              ↓                                              │
│                   ┌────────────────────┐                                   │
│                   │ ⛔ COMPILE NPL     │                                   │
│                   │ npl check          │                                   │
│                   │ make generate-api  │                                   │
│                   │ Verify: OpenAPI    │                                   │
│                   └────────────────────┘                                   │
│                              ↓                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ PHASE 2: API CLIENT GENERATION                                      │   │
│  │                                                                     │   │
│  │ • Setup frontend project structure                                  │   │
│  │ • Generate TypeScript client from OpenAPI                           │   │
│  │                                                                     │   │
│  │ OUTPUT: frontend/src/generated/api.ts + models/                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                              ↓                                              │
│                   ┌────────────────────┐                                   │
│                   │ ⛔ VERIFY CLIENT   │                                   │
│                   │ ls src/generated/  │                                   │
│                   │ npm run build      │                                   │
│                   └────────────────────┘                                   │
│                              ↓                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ PHASE 3: FRONTEND DEVELOPMENT                                       │   │
│  │                                                                     │   │
│  │ • Generate React components                                         │   │
│  │ • All components import from generated/                             │   │
│  │ • NO mock data - use real API only                                  │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Why This Order is Mandatory

| Phase | Produces | Required By |
|-------|----------|-------------|
| Phase 1 (Backend) | NPL protocols | OpenAPI generator |
| NPL Compilation | OpenAPI spec | TypeScript client generator |
| Phase 2 (API Client) | `api.ts` + `models/` | All frontend components |
| Phase 3 (Frontend) | React components | Final application |

**If you skip ahead:**
- ❌ No TypeScript types for protocols
- ❌ No API methods to call
- ❌ Forced to use mock data (FORBIDDEN)
- ❌ Will need complete rewrite

---

## PHASE 1: Backend Development

### Prerequisites (Before Starting)

- [ ] Docker installed and running
- [ ] NPL CLI installed (`npl version` works)
- [ ] Node.js 18+ installed
- [ ] Git repository initialized
- [ ] Local config files created and validated (see `01-LOCAL-CONFIG-FILES.md`)

### Step 1.1: Setup Application Infrastructure

**Action:** Set up the complete application infrastructure:

1. Verfiy `docker-compose.yml` with all services
2. Verify `Makefile` with build/deployment commands
3. Verify `.env` file with environment variables both in root and frontend



### Step 1.2: Verify Infrastructure

**Action:** Ensure all services are running:

- ✅ Engine: http://localhost:12000/actuator/health
- ✅ Keycloak: http://localhost:11000
- ✅ Database: Port 5432
- ✅ GraphQL: http://localhost:15001/graphql

### Step 1.3: Develop NPL Protocols

**Action:** Write NPL protocols based on business requirements:

1. Define protocol structure with parties
2. Add `@api` annotations for API generation
3. Add `@frontend` comments for UI generation
4. Define states, permissions, and obligations

**Reference:** [02-NPL-DEVELOPMENT.md](./02-NPL-DEVELOPMENT.md)

### Step 1.4: Configure Keycloak Roles

**Action:** Generate Keycloak roles from NPL protocol parties:

1. Analyze NPL protocols to extract parties
2. Generate Terraform configuration for roles
3. Create users for each role

**Reference:** [03-KEYCLOAK-PROVISIONING.md](./03-KEYCLOAK-PROVISIONING.md)

---

## ⛔ CHECKPOINT 1: Compile NPL & Generate OpenAPI

**You MUST complete this checkpoint before proceeding to Phase 2.**

```bash
# 1. Validate, compile, and generate OpenAPI
make generate-api

# 2. VERIFY: Check for errors
# ✅ Should complete with no errors and generate frontend/src/generated/*
# ❌ If empty: Check @api annotations on protocols

# 3. Start backend services and deploy NPL package
make npl-deploy

# 4. VERIFY: Services are healthy
curl -s http://localhost:12000/actuator/health | grep UP
# ✅ Should return: "status":"UP"
```

### Checkpoint 1 Checklist

- [ ] `make generate-api` completes without errors
- [ ] OpenAPI files exist in `npl/target/`
- [ ] `make npl-deploy` completes successfully
- [ ] Engine health check returns UP

**❌ DO NOT proceed to Phase 2 until ALL items are checked.**

---

## PHASE 2: API Client Generation

### Step 2.1: Setup Frontend Project Structure

**Action:** Set up React/TypeScript frontend:

1. Initialize project with dependencies
2. Configure TypeScript and Vite
3. Set up service provider and authentication
4. Configure routing

**Reference:** [04-FRONTEND-SETUP.md](./04-FRONTEND-SETUP.md)

### Step 2.2: Generate TypeScript API Client

**Action:** Generate the TypeScript API client from your compiled NPL protocols:

```bash
# Generate OpenAPI spec from NPL, then generate TypeScript client
make generate-api
```

This uses the NPL CLI to produce the OpenAPI spec, then `openapi-generator-cli` to generate the typed TypeScript fetch client into `frontend/src/generated/`.

---

## ⛔ CHECKPOINT 2: Verify Generated API Client

**You MUST complete this checkpoint before proceeding to Phase 3.**

```bash
# 1. VERIFY: Generated files exist
ls frontend/src/generated/
# ✅ Should see: api.ts (or similar)
# ✅ Should see: models/ directory

# 2. VERIFY: Models were generated
ls frontend/src/generated/models/
# ✅ Should see TypeScript files for your protocols
# ❌ If empty: Check OpenAPI spec and regenerate

# 3. VERIFY: TypeScript compiles
cd frontend
npm run build
# ✅ Should complete without type errors
# ❌ If errors: Check generated types match expected structure
```

### Checkpoint 2 Checklist

- [ ] `frontend/src/generated/api.ts` exists
- [ ] `frontend/src/generated/models/` contains TypeScript type definitions
- [ ] `npm run build` completes without TypeScript errors

**❌ DO NOT proceed to Phase 3 until ALL items are checked.**

---

## PHASE 3: Frontend Development

**Now and ONLY now can you develop frontend components.**

### Critical Rules for Phase 3

1. **ALL imports must use generated types:**
   ```typescript
   import { Dog, DogApi } from '../generated/api';
   ```

2. **ALL data must come from API:**
   ```typescript
   const [dogs, setDogs] = useState<Dog[]>([]);
   useEffect(() => {
     api.getDogs().then(setDogs);
   }, []);
   ```

3. **NO mock or hardcoded data:**
   ```typescript
   // ❌ FORBIDDEN
   const mockDogs = [{ id: '1', name: 'Cooper' }];
   
   // ✅ CORRECT
   const [dogs, setDogs] = useState<Dog[]>([]);
   ```

4. **Public start page must match the implemented use case:**
   - Do not leave generic placeholder copy on the unauthenticated landing screen.
   - Update headline, description, and call-to-action context so users immediately understand the domain workflow (for example: provenance, compliance, allocation lifecycle, and role model).
   - Ensure the public page messaging is aligned with the actual protocols and business process implemented in this project.

### Step 3.1: Scan NPL Codebase (Analysis)

**Action:** Analyze all NPL files to identify:

1. **All packages** containing `@api` protocols
2. **All `@api` protocols** within each package
3. **Protocol parameters** (for creation forms)
4. **Protocol variables** (for detail pages)
5. **`@api` permissions/obligations** (for action buttons)
6. **NPL inline comments** (for frontend context)

**Output:** Create a mapping document:

```typescript
interface ProtocolAnalysis {
  package: string;
  protocols: {
    name: string;
    parameters: string[];
    variables: string[];
    actions: string[];
    comments: Record<string, string>;
  }[];
}
```

### Step 3.2: Group by Package

**Action:** Organize protocols by package for sidebar navigation:

```
Package: dogtraining
  - DogTraining
  - Trainer

Package: scheduling
  - TrainingSession
```

### Step 3.3: Identify Dependencies

**Action:** Identify protocol references (e.g., `Currency`, `Equity`):

- Which protocols reference other protocols?
- What dropdowns/autocompletes are needed?
- What relationships exist?

### Step 3.4: Generate Sidebar Navigation

**Action:** Create navigation items :

- Consdier the user journey of the application and built a userfriendly navigation flow


### Step 3.5: Add Routes

**Action:** Add routes to `Router.tsx`:

- Overview routes: `/protocol-name-overview`
- Detail routes: `/protocol-name-detail/:id`
- Creation routes: `/protocol-name-create`

### Step 3.6: Add Translations

**Action:** Add i18n keys for all navigation items:

```json
{
  "navigation": {
    "dogTraining": "Dog Training",
    "dogs": "Dogs",
    "trainers": "Trainers"
  }
}
```

### Step 3.7: Generate Overview Pages

**For each protocol:**

1. Create `src/components/overview-pages/ProtocolNameOverview.tsx`
2. Implement data fetching from API (using generated client)
3. Create table with key columns
4. Add search functionality
5. Add "Create New" button
6. Implement SSE for real-time updates

**Reference:** [06-OVERVIEW-PAGES.md](./06-OVERVIEW-PAGES.md)

**Important:** Import types from `src/generated/models/` - never define types manually!

### Step 3.8: Add Table Columns

**Action:** Choose columns based on:
- Most important fields
- User identification needs
- State/status (always include)

### Step 3.9: Generate Action Buttons

**For each `@api` permission/obligation:**

1. Extract permission name
2. Extract parameters
3. Extract `require()` statements
4. Extract state constraints

**For each action:**

1. Create `src/components/action-buttons/ProtocolName/ActionNameButton.tsx`
2. Implement visibility check (`actions.actionName`)
3. Implement validation from `require()` statements
4. Create dialog (confirmation or form)
5. Implement API call (using generated client)
6. Handle loading and errors

**Reference:** [09-ACTION-BUTTONS.md](./09-ACTION-BUTTONS.md)

**Action:** Export all buttons:

```typescript
// src/components/action-buttons/ProtocolName/index.ts
export { Action1Button } from './Action1Button';
export { Action2Button } from './Action2Button';
```

### Step 3.10: Generate Detail Pages

**For each protocol variable:**

1. Extract `@frontend` comments
2. Identify section names
3. Identify component types
4. Identify labels and formats

**For each protocol:**

1. Create `src/components/detail-pages/ProtocolNameDetailPage.tsx`
2. Implement data fetching by ID (using generated client)
3. Generate sections based on NPL comments
4. Integrate action buttons from library
5. Implement SSE for real-time updates

**Reference:** [07-DETAIL-PAGES.md](./07-DETAIL-PAGES.md)

**Action:** For each section identified in NPL comments:

1. Create Card component
2. Add section title
3. Add fields based on component types:
   - Text → Typography
   - Table → Table component
   - Chip → Chip component
   - KPI → Card with large number
   - etc.

### Step 3.11: Generate Creation Forms

**For each protocol:**

1. Extract all parameters from protocol declaration
2. Identify field types
3. Extract `require()` statements for validation
4. Identify protocol references (for dropdowns)

**For each protocol:**

1. Create `src/components/creation-forms/ProtocolNameCreationForm.tsx`
2. Generate form fields based on parameters
3. Implement validation from `require()` statements
4. Handle protocol references (fetch options from generated API)
5. Implement submission logic (using generated API methods)

**Reference:** [08-CREATION-FORMS.md](./08-CREATION-FORMS.md)

**Action:** Organize fields logically:
- Basic Information
- Additional Details
- Configuration
- Relationships

### Step 3.12: Test All Components

**Action:** Verify all components work correctly:

**Overview Pages:**
- ✅ Data loads correctly (from real API)
- ✅ Search works
- ✅ Row clicks navigate to detail
- ✅ Create button works
- ✅ SSE updates work

**Action Buttons:**
- ✅ Buttons show/hide based on backend actions
- ✅ Validation works correctly
- ✅ API calls succeed
- ✅ Protocol refreshes after action

**Detail Pages:**
- ✅ Data loads correctly
- ✅ Sections display properly
- ✅ Action buttons work
- ✅ SSE updates work
- ✅ Navigation works

**Creation Forms:**
- ✅ All fields render correctly
- ✅ Validation works
- ✅ Submission succeeds
- ✅ Redirect to overview works

---

## PHASE 4: Integration and Testing

### Step 4.1: Test Complete Flows

**Action:** Test end-to-end:

1. **Create Flow:**
   - Navigate to overview
   - Click "Create New"
   - Fill form
   - Submit
   - Verify in overview table

2. **View Flow:**
   - Click row in overview
   - Verify detail page loads
   - Verify all sections display

3. **Action Flow:**
   - Navigate to detail page
   - Click action button
   - Complete action
   - Verify protocol updates

### Step 4.2: Test Real-Time Updates

**Action:** Verify SSE:
- ✅ Overview updates when protocol changes
- ✅ Detail page updates when protocol changes
- ✅ Connection indicator works

### Step 4.3: Test Error Handling

**Action:** Verify:
- ✅ 404 errors show PageNotFound
- ✅ Auth errors redirect to login
- ✅ API errors show user-friendly messages
- ✅ Loading states work correctly

### Step 4.4: Test Role-Based Access

**Action:** Verify:
- ✅ Create buttons only show for authorized roles
- ✅ Action buttons respect backend permissions
- ✅ Protected routes work correctly

---

## PHASE 5: Polish and Optimization

### Step 5.1: Add Empty States

**Action:** Add empty states for:
- Empty overview tables
- Missing data in detail pages
- No search results

### Step 5.2: Add Loading States

**Action:** Ensure loading indicators for:
- Initial data fetch
- Action execution
- Form submission

### Step 5.3: Add Error Boundaries

**Action:** Implement error boundaries:
- Root level
- Route level
- Component level

### Step 5.4: Optimize Performance

**Action:**
- Lazy load routes
- Memoize expensive calculations
- Optimize re-renders
- Code splitting

### Step 5.5: Add Internationalization

**Action:** Ensure all user-facing text:
- Uses i18n keys
- Has translations for all languages
- Formats dates/numbers correctly

---

## PHASE 6: Documentation

### Step 6.1: Document Protocol Mappings

**Action:** Create documentation:
- Which protocols map to which pages
- Which actions map to which buttons
- Which fields map to which components

### Step 6.2: Document Customizations

**Action:** Document any:
- Custom components
- Custom validations
- Custom business logic

## Checklist

Use this checklist to ensure completeness **and correct sequencing**:

### ⛔ Checkpoint 1: Backend Complete (Before Frontend)
- [ ] NPL protocols validate without errors (`npl check`)
- [ ] OpenAPI specification exists in `npl/target/generated-sources/openapi/`
- [ ] Backend services start successfully (`make up`)
- [ ] Engine health check returns UP

### ⛔ Checkpoint 2: API Client Generated (Before Components)
- [ ] `frontend/src/generated/api.ts` exists
- [ ] `frontend/src/generated/models/` contains type definitions
- [ ] TypeScript compiles without errors (`npm run build`)

### Phase 3: Frontend Components
- [ ] All components import from `src/generated/`
- [ ] NO mock or hardcoded data anywhere
- [ ] All API calls use generated methods

#### Sidebar Navigation
- [ ] All packages have menu items
- [ ] All protocols have sub-menu items
- [ ] Routes are configured
- [ ] Translations are added

#### Overview Pages
- [ ] All protocols have overview pages
- [ ] Tables display key information
- [ ] Search works
- [ ] Create buttons work
- [ ] SSE updates work

#### Action Buttons
- [ ] All `@api` permissions have buttons
- [ ] Validation from `require()` statements
- [ ] Dialogs are consistent
- [ ] API calls work correctly

#### Detail Pages
- [ ] All protocols have detail pages
- [ ] Sections match NPL comments
- [ ] Action buttons integrated
- [ ] SSE updates work

#### Creation Forms
- [ ] All protocols have creation forms
- [ ] Fields match protocol parameters
- [ ] Validation from `require()` statements
- [ ] Submission works correctly

### Phase 4: Required Features (MUST IMPLEMENT)

**⚠️ CRITICAL:** These features are **REQUIRED** and must be implemented before considering the application complete. They are NOT optional.

#### 4.1: Keycloak Theme Customization

**Action:** Customize Keycloak login pages to match your application branding.

**Reference:** [13-KEYCLOAK-THEMING.md](./13-KEYCLOAK-THEMING.md)

**Checklist:**
- [ ] Create custom Keycloak theme directory structure
- [ ] Implement `theme.properties` file
- [ ] Create `template.ftl` with custom layout
- [ ] Create `login.ftl` with branded login form
- [ ] Add custom CSS (`login.css`) with brand colors
- [ ] Update `keycloak/Dockerfile` to copy theme files
- [ ] Apply theme in Keycloak Admin Console or via configuration
- [ ] Verify the selected theme is configured on the correct realm (not only on master/default realm)
- [ ] Ensure theme naming/branding matches the realm use case and client-facing application context
- [ ] Test login page displays correctly

**Why Required:** The login page is the first impression users have of your application. A branded login experience is essential for professional applications.

#### 4.2: Internationalization (i18n)

**Action:** Implement multi-language support using react-i18next.

**Reference:** [12-LOCALIZATION.md](./12-LOCALIZATION.md)

**Checklist:**
- [ ] Install i18next dependencies (`i18next`, `react-i18next`, `i18next-browser-languagedetector`)
- [ ] Create `src/i18n/index.ts` with i18n configuration
- [ ] Create translation files (`en.json`, `de.json`, etc.) in `src/i18n/locales/`
- [ ] Import i18n in `main.tsx`
- [ ] Replace all hardcoded strings with `t()` function calls
- [ ] Create `LanguageSwitcher` component
- [ ] Add LanguageSwitcher to sidebar footer
- [ ] Test language switching works and persists

**Why Required:** Professional applications must support multiple languages. Even if starting with English only, the i18n infrastructure must be in place.

#### 4.3: Light/Dark Theme Toggle

**Action:** Implement Material-UI theme switching between light and dark modes.

**Checklist:**
- [ ] Create `ThemeContext` or use MUI's `useColorMode` hook
- [ ] Define light theme palette in `theme.ts`
- [ ] Define dark theme palette in `theme.ts`
- [ ] Create `ThemeToggle` component (sun/moon icon button)
- [ ] Add theme toggle to sidebar footer
- [ ] Persist theme preference in localStorage
- [ ] Test theme switching works across all pages
- [ ] Verify all components respect theme colors

**Why Required:** Users expect modern applications to support their preferred color scheme (light/dark mode). This is a standard UX expectation.

**Example Implementation:**

```typescript
// src/ThemeContext.tsx
import { createContext, useContext, useState, useMemo } from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { CssBaseline } from '@mui/material';

type ColorMode = 'light' | 'dark';

interface ThemeContextType {
  mode: ColorMode;
  toggleColorMode: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useColorMode = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useColorMode must be used within ThemeProvider');
  return context;
};

export const ThemeContextProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mode, setMode] = useState<ColorMode>(() => {
    const saved = localStorage.getItem('themeMode');
    return (saved as ColorMode) || 'light';
  });

  const toggleColorMode = () => {
    setMode((prev) => {
      const newMode = prev === 'light' ? 'dark' : 'light';
      localStorage.setItem('themeMode', newMode);
      return newMode;
    });
  };

  const theme = useMemo(() => createTheme({
    palette: {
      mode,
      // ... your theme configuration
    },
  }), [mode]);

  return (
    <ThemeContext.Provider value={{ mode, toggleColorMode }}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </ThemeContext.Provider>
  );
};
```

#### 4.4: Engine Allowed Issuers Configuration

**Action:** Configure `ENGINE_ALLOWED_ISSUERS` to accept tokens from both Docker network and localhost.

**Checklist:**
- [ ] Verify `docker-compose.yml` includes both URLs in `ENGINE_ALLOWED_ISSUERS`:
  ```yaml
  ENGINE_ALLOWED_ISSUERS: http://keycloak:11000/realms/${VITE_NC_KC_REALM},http://localhost:11000/realms/${VITE_NC_KC_REALM}
  ```
- [ ] Test API calls with tokens issued from browser (localhost)
- [ ] Verify no 401 errors occur after login

**Why Required:** The frontend runs in the browser and uses `localhost` to access Keycloak, but the engine runs in Docker and needs to accept tokens from both the internal Docker network and localhost.

**Reference:** [14-TROUBLESHOOTING.md](./14-TROUBLESHOOTING.md#43-engine-rejects-jwt-tokens-401-unauthorized)

### Phase 5: Integration
- [ ] Complete flows work end-to-end
- [ ] Real-time updates work
- [ ] Error handling works
- [ ] Role-based access works
- [ ] Keycloak theme displays correctly
- [ ] Language switching works
- [ ] Theme switching works
- [ ] All features persist across page reloads

## Troubleshooting

### Common Issues

1. **Actions not showing:**
   - Check `protocol.actions` field exists
   - Verify backend returns `@actions` field
   - Check button visibility logic

2. **Sections not displaying:**
   - Verify NPL comments are correct
   - Check section grouping logic
   - Verify field mapping

3. **Forms not submitting:**
   - Check API endpoint names
   - Verify command structure
   - Check validation errors

4. **SSE not working:**
   - Verify SSE service is configured
   - Check protocol type names
   - Verify connection status

---

## Final Validation: Application Testing

### Final Step 1: Clean Start and Test Application

**Action:** After completing all phases, test the full application stack:

```bash
# Clean up any previous state and start fresh
make clean up
```

This command will:
1. Stop and remove all containers
2. Remove volumes (clean database state)
3. Rebuild all Docker images
4. Start all services

### Final Step 2: Monitor Startup and Fix Issues

**Action:** Watch the logs and fix any issues that arise:

```bash
# Watch logs for all services
make logs

# Or watch specific service logs
docker compose logs -f keycloak
docker compose logs -f engine
docker compose logs -f frontend
```

**IMPORTANT:** If any service fails to start, you MUST:

1. **Read the error logs carefully** to understand the root cause
2. **Fix the underlying issue** in the configuration or code
3. **Re-run `make clean up`** to test the fix
4. **Repeat until all services are healthy**

### Final Step 3: Common Startup Issues and Fixes

| Service | Common Error | Fix |
|---------|--------------|-----|
| **Keycloak** | Build fails during Docker build | Remove `RUN kc.sh build` from Dockerfile - use `start-dev` mode instead |
| **Keycloak** | Cannot connect to database | Check `KC_DB_URL` and ensure keycloak-db is healthy first |
| **Engine** | NPL compilation errors | Fix NPL syntax errors and rebuild |
| **Engine** | Cannot connect to Keycloak | Ensure Keycloak is healthy before engine starts |
| **Frontend** | TypeScript errors | Run `npm run build` locally to see errors |

### Final Step 4: Verify All Services Are Running

**Action:** Check that all services are healthy:

```bash
# Check service status
docker compose ps

# Expected output - all services should show "healthy" or "running"
```

**Verification Endpoints:**
- ✅ Engine Health: http://localhost:12000/actuator/health
- ✅ Engine Swagger: http://localhost:12000/swagger-ui.html
- ✅ Keycloak Admin: http://localhost:11000
- ✅ Frontend: http://localhost:5173
- ✅ GraphQL Playground: http://localhost:15001/graphql

### Final Step 5: Test User Login Flow

**Action:** Complete end-to-end login test:

1. Navigate to http://localhost:5173
2. Click "Sign In"
3. Login with test credentials (e.g., `owner@example.com` / `welcome`)
4. Verify dashboard loads
5. Navigate to each section
6. Test creating a new entity

**DO NOT proceed until the application is fully functional!**

## Next Steps

Once generation is complete:

1. **Review generated code** for any customizations needed
2. **Test thoroughly** with real data
3. **Optimize performance** as needed
4. **Add additional features** as required
5. **Deploy** to production

## Summary

This workflow ensures:
- ✅ Complete frontend generation from NPL
- ✅ Consistent patterns across all protocols
- ✅ Proper integration of all components
- ✅ Production-ready code quality

Follow each phase sequentially, and you'll have a complete, working frontend application!

