import { setTimeout as sleep } from 'node:timers/promises';

import { MemoryCacheStore } from './memoryCache.js';
import type { EsiClientOptions, RequestOptions, RequestResult } from './types.js';

const RETRYABLE_STATUS = new Set([420, 429, 503]);

export class EsiClient {
  private readonly options: EsiClientOptions;
  private readonly inflight = new Map<string, Promise<RequestResult<unknown>>>();
  private nextAllowedAt = 0;

  constructor(options: Partial<EsiClientOptions> = {}) {
    this.options = {
      baseUrl: options.baseUrl ?? 'https://esi.evetech.net/latest',
      userAgent: options.userAgent ?? 'EVE Market Platform/2.0',
      compatibilityDate: options.compatibilityDate ?? '2026-02-19',
      minIntervalMs: options.minIntervalMs ?? 250,
      maxRetries: options.maxRetries ?? 3,
      defaultCacheTtlMs: options.defaultCacheTtlMs ?? 60_000,
      jitterRatio: options.jitterRatio ?? 0.2,
      fetchImpl: options.fetchImpl ?? fetch,
      cacheStore: options.cacheStore ?? new MemoryCacheStore(),
      log: options.log
    };
  }

  async get<T>(path: string, options: RequestOptions = {}): Promise<RequestResult<T>> {
    return (await this.request<T>(path, { ...options, method: 'GET' })) as RequestResult<T>;
  }

  async post<T>(
    path: string,
    body: unknown,
    options: RequestOptions = {}
  ): Promise<RequestResult<T>> {
    return (await this.request<T>(path, {
      ...options,
      method: 'POST',
      body
    })) as RequestResult<T>;
  }

  async clearCache(prefix = 'esi:'): Promise<number> {
    return this.options.cacheStore?.deleteByPrefix(prefix) ?? 0;
  }

  private async request<T>(path: string, options: RequestOptions): Promise<RequestResult<T>> {
    const dedupeKey =
      options.dedupeKey ??
      `${options.method ?? 'GET'}:${path}:${JSON.stringify(options.body ?? null)}`;
    const existing = this.inflight.get(dedupeKey);
    if (existing) {
      return (await existing) as RequestResult<T>;
    }

    const task = this.executeRequest<T>(path, options);
    this.inflight.set(dedupeKey, task as Promise<RequestResult<unknown>>);
    try {
      return await task;
    } finally {
      this.inflight.delete(dedupeKey);
    }
  }

  private async executeRequest<T>(
    path: string,
    options: RequestOptions
  ): Promise<RequestResult<T>> {
    const startedAt = Date.now();
    const cacheKey =
      options.cacheKey ??
      `esi:${options.method ?? 'GET'}:${path}:${JSON.stringify(options.body ?? null)}`;
    const cacheTtlMs = options.cacheTtlMs ?? this.options.defaultCacheTtlMs;
    const maxRetries = options.maxRetries ?? this.options.maxRetries;

    if ((options.method ?? 'GET') === 'GET' && cacheTtlMs > 0) {
      const cached = await this.options.cacheStore?.get(cacheKey);
      if (cached) {
        this.options.log?.({
          level: 'info',
          message: 'ESI cache hit',
          correlationId: options.correlationId,
          context: {
            path,
            cacheHit: true,
            retries: 0,
            latencyMs: Date.now() - startedAt
          }
        });
        return {
          data: cached.value as T,
          status: 200,
          pages: 0,
          cacheHit: true,
          retries: 0,
          latencyMs: Date.now() - startedAt
        };
      }
    }

    const url = this.toUrl(path);
    let retries = 0;

    while (true) {
      await this.waitTurn();
      const response = await this.options.fetchImpl(url, {
        method: options.method ?? 'GET',
        headers: {
          'Accept-Language': 'en',
          'Content-Type': 'application/json',
          'X-Compatibility-Date': this.options.compatibilityDate,
          'User-Agent': this.options.userAgent,
          'X-Correlation-Id': options.correlationId ?? ''
        },
        body: options.body == null ? undefined : JSON.stringify(options.body)
      });

      if (!RETRYABLE_STATUS.has(response.status)) {
        if (!response.ok) {
          const message = await response.text();
          throw new Error(`ESI ${response.status} ${path} ${message}`);
        }

        const data = (await response.json()) as T;
        if ((options.method ?? 'GET') === 'GET' && cacheTtlMs > 0) {
          await this.options.cacheStore?.set(cacheKey, data, cacheTtlMs);
        }

        this.options.log?.({
          level: 'info',
          message: 'ESI request completed',
          correlationId: options.correlationId,
          context: {
            path,
            status: response.status,
            cacheHit: false,
            retries,
            latencyMs: Date.now() - startedAt
          }
        });

        return {
          data,
          status: response.status,
          pages: Number(response.headers.get('x-pages') ?? '0'),
          cacheHit: false,
          retries,
          latencyMs: Date.now() - startedAt
        };
      }

      if (retries >= maxRetries) {
        throw new Error(`ESI retry limit reached for ${path}, status ${response.status}`);
      }

      const delay = this.computeRetryDelay(retries);
      retries += 1;
      this.options.log?.({
        level: 'warn',
        message: 'ESI retry',
        correlationId: options.correlationId,
        context: { path, status: response.status, retries, delay }
      });
      await sleep(delay);
    }
  }

  private toUrl(path: string): string {
    if (path.startsWith('http://') || path.startsWith('https://')) return path;
    return `${this.options.baseUrl.replace(/\/$/, '')}/${path.replace(/^\//, '')}`;
  }

  private async waitTurn(): Promise<void> {
    const now = Date.now();
    const readyAt = Math.max(this.nextAllowedAt, now);
    const waitMs = readyAt - now;
    this.nextAllowedAt = readyAt + this.options.minIntervalMs;
    if (waitMs > 0) await sleep(waitMs);
  }

  private computeRetryDelay(attempt: number): number {
    const base = Math.min(500 * 2 ** attempt, 8_000);
    const jitter = Math.floor(base * this.options.jitterRatio * Math.random());
    return base + jitter;
  }
}
