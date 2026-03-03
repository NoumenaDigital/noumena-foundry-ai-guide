# -01 - Build Scripts Generation

## Overview

**This is the first step before any development begins.**

Before setting up infrastructure, writing NPL protocols, or building the frontend, generate project-specific utility scripts that will track progress and generate prompts throughout the build process. These scripts are derived from your business logic document and are tailored to your specific domain entities.

## Prerequisites

- A business logic document (e.g., `BusinessLogic.md`) that defines:
  - Domain entities (e.g., DogProfile, Command, FoodEntry)
  - Roles and permissions (e.g., Owner, Trainer)
  - Data fields for each entity
  - Permission matrix

## Step 1: Create Scripts Directory

```bash
mkdir -p scripts
```

## Step 2: Analyze Business Logic

From your business logic document, extract:

### 2.1 Domain Entities
List all entities that will become NPL protocols and frontend components.

**Example from a dog management app:**
- DogProfile
- Command
- TrainingProgress
- TrainingSession
- FoodEntry
- Medication
- DoseLog
- WeightEntry
- VetVisit

### 2.2 Roles
List all roles that will become Keycloak roles.

**Example:**
- Owner (pOwner)
- Trainer (pTrainer)

### 2.3 Package Name
Determine the NPL package name (typically derived from the app name).

**Example:** `myapp` (lowercase, no spaces)

## Step 3: Generate Monitor Script

**File:** `scripts/monitor-build.sh`

This script tracks which files have been created across all phases.

### Template Structure

