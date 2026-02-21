import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';

import { EsiClient, MemoryCacheStore } from '@eve/esi-client';
import cors from '@fastify/cors';
import fastifyStatic from '@fastify/static';
import Fastify from 'fastify';
import { z } from 'zod';

import { loadConfig } from './config.js';
import { MarketService } from './market.service.js';
import { MemoryRepository } from './repository.memory.js';
import { PgRepository } from './repository.pg.js';
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

export function buildServer(options?: { repository?: MarketRepository; esiClient?: EsiClient }) {
  const config = loadConfig();
  const repository =
    options?.repository ??
    (config.databaseUrl ? new PgRepository(config.databaseUrl) : new MemoryRepository());

  const app = Fastify({ logger: true });
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

  const marketService = new MarketService(esiClient, repository);

  app.addHook('preHandler', async (request, reply) => {
    const correlationId =
      (request.headers['x-correlation-id'] as string | undefined) ?? randomUUID();
    reply.header('x-correlation-id', correlationId);
    request.headers['x-correlation-id'] = correlationId;
  });

  app.register(cors, { origin: true });

  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
  app.register(fastifyStatic, {
    root: path.join(root, 'client'),
    prefix: '/'
  });

  app.get('/health', async () => ({ ok: true }));

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
    const correlationId = request.headers['x-correlation-id'] as string;
    const result = await marketService.buildSnapshot({
      regionId: parsed.data.regionId,
      constellationId: parsed.data.constellationId,
      correlationId
    });
    return {
      data: {
        snapshot: result.snapshot,
        ordersCount: result.orders.length
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
