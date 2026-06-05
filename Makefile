# =============================================================================
#  Sistema de Inventario — Makefile de orquestación
#
#  IMPORTANTE: antes de `make up` copiá el archivo de ejemplo de variables:
#      cp .env.example .env      # y editá los valores
# =============================================================================

INFRA   = docker-compose.infra.yml
MICROS  = microservicios-inventario/docker-compose.yml
ROOT    = docker-compose.yml

.PHONY: up down logs migrate seed ps

## up: crea la red compartida y levanta infra + microservicios + raíz
up: .env
	docker network create net-shared 2>/dev/null || true
	docker compose -f $(INFRA) up -d
	docker compose -f $(MICROS) up -d
	docker compose -f $(ROOT) up -d

## .env: si no existe, lo crea a partir del ejemplo
.env:
	cp .env.example .env
	@echo ">> Cree .env desde .env.example. Revisa los valores antes de usar en serio."

## down: baja los tres compose
down:
	docker compose -f $(ROOT) down
	docker compose -f $(MICROS) down
	docker compose -f $(INFRA) down

## logs: sigue los logs de los servicios de la raíz
logs:
	docker compose -f $(ROOT) logs -f

## migrate: corre las migraciones dentro del contenedor de productos
##          (shared/db se monta como db/ en cada microservicio)
migrate:
	docker compose -f $(MICROS) exec inventario_ms_productos node db/migrations/runner.js

## seed: crea el admin de auth y carga datos demo de negocio
##       (shared/db se monta como db/ en cada microservicio)
seed:
	docker compose -f $(ROOT) exec -T inventario_auth npm run create-admin
	docker compose -f $(MICROS) exec -T inventario_ms_productos node db/seed.js

## ps: estado de todos los contenedores del proyecto
ps:
	docker compose -f $(INFRA) ps
	docker compose -f $(MICROS) ps
	docker compose -f $(ROOT) ps
