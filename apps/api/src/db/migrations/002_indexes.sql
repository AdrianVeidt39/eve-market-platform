CREATE INDEX idx_snapshots_created_at ON snapshots(created_at);
CREATE INDEX idx_snapshots_region_constellation ON snapshots(region_id, constellation_id);

CREATE INDEX idx_snapshot_orders_snapshot ON snapshot_orders(snapshot_id);
CREATE INDEX idx_snapshot_orders_type ON snapshot_orders(type_id);
CREATE INDEX idx_snapshot_orders_location ON snapshot_orders(location_id);
CREATE INDEX idx_snapshot_orders_issued ON snapshot_orders(issued);

CREATE INDEX idx_esi_logs_created_at ON esi_logs(created_at);
CREATE INDEX idx_esi_logs_correlation ON esi_logs(correlation_id);
