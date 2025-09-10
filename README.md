# EVE Market Explorer

Static client to browse the EVE Online market by region, constellation and system.

## Usage

Open `client/index.html` in a modern browser. The page loads region data from the public ESI API and guides you through selecting a constellation. Press **Consultar mercado** to list buy and sell orders for every public station in the chosen constellation. Stations with no orders are highlighted.

## Development Notes

The client caches API responses and throttles requests (~300 ms between calls) to respect ESI rate limits. Responses that fail with 420/429/503 are retried with exponential backoff.
