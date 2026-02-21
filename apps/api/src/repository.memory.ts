import type { SnapshotOrder } from '@eve/domain';

import type { LogEntry, MarketRepository, SnapshotRecord } from './types.js';

export class MemoryRepository implements MarketRepository {
  private readonly snapshots = new Map<
    string,
    { snapshot: SnapshotRecord; orders: SnapshotOrder[] }
  >();
  private readonly logs: LogEntry[] = [];

  async saveSnapshot(snapshot: SnapshotRecord, orders: SnapshotOrder[]): Promise<void> {
    this.snapshots.set(snapshot.id, { snapshot, orders });
  }

  async getSnapshot(
    snapshotId: string
  ): Promise<{ snapshot: SnapshotRecord; orders: SnapshotOrder[] } | null> {
    return this.snapshots.get(snapshotId) ?? null;
  }

  async saveLog(entry: LogEntry): Promise<void> {
    this.logs.push(entry);
  }
}
