export type MarketOrder = {
  order_id: number;
  type_id: number;
  location_id: number;
  volume_remain: number;
  volume_total: number;
  min_volume: number;
  price: number;
  is_buy_order: boolean;
  issued: string;
  duration: number;
  range: string;
  system_id?: number;
};

export type SnapshotOrder = MarketOrder & {
  snapshot_id: string;
  region_id: number;
  constellation_id: number;
};

export type SnapshotSummary = {
  totalOrders: number;
  buyOrders: number;
  sellOrders: number;
  stationsWithOrders: number;
  stationsWithoutOrders: number;
};
