CREATE TABLE IF NOT EXISTS snapshots (
  id CHAR(36) PRIMARY KEY,
  correlation_id VARCHAR(120) NOT NULL,
  region_id INT NOT NULL,
  constellation_id INT NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  summary JSON NOT NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS snapshot_orders (
  snapshot_id CHAR(36) NOT NULL,
  order_id BIGINT NOT NULL,
  type_id INT NOT NULL,
  location_id BIGINT NOT NULL,
  volume_remain BIGINT NOT NULL,
  volume_total BIGINT NOT NULL,
  min_volume BIGINT NOT NULL,
  price DECIMAL(20, 4) NOT NULL,
  is_buy_order TINYINT(1) NOT NULL,
  issued DATETIME(3) NOT NULL,
  duration INT NOT NULL,
  order_range VARCHAR(32) NOT NULL,
  system_id INT NULL,
  region_id INT NOT NULL,
  constellation_id INT NOT NULL,
  PRIMARY KEY (snapshot_id, order_id),
  CONSTRAINT fk_snapshot_orders_snapshot
    FOREIGN KEY (snapshot_id) REFERENCES snapshots(id)
    ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS esi_logs (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  correlation_id VARCHAR(120) NOT NULL,
  level VARCHAR(20) NOT NULL,
  message TEXT NOT NULL,
  context JSON NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS schema_migrations (
  version VARCHAR(255) PRIMARY KEY,
  applied_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB;
