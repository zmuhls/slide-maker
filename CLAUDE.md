# Slide Maker — Claude Code Instructions

## What This Is

A chat-driven slide builder for the CUNY AI Lab. Users create presentation decks through AI conversation + direct on-canvas editing. Three-panel UI: chat + outline (left), canvas (center), resources (right). Produces HTML slide decks matching the CUNY AI Lab's actual deck framework (section-based navigation, step reveals, carousel sync).

## Architecture

**Monorepo** with pnpm workspaces and Turborepo:

```
apps/api/     — Hono API server (Node, port 3001)
apps/web/     — SvelteKit frontend (Svelte 5, port 5173)
packages/shared/ — Shared TypeScript types
templates/    — Seeded slide template JSON files (zone-based)
```

**Stack:**
- **Frontend:** SvelteKit 2, Svelte 5 (runes), TipTap rich text editor, @chenglou/pretext for text measurement/reflow
- **Backend:** Hono on Node (@hono/node-server), SQLite via better-sqlite3 + Drizzle ORM, Lucia v3 for auth
- **AI:** Anthropic SDK + OpenAI SDK (for OpenRouter). SSE streaming for chat responses with live mutation application.

## Dev Commands

```bash
pnpm install          # install all deps
pnpm dev              # run both API + web (turborepo)
pnpm db:push          # push Drizzle schema to SQLite
pnpm db:seed          # seed templates, theme, and admin users
```

**Env:** `.env` at workspace root, symlinked to `apps/api/.env` and `apps/web/.env`. See `.env.example`.

## Key Conventions

### Svelte 5 Runes
Always use runes, never Svelte 4 patterns:
- `$state()`, `$derived()`, `$effect()`, `$props()`
- `{@render children()}` not `<slot />`

### Slide Layouts (7 types)
Matching the CUNY AI Lab deck framework:
- `title-slide` — Cover slide. Zone: `hero` (centered)
- `layout-split` — Two-column (~70% of slides). Zones: `content` (left), `stage` (right). Resizable split ratio.
- `layout-content` — Full width single column. Zone: `main`
- `layout-grid` — Card grid. Zone: `main`
- `layout-full-dark` — Dark background. Zone: `main`
- `layout-divider` — Section break. Zone: `hero` (centered)
- `closing-slide` — Final slide. Zone: `hero` (centered)

### Module Types (12 types)
Do NOT invent new ones. Each module MUST specify a `zone` matching the layout.

| Module | Data Shape | Use |
|--------|-----------|-----|
| `heading` | `{ text, level: 1-4 }` | Titles, subtitles |
| `text` | `{ markdown?, html? }` | Paragraphs, formatted text (TipTap editing) |
| `card` | `{ content, variant?: 'cyan'\|'navy'\|'default' }` | Colored info cards |
| `label` | `{ text, color: 'cyan'\|'blue'\|'navy'\|'red'\|'amber'\|'green' }` | Section tag badges |
| `tip-box` | `{ content, title? }` | Callout/note boxes |
| `prompt-block` | `{ content, quality?: 'good'\|'mid'\|'bad', language? }` | Code/prompt display |
| `image` | `{ src, alt, caption? }` | Images (API URLs auto-prefixed) |
| `carousel` | `{ items: [{src, caption?}], syncSteps? }` | Image slider |
| `comparison` | `{ panels: [{title, content}] }` | Side-by-side panels |
| `card-grid` | `{ cards: [{title, content, color?}], columns?: 2-4 }` | Multi-card grid |
| `flow` | `{ nodes: [{label, description?}] }` | Process flow with arrows |
| `stream-list` | `{ items: string[] }` | Styled bullet list |

Renderers: `apps/web/src/lib/components/renderers/`. Dispatched by `ModuleRenderer.svelte`.

### Zone Model
Modules flow vertically within zones. No absolute x/y positioning.
- Layout defines which zones exist (see LAYOUT_ZONES in `packages/shared/src/block-types.ts`)
- Each module has a `zone` field
- Modules reorder via ▲/▼ buttons on hover
- Modules resize via corner drag (bottom-right) — content scales down via CSS transform

