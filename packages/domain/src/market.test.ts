import { describe, expect, it } from 'vitest';

import { buildSnapshotOrders, summarizeSnapshotOrders } from './market.js';
import type { MarketOrder } from './types.js';

function makeOrder(partial: Partial<MarketOrder>): MarketOrder {
  return {
    order_id: 1,
    type_id: 34,
    location_id: 60003760,
    volume_remain: 100,
    volume_total: 200,
    min_volume: 1,
    price: 5,
    is_buy_order: false,
    issued: '2026-01-01T00:00:00Z',
    duration: 90,
    range: 'region',
    ...partial
  };
}

describe('market domain', () => {
  it('filters orders by station ids and enriches snapshot fields', () => {
    const stationIds = new Set([60003760]);
    const orders = [
      makeOrder({ order_id: 10, location_id: 60003760 }),
      makeOrder({ order_id: 11, location_id: 60008494 })
    ];

    const result = buildSnapshotOrders({
      snapshotId: 's1',
      regionId: 10000002,
      constellationId: 20000020,
      stationIds,
      marketOrders: orders
    });

    expect(result).toHaveLength(1);
    expect(result[0]?.snapshot_id).toBe('s1');
    expect(result[0]?.region_id).toBe(10000002);
  });

  it('computes summary metrics', () => {
    const stationIds = new Set([1, 2, 3]);
    const summary = summarizeSnapshotOrders(
      [
        makeOrder({ order_id: 1, location_id: 1, is_buy_order: true, price: 1, type_id: 1 }),
        makeOrder({ order_id: 2, location_id: 2, is_buy_order: false, price: 2, type_id: 2 })
      ].map((o) => ({
        ...o,
        snapshot_id: 'x',
        region_id: 10000002,
        constellation_id: 20000020
      })),
      stationIds
    );

    expect(summary.totalOrders).toBe(2);
    expect(summary.buyOrders).toBe(1);
    expect(summary.sellOrders).toBe(1);
    expect(summary.stationsWithOrders).toBe(2);
    expect(summary.stationsWithoutOrders).toBe(1);
  });
});
