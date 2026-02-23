import mysql from 'mysql2/promise';
import type { RowDataPacket } from 'mysql2';

import type { SnapshotOrder } from '@eve/domain';

import type { LogEntry, MarketRepository, SnapshotRecord } from './types.js';

type SnapshotRow = RowDataPacket & {
  id: string;
  correlation_id: string;
  region_id: number;
  constellation_id: number;
  created_at: Date | string;
  summary: string | Record<string, unknown>;
};

type SnapshotOrderRow = RowDataPacket &
  Omit<SnapshotOrder, 'is_buy_order'> & {
    is_buy_order: number | boolean;
  };

function toMysqlDateTime(value: string | Date): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid date value: ${String(value)}`);
  }

  const yyyy = date.getUTCFullYear();
  const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(date.getUTCDate()).padStart(2, '0');
  const hh = String(date.getUTCHours()).padStart(2, '0');
  const mi = String(date.getUTCMinutes()).padStart(2, '0');
  const ss = String(date.getUTCSeconds()).padStart(2, '0');
  const mss = String(date.getUTCMilliseconds()).padStart(3, '0');
  return `${yyyy}-${mm}-${dd} ${hh}:${mi}:${ss}.${mss}`;
}

export class MysqlRepository implements MarketRepository {
  private readonly pool: mysql.Pool;

  constructor(databaseUrl: string) {
    this.pool = mysql.createPool({
      uri: databaseUrl,
      connectionLimit: 10,
      timezone: 'Z'
    });
  }

  async saveSnapshot(snapshot: SnapshotRecord, orders: SnapshotOrder[]): Promise<void> {
    const connection = await this.pool.getConnection();
    try {
      await connection.beginTransaction();
      await connection.execute(
        `INSERT INTO snapshots(id, correlation_id, region_id, constellation_id, created_at, summary)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          snapshot.id,
          snapshot.correlationId,
          snapshot.regionId,
          snapshot.constellationId,
          toMysqlDateTime(snapshot.createdAt),
          JSON.stringify(snapshot.summary)
        ]
      );

      for (const order of orders) {
        await connection.execute(
          `INSERT INTO snapshot_orders(
             snapshot_id, order_id, type_id, location_id, volume_remain, volume_total,
             min_volume, price, is_buy_order, issued, duration, order_range, system_id,
             region_id, constellation_id
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE order_id = order_id`,
          [
            snapshot.id,
            order.order_id,
            order.type_id,
            order.location_id,
            order.volume_remain,
            order.volume_total,
            order.min_volume,
            order.price,
            order.is_buy_order ? 1 : 0,
            toMysqlDateTime(order.issued),
            order.duration,
            order.range,
            order.system_id ?? null,
            order.region_id,
            order.constellation_id
          ]
        );
      }

      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async getSnapshot(
    snapshotId: string
  ): Promise<{ snapshot: SnapshotRecord; orders: SnapshotOrder[] } | null> {
    const [snapRows] = await this.pool.query<SnapshotRow[]>(
      'SELECT * FROM snapshots WHERE id = ?',
      [snapshotId]
    );
    const row = snapRows[0];
    if (!row) return null;

    const [orderRows] = await this.pool.query<SnapshotOrderRow[]>(
      `SELECT snapshot_id, order_id, type_id, location_id, volume_remain, volume_total,
              min_volume, price, is_buy_order, issued, duration, order_range AS \`range\`,
              system_id, region_id, constellation_id
         FROM snapshot_orders
        WHERE snapshot_id = ?`,
      [snapshotId]
    );

    return {
      snapshot: {
        id: row.id,
        correlationId: row.correlation_id,
        regionId: Number(row.region_id),
        constellationId: Number(row.constellation_id),
        createdAt:
          row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
        summary:
          typeof row.summary === 'string'
            ? (JSON.parse(row.summary) as SnapshotRecord['summary'])
            : (row.summary as SnapshotRecord['summary'])
      },
      orders: orderRows.map((order: SnapshotOrderRow) => ({
        ...order,
        is_buy_order: Boolean(order.is_buy_order)
      }))
    };
  }

  async saveLog(entry: LogEntry): Promise<void> {
    await this.pool.execute(
      'INSERT INTO esi_logs(correlation_id, level, message, context) VALUES (?, ?, ?, ?)',
      [entry.correlationId, entry.level, entry.message, JSON.stringify(entry.context ?? {})]
    );
  }

  async listSnapshots(limit: number, offset: number): Promise<SnapshotRecord[]> {
    const safeLimit = Math.max(1, Math.min(limit, 100));
    const safeOffset = Math.max(0, offset);
    const [rows] = await this.pool.query<SnapshotRow[]>(
      `SELECT id, correlation_id, region_id, constellation_id, created_at, summary
         FROM snapshots
        ORDER BY created_at DESC
        LIMIT ? OFFSET ?`,
      [safeLimit, safeOffset]
    );

    return rows.map((row) => ({
      id: row.id,
      correlationId: row.correlation_id,
      regionId: Number(row.region_id),
      constellationId: Number(row.constellation_id),
      createdAt:
        row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
      summary:
        typeof row.summary === 'string'
          ? (JSON.parse(row.summary) as SnapshotRecord['summary'])
          : (row.summary as SnapshotRecord['summary'])
    }));
  }

  async healthCheck(): Promise<{ ok: boolean; mode: 'mysql' }> {
    await this.pool.query('SELECT 1');
    return { ok: true, mode: 'mysql' };
  }
}