```bash
#!/bin/bash

# =============================================================================
# [APP_NAME] - Build Monitor & Progress Tracker
# =============================================================================
# This script monitors the build progress and provides status updates
# Run with: ./scripts/monitor-build.sh
# =============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Project root
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo -e "${CYAN}"
echo "╔════════════════════════════════════════════════════════════════════╗"
echo "║           [APP_NAME] - Build Progress Monitor                       ║"
echo "╚════════════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# =============================================================================
# Phase 1: Infrastructure Files
# =============================================================================
check_infrastructure() {
    echo -e "\n${PURPLE}━━━ Phase 1: Infrastructure ━━━${NC}"
    
    local infra_files=(
        "docker-compose.yml"
        "Makefile"
        ".env"
        "npl/pom.xml"
        "npl/Dockerfile"
        "nginx/nginx.conf"
        "db_init/db_init.sh"
        "rabbitmq/Dockerfile"
    )
    
    local found=0
    local total=${#infra_files[@]}
    
    for file in "${infra_files[@]}"; do
        if [ -f "$PROJECT_ROOT/$file" ]; then
            echo -e "  ${GREEN}✓${NC} $file"
            ((found++))
        else
            echo -e "  ${RED}✗${NC} $file ${YELLOW}(missing)${NC}"
        fi
    done
    
    echo -e "\n  ${BLUE}Progress: $found/$total files${NC}"
    return $((total - found))
}

# =============================================================================
# Phase 2: NPL Protocols
# =============================================================================
check_npl_protocols() {
    echo -e "\n${PURPLE}━━━ Phase 2: NPL Protocols ━━━${NC}"
    
    # UPDATE THIS: Set your NPL package directory
    local npl_dir="$PROJECT_ROOT/npl/src/main/npl-1.0/[PACKAGE_NAME]"
    
    # UPDATE THIS: List all protocols from your business logic
    local npl_files=(
        "[Entity1].npl"
        "[Entity2].npl"
        "[Entity3].npl"
        # ... add all entities from BusinessLogic.md
    )
    
    local found=0
    local total=${#npl_files[@]}
    
    if [ ! -d "$npl_dir" ]; then
        echo -e "  ${YELLOW}NPL directory not found: $npl_dir${NC}"
        for file in "${npl_files[@]}"; do
            echo -e "  ${RED}✗${NC} $file ${YELLOW}(missing)${NC}"
        done
    else
        for file in "${npl_files[@]}"; do
            if [ -f "$npl_dir/$file" ]; then
                echo -e "  ${GREEN}✓${NC} $file"
                ((found++))
            else
                echo -e "  ${RED}✗${NC} $file ${YELLOW}(missing)${NC}"
            fi
        done
    fi
    
    echo -e "\n  ${BLUE}Progress: $found/$total protocols${NC}"
    return $((total - found))
}

# =============================================================================
# Phase 3: Keycloak Provisioning
# =============================================================================
check_keycloak() {
    echo -e "\n${PURPLE}━━━ Phase 3: Keycloak Provisioning ━━━${NC}"
    
    local kc_files=(
        "keycloak-provisioning/terraform.tf"
        "keycloak-provisioning/providers.tf"
        "keycloak-provisioning/Dockerfile"
        "keycloak-provisioning/local.sh"
    )
    
    local found=0
    local total=${#kc_files[@]}
    
    for file in "${kc_files[@]}"; do
        if [ -f "$PROJECT_ROOT/$file" ]; then
            echo -e "  ${GREEN}✓${NC} $file"
            ((found++))
        else
            echo -e "  ${RED}✗${NC} $file ${YELLOW}(missing)${NC}"
        fi
    done
    
    echo -e "\n  ${BLUE}Progress: $found/$total files${NC}"
    return $((total - found))
}

# =============================================================================
# Phase 4: Frontend Structure
# =============================================================================
check_frontend_structure() {
    echo -e "\n${PURPLE}━━━ Phase 4: Frontend Structure ━━━${NC}"
    
    local fe_files=(
        "frontend/package.json"
        "frontend/tsconfig.json"
        "frontend/vite.config.ts"
        "frontend/index.html"
        "frontend/src/main.tsx"
        "frontend/src/App.tsx"
        "frontend/src/Router.tsx"
        "frontend/src/ServiceProvider.tsx"
        "frontend/src/AuthProvider.tsx"
        "frontend/src/theme.ts"
    )
    
    local found=0
    local total=${#fe_files[@]}
    
    for file in "${fe_files[@]}"; do
        if [ -f "$PROJECT_ROOT/$file" ]; then
            echo -e "  ${GREEN}✓${NC} $file"
            ((found++))
        else
            echo -e "  ${RED}✗${NC} $file ${YELLOW}(missing)${NC}"
        fi
    done
    
    echo -e "\n  ${BLUE}Progress: $found/$total files${NC}"
    return $((total - found))
}

# =============================================================================
# Phase 5: Frontend Components
# =============================================================================
check_frontend_components() {
    echo -e "\n${PURPLE}━━━ Phase 5: Frontend Components ━━━${NC}"
    
    # UPDATE THIS: List overview pages for each entity that needs one
    echo -e "\n  ${CYAN}Overview Pages:${NC}"
    local overview_pages=(
        "[Entity1]Overview.tsx"
        "[Entity2]Overview.tsx"
        # ... add all entities that need overview pages
    )
    
    local overview_found=0
    for file in "${overview_pages[@]}"; do
        if [ -f "$PROJECT_ROOT/frontend/src/components/overview-pages/$file" ]; then
            echo -e "    ${GREEN}✓${NC} $file"
            ((overview_found++))
        else
            echo -e "    ${RED}✗${NC} $file ${YELLOW}(missing)${NC}"
        fi
    done
    
    # UPDATE THIS: List detail pages for each entity
    echo -e "\n  ${CYAN}Detail Pages:${NC}"
    local detail_pages=(
        "[Entity1]DetailPage.tsx"
        "[Entity2]DetailPage.tsx"
        # ... add all entities
    )
    
    local detail_found=0
    for file in "${detail_pages[@]}"; do
        if [ -f "$PROJECT_ROOT/frontend/src/components/detail-pages/$file" ]; then
            echo -e "    ${GREEN}✓${NC} $file"
            ((detail_found++))
        else
            echo -e "    ${RED}✗${NC} $file ${YELLOW}(missing)${NC}"
        fi
    done
    
    # UPDATE THIS: List creation forms for each entity
    echo -e "\n  ${CYAN}Creation Forms:${NC}"
    local creation_forms=(
        "[Entity1]CreationForm.tsx"
        "[Entity2]CreationForm.tsx"
        # ... add all entities that need creation forms
    )
    
    local forms_found=0
    for file in "${creation_forms[@]}"; do
        if [ -f "$PROJECT_ROOT/frontend/src/components/creation-forms/$file" ]; then
            echo -e "    ${GREEN}✓${NC} $file"
            ((forms_found++))
        else
            echo -e "    ${RED}✗${NC} $file ${YELLOW}(missing)${NC}"
        fi
    done
    
    # Shared components (usually same for all projects)
    echo -e "\n  ${CYAN}Shared Components:${NC}"
    local shared_components=(
        "SidebarNavigation.tsx"
        "PageHeader.tsx"
        "Layout.tsx"
        "ProtectedRoute.tsx"
        "ErrorBoundary.tsx"
    )
    
    local shared_found=0
    for file in "${shared_components[@]}"; do
        if [ -f "$PROJECT_ROOT/frontend/src/components/shared/$file" ]; then
            echo -e "    ${GREEN}✓${NC} $file"
            ((shared_found++))
        else
            echo -e "    ${RED}✗${NC} $file ${YELLOW}(missing)${NC}"
        fi
    done
    
    local total=$((${#overview_pages[@]} + ${#detail_pages[@]} + ${#creation_forms[@]} + ${#shared_components[@]}))
    local found=$((overview_found + detail_found + forms_found + shared_found))
    
    echo -e "\n  ${BLUE}Progress: $found/$total components${NC}"
    return $((total - found))
}

# =============================================================================
# Summary
# =============================================================================
print_summary() {
    echo -e "\n${CYAN}"
    echo "╔════════════════════════════════════════════════════════════════════╗"
    echo "║                         Build Summary                               ║"
    echo "╚════════════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
    
    local total_missing=$1
    
    if [ $total_missing -eq 0 ]; then
        echo -e "${GREEN}✓ All files present! Ready for build.${NC}"
        echo ""
        echo -e "${YELLOW}Next steps:${NC}"
        echo "  1. cd npl && mvn package     # Compile NPL"
        echo "  2. make up                    # Start services"
        echo "  3. cd frontend && npm install # Install dependencies"
        echo "  4. npm run dev                # Start frontend"
    else
        echo -e "${YELLOW}⚠ $total_missing files still missing${NC}"
        echo ""
        echo -e "${YELLOW}To continue building:${NC}"
        echo "  1. Use Cursor Agent Mode"
        echo "  2. Follow the ai-guide-npl phases"
        echo "  3. Run this script again to check progress"
    fi
    
    echo ""
}

# =============================================================================
# Main
# =============================================================================
main() {
    local missing=0
    
    check_infrastructure
    missing=$((missing + $?))
    
    check_npl_protocols
    missing=$((missing + $?))
    
    check_keycloak
    missing=$((missing + $?))
    
    check_frontend_structure
    missing=$((missing + $?))
    
    check_frontend_components
    missing=$((missing + $?))
    
    print_summary $missing
}

main
```

