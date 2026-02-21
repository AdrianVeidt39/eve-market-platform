import type { MarketOrder, SnapshotOrder, SnapshotSummary } from './types.js';

export function buildSnapshotOrders(params: {
  snapshotId: string;
  regionId: number;
  constellationId: number;
  stationIds: Set<number>;
  marketOrders: MarketOrder[];
}): SnapshotOrder[] {
  const { snapshotId, regionId, constellationId, stationIds, marketOrders } = params;
  if (!stationIds.size || !marketOrders.length) {
    return [];
  }

  const result: SnapshotOrder[] = [];
  for (const order of marketOrders) {
    if (!stationIds.has(order.location_id)) continue;
    result.push({
      ...order,
      snapshot_id: snapshotId,
      region_id: regionId,
      constellation_id: constellationId
    });
  }
  return result;
}

export function summarizeSnapshotOrders(
  snapshotOrders: SnapshotOrder[],
  stationIds: Set<number>
): SnapshotSummary {
  let buyOrders = 0;
  let sellOrders = 0;
  const stationsWithOrders = new Set<number>();

  for (const order of snapshotOrders) {
    if (order.is_buy_order) buyOrders += 1;
    else sellOrders += 1;
    stationsWithOrders.add(order.location_id);
  }

  return {
    totalOrders: snapshotOrders.length,
    buyOrders,
    sellOrders,
    stationsWithOrders: stationsWithOrders.size,
    stationsWithoutOrders: Math.max(stationIds.size - stationsWithOrders.size, 0)
  };
}
