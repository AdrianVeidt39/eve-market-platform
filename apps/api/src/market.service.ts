import { randomUUID } from 'node:crypto';

import { buildSnapshotOrders, summarizeSnapshotOrders, type MarketOrder } from '@eve/domain';
import type { EsiClient } from '@eve/esi-client';

import type { MarketRepository, SnapshotRecord } from './types.js';

export class MarketService {
  constructor(
    private readonly esiClient: EsiClient,
    private readonly repository: MarketRepository
  ) {}

  async getRegions(correlationId: string): Promise<Array<{ id: number; name: string }>> {
    const regionIdsRes = await this.esiClient.get<number[]>('/universe/regions/', {
      correlationId,
      cacheKey: 'esi:regions'
    });
    const namesRes = await this.esiClient.post<
      Array<{ id: number; name: string; category: string }>
    >('/universe/names/', regionIdsRes.data, {
      correlationId,
      dedupeKey: `universe:names:regions:${regionIdsRes.data.length}`
    });

    return namesRes.data
      .filter((entry) => entry.category === 'region')
      .map((entry) => ({ id: Number(entry.id), name: entry.name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  async getConstellations(
    regionId: number,
    correlationId: string
  ): Promise<Array<{ id: number; name: string }>> {
    const regionRes = await this.esiClient.get<{ constellations: number[] }>(
      `/universe/regions/${regionId}/`,
      {
        correlationId,
        cacheKey: `esi:region:${regionId}`
      }
    );

    const names = await this.esiClient.post<Array<{ id: number; name: string; category: string }>>(
      '/universe/names/',
      regionRes.data.constellations,
      { correlationId }
    );

    return names.data
      .filter((entry) => entry.category === 'constellation')
      .map((entry) => ({ id: Number(entry.id), name: entry.name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  async getConstellationStations(
    constellationId: number,
    correlationId: string
  ): Promise<{
    stations: number[];
    stationToSystem: Array<{ stationId: number; systemId: number }>;
  }> {
    const constellation = await this.esiClient.get<{ systems: number[] }>(
      `/universe/constellations/${constellationId}/`,
      {
        correlationId,
        cacheKey: `esi:constellation:${constellationId}`
      }
    );

    const stationToSystem: Array<{ stationId: number; systemId: number }> = [];
    const stations: number[] = [];

    for (const systemId of constellation.data.systems ?? []) {
      const system = await this.esiClient.get<{ stations?: number[] }>(
        `/universe/systems/${systemId}/`,
        {
          correlationId,
          cacheKey: `esi:system:${systemId}`
        }
      );
      for (const stationId of system.data.stations ?? []) {
        stations.push(stationId);
        stationToSystem.push({ stationId, systemId });
      }
    }

    return { stations, stationToSystem };
  }

  async buildSnapshot(params: {
    regionId: number;
    constellationId: number;
    correlationId: string;
  }): Promise<{ snapshot: SnapshotRecord; orders: ReturnType<typeof buildSnapshotOrders> }> {
    const { regionId, constellationId, correlationId } = params;

    const stationsData = await this.getConstellationStations(constellationId, correlationId);
    const stationIds = new Set(stationsData.stations);
    const marketOrders: MarketOrder[] = [];

    const firstPage = await this.esiClient.get<MarketOrder[]>(
      `/markets/${regionId}/orders/?order_type=all&page=1`,
      {
        correlationId,
        cacheTtlMs: 60_000,
        cacheKey: `esi:markets:${regionId}:page:1`
      }
    );

    for (const order of firstPage.data) {
      marketOrders.push(order);
    }

    const pages = Math.max(firstPage.pages, 1);
    for (let page = 2; page <= pages; page += 1) {
      const next = await this.esiClient.get<MarketOrder[]>(
        `/markets/${regionId}/orders/?order_type=all&page=${page}`,
        {
          correlationId,
          cacheTtlMs: 60_000,
          cacheKey: `esi:markets:${regionId}:page:${page}`
        }
      );
      for (const order of next.data) {
        marketOrders.push(order);
      }
    }

    const snapshotId = randomUUID();
    const orders = buildSnapshotOrders({
      snapshotId,
      regionId,
      constellationId,
      stationIds,
      marketOrders
    });
    const summary = summarizeSnapshotOrders(orders, stationIds);
    const snapshot: SnapshotRecord = {
      id: snapshotId,
      correlationId,
      regionId,
      constellationId,
      createdAt: new Date().toISOString(),
      summary
    };

    await this.repository.saveSnapshot(snapshot, orders);
    return { snapshot, orders };
  }
}
