# Repository Guidelines

## Project Structure & Modules
- `apps/web` — SvelteKit (Svelte 5) UI: editor/canvas, resources, chat, admin.
- `apps/api` — Hono API + Drizzle/SQLite: auth, decks, artifacts, chat, debug.
- `packages/shared` — Shared types and mutations used by web + API.
- `templates/` — Slide templates and artifact definitions (JSON).
- `tests/` — Vitest unit tests, shell checks; Playwright E2E.

## Build, Test, Develop
- `pnpm dev` — Run web+api (web:5173, api:3001).
- `pnpm build` — Build all workspaces via Turbo/Vite/tsc.
- `pnpm test` — Run unit tests (Vitest) and shell checks.
- `pnpm test:e2e` — Playwright E2E (requires `pnpm dev`).
- `pnpm db:seed` — Seed templates/themes/artifacts. `pnpm seed:admin -- <email> [--password <pwd>]` to create an admin.

## Coding Style & Naming
- TypeScript-first; 2-space indentation; descriptive names (avoid one-letter vars).
- Svelte 5 reactivity: use `$state`, `$derived`, `$effect`; avoid capturing initial props in state.
- Keep UI modules small under `apps/web/src/lib/**`; prefer composable utilities.
- Artifacts render in sandboxed iframes; apply strict CSP for blob/inline HTML.

## Testing Guidelines
- Unit tests in `tests/*.test.ts` (Vitest). Shell checks `tests/*.sh` via `tests/run_all.sh`.
- E2E in `e2e/*.spec.ts` (Playwright). Keep fixtures minimal; assert core behavior.
- Update/add tests when changing mutations, renderers, or artifact sizing/layout.

## Commits & PRs
- Conventional Commits: `feat:`, `fix:`, `docs:`, `chore:`, `test:`, `ux:`.
- Small, scoped PRs with clear description; include screenshots/GIFs for UI changes.
- Link issues and/or `docs/prompts/*`. Never commit secrets or `.env*`; exclude local logs (e.g., `.playwright-mcp/`).

## Security & Configuration
- Configure env in `.env`; run `pnpm db:seed` on fresh setups.
- API and web run on separate ports; enforce CORS/CSRF/auth server-side.
- Debug routes only when `NODE_ENV !== 'production'`. For tests, set `DEBUG_TRANSCRIPT_LOG=/tmp/transcripts.test.json`.

## Agent Notes
- Prefer surgical diffs; follow shared types and mutation flow.
- New blocks default `autoSize: true`, `aspectRatio: 16/9`; on manual resize, persist `width/height` and set `autoSize: false`.
