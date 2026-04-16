# Kale Deploy Integration Design

**Date:** 2026-04-11
**Status:** Draft
**Author:** Zach Muhlbauer + Claude

## Context

The slide-maker already produces self-contained static HTML decks (HTML + CSS + JS + images) via its ZIP export pipeline. Kale Deploy is the CUNY AI Lab's Cloudflare Workers deployment platform, which supports a `static_site` shape that serves files from a `public/` directory. The goal is to add a second export path: a "Publish" button that deploys a deck to a public URL via Kale, alongside the existing local ZIP download.

**Problem:** Exported decks currently require manual hosting. Faculty and students must download a ZIP, extract it, and upload to their own web server. There's no way to go from "deck in the editor" to "live URL" without leaving the app.

**Outcome:** Admins can publish any deck to a public URL (`https://slide-decks.cuny.qzz.io/<slug>/`) with one click. Users can view published decks without authentication. Decks can be updated and unpublished.

## Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Deployment trigger | In-app "Publish" button | Seamless UX, no CLI needed |
| Hosting model | Single shared Kale project | All decks in one repo, one deploy, simpler infra |
| Access control | Admin-only publish, public URLs | Gatekeeping prevents accidental public exposure |
| Push mechanism | GitHub Trees API | Stateless, no git binary on server, atomic commits |
| Kale shape | `static_site` | Deck output is pure static files, no Worker logic |
| Pre-deploy validation | None (deferred) | Static files don't need a build step; if export is valid, deploy is valid |

## Architecture

Two parallel export paths from a shared file-generation core:

```
                    +------------------+
                    |  Deck in SQLite  |
                    +--------+---------+
                             |
                    +--------v---------+
                    | generateDeckFiles |  (shared core)
                    | html, css, js,    |
                    | assets, artifacts |
                    +--+------------+--+
                       |            |
              +--------v--+  +-----v---------+
              | ZIP Export |  | Kale Publish  |
              | (archiver) |  | (GitHub API)  |
              +-----------+  +------+---------+
                                     |
                              +------v--------+
                              | Kale Deploy   |
                              | auto-deploys  |
                              | on push       |
                              +--------------+
```

### Shared File Generation

Extract the file-generation logic from `exportDeckAsZip()` into a new function:

**File:** `apps/api/src/export/index.ts`

```typescript
interface GeneratedFile {
  path: string        // relative path, e.g., "css/styles.css"
  content: string | Buffer
  encoding: 'utf-8' | 'base64'
}

export function generateDeckFiles(
  slug: string,
  slideList: ExportSlide[],
  theme: ExportTheme | null,
  deckName: string,
  files?: ExportFile[]
): GeneratedFile[]
```

This returns an array of file descriptors (path + content + encoding). The existing `exportDeckAsZip()` becomes a thin wrapper that feeds these into `archiver`. The publish route feeds them into the GitHub API.

The function performs:
1. Normalize slides (modules/blocks)
2. `clearExtractedArtifacts()` + `renderDeckHtml()` with `extractArtifacts: true, externalJs: true`
3. Gather `FRAMEWORK_CSS`, `NAVIGATION_JS + CAROUSEL_JS`, `ARTIFACTS_JS`
4. Collect extracted artifact files, rewrite `/api/static/` refs to `../lib/`
5. Bundle static library dependencies (frappe-charts, leaflet)
6. Bundle uploaded file assets
7. Build manifest JSON
8. Return all as `GeneratedFile[]`

### GitHub API Client

**New file:** `apps/api/src/utils/github-publish.ts`

A focused client wrapping the GitHub Git Data API (REST):

