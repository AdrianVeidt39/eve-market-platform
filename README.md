# EVE Market Explorer

Static client to browse the EVE Online market by region, constellation and system.

## Usage

Open `client/index.html` in a modern browser. The page loads region data from the public ESI API and guides you through selecting a constellation. Press **Consultar mercado** to list buy and sell orders for every public station in the chosen constellation. Stations with no orders are highlighted.

## Development Notes

The client caches API responses and throttles requests (~300 ms between calls) to respect ESI rate limits. Responses that fail with 420/429/503 are retried with exponential backoff.

## Sync Local Workspace

If your editable workspace is in the parent folder (`../`) and this repository is the publish target, use:

```bash
bash sync-local.sh
```

Include local `AGENTS.md`, then commit and push in one command:

```bash
bash sync-local.sh --with-agents --commit "Sync local workspace files" --push
```

## Logging and Auditing

All API interactions and warnings are recorded through helper functions (`logInfo`, `logWarn`, `logError`). Each entry is stored in `localStorage` under the `esiLogs` key and, when possible, sent to a backend endpoint using `navigator.sendBeacon`.

ESI request logging is enabled by default. It can be toggled by setting an environment variable or a `localStorage` value:

```js
// disable
localStorage.setItem('LOG_ESI','false');
// enable
localStorage.setItem('LOG_ESI','true');
```

To retrieve the stored logs for audits, open the browser console and run:

```js
getStoredLogs(); // or JSON.parse(localStorage.getItem('esiLogs'))
```

The returned array can be exported or forwarded to your logging backend for compliance reviews.
