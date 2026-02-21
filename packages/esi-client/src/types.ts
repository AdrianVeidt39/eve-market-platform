export type EsiLogFn = (entry: {
  level: 'info' | 'warn' | 'error';
  message: string;
  correlationId?: string;
  context?: Record<string, unknown>;
}) => void;

export type CacheStore = {
  get(key: string): Promise<{ value: unknown; expiresAt: number } | null>;
  set(key: string, value: unknown, ttlMs: number): Promise<void>;
  deleteByPrefix(prefix: string): Promise<number>;
};

export type EsiClientOptions = {
  baseUrl: string;
  userAgent: string;
  compatibilityDate: string;
  minIntervalMs: number;
  maxRetries: number;
  defaultCacheTtlMs: number;
  jitterRatio: number;
  cacheStore?: CacheStore;
  fetchImpl: typeof fetch;
  log?: EsiLogFn;
};

export type RequestOptions = {
  correlationId?: string;
  cacheKey?: string;
  cacheTtlMs?: number;
  dedupeKey?: string;
  maxRetries?: number;
  method?: 'GET' | 'POST';
  body?: unknown;
};

export type RequestResult<T> = {
  data: T;
  status: number;
  pages: number;
  cacheHit: boolean;
  retries: number;
  latencyMs: number;
};