```typescript
interface GitHubPublishConfig {
  token: string       // GITHUB_PUBLISH_TOKEN
  repo: string        // e.g., "CUNY-AI-Lab/slide-decks"
}

// Core operations
async function createBlob(config, content: string, encoding: 'utf-8' | 'base64'): Promise<string>  // returns SHA
async function getRef(config, ref: string): Promise<{ sha: string }>
async function getCommit(config, sha: string): Promise<{ tree: { sha: string } }>
async function createTree(config, baseTree: string, entries: TreeEntry[]): Promise<string>  // returns tree SHA
async function createCommit(config, tree: string, parent: string, message: string): Promise<string>  // returns commit SHA
async function updateRef(config, ref: string, sha: string): Promise<void>

// High-level operations
export async function publishDeckToGitHub(
  config: GitHubPublishConfig,
  slug: string,
  files: GeneratedFile[],
  commitMessage: string
): Promise<void>

export async function unpublishDeckFromGitHub(
  config: GitHubPublishConfig,
  slug: string,
  commitMessage: string
): Promise<void>
```

**Publish flow:**
1. `GET /repos/{repo}/git/ref/heads/main` -> latest commit SHA
2. `GET /repos/{repo}/git/commits/{sha}` -> base tree SHA
3. For each file: `POST /repos/{repo}/git/blobs` with content + encoding -> blob SHA
4. `POST /repos/{repo}/git/trees` with base tree + entries under `public/{slug}/` -> tree SHA
5. `POST /repos/{repo}/git/commits` with tree SHA + parent SHA + message -> commit SHA
6. `PATCH /repos/{repo}/git/refs/heads/main` with new commit SHA