### Customization Instructions

Replace the following placeholders based on your `BusinessLogic.md`:

| Placeholder | Replace With |
|-------------|--------------|
| `[APP_NAME]` | Your application name (e.g., "My App") |
| `[PACKAGE_NAME]` | Your NPL package name (e.g., "myapp") |
| `[Entity1].npl`, `[Entity2].npl`, etc. | Your domain entity names as `.npl` files |
| `[Entity1]Overview.tsx`, etc. | Your entity names with appropriate suffixes |

## Step 4: Generate Prompt Generator Script

**File:** `scripts/generate-prompts.sh`

This script generates optimized prompts for Cursor Agent Mode.

### Template Structure

```bash
#!/bin/bash

# =============================================================================
# [APP_NAME] - Cursor Prompt Generator
# =============================================================================
# Generates optimized prompts for Cursor Agent Mode
# Run with: ./scripts/generate-prompts.sh [phase]
# Phases: infra, npl, keycloak, frontend, components, all
# =============================================================================

set -e

# Colors
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
NC='\033[0m'

# =============================================================================
# Phase 1: Infrastructure Prompt
# =============================================================================
prompt_infrastructure() {
    echo -e "${CYAN}━━━ Phase 1: Infrastructure Setup Prompt ━━━${NC}"
    echo ""
    cat << 'EOF'
Following the ai-guide-npl (specifically 01-PROJECT-SETUP.md), create the complete infrastructure for [APP_NAME]:

## Files to Create:

1. **docker-compose.yml** - Include all services:
   - engine (NPL runtime)
   - engine-db (PostgreSQL)
   - history service
   - read-model (GraphQL)
   - keycloak
   - keycloak-db
   - keycloak-provisioning
   - rabbitmq
   - nginx-proxy
   - frontend

2. **Makefile** - Include commands:
   - up, down, logs
   - npl-test, npl-docker
   - clean
   - frontend-build, frontend-dev

3. **.env** - Environment variables template

4. **npl/pom.xml** - Maven configuration for NPL compilation

5. **npl/Dockerfile** - NPL engine Dockerfile

6. **nginx/nginx.conf** - Proxy configuration with SSE support

7. **db_init/db_init.sh** - Database initialization script

8. **rabbitmq/Dockerfile** - RabbitMQ configuration

## Requirements:
- Follow the exact patterns from 01-PROJECT-SETUP.md
- Use PLATFORM_VERSION=2025.2.6 (check Maven Central for updates: https://central.sonatype.com/artifact/com.noumenadigital.platform/npl-maven-plugin)
- Configure ports: 12001 (API), 11000 (Keycloak), 5173 (Frontend)
- Include health checks for all services

Generate all files completely. Do not use placeholders.
EOF
    echo ""
}

# =============================================================================
# Phase 2: NPL Protocols Prompt
# =============================================================================
prompt_npl() {
    echo -e "${CYAN}━━━ Phase 2: NPL Protocols Prompt ━━━${NC}"
    echo ""
    # UPDATE THIS SECTION based on your BusinessLogic.md
    cat << 'EOF'
Following the ai-guide-npl (specifically 02-NPL-DEVELOPMENT.md) and BusinessLogic.md, create all NPL protocols for [APP_NAME]:

## Package: [PACKAGE_NAME]

## Protocols to Create:

[LIST ALL PROTOCOLS FROM BusinessLogic.md WITH:]
- Protocol name
- Parties involved
- Key fields
- Permissions
- States (if applicable)

## Requirements for ALL protocols:
- Include @api annotation on protocol
- Add @frontend comments for UI generation
- Include require() statements for validation
- Use proper state machines where applicable
- Follow the patterns from 02-NPL-DEVELOPMENT.md exactly

Generate all protocol files in: npl/src/main/npl-1.0/[PACKAGE_NAME]/
EOF
    echo ""
}

# =============================================================================
# Phase 3: Keycloak Prompt
# =============================================================================
prompt_keycloak() {
    echo -e "${CYAN}━━━ Phase 3: Keycloak Provisioning Prompt ━━━${NC}"
    echo ""
    # UPDATE THIS SECTION based on your roles
    cat << 'EOF'
Following the ai-guide-npl (specifically 03-KEYCLOAK-PROVISIONING.md), create the Keycloak provisioning configuration:

## Roles to Create (from NPL parties):
[LIST ROLES FROM BusinessLogic.md]

## Files to Create:

1. **keycloak-provisioning/terraform.tf** - Main Terraform config
   - Create realm: [PACKAGE_NAME]
   - Create client: [PACKAGE_NAME]
   - Create roles: [ROLE_LIST]
   - Create demo users for each role

2. **keycloak-provisioning/providers.tf** - Terraform providers

3. **keycloak-provisioning/Dockerfile** - Terraform container

4. **keycloak-provisioning/local.sh** - Local provisioning script

Generate all files completely.
EOF
    echo ""
}

# =============================================================================
# Phase 4: Frontend Structure Prompt
# =============================================================================
prompt_frontend() {
    echo -e "${CYAN}━━━ Phase 4: Frontend Structure Prompt ━━━${NC}"
    echo ""
    cat << 'EOF'
Following the ai-guide-npl (specifically 04-FRONTEND-SETUP.md), create the complete frontend structure:

## Files to Create:

1. **frontend/package.json** - Dependencies including:
   - React 18, TypeScript 5
   - Material-UI 5
   - React Router 6
   - React Hook Form
   - Keycloak JS, @react-keycloak/web
   - i18next
   - Vite

2. **frontend/tsconfig.json** - TypeScript configuration

3. **frontend/vite.config.ts** - Vite configuration with proxy

4. **frontend/index.html** - HTML entry point

5. **frontend/src/main.tsx** - React entry point with providers

6. **frontend/src/App.tsx** - Root component

7. **frontend/src/Router.tsx** - Route configuration

8. **frontend/src/ServiceProvider.tsx** - API service provider

9. **frontend/src/AuthProvider.tsx** - Keycloak authentication

10. **frontend/src/theme.ts** - Material-UI theme

## Requirements:
- Follow the patterns from 04-FRONTEND-SETUP.md
- Configure for local development
- Set realm name to "[PACKAGE_NAME]"

Generate all files completely.
EOF
    echo ""
}

# =============================================================================
# Phase 5: Frontend Components Prompt
# =============================================================================
prompt_components() {
    echo -e "${CYAN}━━━ Phase 5: Frontend Components Prompt ━━━${NC}"
    echo ""
    # UPDATE THIS SECTION based on your BusinessLogic.md entities
    cat << 'EOF'
Following the ai-guide-npl (04-08 guides), create all frontend components:

## Shared Components (frontend/src/components/shared/):
- SidebarNavigation.tsx (with menu structure from BusinessLogic.md)
- PageHeader.tsx
- Layout.tsx
- ProtectedRoute.tsx
- RoleProtectedRoute.tsx
- ErrorBoundary.tsx
- PageNotFound.tsx

## Overview Pages (frontend/src/components/overview-pages/):
[LIST ALL ENTITY OVERVIEW PAGES]

## Detail Pages (frontend/src/components/detail-pages/):
[LIST ALL ENTITY DETAIL PAGES]

## Creation Forms (frontend/src/components/creation-forms/):
[LIST ALL ENTITY CREATION FORMS]

## Action Buttons (frontend/src/components/action-buttons/):
[LIST ACTION BUTTONS FOR ENTITIES WITH STATE-CHANGING ACTIONS]

## Requirements:
- Follow patterns from 04-08 guides exactly
- Use protocol.actions for button visibility
- Include search and filtering in overview pages

Generate all component files completely.
EOF
    echo ""
}

# =============================================================================
# Main
# =============================================================================
main() {
    local phase=${1:-all}
    
    echo -e "${GREEN}"
    echo "╔════════════════════════════════════════════════════════════════════╗"
    echo "║           [APP_NAME] - Cursor Prompt Generator                      ║"
    echo "╚════════════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
    echo ""
    echo -e "${YELLOW}Usage: Copy the prompt below and paste into Cursor Agent Mode (Cmd+I)${NC}"
    echo ""
    
    case $phase in
        infra|infrastructure)
            prompt_infrastructure
            ;;
        npl|protocols)
            prompt_npl
            ;;
        keycloak|kc)
            prompt_keycloak
            ;;
        frontend|fe)
            prompt_frontend
            ;;
        components|comp)
            prompt_components
            ;;
        all)
            echo -e "${YELLOW}Available phases:${NC}"
            echo "  ./scripts/generate-prompts.sh infra      # Infrastructure setup"
            echo "  ./scripts/generate-prompts.sh npl        # NPL protocols"
            echo "  ./scripts/generate-prompts.sh keycloak   # Keycloak provisioning"
            echo "  ./scripts/generate-prompts.sh frontend   # Frontend structure"
            echo "  ./scripts/generate-prompts.sh components # Frontend components"
            echo ""
            echo -e "${YELLOW}Recommended order:${NC}"
            echo "  1. infra"
            echo "  2. npl"
            echo "  3. keycloak"
            echo "  4. frontend"
            echo "  5. components"
            ;;
        *)
            echo "Unknown phase: $phase"
            echo "Use: infra, npl, keycloak, frontend, components, or all"
            exit 1
            ;;
    esac
}

main "$@"
```

