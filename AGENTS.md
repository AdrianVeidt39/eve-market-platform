# AGENTS.md

This repository is used by agentic coding tools. Follow these conventions when
making changes.

## Repo Overview
- Type: static frontend (no build step detected).
- Primary UI file: `client/index.html` (HTML + CSS + large inline JS).
- Local helper script: `client/logging.js`.
- Test folder exists: `test/` (currently no standardized runner command found).
- External dependency: Chart.js via CDN (`chart.umd.min.js`).

## Commands
No package manager or task runner config was found (no `package.json`,
`pyproject.toml`, etc.). Build/lint/test are not standardized yet.

### Run Locally (Recommended)
Use a static file server from repo root:

```bash
python -m http.server 8000
```

Open: `http://localhost:8000/client/`

Alternative:

```bash
npx serve .
```

### Build
- Not configured.

### Lint
- Not configured.

### Test
- No confirmed test runner command in repo root.

### Run A Single Test
- Not configured yet.
- If a runner is added, document:
  - full suite command
  - single file command
  - single test/case command

Example patterns (once tooling exists):

```bash
# Full suite
npm test

# Single file
npm test -- test/validation.test.js

# Single case
npm test -- -t "validates market row"
```

## Smoke Test Checklist (Manual)
Run these checks in a browser after any code change:
- Page loads with no fatal errors in DevTools console.
- Region/constellation dropdown flow still works.
- "Consultar mercado" triggers loading state and results.
- Orders table renders and sort/filter UI responds.
- Collapsible table sections toggle and update `aria-*` correctly.
- Charts render after "Generar graficas" without warning loops.
- CSV export still downloads expected content.

## Code Style
`client/index.html` is the source of truth. Keep edits minimal and scoped.

### Language
- UI copy should stay in Spanish unless requested otherwise.
- Code identifiers are mostly English; preserve that pattern.

### Formatting
- Prefer ASCII characters when editing/adding files.
- Keep semicolons (existing style).
- Prefer single quotes for JS strings unless double quotes are simpler.
- Keep functions readable; avoid unnecessary long lines.

### Imports / Modules
- No module bundler is configured.
- Do not introduce ESM imports without adding a run/build plan.
- New external libs must be necessary and documented.

### Variables, Types, Naming
- `const` by default; `let` only when reassigned; avoid `var`.
- `camelCase` for variables/functions, `UPPER_SNAKE_CASE` for constants.
- Normalize API IDs with `Number(...)` and validate with
  `Number.isFinite(...)`.
- Keep domain names explicit (`destinationEntries`, `regionNameMap`, etc.).

### Error Handling and Resilience
- Treat API/network data as untrusted.
- Guard optional properties and array shapes before use.
- Favor early returns over deep nesting.
- For recoverable failures: keep UI functional with partial data.
- Avoid silent failures unless intentionally best-effort.

### Async / Network Rules (ESI)
- Reuse existing helpers: `fetchWithRetry`, `get`, `post`.
- Respect the existing ESI queue/throttle behavior.
- Keep retry/backoff aligned with current logic.
- Preserve `Accept-Language` and ESI user-agent/compatibility headers.
- Do not bypass ESI cache/rate-limit semantics.

### Caching
- Cache uses `localStorage` with TTL.
- Keep cache key shapes stable (`esi.*`).
- For payload changes, maintain backward compatibility or bump key version.

### DOM / UI Practices
- Prefer the existing `j(selector)` helper for single-node lookups.
- Keep collapsible `aria-expanded` / `aria-hidden` states correct.
- Batch DOM updates when practical.
- Keep stable IDs/classes unless a migration is planned.

### Charts (Chart.js)
- Reuse/destroy chart instances to prevent leaks.
- Keep chart colors aligned with CSS vars (`--accent`, `--accent2`, etc.).
- Plugin code should be defensive (null checks, skip invalid points).

### Logging
- Use existing `logInfo`, `logWarn`, `logError` when available.
- Keep verbose ESI logging gated behind `LOG_ESI`.

## Security / Privacy
- Do not commit secrets, API tokens, or account credentials.
- Do not store sensitive data in `localStorage`.
- New third-party scripts must be justified and documented.

## Cursor / Copilot Rules
No editor rule files were found in this repository:
- `.cursor/rules/`: not present
- `.cursorrules`: not present
- `.github/copilot-instructions.md`: not present

If any are added, mirror relevant instructions in this file.

## Change Discipline
- Keep diffs small and task-scoped.
- Avoid broad refactors unless requested.
- If tooling is added (lint/test/build), update Commands above.
