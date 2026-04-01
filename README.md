# Slide Maker

Chat-driven slide builder for the CUNY AI Lab. Create presentation decks through AI conversation and direct on-canvas editing.

## Contributor Guide

See Repository Guidelines in `AGENTS.md` for project structure, local dev commands, coding style, testing, and commit conventions.

## Prerequisites

- Node.js 18+
- [pnpm](https://pnpm.io/) 9.x (`corepack enable && corepack prepare pnpm@9.15.0 --activate`)

## Setup

1. **Install dependencies**

   ```bash
   pnpm install
   ```

2. **Configure environment**

   Copy the example env file and fill in your keys:

   ```bash
   cp .env.example .env.development
   ```

   Required variables:
   - `OPENROUTER_API_KEY` -- AI chat (OpenRouter)
   - `TAVILY_API_KEY` -- web search (`/search` command)
   - `SESSION_SECRET` -- any random string for auth sessions

   The `.env` file at the root is symlinked into `apps/api/.env` and `apps/web/.env`.

3. **Initialize the database**

   ```bash
   pnpm db:push    # apply schema to SQLite
   pnpm db:seed    # seed templates, default theme, admin users
   ```

## Running

```bash
pnpm dev
```

This starts both services via Turborepo:

| Service | URL |
|---------|-----|
| Web (SvelteKit) | http://localhost:5173 |
| API (Hono) | http://localhost:3001 |

## Project Structure

```
apps/api/        -- Hono API server (Node, SQLite, Drizzle ORM, Lucia auth)
apps/web/        -- SvelteKit frontend (Svelte 5, TipTap editor)
packages/shared/ -- Shared TypeScript types and constants
templates/       -- Seeded slide template JSON files
```

## Other Commands

```bash
pnpm build       # production build (both apps)
pnpm db:push     # push Drizzle schema changes to SQLite
pnpm db:seed     # re-seed templates and themes
pnpm seed:admin  # seed admin users only
```

## Deployment

Staging deploys to `tools.cuny.qzz.io/slide-maker` via `./deploy-staging.sh` (requires Tailscale/CUNY VPN).
