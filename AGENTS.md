# Repository Guidelines

## Project Structure & Module Organization
- `apps/web` — SvelteKit (Svelte 5) UI: editor, canvas, resources, chat, admin pages.
- `apps/api` — Hono API + Drizzle/SQLite: auth, decks, artifacts, chat, admin/debug routes.
- `packages/shared` — Shared types/mutations used by web + API.
- `templates` — Slide templates and artifact definitions (JSON).
- `tests` — Vitest unit tests and shell checks; Playwright E2E.
- Debug: `apps/web/src/routes/(app)/debug/*`, API: `apps/api/src/routes/debug.ts`, transcripts at `apps/api/data/debug-logs/transcripts.json`.

## Build, Test, and Development Commands
- `pnpm dev` — Run web + API via Turbo (web:5173, api:3001).
- `pnpm build` — Build all workspaces.
- `pnpm test` — Run unit tests across packages.
- `pnpm test:e2e` — Run Playwright E2E (requires `pnpm dev`).
- `pnpm db:seed` — Seed templates, themes, artifacts; auto-admins if env set.
- `pnpm seed:admin -- <email> [--password <pwd>]` — Create/update an admin.

## Coding Style & Naming Conventions
- TypeScript-first. Svelte 5 `$state`/`$derived` for reactivity.
- 2‑space indentation; clear, descriptive names (avoid one‑letter vars).
- Keep modules small under `apps/web/src/lib/**`; prefer composable utilities.
- Artifacts render in sandboxed iframes; inject strict CSP for blob/inline HTML.

## Testing Guidelines
- Unit: `tests/*.test.ts` (Vitest). Shell checks: `tests/*.sh` via `tests/run_all.sh`.
- E2E: `e2e/*.spec.ts` (Playwright). Keep fixtures minimal; assert core behaviors.
- Update/add tests when changing mutations, renderers, or artifact sizing.

## Commit & Pull Request Guidelines
- Conventional Commits: `feat:`, `fix:`, `docs:`, `chore:`, `test:`, `ux:`.
- Keep PRs small and scoped; include description and screenshots/GIFs for UI.
- Link issues or handoff docs (`docs/prompts/*`). Never commit secrets, `.env*`, or local logs (e.g., `.playwright-mcp/`).

## Security & Configuration Tips
- Configure env in `.env`; run `pnpm db:seed` on fresh setups.
- API/web on separate ports; CORS/CSRF/auth enforced server-side.
- Debug routes mount only when `NODE_ENV !== 'production'`; override transcript path with `DEBUG_TRANSCRIPT_LOG` for tests.

## Agent‑Specific Notes
- Prefer surgical diffs; follow existing mutation flow and shared types.
- Artifact sizing: new blocks default to `autoSize: true` and `aspectRatio` 16/9. On manual resize, persist `width/height` and set `autoSize: false`.
- Validate changes locally with unit tests first, then E2E for UI‑affecting work.

## LLM Debugging Dashboard
- Access: `/debug` (web), admin-only. API debug routes mount only in non‑production.
- Live Streams: subscribes to `GET /api/debug/stream` (SSE) with credentials. Shows model/user/deck, tokens/sec (~chars/4), chunk count; highlights ```mutation fences; completed/error streams fade and auto-collapse after 30s (Clear Completed to prune).
- Transcript Log: JSON persisted at `apps/api/data/debug-logs/transcripts.json`. Endpoints: `GET /api/debug/transcripts?limit=50&deck=ID&model=ID`, `DELETE /api/debug/transcripts`. UI supports filters, search, row expansion, markdown rendering; auto-refreshes every 5s and on `stream:done`.
- Local test: `pnpm dev`, seed an admin (`pnpm seed:admin -- <email> --password <pwd>`), log in, open a deck, send a chat, then watch Live Streams and confirm a transcript entry.
- Override for tests: set `DEBUG_TRANSCRIPT_LOG=/tmp/transcripts.test.json` to isolate logs.
