# 17 - Noumena Cloud Deployment

## ⚠️ CRITICAL: Client Request Only

**Cloud deployment should ONLY be generated when explicitly requested by the client.** This is an optional feature that should not be included in the standard application build process unless the client specifically asks for it.

**When to generate cloud deployment:**
- ✅ Client explicitly requests cloud deployment
- ✅ Client asks to "deploy to Noumena Cloud"
- ✅ Client wants to publish the application to production

**When NOT to generate cloud deployment:**
- ❌ Standard application builds
- ❌ Client hasn't mentioned cloud deployment
- ❌ Automatic generation without request

---

## Overview

This guide covers deploying your NPL application to **Noumena Cloud**. The deployment process includes:
- Building and deploying NPL protocols
- Building and deploying the frontend
- Provisioning Keycloak (optional, separate step)

## Prerequisites

Before deploying to Noumena Cloud, ensure:
- ✅ All NPL protocols are complete and tested
- ✅ Frontend is complete and tested
- ✅ Makefile exists with deployment commands
- ✅ Environment variables are configured for cloud deployment
- ✅ NPL CLI is installed (`brew install NoumenaDigital/tools/npl` or equivalent)
- ✅ You have Noumena Cloud credentials configured

## Environment Variables Required

Ensure your `.env` file includes:

```env
# NOUMENA Cloud Configuration
VITE_NC_ORG_NAME=your-org-name
VITE_NC_APP_NAME=your-app-name
VITE_NC_APP_SLUG=your-app-slug
NC_DOMAIN=noumena.cloud
VITE_NC_KC_REALM=your-realm-name
```

## Deployment Steps

### Step 1: Validate and Generate OpenAPI

```bash
npl check --source-dir npl/src/main/npl-1.0
npl openapi --source-dir npl/src/main/npl-1.0 --rules npl/src/main/rules.yml --output-dir npl/target
```

This validates all NPL protocols and generates the OpenAPI specification.

### Step 2: Clear Existing Deployment (Optional)

If the app already exists in Noumena Cloud and you want a fresh deployment:

```bash
npl cloud clear npl --tenant ${VITE_NC_ORG_NAME} --app ${VITE_NC_APP_SLUG} || echo "App doesn't exist yet, continuing with deployment..."
```

This step is safe to run even if the app doesn't exist yet (it will just print a message and continue).

### Step 4: Deploy NPL Protocols

```bash
npl cloud deploy npl --tenant ${VITE_NC_ORG_NAME} --app ${VITE_NC_APP_SLUG} --migration npl/src/main/migration.yml
```

This deploys your NPL protocols to Noumena Cloud.

### Step 5: Build Frontend

```bash
cd frontend && npm run build
```

This creates the production-ready `frontend/dist` directory.

### Step 6: Deploy Frontend

```bash
npl cloud deploy frontend --tenant ${VITE_NC_ORG_NAME} --app ${VITE_NC_APP_SLUG} --frontend frontend/dist
```

This deploys your frontend to Noumena Cloud.

## Makefile Integration

The Makefile should include a `clear-deploy` target that automates all these steps:

```makefile
.PHONY: clear-deploy
clear-deploy:
	@if [ -z "$(NC_APP)" ] ; then echo "App $(NC_APP) not found"; exit 1; fi
	npl check --source-dir npl/src/main/npl-1.0
	npl openapi --source-dir npl/src/main/npl-1.0 --rules npl/src/main/rules.yml --output-dir npl/target
	-npl cloud clear npl --tenant $(NC_ORG) --app $(NC_APP) || echo "App $(NC_APP) doesn't exist yet, continuing with deployment..."
	npl cloud deploy npl --tenant $(NC_ORG) --app $(NC_APP) --migration npl/src/main/migration.yml
	cd frontend && npm run build; cd -
	npl cloud deploy frontend --tenant $(NC_ORG) --app $(NC_APP) --frontend frontend/dist
```

## Keycloak Provisioning (Separate Step)

Keycloak provisioning is typically done separately using the `cloud-keycloak-provision-app` make target:

```makefile
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
```

**Note:** This phase focuses on NPL and frontend deployment. Keycloak provisioning can be done manually or as a separate step.

## Implementation Instructions

When implementing this phase:

1. **Verify Makefile exists** with `clear-deploy` target
2. **Check environment variables** are set for cloud deployment
3. **Run the deployment commands** in sequence:
   - Validate & generate OpenAPI: `npl check ... && npl openapi ...`
   - Clear existing deployment (optional): `npl cloud clear npl --tenant ... --app ...`
   - Deploy NPL: `npl cloud deploy npl --tenant ... --app ... --migration ...`
   - Build frontend: `cd frontend && npm run build`
   - Deploy frontend: `npl cloud deploy frontend --tenant ... --app ... --frontend ...`
4. **Handle errors gracefully** - deployment may fail if credentials are missing or app already exists
5. **Log all output** for debugging

## Definition of Done

- ✅ NPL protocols compiled successfully (`npl/target/` contains artifacts)
- ✅ Frontend built successfully (`frontend/dist/` exists)
- ✅ Deployment commands executed (or documented if manual step required)
- ✅ Environment variables configured for cloud deployment

## Common Issues

### Missing NPL CLI
- **Error:** `npl: command not found`
- **Solution:** Install NPL CLI: `brew install NoumenaDigital/tools/npl`

### Missing Environment Variables
- **Error:** `App not found` or deployment fails
- **Solution:** Ensure `.env` file has all required `VITE_NC_*` variables set

### Frontend Build Fails
- **Error:** `npm run build` fails
- **Solution:** Check frontend dependencies are installed and TypeScript errors are resolved

### Deployment Permission Errors
- **Error:** Authentication or permission errors
- **Solution:** Verify Noumena Cloud credentials are configured correctly

## Next Steps

After successful deployment:
- Verify the application is accessible at the cloud URL
- Test authentication and authorization
- Provision Keycloak if needed (separate step)
- Monitor application logs in Noumena Cloud dashboard
