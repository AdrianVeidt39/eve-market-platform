import type { CacheStore } from './types.js';

type Entry = {
  value: unknown;
  expiresAt: number;
};

export class MemoryCacheStore implements CacheStore {
  private readonly data = new Map<string, Entry>();

  async get(key: string): Promise<Entry | null> {
    const entry = this.data.get(key);
    if (!entry) return null;
    if (Date.now() >= entry.expiresAt) {
      this.data.delete(key);
      return null;
    }
    return entry;
  }

  async set(key: string, value: unknown, ttlMs: number): Promise<void> {
    this.data.set(key, { value, expiresAt: Date.now() + ttlMs });
  }

  async deleteByPrefix(prefix: string): Promise<number> {
    let count = 0;
    for (const key of this.data.keys()) {
      if (!key.startsWith(prefix)) continue;
      this.data.delete(key);
      count += 1;
    }
    return count;
  }
}
