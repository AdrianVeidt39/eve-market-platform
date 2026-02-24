import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';

import { EsiClient, MemoryCacheStore } from '@eve/esi-client';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import fastifyStatic from '@fastify/static';
import Fastify from 'fastify';
import { z } from 'zod';

import { loadConfig } from './config.js';
import { MarketService } from './market.service.js';
import { MysqlRepository } from './repository.mysql.js';
import { MemoryRepository } from './repository.memory.js';
import type { MarketRepository } from './types.js';

const snapshotBodySchema = z.object({
  regionId: z.number().int().positive(),
  constellationId: z.number().int().positive()
});

const logBodySchema = z.object({
  level: z.enum(['info', 'warn', 'error']),
  message: z.string().min(1),
  context: z.record(z.string(), z.unknown()).optional()
});

const snapshotListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0)
});

type SnapshotJob = {
  id: string;
  correlationId: string;
  regionId: number;
  constellationId: number;
  status: 'queued' | 'running' | 'completed' | 'failed';
  createdAt: string;
  startedAt?: string;
  finishedAt?: string;
  snapshotId?: string;
  error?: string;
};

export function buildServer(options?: { repository?: MarketRepository; esiClient?: EsiClient }) {
  const config = loadConfig();
  const repository =
    options?.repository ??
    (config.databaseUrl ? new MysqlRepository(config.databaseUrl) : new MemoryRepository());

  const app = Fastify({
    logger: true,
    bodyLimit: 1_048_576,
    routerOptions: { ignoreTrailingSlash: true }
  });
  const metrics = {
    requestsTotal: 0,
    requestsErrors: 0,
    requestLatencyMsTotal: 0,
    requestLatencyMsCount: 0
  };
  const esiClient =
    options?.esiClient ??
    new EsiClient({
      baseUrl: config.esiBaseUrl,
      userAgent: config.esiUserAgent,
      compatibilityDate: config.esiCompatibilityDate,
      minIntervalMs: config.esiMinIntervalMs,
      maxRetries: config.esiRetries,
      defaultCacheTtlMs: config.esiCacheTtlMs,
      cacheStore: new MemoryCacheStore(),
      log: (entry) => {
        void repository.saveLog({
          correlationId: entry.correlationId ?? randomUUID(),
          level: entry.level,
          message: entry.message,
          context: entry.context
        });
        app.log[entry.level](
          {
            correlationId: entry.correlationId,
            ...entry.context
          },
          entry.message
        );
      }
    });

  const snapshotJobs = new Map<string, SnapshotJob>();
  const snapshotQueue: string[] = [];
  let processingSnapshotQueue = false;

  const processSnapshotQueue = async () => {
    if (processingSnapshotQueue) return;
    processingSnapshotQueue = true;
    try {
      while (snapshotQueue.length > 0) {
        const jobId = snapshotQueue.shift();
        if (!jobId) continue;
        const job = snapshotJobs.get(jobId);
        if (!job || job.status !== 'queued') continue;

        job.status = 'running';
        job.startedAt = new Date().toISOString();

        try {
          const result = await marketService.buildSnapshot({
            regionId: job.regionId,
            constellationId: job.constellationId,
            correlationId: job.correlationId
          });
          job.status = 'completed';
          job.snapshotId = result.snapshot.id;
          job.finishedAt = new Date().toISOString();
        } catch (error) {
          job.status = 'failed';
          job.error = error instanceof Error ? error.message : String(error);
          job.finishedAt = new Date().toISOString();
        }
      }
    } finally {
      processingSnapshotQueue = false;
    }
  };

  const marketService = new MarketService(esiClient, repository);

  app.addHook('preHandler', async (request, reply) => {
    const correlationId =
      (request.headers['x-correlation-id'] as string | undefined) ?? randomUUID();
    reply.header('x-correlation-id', correlationId);
    request.headers['x-correlation-id'] = correlationId;
  });

  app.register(cors, { origin: true });
  app.register(rateLimit, {
    max: 300,
    timeWindow: '1 minute'
  });

  app.addHook('onResponse', async (request, reply) => {
    const latencyHeader = reply.getHeader('response-time');
    const latencyMs =
      typeof latencyHeader === 'string'
        ? Number(latencyHeader)
        : typeof latencyHeader === 'number'
          ? latencyHeader
          : Number(reply.elapsedTime ?? 0);

    metrics.requestsTotal += 1;
    if (reply.statusCode >= 400) metrics.requestsErrors += 1;
    if (Number.isFinite(latencyMs) && latencyMs >= 0) {
      metrics.requestLatencyMsTotal += latencyMs;
      metrics.requestLatencyMsCount += 1;
    }

    request.log.info(
      {
        correlationId: request.headers['x-correlation-id'] as string,
        path: request.url,
        method: request.method,
        statusCode: reply.statusCode,
        latencyMs
      },
      'http request completed'
    );
  });

  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
  const openapiPath = path.join(root, 'apps/api/openapi.v1.yaml');

  app.get('/v1/openapi.yaml', async (_request, reply) => {
    const spec = await readFile(openapiPath, 'utf8');
    reply.type('application/yaml').send(spec);
  });

  app.get('/docs', async (_request, reply) => {
    reply.type('text/html').send(`<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>EVE API Docs</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css" />
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
  <script>
    window.ui = SwaggerUIBundle({
      url: '/v1/openapi.yaml',
      dom_id: '#swagger-ui'
    });
  </script>
</body>
</html>`);
  });

  app.register(fastifyStatic, {
    root: path.join(root, 'client'),
    prefix: '/'
  });

  app.get('/health', async () => ({ ok: true }));

  app.get('/ready', async (request, reply) => {
    try {
      const result = await repository.healthCheck();
      return { ok: result.ok, mode: result.mode };
    } catch (error) {
      request.log.error({ err: error }, 'readiness check failed');
      return reply.code(503).send({ ok: false });
    }
  });

  app.get('/metrics', async (_request, reply) => {
    const avgLatency =
      metrics.requestLatencyMsCount > 0
        ? metrics.requestLatencyMsTotal / metrics.requestLatencyMsCount
        : 0;
    const lines = [
      '# HELP eve_api_requests_total Total HTTP requests processed',
      '# TYPE eve_api_requests_total counter',
      `eve_api_requests_total ${metrics.requestsTotal}`,
      '# HELP eve_api_requests_errors_total Total HTTP requests with status >= 400',
      '# TYPE eve_api_requests_errors_total counter',
      `eve_api_requests_errors_total ${metrics.requestsErrors}`,
      '# HELP eve_api_request_latency_ms_avg Average request latency in milliseconds',
      '# TYPE eve_api_request_latency_ms_avg gauge',
      `eve_api_request_latency_ms_avg ${avgLatency.toFixed(2)}`
    ];

    reply.type('text/plain; version=0.0.4').send(lines.join('\n'));
  });

  app.get('/v1/regions', async (request) => {
    const correlationId = request.headers['x-correlation-id'] as string;
    const data = await marketService.getRegions(correlationId);
    return { data };
  });

  app.get('/v1/regions/:regionId/constellations', async (request) => {
    const params = request.params as { regionId: string };
    const regionId = Number(params.regionId);
    const correlationId = request.headers['x-correlation-id'] as string;
    const data = await marketService.getConstellations(regionId, correlationId);
    return { data };
  });

  app.get('/v1/constellations/:constellationId/stations', async (request) => {
    const params = request.params as { constellationId: string };
    const correlationId = request.headers['x-correlation-id'] as string;
    const data = await marketService.getConstellationStations(
      Number(params.constellationId),
      correlationId
    );
    return { data };
  });

  app.post('/v1/market/snapshots', async (request, reply) => {
    const parsed = snapshotBodySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'invalid_payload', details: parsed.error.flatten() });
    }
    try {
      const correlationId = request.headers['x-correlation-id'] as string;
      const startedAt = Date.now();
      const result = await marketService.buildSnapshot({
        regionId: parsed.data.regionId,
        constellationId: parsed.data.constellationId,
        correlationId
      });
      request.log.info(
        {
          correlationId,
          regionId: parsed.data.regionId,
          constellationId: parsed.data.constellationId,
          ordersCount: result.orders.length,
          latencyMs: Date.now() - startedAt
        },
        'snapshot persisted'
      );
      return {
        data: {
          snapshot: result.snapshot,
          ordersCount: result.orders.length
        }
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      request.log.error({ err: error }, 'snapshot persistence failed');
      return reply.code(500).send({ error: 'snapshot_persist_failed', message });
    }
  });

  app.post('/v1/market/snapshot-jobs', async (request, reply) => {
    const parsed = snapshotBodySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'invalid_payload', details: parsed.error.flatten() });
    }

    const correlationId = request.headers['x-correlation-id'] as string;
    const job: SnapshotJob = {
      id: randomUUID(),
      correlationId,
      regionId: parsed.data.regionId,
      constellationId: parsed.data.constellationId,
      status: 'queued',
      createdAt: new Date().toISOString()
    };

    snapshotJobs.set(job.id, job);
    snapshotQueue.push(job.id);
    void processSnapshotQueue();

    return reply.code(202).send({ data: job });
  });

  app.get('/v1/market/snapshot-jobs/:jobId', async (request, reply) => {
    const params = request.params as { jobId: string };
    const job = snapshotJobs.get(params.jobId);
    if (!job) {
      return reply.code(404).send({ error: 'snapshot_job_not_found' });
    }
    return { data: job };
  });

  app.get('/v1/market/snapshots', async (request, reply) => {
    const parsed = snapshotListQuerySchema.safeParse(request.query ?? {});
    if (!parsed.success) {
      return reply.code(400).send({ error: 'invalid_query', details: parsed.error.flatten() });
    }

    const items = await repository.listSnapshots(parsed.data.limit, parsed.data.offset);
    return {
      data: {
        items,
        limit: parsed.data.limit,
        offset: parsed.data.offset
      }
    };
  });

  app.get('/v1/market/snapshots/:snapshotId', async (request, reply) => {
    const params = request.params as { snapshotId: string };
    const snapshot = await repository.getSnapshot(params.snapshotId);
    if (!snapshot) {
      return reply.code(404).send({ error: 'snapshot_not_found' });
    }
    return { data: snapshot };
  });

  app.post('/v1/cache/refresh', async () => {
    const cleared = await esiClient.clearCache('esi:');
    return { data: { cleared } };
  });

  app.post('/v1/logs/esi', async (request, reply) => {
    let rawBody: unknown = request.body;
    if (typeof request.body === 'string') {
      try {
        rawBody = JSON.parse(request.body);
      } catch {
        return reply.code(400).send({ error: 'invalid_log_payload' });
      }
    }
    const parsed = logBodySchema.safeParse(rawBody);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'invalid_log_payload' });
    }
    await repository.saveLog({
      correlationId: (request.headers['x-correlation-id'] as string) ?? randomUUID(),
      level: parsed.data.level,
      message: parsed.data.message,
      context: parsed.data.context
    });
    return reply.code(202).send({ ok: true });
  });

  app.get('/v1/universe/constellations/:id', async (request, reply) => {
    const params = request.params as { id: string };
    const id = Number(params.id);
    if (!Number.isFinite(id)) return reply.code(400).send({ error: 'invalid_id' });
    const response = await esiClient.get<unknown>(`/universe/constellations/${id}/`, {
      correlationId: request.headers['x-correlation-id'] as string,
      cacheKey: `esi:universe:constellation:${id}`
    });
    return response.data;
  });

  app.get('/v1/universe/systems/:id', async (request, reply) => {
    const params = request.params as { id: string };
    const id = Number(params.id);
    if (!Number.isFinite(id)) return reply.code(400).send({ error: 'invalid_id' });
    const response = await esiClient.get<unknown>(`/universe/systems/${id}/`, {
      correlationId: request.headers['x-correlation-id'] as string,
      cacheKey: `esi:universe:system:${id}`
    });
    return response.data;
  });

  app.get('/v1/universe/stargates/:id', async (request, reply) => {
    const params = request.params as { id: string };
    const id = Number(params.id);
    if (!Number.isFinite(id)) return reply.code(400).send({ error: 'invalid_id' });
    const response = await esiClient.get<unknown>(`/universe/stargates/${id}/`, {
      correlationId: request.headers['x-correlation-id'] as string,
      cacheKey: `esi:universe:stargate:${id}`
    });
    return response.data;
  });

  app.post('/v1/universe/names', async (request) => {
    const body = request.body as number[];
    const response = await esiClient.post<unknown>('/universe/names/', body, {
      correlationId: request.headers['x-correlation-id'] as string,
      dedupeKey: `esi:universe:names:${JSON.stringify(body ?? [])}`
    });
    return response.data;
  });

  app.get('/v1/markets/:regionId/orders', async (request, reply) => {
    const params = request.params as { regionId: string };
    const query = request.query as { page?: string; order_type?: string };
    const regionId = Number(params.regionId);
    const page = Number(query.page ?? '1');
    const orderType = query.order_type ?? 'all';
    if (!Number.isFinite(regionId) || !Number.isFinite(page)) {
      return reply.code(400).send({ error: 'invalid_params' });
    }

    const path = `/markets/${regionId}/orders/?order_type=${encodeURIComponent(orderType)}&page=${page}`;
    const response = await esiClient.get<unknown>(path, {
      correlationId: request.headers['x-correlation-id'] as string,
      cacheKey: `esi:markets:${regionId}:orderType:${orderType}:page:${page}`,
      cacheTtlMs: 10_000
    });
    if (response.pages > 0) reply.header('x-pages', String(response.pages));
    return response.data;
  });

  app.get('/v1/esi/*', async (request, reply) => {
    const wildcard = (request.params as { '*': string })['*'] ?? '';
    const query = new URLSearchParams(request.query as Record<string, string>).toString();
    const pathWithQuery = query ? `/${wildcard}?${query}` : `/${wildcard}`;

    const response = await esiClient.get<unknown>(pathWithQuery, {
      correlationId: request.headers['x-correlation-id'] as string,
      cacheKey: `esi:proxy:get:${pathWithQuery}`,
      dedupeKey: `esi:proxy:get:${pathWithQuery}`,
      cacheTtlMs: /\/markets\/\d+\/orders\//.test(pathWithQuery) ? 10_000 : config.esiCacheTtlMs
    });

    if (response.pages > 0) reply.header('x-pages', String(response.pages));
    return response.data;
  });

  app.post('/v1/esi/*', async (request) => {
    const wildcard = (request.params as { '*': string })['*'] ?? '';
    const pathWithQuery = `/${wildcard}`;
    const response = await esiClient.post<unknown>(pathWithQuery, request.body, {
      correlationId: request.headers['x-correlation-id'] as string,
      dedupeKey: `esi:proxy:post:${pathWithQuery}:${JSON.stringify(request.body ?? null)}`,
      cacheTtlMs: 0
    });

    return response.data;
  });

  return app;
}
