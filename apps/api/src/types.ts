import type { SnapshotOrder, SnapshotSummary } from '@eve/domain';

export type RegionRow = { id: number; name: string };
export type ConstellationRow = { id: number; name: string; regionId: number };
export type StationRow = { id: number; systemId: number };

export type SnapshotRecord = {
  id: string;
  correlationId: string;
  regionId: number;
  constellationId: number;
  createdAt: string;
  summary: SnapshotSummary;
};

export type LogEntry = {
  correlationId: string;
  level: 'info' | 'warn' | 'error';
  message: string;
  context?: Record<string, unknown>;
};

export type MarketRepository = {
  saveSnapshot(snapshot: SnapshotRecord, orders: SnapshotOrder[]): Promise<void>;
  getSnapshot(
    snapshotId: string
  ): Promise<{ snapshot: SnapshotRecord; orders: SnapshotOrder[] } | null>;
  saveLog(entry: LogEntry): Promise<void>;
};
