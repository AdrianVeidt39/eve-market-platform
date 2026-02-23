# Runbook Operativo

## Arranque local

```bash
npm install
npm run migrate -w apps/api
npm run dev:api
```

Abrir: `http://localhost:3001/`

## Endpoints de diagnostico

- Liveness: `GET /health`
- Readiness: `GET /ready`
- Metricas: `GET /metrics`
- Swagger UI: `GET /docs`

## Verificacion de persistencia

```sql
SELECT COUNT(*) FROM snapshots;
SELECT COUNT(*) FROM snapshot_orders;
SELECT COUNT(*) FROM esi_logs;
```

## Incidentes comunes

- **`snapshot_persist_failed`**
  - Verificar `DATABASE_URL`
  - Revisar conectividad MySQL
  - Revisar logs de API y `esi_logs`

- **Readiness `503` en `/ready`**
  - MySQL no disponible o credenciales invalidas
  - Reintentar migraciones: `npm run migrate -w apps/api`

- **Sin datos en snapshots**
  - Confirmar que UI llega a `POST /v1/market/snapshots`
  - Revisar Network en navegador y logs API

## Rollback rapido

1. Detener API
2. Volver a commit estable
3. Levantar API y validar `health`, `ready`, `docs`
