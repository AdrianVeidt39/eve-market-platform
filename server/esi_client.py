"""ESI API client with throttling, caching and connection checks."""
import logging
import time
from typing import Any, Dict, List, Optional

import requests
import requests_cache
from requests import HTTPError, RequestException

# Cache responses for one hour to avoid unnecessary calls
requests_cache.install_cache("esi_cache", expire_after=3600)

logger = logging.getLogger(__name__)


class ESIClient:
    """Minimal client for the EVE Swagger Interface."""

    BASE_URL = "https://esi.evetech.net/latest"
    USER_AGENT = "LocalMarketTool/1.0"

    def __init__(self) -> None:
        self._last_call: float = 0.0

    def _throttle(self, min_interval: float = 0.2) -> None:
        """Respect ESI rate limits by spacing out requests."""
        elapsed = time.time() - self._last_call
        if elapsed < min_interval:
            time.sleep(min_interval - elapsed)
        self._last_call = time.time()

    def _get(self, endpoint: str, params: Optional[Dict[str, Any]] = None, retries: int = 3) -> Any:
        """Internal helper to issue GET requests with retry/backoff."""
        for attempt in range(retries):
            self._throttle()
            headers = {"User-Agent": self.USER_AGENT}
            try:
                response = requests.get(
                    f"{self.BASE_URL}{endpoint}",
                    params=params,
                    headers=headers,
                    timeout=30,
                )
            except RequestException as exc:
                logger.error("ESI connection error on %s: %s", endpoint, exc)
                backoff = 2 ** attempt
                time.sleep(backoff)
                continue
            if response.status_code in (420, 429, 503):
                logger.warning(
                    "ESI rate limited (status %s) on %s", response.status_code, endpoint
                )
                backoff = 2 ** attempt
                time.sleep(backoff)
                continue
            response.raise_for_status()
            logger.info("ESI GET %s params=%s", endpoint, params)
            return response.json()
        raise RuntimeError(f"ESI request failed: {endpoint}")

    def is_online(self) -> bool:
        """Check whether the ESI API is reachable."""
        try:
            self._get("/status/")
        except Exception:
            return False
        return True

    def search_item(self, name: str) -> Optional[int]:
        """Return the type ID for an item name using a partial match."""
        try:
            data = self._get(
                "/search/",
                {"categories": "inventory_type", "search": name, "strict": False},
            )
        except HTTPError as exc:  # 404 means no matches
            if exc.response is not None and exc.response.status_code == 404:
                return None
            raise
        ids: List[int] = data.get("inventory_type", [])
        return ids[0] if ids else None

    def get_regions(self) -> List[int]:
        return self._get("/universe/regions/")

    def get_region_name(self, region_id: int) -> str:
        data = self._get(f"/universe/regions/{region_id}/")
        return data["name"]

    def get_region_orders(self, region_id: int, type_id: int) -> List[Dict[str, Any]]:
        params = {"type_id": type_id, "order_type": "sell"}
        return self._get(f"/markets/{region_id}/orders/", params)

    def get_system_name(self, system_id: int) -> str:
        data = self._get(f"/universe/systems/{system_id}/")
        return data["name"]
