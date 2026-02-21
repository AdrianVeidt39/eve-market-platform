export type AppConfig = {
  port: number;
  host: string;
  databaseUrl?: string;
  esiBaseUrl: string;
  esiCompatibilityDate: string;
  esiUserAgent: string;
  esiCacheTtlMs: number;
  esiMinIntervalMs: number;
  esiRetries: number;
};

export function loadConfig(): AppConfig {
  return {
    port: Number(process.env.PORT ?? '3001'),
    host: process.env.HOST ?? '0.0.0.0',
    databaseUrl: process.env.DATABASE_URL,
    esiBaseUrl: process.env.ESI_BASE_URL ?? 'https://esi.evetech.net/latest',
    esiCompatibilityDate: process.env.ESI_COMPATIBILITY_DATE ?? '2026-02-19',
    esiUserAgent: process.env.ESI_USER_AGENT ?? 'EVE Market Platform/2.0 (ops@local)',
    esiCacheTtlMs: Number(process.env.ESI_CACHE_TTL_MS ?? '86400000'),
    esiMinIntervalMs: Number(process.env.ESI_MIN_INTERVAL_MS ?? '300'),
    esiRetries: Number(process.env.ESI_RETRIES ?? '3')
  };
}
