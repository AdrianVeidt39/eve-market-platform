# Arquitectura objetivo (v1)

## Vista general

- `apps/web`: frontend estatico (transicion incremental desde `client/`).
- `apps/api`: backend Fastify con API versionada `/v1`, integracion ESI, cache, throttle, retry y dedupe.
- `packages/domain`: reglas de negocio puras (sin HTTP/DB).
- `packages/esi-client`: cliente ESI reusable con resiliencia y telemetria.

## Flujo principal

1. Frontend llama `/v1/regions` -> `/v1/regions/:id/constellations` -> `/v1/constellations/:id/stations`.
2. Usuario solicita snapshot: `POST /v1/market/snapshots`.
3. Backend consume ESI con throttle/retry/backoff+jitter+dedupe, filtra por estaciones NPC y persiste snapshot + orders.
4. Frontend consulta `GET /v1/market/snapshots/:id` para tablas/graficas.

## Persistencia

MySQL (recomendado) con tablas:

- `snapshots`
- `snapshot_orders`
- `esi_logs`
- `schema_migrations`

## Observabilidad

- Correlation ID por request (`x-correlation-id`).
- Logs estructurados (`level`, `message`, `context`).
- Metricas por llamada ESI: `latencyMs`, `retries`, `cacheHit`.
- Endpoints operativos: `/health`, `/ready`, `/metrics`.

## Hardening API

- Rate limit global en Fastify (`@fastify/rate-limit`).
- `bodyLimit` de 1MB para reducir superficie de abuso.
- Endpoint de historial `GET /v1/market/snapshots?limit=&offset=` para consultas paginadas.

## Migracion incremental

- Fase 1 (completada): backend + proxy `/v1/esi/*`, frontend existente deja de llamar ESI directo.
- Fase 2 (en progreso): mover UI desde `client/` a `apps/web` por modulos.
- Fase 3 (parcial): flujo principal (`region -> constellation -> snapshot`) usa endpoints de dominio `/v1/*`; el proxy `/v1/esi/*` queda para compatibilidad de funcionalidades secundarias.

## Rendimiento SQL

- Indices agregados en `002_indexes.sql` para snapshots, orders y logs.
- Consultas de analisis en `docs/sql-analysis-queries.md`.
