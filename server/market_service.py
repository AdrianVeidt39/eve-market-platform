"""Business logic for market analysis."""
from typing import Any, Dict, List

from esi_client import ESIClient


class MarketService:
    def __init__(self, client: ESIClient | None = None) -> None:
        self.client = client or ESIClient()

    def market_data(self, item_name: str) -> Dict[str, Any]:
        if not self.client.is_online():
            return {"error": "ESI API unavailable"}
        type_id = self.client.search_item(item_name)
        if not type_id:
            return {"error": "Item not found"}

        regions: List[int] = self.client.get_regions()
        results: List[Dict[str, Any]] = []
        for region_id in regions:
            orders = self.client.get_region_orders(region_id, type_id)
            if not orders:
                continue
            min_order = min(orders, key=lambda o: o["price"])
            volume = sum(o["volume_remain"] for o in orders)
            region_name = self.client.get_region_name(region_id)
            system_name = self.client.get_system_name(min_order["system_id"])
            results.append(
                {
                    "region_id": region_id,
                    "region_name": region_name,
                    "min_price": min_order["price"],
                    "volume": volume,
                    "system_name": system_name,
                }
            )
        return {"type_id": type_id, "results": results}
