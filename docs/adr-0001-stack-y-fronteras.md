# ADR-0001: Stack y fronteras de arquitectura

## Estado

Aprobado.

## Contexto

La app actual es cliente estatico con logica y llamadas ESI en navegador. Esto dificulta cache compartido, control de rate limit, trazabilidad y evolucion.

## Decision

- Monorepo con workspaces: `apps/*` y `packages/*`.
- Backend: Node.js + Fastify + TypeScript.
- DB: MySQL con migraciones SQL versionadas.
- Dominio en paquete puro (`@eve/domain`) sin dependencias de infraestructura.
- Cliente ESI reusable (`@eve/esi-client`) con:
  - throttle global,
  - retry/backoff+jitter,
  - dedupe de requests concurrentes,
  - cache TTL centralizada.

## Consecuencias

Positivas:

- Frontend desacoplado de ESI.
- Control central de limites y cache.
- Mejor auditoria (esiLogs + correlationId).

Trade-offs:

- Mas componentes operativos (API + DB).
- Se requiere pipeline CI basico y scripts de entorno.
