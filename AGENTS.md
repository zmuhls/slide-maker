# Repository Guidelines

## Project Structure & Module Organization
- `apps/web` — SvelteKit (Svelte 5) UI: editor, canvas, resources, chat.
- `apps/api` — Hono API + Drizzle/SQLite: auth, decks, artifacts, chat.
- `packages/shared` — Shared types and mutations used by web + API.
- `templates` — Slide templates and artifact definitions (JSON).
- `tests` — Vitest unit tests and shell checks; E2E via Playwright.
- `docs/prompts` — Handoff briefs and contributor prompts.

## Build, Test, and Development Commands
- `pnpm dev` — Run web + API via Turbo (web:5173, api:3001).
- `pnpm build` — Build all workspaces.
- `pnpm test` — Run unit tests for all packages.
- `pnpm test:e2e` — Playwright E2E against a running dev server.
- `pnpm db:seed` — Seed templates, themes, artifacts (admins when env is set).
- `pnpm seed:admin -- <email> [--password <pwd>]` — Create/update an admin.

## Coding Style & Naming Conventions
- TypeScript-first; Svelte 5 `$state`/`$derived` for reactivity.
- 2‑space indentation; descriptive names (avoid one‑letter vars).
- Keep modules small and composable under `apps/web/src/lib/**`.
- Artifacts: keep iframes sandboxed and inject a strict CSP for blob/inline HTML.

## Testing Guidelines
- Unit tests live in `tests/*.test.ts` (Vitest). Shell checks: `tests/*.sh` (run via `tests/run_all.sh`).
- E2E in `e2e/*.spec.ts` (Playwright). Add minimal fixtures and assertions.
- Add/adjust tests for any behavior you change (especially mutations, renderers, and artifact sizing).

## Commit & Pull Request Guidelines
- Conventional Commits: `feat:`, `fix:`, `docs:`, `chore:`, `test:`, `ux:`.
- Keep PRs small and scoped; include a clear description and screenshots/GIFs for UI changes.
- Link issues or handoff docs (see `docs/prompts/*`). Never commit secrets, `.env*`, or local logs (e.g., `.playwright-mcp/`).

## Security & Configuration Tips
- Configure env in `.env`; bootstrap data with `pnpm db:seed`.
- API and web run on separate ports; server enforces CORS/auth.
- Never inline third‑party scripts in artifacts without sandboxing.

## Agent‑Specific Notes
- Prefer surgical diffs; follow existing mutation flow and shared types.
- Artifact sizing: new blocks default to `autoSize: true` and `aspectRatio` (16/9). Manual resize should persist `width/height` and set `autoSize: false`.
- Validate locally with unit tests first, then E2E if UI‑affecting.
