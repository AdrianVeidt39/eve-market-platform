import pg from 'pg';

import type { SnapshotOrder } from '@eve/domain';

import type { LogEntry, MarketRepository, SnapshotRecord } from './types.js';

const { Pool } = pg;

export class PgRepository implements MarketRepository {
  private readonly pool: pg.Pool;

  constructor(databaseUrl: string) {
    this.pool = new Pool({ connectionString: databaseUrl });
  }

  async saveSnapshot(snapshot: SnapshotRecord, orders: SnapshotOrder[]): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(
        `INSERT INTO snapshots(id, correlation_id, region_id, constellation_id, created_at, summary)
         VALUES ($1, $2, $3, $4, $5, $6::jsonb)`,
        [
          snapshot.id,
          snapshot.correlationId,
          snapshot.regionId,
          snapshot.constellationId,
          snapshot.createdAt,
          JSON.stringify(snapshot.summary)
        ]
      );

      for (const order of orders) {
        await client.query(
          `INSERT INTO snapshot_orders(
             snapshot_id, order_id, type_id, location_id, volume_remain, volume_total,
             min_volume, price, is_buy_order, issued, duration, range, system_id,
             region_id, constellation_id
           ) VALUES (
             $1, $2, $3, $4, $5, $6,
             $7, $8, $9, $10, $11, $12, $13,
             $14, $15
           ) ON CONFLICT DO NOTHING`,
          [
            snapshot.id,
            order.order_id,
            order.type_id,
            order.location_id,
            order.volume_remain,
            order.volume_total,
            order.min_volume,
            order.price,
            order.is_buy_order,
            order.issued,
            order.duration,
            order.range,
            order.system_id ?? null,
            order.region_id,
            order.constellation_id
          ]
        );
      }

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async getSnapshot(
    snapshotId: string
  ): Promise<{ snapshot: SnapshotRecord; orders: SnapshotOrder[] } | null> {
    const snap = await this.pool.query<{
      id: string;
      correlation_id: string;
      region_id: number;
      constellation_id: number;
      created_at: string;
      summary: Record<string, unknown>;
    }>('SELECT * FROM snapshots WHERE id = $1', [snapshotId]);

    const row = snap.rows[0];
    if (!row) return null;

    const ordersResult = await this.pool.query<SnapshotOrder>(
      'SELECT * FROM snapshot_orders WHERE snapshot_id = $1',
      [snapshotId]
    );

    return {
      snapshot: {
        id: row.id,
        correlationId: row.correlation_id,
        regionId: row.region_id,
        constellationId: row.constellation_id,
        createdAt: row.created_at,
        summary: row.summary as SnapshotRecord['summary']
      },
      orders: ordersResult.rows
    };
  }

  async saveLog(entry: LogEntry): Promise<void> {
    await this.pool.query(
      'INSERT INTO esi_logs(correlation_id, level, message, context) VALUES ($1, $2, $3, $4::jsonb)',
      [entry.correlationId, entry.level, entry.message, JSON.stringify(entry.context ?? {})]
    );
  }
}
