import { afterAll, describe, expect, it } from 'vitest';
import { setTimeout as sleep } from 'node:timers/promises';

import { EsiClient } from '@eve/esi-client';

import { MemoryRepository } from '../src/repository.memory.js';
import { buildServer } from '../src/server.js';

function createMockFetch() {
  return async (input: string | URL | Request, init?: RequestInit): Promise<Response> => {
    const url = input instanceof Request ? input.url : String(input);

    if (url.endsWith('/universe/regions/')) {
      return Response.json([10000002]);
    }
    if (url.endsWith('/universe/names/')) {
      const body = JSON.parse(String(init?.body ?? '[]')) as number[];
      if (body.includes(10000002)) {
        return Response.json([{ id: 10000002, name: 'The Forge', category: 'region' }]);
      }
      return Response.json([
        { id: 20000020, name: 'Kimotoro', category: 'constellation' },
        { id: 30000142, name: 'Jita', category: 'solar_system' }
      ]);
    }
    if (url.includes('/universe/regions/10000002/')) {
      return Response.json({ constellations: [20000020] });
    }
    if (url.includes('/universe/constellations/20000020/')) {
      return Response.json({ systems: [30000142] });
    }
    if (url.includes('/universe/systems/30000142/')) {
      return Response.json({ stations: [60003760] });
    }
    if (url.includes('/markets/10000002/orders/') && url.includes('page=1')) {
      return new Response(
        JSON.stringify([
          {
            order_id: 1,
            type_id: 34,
            location_id: 60003760,
            volume_remain: 10,
            volume_total: 20,
            min_volume: 1,
            price: 5,
            is_buy_order: false,
            issued: '2026-01-01T00:00:00Z',
            duration: 90,
            range: 'region'
          }
        ]),
        { headers: { 'x-pages': '1' } }
      );
    }

    return new Response(JSON.stringify({ error: `unhandled ${url}` }), { status: 404 });
  };
}

describe('v1 api', () => {
  const app = buildServer({
    repository: new MemoryRepository(),
    esiClient: new EsiClient({
      fetchImpl: createMockFetch(),
      baseUrl: 'https://esi.evetech.net/latest'
    })
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns regions', async () => {
    const response = await app.inject({ method: 'GET', url: '/v1/regions' });
    expect(response.statusCode).toBe(200);
    const body = response.json() as { data: Array<{ id: number; name: string }> };
    expect(body.data[0]?.name).toBe('The Forge');
  });

  it('creates market snapshot', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/v1/market/snapshots',
      payload: { regionId: 10000002, constellationId: 20000020 }
    });

    expect(response.statusCode).toBe(200);
    const body = response.json() as { data: { ordersCount: number } };
    expect(body.data.ordersCount).toBe(1);
  });

  it('lists snapshots and exposes readiness and metrics', async () => {
    const create = await app.inject({
      method: 'POST',
      url: '/v1/market/snapshots',
      payload: { regionId: 10000002, constellationId: 20000020 }
    });
    expect(create.statusCode).toBe(200);

    const list = await app.inject({ method: 'GET', url: '/v1/market/snapshots?limit=10&offset=0' });
    expect(list.statusCode).toBe(200);
    const listBody = list.json() as { data: { items: Array<{ id: string }> } };
    expect(listBody.data.items.length).toBeGreaterThan(0);

    const ready = await app.inject({ method: 'GET', url: '/ready' });
    expect(ready.statusCode).toBe(200);

    const metrics = await app.inject({ method: 'GET', url: '/metrics' });
    expect(metrics.statusCode).toBe(200);
    expect(metrics.body.includes('eve_api_requests_total')).toBe(true);
  });

  it('supports domain ESI endpoints and async snapshot jobs', async () => {
    const system = await app.inject({ method: 'GET', url: '/v1/universe/systems/30000142' });
    expect(system.statusCode).toBe(200);

    const names = await app.inject({
      method: 'POST',
      url: '/v1/universe/names',
      payload: [10000002]
    });
    expect(names.statusCode).toBe(200);

    const create = await app.inject({
      method: 'POST',
      url: '/v1/market/snapshot-jobs',
      payload: { regionId: 10000002, constellationId: 20000020 }
    });
    expect(create.statusCode).toBe(202);
    const created = create.json() as { data: { id: string } };
    const jobId = created.data.id;

    let completed = false;
    for (let i = 0; i < 15; i += 1) {
      const status = await app.inject({ method: 'GET', url: `/v1/market/snapshot-jobs/${jobId}` });
      expect(status.statusCode).toBe(200);
      const payload = status.json() as { data: { status: string; snapshotId?: string } };
      if (payload.data.status === 'completed') {
        expect(typeof payload.data.snapshotId).toBe('string');
        completed = true;
        break;
      }
      if (payload.data.status === 'failed') {
        throw new Error('snapshot job failed in test');
      }
      await sleep(25);
    }

    expect(completed).toBe(true);
  });
});
