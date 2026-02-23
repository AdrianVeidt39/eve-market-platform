# Consultas SQL de analisis (MySQL)

## Ultimos snapshots

```sql
SELECT id, region_id, constellation_id, created_at, summary
FROM snapshots
ORDER BY created_at DESC
LIMIT 20;
```

## Liquidez por estacion en un snapshot

```sql
SELECT
  location_id,
  SUM(CASE WHEN is_buy_order = 1 THEN volume_remain * price ELSE 0 END) AS buy_liquidity_isk,
  SUM(CASE WHEN is_buy_order = 0 THEN volume_remain * price ELSE 0 END) AS sell_liquidity_isk,
  COUNT(*) AS orders_count
FROM snapshot_orders
WHERE snapshot_id = 'TU_SNAPSHOT_ID'
GROUP BY location_id
ORDER BY sell_liquidity_isk DESC;
```

## Spread por item (best buy vs best sell)

```sql
SELECT
  type_id,
  MAX(CASE WHEN is_buy_order = 1 THEN price END) AS best_buy,
  MIN(CASE WHEN is_buy_order = 0 THEN price END) AS best_sell,
  MIN(CASE WHEN is_buy_order = 0 THEN price END) - MAX(CASE WHEN is_buy_order = 1 THEN price END) AS spread_abs
FROM snapshot_orders
WHERE snapshot_id = 'TU_SNAPSHOT_ID'
GROUP BY type_id
HAVING best_buy IS NOT NULL AND best_sell IS NOT NULL
ORDER BY spread_abs DESC
LIMIT 100;
```

## Logs de errores/reintentos

```sql
SELECT
  created_at,
  correlation_id,
  level,
  message,
  JSON_EXTRACT(context, '$.path') AS path,
  JSON_EXTRACT(context, '$.retries') AS retries,
  JSON_EXTRACT(context, '$.latencyMs') AS latency_ms
FROM esi_logs
WHERE level IN ('warn', 'error')
   OR JSON_EXTRACT(context, '$.retries') > 0
ORDER BY created_at DESC
LIMIT 200;
```
