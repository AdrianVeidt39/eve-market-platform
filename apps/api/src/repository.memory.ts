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

  async listSnapshots(limit: number, offset: number): Promise<SnapshotRecord[]> {
    return [...this.snapshots.values()]
      .map((entry) => entry.snapshot)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(offset, offset + limit);
  }

  async healthCheck(): Promise<{ ok: boolean; mode: 'memory' }> {
    return { ok: true, mode: 'memory' };
  }
}
