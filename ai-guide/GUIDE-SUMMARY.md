# AI Guide Summary

## Overview

This guide provides **complete instructions** for generating a full-stack application from NPL protocols, including:
- Complete application infrastructure (Docker, services, configuration)
- Keycloak role generation from NPL protocol parties
- Complete React/TypeScript frontend with all patterns

## Guide Files

### Prerequisites & Setup
1. **PREREQUISITES.md** - Required tools and setup
2. **QUICK-START.md** - Quick start guide
3. **01-PROJECT-SETUP.md** - Project initialization and structure
4. **02-NPL-DEVELOPMENT.md** - NPL development guidelines and syntax
5. **03-KEYCLOAK-PROVISIONING.md** - Keycloak setup and role generation
6. **03a-KEYCLOAK-THEMING.md** - Keycloak login theme customization (REQUIRED)
7. **04-FRONTEND-SETUP.md** - Frontend project initialization

### Frontend Generation
7. **05-SIDEBAR-NAVIGATION.md** - Collapsible sidebar navigation
   - Generate sidebar from packages
   - Collapsible sections for protocols
   - Collapsible sidebar (full/collapsed states)
   - Role-based visibility
   - Responsive design

8. **06-ACTION-BUTTONS.md** - Centralized button library (CREATE FIRST!)
   - One button per `@api` permission
   - Uses `@actions` field from API response
   - Validation from `require()` statements
   - Consistent dialog patterns

9. **07-DETAIL-PAGES.md** - Detail views (uses action buttons)
   - Action buttons integration
   - Section organization from NPL comments
   - Variable display based on annotations

10. **08-OVERVIEW-PAGES.md** - Table pages
    - One overview page per protocol
    - Data tables with search/filter
    - "Create New" buttons
    - Real-time updates via SSE

11. **09-CREATION-FORMS.md** - Form generation
    - Forms from protocol parameters
    - Validation from NPL `require()` statements
    - Field type mapping

12. **10-CODE-TEMPLATES.md** - Complete code examples
    - Copy-paste ready templates
    - Service provider
    - Router configuration
    - Complete component examples

13. **11-STEP-BY-STEP.md** - Complete workflow
    - Phase-by-phase instructions
    - Checklist for completion
    - Troubleshooting guide

### Additional Features
14. **12-LOCALIZATION.md** - Internationalization (i18n)
    - react-i18next setup
    - Translation file structure
    - Language switcher component
    - Multi-language support

## Key Features

### Automatic Role Generation
- **Extracts parties** from NPL protocol declarations
- **Generates Keycloak roles** automatically
- **Creates demo users** for each role
- **Uses context** from NPL generation prompt for descriptions

### Complete Application Stack
- **Docker Compose** with all services
- **Makefile** for common operations
- **Environment configuration** templates
- **Service dependencies** and health checks

### Frontend Patterns
- **Protocol-centric** architecture
- **Backend actions** as source of truth
- **Consistent patterns** across all components
- **Real-time updates** via SSE

## Usage

> ⚠️ **CRITICAL: NPL First, Then TypeScript**
> 
> You MUST complete and compile the NPL protocols before working on TypeScript frontend code. The frontend depends on the OpenAPI-generated client which is only available after running `mvn package` on the NPL project.

1. **Copy the `/ai-guide-npl` folder** into your clean repository
2. **Follow 01-PROJECT-SETUP.md** to set up infrastructure (Docker, services, configuration)
3. **Follow 02-NPL-DEVELOPMENT.md** to create NPL protocols
4. **Compile NPL:** Run `cd npl && mvn package` to generate OpenAPI spec
5. **Follow 03-KEYCLOAK-PROVISIONING.md** to configure Keycloak roles and users
6. **Follow 04-FRONTEND-SETUP.md** to set up frontend project
7. **Start the system:** Run `make up` (this automatically generates the API client)
8. **Follow guides 05-09** to generate frontend components
9. **Use 11-STEP-BY-STEP.md** as a checklist for the complete workflow

## What Gets Generated

### Infrastructure
- ✅ Docker Compose configuration
- ✅ Makefile with all commands
- ✅ Environment variable templates
- ✅ Keycloak roles from NPL parties
- ✅ Service configurations

### Frontend
- ✅ Sidebar navigation from packages
- ✅ Overview pages (one per protocol)
- ✅ Detail pages (one per protocol)
- ✅ Creation forms (one per protocol)
- ✅ Action button library (one per @api action)
- ✅ Routes and navigation
- ✅ Real-time updates

## Result

A **complete, production-ready application** with:
- Full backend infrastructure
- Automatic role-based access control
- Complete frontend with all patterns
- Consistent UI/UX
- Real-time updates
- Proper error handling

All generated from NPL protocols and this guide!