## Step 5: Create README for Scripts

**File:** `scripts/README.md`

```markdown
# [APP_NAME] - Build Scripts

This directory contains scripts to help with the development workflow.

## Scripts

### 1. monitor-build.sh

Monitors the build progress and shows which files are complete vs missing.

```bash
./scripts/monitor-build.sh
```

### 2. generate-prompts.sh

Generates optimized prompts for Cursor Agent Mode.

```bash
# Show available phases
./scripts/generate-prompts.sh

# Generate prompt for specific phase
./scripts/generate-prompts.sh infra      # Infrastructure setup
./scripts/generate-prompts.sh npl        # NPL protocols
./scripts/generate-prompts.sh keycloak   # Keycloak provisioning
./scripts/generate-prompts.sh frontend   # Frontend structure
./scripts/generate-prompts.sh components # Frontend components
```

## Workflow

1. Run `./scripts/monitor-build.sh` to check progress
2. Run `./scripts/generate-prompts.sh [phase]` for the next phase
3. Copy the generated prompt to Cursor Agent Mode (Cmd+I)
4. Let Cursor generate the files
5. Repeat until all files are complete
```

## Step 6: Make Scripts Executable

```bash
chmod +x scripts/monitor-build.sh
chmod +x scripts/generate-prompts.sh
```

