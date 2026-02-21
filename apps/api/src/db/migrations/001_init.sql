CREATE TABLE IF NOT EXISTS snapshots (
  id UUID PRIMARY KEY,
  correlation_id TEXT NOT NULL,
  region_id INTEGER NOT NULL,
  constellation_id INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  summary JSONB NOT NULL
);

CREATE TABLE IF NOT EXISTS snapshot_orders (
  snapshot_id UUID NOT NULL REFERENCES snapshots(id) ON DELETE CASCADE,
  order_id BIGINT NOT NULL,
  type_id INTEGER NOT NULL,
  location_id BIGINT NOT NULL,
  volume_remain BIGINT NOT NULL,
  volume_total BIGINT NOT NULL,
  min_volume BIGINT NOT NULL,
  price NUMERIC(20, 4) NOT NULL,
  is_buy_order BOOLEAN NOT NULL,
  issued TIMESTAMPTZ NOT NULL,
  duration INTEGER NOT NULL,
  range TEXT NOT NULL,
  system_id INTEGER,
  region_id INTEGER NOT NULL,
  constellation_id INTEGER NOT NULL,
  PRIMARY KEY (snapshot_id, order_id)
);

CREATE TABLE IF NOT EXISTS esi_logs (
  id BIGSERIAL PRIMARY KEY,
  correlation_id TEXT NOT NULL,
  level TEXT NOT NULL,
  message TEXT NOT NULL,
  context JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS schema_migrations (
  version TEXT PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