**Unpublish flow:**
1. Same ref/commit/tree fetch
2. Get current tree, then get the `public/` subtree recursively
3. Rebuild the `public/` tree without the `{slug}` entry (GitHub's tree API replaces the full tree when no `base_tree` is specified — omitting entries effectively deletes them)
4. Create commit + update ref

### Database Changes

**File:** `apps/api/src/db/schema.ts`

Add three nullable columns to the `decks` table:

```typescript
publishedAt: integer('published_at', { mode: 'timestamp_ms' }),
publishSlug: text('publish_slug'),
publishUrl: text('publish_url'),
```

- `publishedAt` — timestamp of last publish. Null = never published.
- `publishSlug` — the slug used in the deployed URL. May differ from `deck.slug` to avoid collision.
- `publishUrl` — the full public URL (e.g., `https://slide-decks.cuny.qzz.io/my-deck/`).

After adding columns: `pnpm db:push`.

### API Routes

**New file:** `apps/api/src/routes/publish.ts`

Registered in `apps/api/src/index.ts` as `publishRouter` under `/api/decks`.

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/:id/publish` | Admin | Generate files, push to GitHub, update DB. Returns `{ url, publishedAt }` |
| `POST` | `/:id/unpublish` | Admin | Remove deck directory from GitHub repo, clear DB. Returns `{ ok: true }` |
| `GET` | `/:id/publish-status` | Deck access | Returns `{ published, url, publishedAt, publishSlug }` |

**Rate limit:** 3 publishes per 15 minutes per IP.

**Publish endpoint flow:**
1. Verify admin role (via existing `adminMiddleware`)
2. Verify deck exists and user has access
3. Load slides, blocks, theme, uploaded files (same as export route)
4. Resolve artifact sources
5. Call `generateDeckFiles(slug, slides, theme, deckName, files)`
6. Call `publishDeckToGitHub(config, slug, generatedFiles, commitMessage)`
7. Update deck record: `publishedAt = now`, `publishSlug = slug`, `publishUrl = ...`
8. Return `{ url, publishedAt }`

**Error handling:**
- GitHub API failures return 502 with error message
- Missing `GITHUB_PUBLISH_TOKEN` or `GITHUB_PUBLISH_REPO` returns 501 (not configured)
- Slug collision: append a short hash suffix (e.g., `my-deck-a3f2`)

### Frontend UI

**File:** `apps/web/src/lib/components/canvas/CanvasToolbar.svelte`

Add a "Publish" button next to the export button, visible only to admins:

```svelte
{#if $currentUser?.role === 'admin'}
  <button class="icon-btn" onclick={handlePublish} disabled={publishing || !$currentDeck} title={publishUrl ? 'Update published deck' : 'Publish deck'}>
    <!-- globe/upload icon -->
  </button>
{/if}
```

**States:**
- **Unpublished:** Globe icon, tooltip "Publish deck"
- **Publishing:** Spinner (same pattern as export)
- **Published:** Green dot indicator on the globe icon, tooltip shows URL. Click to show dropdown: "Update" / "Copy URL" / "Unpublish"

**API client additions** in `apps/web/src/lib/api.ts`:
```typescript
publishDeck(deckId: string): Promise<{ url: string, publishedAt: string }>
unpublishDeck(deckId: string): Promise<{ ok: boolean }>
getPublishStatus(deckId: string): Promise<{ published: boolean, url?: string, publishedAt?: string }>
```

### Kale Project Setup (One-Time, Manual)

A separate GitHub repo scaffolded once using Kale skills:

**Repo:** `CUNY-AI-Lab/slide-decks`

```
CUNY-AI-Lab/slide-decks/
  package.json
  wrangler.jsonc          # assets.directory: "public"
  kale.project.json       # projectShape: "static_site", staticOutputDir: "public"
  tsconfig.json
  src/index.ts            # stub: export default { fetch() { return new Response(null, { status: 404 }) } }
  AGENTS.md
  public/
    index.html            # optional: landing page listing published decks
```

**Setup steps:**
1. `kale-init slide-decks --shape static`
2. Push to `CUNY-AI-Lab/slide-decks`
3. `kale-connect` (authenticate)
4. `register_project` (approve GitHub App)
5. Push to main -> verify auto-deploy
6. Add `GITHUB_PUBLISH_TOKEN` and `GITHUB_PUBLISH_REPO=CUNY-AI-Lab/slide-decks` to slide-maker `.env`

**Published deck URLs:** `https://slide-decks.cuny.qzz.io/<slug>/index.html`

### Environment Variables

Add to `.env.example`:

```
# Kale Deploy publishing (optional — publish button hidden if not set)
GITHUB_PUBLISH_TOKEN=ghp_...        # GitHub fine-grained PAT with contents:write on the deck repo
GITHUB_PUBLISH_REPO=CUNY-AI-Lab/slide-decks  # org/repo for the Kale project
KALE_PUBLISH_BASE_URL=https://slide-decks.cuny.qzz.io  # base URL for published deck links
```

If `GITHUB_PUBLISH_TOKEN` is not set, the publish feature is disabled (button hidden, endpoint returns 501).

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `apps/api/src/utils/github-publish.ts` | Create | GitHub Git Data API client |
| `apps/api/src/routes/publish.ts` | Create | Publish/unpublish/status endpoints |
| `apps/api/src/export/index.ts` | Modify | Extract `generateDeckFiles()` from `exportDeckAsZip()` |
| `apps/api/src/db/schema.ts` | Modify | Add `publishedAt`, `publishSlug`, `publishUrl` to decks |
| `apps/api/src/index.ts` | Modify | Register `publishRouter` |
| `apps/web/src/lib/api.ts` | Modify | Add `publishDeck()`, `unpublishDeck()`, `getPublishStatus()` |
| `apps/web/src/lib/components/canvas/CanvasToolbar.svelte` | Modify | Add Publish button (admin-only) |
| `.env.example` | Modify | Add `GITHUB_PUBLISH_*` vars |

## Verification Plan

1. **Unit tests:** `generateDeckFiles()` returns expected file list matching current ZIP contents
2. **GitHub API tests:** Mock GitHub responses and verify the correct sequence of blob/tree/commit/ref API calls
3. **Refactor parity:** Existing `exportDeckAsZip()` produces identical output after refactoring to use `generateDeckFiles()`
4. **Integration:** Publish a test deck, verify files appear in the GitHub repo under `public/<slug>/`
5. **E2E manual:** Publish -> verify live URL -> update deck -> re-publish -> verify changes -> unpublish -> verify 404
6. **Admin gate:** Verify non-admin users cannot see the Publish button or call the endpoint
7. **Graceful degradation:** Verify publish feature is hidden when env vars are missing