## Customization Process

### From BusinessLogic.md to Scripts

1. **Read your BusinessLogic.md** and identify:
   - All domain entities (Section 4: Core Domain Components)
   - All roles (Section 3: Roles & Permissions)
   - The permission matrix
   - Required fields for each entity

2. **Update `monitor-build.sh`:**
   - Replace `[Entity1].npl` with your entity names
   - Update overview pages list
   - Update detail pages list
   - Update creation forms list

3. **Update `generate-prompts.sh`:**
   - Fill in the NPL protocols section with your entities
   - List roles for Keycloak section
   - List components for frontend section

### Example: Dog Management App

From a `BusinessLogic.md` with these entities:
- DogProfile
- Command
- TrainingProgress
- TrainingSession
- FoodEntry
- Medication
- DoseLog
- WeightEntry
- VetVisit

The `npl_files` array becomes:
```bash
local npl_files=(
    "DogProfile.npl"
    "Command.npl"
    "TrainingProgress.npl"
    "TrainingSession.npl"
    "FoodEntry.npl"
    "Medication.npl"
    "DoseLog.npl"
    "WeightEntry.npl"
    "VetVisit.npl"
)
```

## Next Steps

After generating and customizing the scripts:

1. Run `./scripts/monitor-build.sh` to see the initial state (all files missing)
2. Proceed to [01-PROJECT-SETUP.md](./01-PROJECT-SETUP.md) to start building

## Tips

- **Keep scripts updated** - As you add entities, update the scripts
- **Run monitor often** - Check progress after each phase
- **Use prompts wisely** - Each prompt is designed for one Agent Mode session
- **Batch work** - Complete one phase before moving to the next

