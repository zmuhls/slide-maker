# Repository Guidelines

## Project Structure & Module Organization
- apps/web — SvelteKit (Svelte 5) UI: editor, canvas, resources, chat.
- apps/api — Hono API + Drizzle/SQLite: auth, decks, artifacts, chat.
- packages/shared — Shared types (mutations, block types).
- templates — Slide templates and artifact definitions (JSON).
- tests — Vitest unit tests and shell checks; e2e via Playwright.
- docs/prompts — Handoff briefs and contributor prompts.

## Build, Test, and Development Commands
- `pnpm dev` — Run web + API via Turbo (web:5173, api:3001).
- `pnpm build` — Build all workspaces.
- `pnpm test` — Run workspace tests.
- `pnpm db:seed` — Seed templates, themes, artifacts; also seeds admins if env is set.
- `pnpm seed:admin -- <email> [--password <pwd>]` — Create/update an admin.
- `pnpm test:e2e` — Playwright E2E against a running dev server.
- `pnpm vitest run tests/artifact-config.test.ts` — Run unit tests locally.

## Coding Style & Naming Conventions
- TypeScript everywhere; Svelte 5 `$state`/`$derived` patterns for reactivity.
- 2-space indentation; concise, self‑explanatory names (no one‑letter vars).
- Keep modules focused; prefer small, composable utilities under `apps/web/src/lib`.
- Security defaults: artifact iframes must remain sandboxed; inject CSP when using blobs.

## Testing Guidelines
- Unit tests in `tests/*.test.ts` (Vitest).
- Shell checks in `tests/*.sh`; run `tests/run_all.sh` for quick audits.
- E2E in `e2e/*.spec.ts` (Playwright). Provide minimal fixtures and assertions.
- Add/adjust tests for any behavior you change (especially mutations and renderers).

## Commit & Pull Request Guidelines
- Use Conventional Commits: `feat:`, `fix:`, `docs:`, `chore:`, `test:`, `ux:`.
- Keep PRs small and scoped; include a clear description and screenshots/GIFs for UI changes.
- Link issues or handoff docs (see `docs/prompts/*`).
- Do not commit secrets, `.env*`, or local logs (e.g., `.playwright-mcp/`).

## Security & Configuration Tips
- Configure env in `.env`; use `pnpm db:seed` to bootstrap data.
- API and web run on separate ports; CORS/auth are enforced server‑side.
- Never inline third‑party script URLs in artifacts without sandboxing.

## Agent‑Specific Notes
- Prefer surgical diffs; follow existing Svelte/TS patterns and mutation flow.
- Respect handoff plans in `docs/prompts/` and shared types in `packages/shared`.
- Validate changes with unit tests first, then E2E if UI‑affecting.