### Canvas Editing
- **Double-click** a text/card/tip-box module → TipTap rich text editor activates
- **Format toolbar** (fixed above slide): font size, bold, italic, link, bullet list, ordered list, align left/center/right
- **Corner resize** (bottom-right handle): drag to shrink module, content scales proportionally via CSS `transform: scale()`
- **▲/▼ buttons**: move module up/down within its zone
- **✕ button**: delete module (double-click to confirm)
- **+ Module button**: opens module picker overlay per zone
- **Split handle**: drag to resize left/right zone proportions in `layout-split`

### AI Chat Mutations
The AI emits mutations in ` ```mutation ` fenced blocks. Applied live during streaming (not after).

Key mutations:
- `addSlide { layout, modules: [{ type, zone, data }] }` — creates slide with modules
- `addBlock { slideId, block: { type, zone, data } }` — adds module to existing slide
- `updateBlock`, `removeBlock`, `removeSlide`, `updateSlide`, `setTheme`

System prompt at `apps/api/src/prompts/system.ts` — includes uploaded file URLs so AI can reference them.

### File Uploads
- Upload via Files tab or drag into chat input
- Stored at `apps/api/uploads/{deckId}/{fileId}{ext}`
- Served at `/api/decks/:deckId/files/:fileId` (no auth, cached)
- ImageModule auto-prefixes API_URL for relative paths
- Export rewrites API URLs to local `assets/` paths in zip

### Persistence
All mutations persist to API immediately. Pattern:
1. Call API endpoint
2. Update local Svelte store with response
3. Canvas re-renders reactively

### Export
Produces self-contained HTML decks matching the CUNY AI Lab framework:
- `css/styles.css` — layout classes, module styles, step reveals, responsive typography
- `js/` — deck-engine (keyboard nav, step system, carousel sync, scrubber)
- Accessible: ARIA roles, skip links, screen reader announcements
- `assets/` — bundled uploaded images

## Database

SQLite at `apps/api/data/slide-maker.db`. Schema at `apps/api/src/db/schema.ts`.

Key tables:
- `slides` — layout, splitRatio, order
- `content_blocks` — type, zone, data (JSON), order, stepOrder
- `templates` — layout, modules (JSON)
- `users`, `sessions`, `decks`, `deck_access`, `uploaded_files`, `chat_messages`, `deck_locks`

Push schema changes with `pnpm db:push`.

## Auth

- Email/password with `*.cuny.edu` domain gating
- Registration → email verification → admin approval → login
- Lucia v3 sessions (HTTP-only cookies)
- Admins: Stefano Morello (smorello@gc.cuny.edu), Zach Muhlbauer (zmuhlbauer@gc.cuny.edu)

## Deployment

- **Dev:** `pnpm dev` (localhost:5173 + localhost:3001)
- **Staging:** `tools.cuny.qzz.io/slide-maker` — Debian server, Nginx reverse proxy
- **Deploy:** Manual via GitHub Actions workflow (`workflow_dispatch`)
- **Nginx config:** `nginx/slide-maker.conf`

## Docs

- Vision: `slide-builder-prompt-pt1.md`
- Specs: `docs/superpowers/specs/2026-03-28-slide-maker-v{1,2,3}-design.md`
- Plans: `docs/superpowers/plans/2026-03-28-slide-maker-v{1,2,3}.md`

## Known Issues / Tech Debt

- PreTeXtBook/pretext is a server-side Python toolchain, NOT a browser JS library. Only chenglou/pretext (`@chenglou/pretext`) is integrated for text measurement.
- svelte-dnd-action still used for slide reordering in outline, removed from zones (replaced with ▲/▼ buttons).
- Fragment/progressive disclosure: schema + export support exists, canvas editing UX is minimal (step badge only).
- Export doesn't include speaker notes panel yet.
- No real-time collaborative editing — uses pessimistic locking (5-min TTL with heartbeat).
- Font size in format toolbar applies to entire editor DOM, not per-selection (TipTap TextStyle extension needed for proper per-selection sizing).
