# EVE Market Explorer

Refactor incremental hacia arquitectura profesional **Frontend + Backend + DB**.

## Monorepo

- `apps/web`: runtime del frontend estatico (fuente actual todavia en `client/`).
- `apps/api`: backend Fastify con API `/v1`, proxy ESI y snapshot de mercado.
- `packages/domain`: logica de dominio pura.
- `packages/esi-client`: cliente ESI reusable (cache TTL, throttle, retry+jitter, dedupe).

## Inicio rapido

```bash
npm install
npm run dev:api
```

Abrir: `http://localhost:3001/`.

## Base de datos (PostgreSQL recomendado)

Configura `DATABASE_URL` y ejecuta migraciones:

```bash
npm run migrate -w apps/api
```

Si no hay `DATABASE_URL`, la API usa repositorio en memoria para desarrollo rapido.

## API versionada

- Contrato: `apps/api/openapi.v1.yaml`
- Arquitectura/decisiones: `docs/architecture.md`, `docs/adr-0001-stack-y-fronteras.md`

## Calidad y CI

```bash
npm run ci
```

## Sync Local Workspace

If your editable workspace is in the parent folder (`../`) and this repository is the publish target, use:

```bash
bash sync-local.sh
```

Windows (CMD) wrappers:

```bat
sync-local.cmd
syncp.cmd
```

OpenCode custom command:

```text
/syncp
```

This command is defined in `.opencode/commands/syncp.md` and runs the publish preset (`bash sync-local.sh --syncp`).

Include local `AGENTS.md`, then commit and push in one command:

```bash
bash sync-local.sh --with-agents --commit "Sync local workspace files" --push
```

## Logging and Auditing

All API interactions and warnings are recorded through helper functions (`logInfo`, `logWarn`, `logError`). Each entry is stored in `localStorage` under the `esiLogs` key and, when possible, sent to a backend endpoint using `navigator.sendBeacon`.

ESI request logging is enabled by default. It can be toggled by setting an environment variable or a `localStorage` value:

```js
// disable
localStorage.setItem('LOG_ESI', 'false');
// enable
localStorage.setItem('LOG_ESI', 'true');
```

To retrieve the stored logs for audits, open the browser console and run:

```js
getStoredLogs(); // or JSON.parse(localStorage.getItem('esiLogs'))
```

The returned array can be exported or forwarded to your logging backend for compliance reviews.
