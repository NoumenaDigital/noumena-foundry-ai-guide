# Prerequisites Checklist

Before using this guide to generate a complete NPL application, ensure you have the following:

## System Requirements

- ✅ **Docker & Docker Compose** - For running all services locally
- ✅ **Node.js** (v18+) - For frontend development
- ✅ **Java** (JDK 11+) - For NPL compilation
- ✅ **Maven** (3.6+) - For building NPL projects
- ✅ **Make** - For running build commands (optional but recommended)
- ✅ **Terraform** (1.0+) - For Keycloak provisioning (optional)

## Required Knowledge

### For AI/Developer

- ✅ **NPL Syntax** - Understanding of NOUMENA Protocol Language
- ✅ **React/TypeScript** - Basic understanding of React hooks and TypeScript
- ✅ **REST APIs** - Understanding of API calls and OpenAPI specifications
- ✅ **Docker Basics** - Understanding of containers and Docker Compose
- ✅ **Keycloak Basics** - Understanding of authentication and roles (optional)

## Required Information

Before starting, gather the following information:

### Project Metadata

- ✅ **Tenant Name** - Organization/tenant identifier
- ✅ **App Name** - Application identifier
- ✅ **Package Name** - NPL package name (e.g., `productcenter`, `riskmanagement`)

### Business Requirements

- ✅ **Protocol Definitions** - What protocols need to be created?
- ✅ **Party Definitions** - Who are the parties in each protocol?
- ✅ **State Transitions** - What states can protocols be in?
- ✅ **Permissions** - What actions can each party perform?
- ✅ **Business Rules** - What validation rules apply?

### Infrastructure Details

- ✅ **Keycloak Realm** - Realm name (default: `seed`)
- ✅ **Database Name** - PostgreSQL database name
- ✅ **API Port** - Backend API port (default: `12001`)
- ✅ **Keycloak Port** - Keycloak port (default: `11000`)

## Required Files & Structure

### Initial Project Structure

```
project-root/
├── docker-compose.yml          # (Will be created)
├── Makefile                    # (Will be created)
├── .env                        # (Will be created)
├── npl/                        # (Will be created)
│   ├── Dockerfile
│   ├── pom.xml
│   └── src/main/npl-1.0/
├── frontend/                   # (Will be created)
│   ├── package.json
│   └── src/
├── keycloak-provisioning/      # (Will be created)
│   └── terraform.tf
└── ai-guide-npl/               # (Copy this folder)
    └── [all guide files]
```

### NPL Engine Access

- ✅ **NPL Engine Docker Image** - Access to NOUMENA NPL Engine image
- ✅ **Engine Version** - Know which version to use

### Keycloak Setup

- ✅ **Keycloak Docker Image** - Access to Keycloak image
- ✅ **Admin Credentials** - Default admin username/password (can be changed)

## Environment Variables

You'll need to set up these environment variables (see [01-PROJECT-SETUP.md](./01-PROJECT-SETUP.md)):

### Local Development

```bash
VITE_LOCAL_API_URL=http://localhost:12001
VITE_LOCAL_KC_URL=http://localhost:11000
VITE_DEPLOYMENT_TARGET=LOCAL
```

### Noumena Cloud (if applicable)

```bash
VITE_NC_ORG_NAME=your-tenant
VITE_NC_APP_SLUG=your-app
VITE_NC_KC_REALM=seed
VITE_DEPLOYMENT_TARGET=NOUMENA_CLOUD
```

## Dependencies

### Frontend Dependencies

The frontend will need these packages (see [04-FRONTEND-SETUP.md](./04-FRONTEND-SETUP.md)):

- React 18+
- TypeScript 5+
- Material-UI (MUI) 5+
- React Router 6+
- React Hook Form
- Keycloak JS
- i18next
- And more...

### Backend Dependencies

The NPL project will need:

- NPL Engine Maven plugin
- OpenAPI Generator Maven plugin
- PostgreSQL driver (if needed)

## Verification Checklist

Before starting generation, verify:

- ✅ Docker is running: `docker ps`
- ✅ Ports are available: `12001`, `11000`, `5432`, `5672`
- ✅ Node.js version: `node --version` (should be 18+)
- ✅ Maven version: `mvn --version` (should be 3.6+)
- ✅ Java version: `java --version` (should be 11+)
- ✅ NPL plugin available: Version 2025.2.6 on Maven Central (https://central.sonatype.com/artifact/com.noumenadigital.platform/npl-maven-plugin)

## What You'll Create

### Phase 1: Infrastructure
- Docker Compose configuration
- Makefile
- Environment variables
- Service configurations

### Phase 2: NPL Protocols
- Protocol definitions
- Party declarations
- State management
- Permissions and obligations

### Phase 3: Keycloak
- Terraform configuration
- Role definitions
- User creation

### Phase 4: Frontend
- React project setup
- Component generation
- Routing configuration
- API integration

## Next Steps

Once all prerequisites are met:

1. **Copy the `/ai-guide-npl` folder** into your project root
2. **Start with [01-PROJECT-SETUP.md](./01-PROJECT-SETUP.md)** - Set up infrastructure
3. **Follow guides in numerical order** - Each builds on the previous
4. **Reference [10-CODE-TEMPLATES.md](./10-CODE-TEMPLATES.md)** - For code examples
5. **Use [11-STEP-BY-STEP.md](./11-STEP-BY-STEP.md)** - For complete workflow

## Getting Help

If you encounter issues:

1. Check the specific guide for your current step
2. Review the code templates in [10-CODE-TEMPLATES.md](./10-CODE-TEMPLATES.md)
3. Verify all prerequisites are met
4. Check Docker logs: `docker-compose logs [service-name]`
5. Verify environment variables are set correctly

