# AGENTS.md

This repository is used by agentic coding tools. Follow these conventions when
making changes.

## Repo Overview
- Type: static frontend (no build step detected).
- Primary file: `client/index.html` (HTML + CSS + large inline JS).
- External dependency: Chart.js via CDN (`chart.umd.min.js`).
- Local logging helper: `client/logging.js`.

## Commands
No package manager or task runner config was found (no `package.json`,
`pyproject.toml`, etc.). That means build/lint/test are not standardized.

### Run Locally (Recommended)
Use a static file server (avoid opening the file via `file://` when debugging
fetch/caching behavior).

```bash
python -m http.server 8000
```

Open: `http://localhost:8000`

Open app path: `http://localhost:8000/client/`

Alternatives:

```bash
npx serve .
```

### Sync Local Workspace to Repo
When your local working copy lives in the parent folder (`../`), use:

```bash
bash sync-local.sh
```

Sync and include local `AGENTS.md` as well:

```bash
bash sync-local.sh --with-agents
```

One-command sync + commit + push:

```bash
bash sync-local.sh --with-agents --commit "Sync local workspace files" --push
```

Windows helper commands:

```bat
sync-local.cmd
syncp.cmd
```

OpenCode custom command:
- `/syncp` is defined in `.opencode/commands/syncp.md`.
- Prefer using `/syncp` explicitly instead of always-auto-sync to avoid
  accidental commits/pushes.

### Build
- Not configured.

### Lint
- Not configured.

### Test
- Not configured.

### Run A Single Test
- Not applicable yet (no test runner).
- If you add tests, update this section with:
  - full suite command
  - single file command
  - single test/case command

Example patterns to document once a runner exists:

```bash
# Full suite
npm test

# Single file
npm test -- path/to/file.test.js

# Single test name
npm test -- -t "does something"
```

## Smoke Test Checklist (Manual)
Run these checks in a browser after changes:
- Page loads with no fatal errors in DevTools console.
- Region/constellation dropdown flow still works.
- "Consultar mercado" triggers expected loading state and results.
- Orders table renders, sort/filter UI still responds.
- Collapsible sections (tables) toggle and update `aria-*` correctly.
- Charts render after "Generar graficas" (and no Chart.js warnings loop).
- CSV export still downloads expected content.

## Code Style
`client/index.html` is the source of truth. Make minimal, targeted edits and avoid
reformatting unrelated blocks.

### Language
- UI text is Spanish; keep it Spanish unless asked.
- Code identifiers are mostly English; keep that pattern.

### Formatting
- Prefer ASCII characters when editing/adding files.
- Keep semicolons (existing style).
- Prefer single quotes for JS strings unless embedding quotes is simpler.
- Keep functions readable; avoid very long lines when touching code.

### Imports / Modules
- There is no module bundler; code currently runs in the browser as-is.
- Do not introduce ESM imports without also adding a build/run plan.
- External libs should be added only if necessary and must be documented.

### Variables, Types, and Naming
- `const` by default; `let` only when reassigned; avoid `var`.
- `camelCase` for variables/functions, `UPPER_SNAKE_CASE` for constants.
- IDs from APIs: normalize with `Number(...)` and validate via
  `Number.isFinite(...)`.
- Prefer clear names for domain state (`destinationEntries`, `regionNameMap`).

### Error Handling and Resilience
- Treat network/API data as untrusted.
- Guard optional properties and array shapes before use.
- Favor early returns to reduce nesting.
- For recoverable failures: log and keep UI functional (partial results OK).
- Avoid silent failures unless intentionally best-effort.

### Async / Network Rules (ESI)
- Reuse existing helpers: `fetchWithRetry`, `get`, `post`.
- Respect ESI rate limits; do not bypass the queue/throttle pattern.
- Keep retry/backoff behavior consistent with existing logic.
- Preserve `Accept-Language` and user-agent/compatibility header rules.
- Keep conditional caching behavior (`ETag` / `If-None-Match`) intact.

### Caching
- Cache is implemented via `localStorage` with TTL.
- Keep cache keys stable (`esi.*`) and preserve payload shapes.
- When changing cached structures, ensure backward compatibility or bump keys.
- Respect HTTP cache headers (`Expires`, `Cache-Control`, `Last-Modified`) when
  extending ESI fetch logic.

### DOM / UI Practices
- Prefer the existing `j(selector)` helper for single-node queries.
- When updating collapsibles, keep `aria-expanded` / `aria-hidden` correct.
- Batch DOM updates where easy; avoid repeated expensive queries in loops.
- Keep existing IDs/classes stable unless there is a migration plan.

### Charts (Chart.js)
- Reuse and destroy chart instances appropriately to avoid leaks.
- Keep colors aligned with CSS variables (`--accent`, `--accent2`, etc.).
- Plugin code should be defensive (null checks, skip invalid points).

### Logging
- Use existing `logInfo`, `logWarn`, `logError` if available.
- Gate noisy ESI logs behind `LOG_ESI` (existing behavior).

## Security / Privacy
- Do not commit secrets, tokens, or account identifiers.
- Do not store sensitive data in `localStorage`.
- New third-party scripts must be justified and documented.

## Cursor / Copilot Rules
No editor agent rule files were found in this repo:
- `.cursor/rules/`: not present
- `.cursorrules`: not present
- `.github/copilot-instructions.md`: not present

If any of these are added later, mirror the relevant instructions here.

## Change Discipline
- Keep diffs small and task-scoped.
- Avoid large refactors unless requested.
- If you add tooling (lint/test/build), update the Commands section above.
