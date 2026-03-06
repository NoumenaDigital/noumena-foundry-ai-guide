include .env

GITHUB_SHA=HEAD
NPL_SOURCE_DIR=npl/src/main/npl-1.0
NPL_RULES=npl/src/main/rules.yml
NPL_OPENAPI_OUT=npl/target

ifeq ($(OS),Windows_NT)
PROVISION_SETUP = if not exist .docker-anon mkdir .docker-anon
PROVISION_RUN = set DOCKER_CONFIG=.docker-anon && docker compose --profile app up -d --build keycloak-provisioning
else
PROVISION_SETUP = mkdir -p .docker-anon
PROVISION_RUN = DOCKER_CONFIG=.docker-anon docker compose --profile app up -d --build keycloak-provisioning
endif

## ============================================================================
## BASE INFRASTRUCTURE — run once, always ready
## ============================================================================

# Ensure database init script is executable (required for PostgreSQL initialization)
.PHONY: ensure-db-init-executable
ensure-db-init-executable:
	@echo "Skipping chmod on Windows host"

# Start base infrastructure (all services except keycloak-provisioning and frontend)
.PHONY: infra
infra: ensure-db-init-executable
	docker compose up --wait --build engine read-model history nginx-proxy

# Stop all containers
.PHONY: down
down:
	docker compose down

# Full reset — destroy volumes and rebuild everything
.PHONY: reset
reset: ensure-db-init-executable
	docker compose down -v
	docker compose up --wait --build engine read-model history nginx-proxy

# Check infrastructure health
.PHONY: infra-health
infra-health:
	@echo "=== Container Status ==="
	@docker compose ps
	@echo ""
	@echo "=== Keycloak ==="
	@curl -sf http://host.docker.internal:11000/health/ready > /dev/null && echo "OK" || echo "UNHEALTHY"
	@echo ""
	@echo "=== Engine ==="
	@curl -sf http://localhost:12001/actuator/health | jq -r '.status' 2>/dev/null || echo "UNHEALTHY"

## ============================================================================
## APP SETUP — run after planning phase
## ============================================================================

# Provision Keycloak (create realm, roles, users from terraform.tf)
.PHONY: provision
provision:
	$(PROVISION_SETUP)
	$(PROVISION_RUN)

# Deploy NPL to running engine
.PHONY: npl-deploy
npl-deploy:
	npl check --source-dir $(NPL_SOURCE_DIR)
	npl deploy --source-dir $(NPL_SOURCE_DIR) --clear

# Run NPL tests
.PHONY: npl-test
npl-test:
	npl test --test-source-dir npl/src

# Full app startup (infra + provision + npl + frontend)
.PHONY: up
up: infra provision npl-deploy
	docker compose up -d frontend

## ============================================================================
## FRONTEND
## ============================================================================

.PHONY: frontend
frontend:
	docker compose up -d --build frontend

.PHONY: frontend-build
frontend-build:
	cd frontend && npm run build

.PHONY: frontend-dev
frontend-dev:
	cd frontend && npm run dev

.PHONY: generate-api
generate-api:
	npl openapi --source-dir $(NPL_SOURCE_DIR) --rules $(NPL_RULES) --output-dir $(NPL_OPENAPI_OUT)
	npx --yes openapi-typescript-codegen \
		--input "$$(find $(NPL_OPENAPI_OUT) -name '*.yaml' -o -name '*.yml' | head -1)" \
		--output frontend/src/generated \
		--client fetch --useOptions --useUnionTypes

.PHONY: verify-auth
verify-auth:
	@echo "Auth verification requires running infra/keycloak and valid user credentials."
	@echo "Open http://localhost:5173, login with a provisioned user, then verify /npl calls include Authorization header."

## ============================================================================
## UTILITIES
## ============================================================================

.PHONY: logs
logs:
	docker compose logs -f

.PHONY: logs-engine
logs-engine:
	docker compose logs -f engine

.PHONY: clean
clean:
	docker compose --profile app down -v
	rm -rf $(NPL_OPENAPI_OUT)
	rm -rf frontend/node_modules frontend/dist frontend/build frontend/src/generated
	rm -rf keycloak-provisioning/state.tfstate*
	rm -rf keycloak-provisioning/.terraform*
