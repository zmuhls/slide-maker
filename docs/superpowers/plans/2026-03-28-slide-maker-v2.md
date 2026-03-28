# Slide Maker v2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add file upload, slide/block reordering via drag, block resize on canvas, text reflow via chenglou/pretext, multi-column layouts, and fix v1 bugs.

**Architecture:** File upload via multer to local disk. Slide reordering via svelte-dnd-action in the outline. Block resize/drag via svelte-moveable on the canvas. Text overflow prevention via @chenglou/pretext measurements. Multi-column layouts via CSS grid in SlideRenderer.

**Tech Stack:** `@chenglou/pretext`, `svelte-moveable`, `svelte-dnd-action`, `multer` (file upload), existing SvelteKit + Hono stack

**Spec:** `docs/superpowers/specs/2026-03-28-slide-maker-v2-design.md`

---

## File Map

```
apps/api/src/
  routes/files.ts              ← NEW: file upload/serve/delete endpoints
  uploads/                     ← NEW: uploaded files stored here (gitignored)

apps/web/src/lib/
  components/
    resources/FilesTab.svelte  ← REWRITE: real file browser with upload
    outline/SlideOutline.svelte ← MODIFY: add svelte-dnd-action for slide reorder
    outline/SlideCard.svelte   ← MODIFY: add drag handle, move up/down buttons
    outline/BlockItem.svelte   ← MODIFY: add drag handle for block reorder
    canvas/SlideRenderer.svelte ← MODIFY: multi-column layout support
    canvas/SlideCanvas.svelte  ← MODIFY: integrate svelte-moveable for block resize/drag
    canvas/BlockWrapper.svelte ← NEW: wraps each block with moveable handles
    renderers/BlockRenderer.svelte ← MODIFY: pass layout props, resize callback
    renderers/TextBlock.svelte ← MODIFY: integrate pretext for overflow detection
    renderers/HeadingBlock.svelte ← MODIFY: auto-shrink on overflow
    renderers/QuoteBlock.svelte ← MODIFY: auto-shrink on overflow
  utils/
    text-measure.ts            ← NEW: chenglou/pretext wrapper
    mutations.ts               ← MODIFY: handle layout updates from resize
  stores/
    chat.ts                    ← MODIFY: load chat history on deck open
  api.ts                       ← MODIFY: add file upload/list/delete methods
```

---

## Task 1: File Upload Backend

**Files:**
- Create: `apps/api/src/routes/files.ts`
- Modify: `apps/api/src/index.ts` — mount files router

- [ ] **Step 1: Install multer**

```bash
cd apps/api && pnpm add multer @types/multer
```

- [ ] **Step 2: Create file upload route**

Create `apps/api/src/routes/files.ts`:

```typescript
import { Hono } from 'hono'
import { eq, and } from 'drizzle-orm'
import { createId } from '@paralleldrive/cuid2'
import fs from 'node:fs'
import path from 'node:path'
import { db } from '../db/index.js'
import { uploadedFiles, decks, deckAccess } from '../db/schema.js'
import { authMiddleware } from '../middleware/auth.js'

const filesRouter = new Hono()
filesRouter.use('/*', authMiddleware)

const UPLOAD_DIR = path.resolve(import.meta.dirname ?? '.', '..', '..', 'uploads')
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const ALLOWED_TYPES = [
  'image/png', 'image/jpeg', 'image/gif', 'image/svg+xml', 'image/webp',
  'application/pdf', 'text/csv', 'application/json', 'application/geo+json',
]

// POST /:deckId/files — upload a file
filesRouter.post('/:deckId/files', async (c) => {
  const user = c.get('user')
  const deckId = c.req.param('deckId')

  // Check access
  const access = await db.select().from(deckAccess)
    .where(and(eq(deckAccess.deckId, deckId), eq(deckAccess.userId, user.id))).get()
  if (!access || access.role === 'viewer') {
    return c.json({ error: 'No permission' }, 403)
  }

  const formData = await c.req.formData()
  const file = formData.get('file') as File | null
  if (!file) return c.json({ error: 'No file provided' }, 400)

  if (file.size > MAX_FILE_SIZE) {
    return c.json({ error: 'File too large (max 10MB)' }, 400)
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    return c.json({ error: `File type not allowed: ${file.type}` }, 400)
  }

  const fileId = createId()
  const ext = path.extname(file.name) || ''
  const storedName = `${fileId}${ext}`
  const deckDir = path.join(UPLOAD_DIR, deckId)

  fs.mkdirSync(deckDir, { recursive: true })

  const buffer = Buffer.from(await file.arrayBuffer())
  const filePath = path.join(deckDir, storedName)
  fs.writeFileSync(filePath, buffer)

  await db.insert(uploadedFiles).values({
    id: fileId,
    deckId,
    filename: file.name,
    mimeType: file.type,
    path: `${deckId}/${storedName}`,
    uploadedBy: user.id,
    createdAt: new Date(),
  })

  return c.json({
    file: {
      id: fileId,
      filename: file.name,
      mimeType: file.type,
      url: `/api/decks/${deckId}/files/${fileId}`,
    },
  }, 201)
})

// GET /:deckId/files — list files for deck
filesRouter.get('/:deckId/files', async (c) => {
  const deckId = c.req.param('deckId')
  const files = await db.select().from(uploadedFiles)
    .where(eq(uploadedFiles.deckId, deckId)).all()
  return c.json({
    files: files.map((f) => ({
      id: f.id,
      filename: f.filename,
      mimeType: f.mimeType,
      url: `/api/decks/${deckId}/files/${f.id}`,
      createdAt: f.createdAt,
    })),
  })
})

// GET /:deckId/files/:fileId — serve file
filesRouter.get('/:deckId/files/:fileId', async (c) => {
  const fileId = c.req.param('fileId')
  const file = await db.select().from(uploadedFiles)
    .where(eq(uploadedFiles.id, fileId)).get()
  if (!file) return c.json({ error: 'Not found' }, 404)

  const filePath = path.join(UPLOAD_DIR, file.path)
  if (!fs.existsSync(filePath)) return c.json({ error: 'File missing' }, 404)

  const buffer = fs.readFileSync(filePath)
  return new Response(buffer, {
    headers: {
      'Content-Type': file.mimeType,
      'Content-Disposition': `inline; filename="${file.filename}"`,
      'Cache-Control': 'public, max-age=86400',
    },
  })
})

// DELETE /:deckId/files/:fileId — delete file
filesRouter.delete('/:deckId/files/:fileId', async (c) => {
  const user = c.get('user')
  const deckId = c.req.param('deckId')
  const fileId = c.req.param('fileId')

  const file = await db.select().from(uploadedFiles)
    .where(eq(uploadedFiles.id, fileId)).get()
  if (!file) return c.json({ error: 'Not found' }, 404)

  const filePath = path.join(UPLOAD_DIR, file.path)
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath)

  await db.delete(uploadedFiles).where(eq(uploadedFiles.id, fileId))
  return c.json({ message: 'Deleted' })
})

export { filesRouter }
```

- [ ] **Step 3: Mount in app entry**

Add to `apps/api/src/index.ts`:
```typescript
import { filesRouter } from './routes/files.js'
app.route('/api/decks', filesRouter)
```

- [ ] **Step 4: Add uploads to gitignore**

Append to `.gitignore`:
```
apps/api/uploads/
```

- [ ] **Step 5: Add file API methods to frontend**

Add to `apps/web/src/lib/api.ts`:
```typescript
  // Files
  uploadFile: async (deckId: string, file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    const res = await fetch(`${API_URL}/api/decks/${deckId}/files`, {
      method: 'POST',
      credentials: 'include',
      body: formData,
    })
    if (!res.ok) {
      const body = await res.json().catch(() => ({ error: res.statusText }))
      throw new Error(body.error ?? 'Upload failed')
    }
    return res.json()
  },
  listFiles: (deckId: string) =>
    request<{ files: any[] }>(`/api/decks/${deckId}/files`),
  deleteFile: (deckId: string, fileId: string) =>
    request(`/api/decks/${deckId}/files/${fileId}`, { method: 'DELETE' }),
```

Note: `uploadFile` doesn't use the generic `request()` helper because it sends FormData, not JSON.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add file upload API with serve, list, and delete

Multipart upload to local disk, 10MB limit, image/pdf/csv/json/geojson.
Files served with caching headers. CRUD endpoints on /api/decks/:id/files."
```

---

## Task 2: File Browser UI (FilesTab)

**Files:**
- Rewrite: `apps/web/src/lib/components/resources/FilesTab.svelte`

- [ ] **Step 1: Rewrite FilesTab with upload and file grid**

Replace the placeholder with a real file browser. The component needs:
- A `deckId` prop (add to ResourcePanel.svelte which renders it — pass `$currentDeck?.id`)
- On mount: fetch files via `api.listFiles(deckId)`
- Upload zone: a button that opens a file picker, or drag-and-drop onto the tab
- File grid: show thumbnails for images (use the serve URL), filename + type icon for others
- Click an image file: insert it as an `image` block on the active slide via `applyMutation({ action: 'addBlock', payload: { slideId, block: { type: 'image', data: { src: fileUrl, alt: filename } } } })`
- Delete button (✕) on each file with confirmation
- Loading and error states

The file serve URL pattern is: `${API_URL}/api/decks/${deckId}/files/${fileId}`

Use Svelte 5 patterns ($state, $effect, $props). Style with CUNY brand tokens.

- [ ] **Step 2: Pass deckId to FilesTab from ResourcePanel**

Modify `ResourcePanel.svelte` to read `$currentDeck?.id` and pass it as a prop to `FilesTab`.

- [ ] **Step 3: Verify upload and insert**

Upload an image via the Files tab, click it, verify it inserts into the active slide on the canvas.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: add file browser with upload, thumbnails, and insert into slides

Upload images/files via drag-and-drop or file picker. Thumbnails for
images, icons for other types. Click to insert as image block on
active slide."
```

---

## Task 3: Slide Reordering via Drag

**Files:**
- Modify: `apps/web/src/lib/components/outline/SlideOutline.svelte`
- Modify: `apps/web/src/lib/components/outline/SlideCard.svelte`

- [ ] **Step 1: Install svelte-dnd-action**

```bash
cd apps/web && pnpm add svelte-dnd-action
```

- [ ] **Step 2: Add drag-and-drop to SlideOutline**

Modify `SlideOutline.svelte` to use `svelte-dnd-action` on the slide list container:

```svelte
<script lang="ts">
  import { dndzone } from 'svelte-dnd-action'
  // ... existing imports

  function handleDndConsider(e: CustomEvent) {
    // Update local slides order during drag
    currentDeck.update((d) => d ? { ...d, slides: e.detail.items } : d)
  }

  async function handleDndFinalize(e: CustomEvent) {
    const newSlides = e.detail.items
    currentDeck.update((d) => d ? { ...d, slides: newSlides } : d)

    // Persist new order to API
    const order = newSlides.map((s: any) => s.id)
    const deckId = deck?.id
    if (deckId) {
      await fetch(`${API_URL}/api/decks/${deckId}/slides/reorder`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order }),
      })
    }
  }
</script>

<div class="slide-list"
  use:dndzone={{ items: slides, flipDurationMs: 200, dragDisabled: false }}
  onconsider={handleDndConsider}
  onfinalize={handleDndFinalize}
>
  {#each slides as slide, i (slide.id)}
    <SlideCard {slide} active={slide.id === activeId} index={i} />
  {/each}
</div>
```

Note: `svelte-dnd-action` requires items to have an `id` property, which our slides already have. For Svelte 5, use `onconsider` and `onfinalize` (not `on:consider`).

- [ ] **Step 3: Add drag handle styling to SlideCard**

Add a drag handle (⠿ or ≡ icon) to the left side of each SlideCard that serves as the drag grip. The entire card should be draggable but the handle provides visual affordance.

- [ ] **Step 4: Verify drag reorder persists**

Drag a slide to a new position in the outline, refresh the page, verify the order persisted.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add slide reordering via drag-and-drop in outline

svelte-dnd-action on the slide list. Drag slides to reorder,
persists to API on drop."
```

---

## Task 4: Block Reordering in Expanded Slide Card

**Files:**
- Modify: `apps/web/src/lib/components/outline/SlideCard.svelte`
- Modify: `apps/web/src/lib/components/outline/BlockItem.svelte`

- [ ] **Step 1: Add dndzone to block list in expanded SlideCard**

When a SlideCard is expanded (active), the block list should also be drag-reorderable:

```svelte
<div class="block-list"
  use:dndzone={{ items: slide.blocks, flipDurationMs: 150 }}
  onconsider={handleBlockConsider}
  onfinalize={handleBlockFinalize}
>
  {#each slide.blocks as block (block.id)}
    <BlockItem {block} />
  {/each}
</div>
```

On finalize: update the block order in the store via `updateSlideInDeck`, and persist by calling the reorder API (or updating each block's order).

- [ ] **Step 2: Add drag handle to BlockItem**

Add a ⠿ grip icon to the left of each BlockItem.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: add block reordering via drag in slide accordion"
```

---

## Task 5: Block Resize & Drag on Canvas (svelte-moveable)

**Files:**
- Create: `apps/web/src/lib/components/canvas/BlockWrapper.svelte`
- Modify: `apps/web/src/lib/components/canvas/SlideRenderer.svelte`
- Modify: `apps/web/src/lib/components/renderers/BlockRenderer.svelte`
- Modify: `apps/web/src/lib/utils/mutations.ts`

- [ ] **Step 1: Install svelte-moveable**

```bash
cd apps/web && pnpm add svelte-moveable
```

- [ ] **Step 2: Create BlockWrapper component**

Create `apps/web/src/lib/components/canvas/BlockWrapper.svelte`:

This component wraps each block on the canvas when `editable=true`. It provides:
- Resize handles (corners and edges) via svelte-moveable's `Resizable`
- Drag to reposition via svelte-moveable's `Draggable`
- Stores position/size in the block's `layout` field
- On resize end / drag end: persist layout to API via `PATCH /api/decks/:deckId/slides/:slideId/blocks/:blockId` with the new layout

```svelte
<script lang="ts">
  import Moveable from 'svelte-moveable'

  let { children, block, deckId, slideId, onLayoutChange }: {
    children: any
    block: { id: string; layout?: { x: number; y: number; width: number; height: number } | null }
    deckId: string
    slideId: string
    onLayoutChange: (blockId: string, layout: { x: number; y: number; width: number; height: number }) => void
  } = $props()

  let targetRef: HTMLDivElement
  let x = $state(block.layout?.x ?? 0)
  let y = $state(block.layout?.y ?? 0)
  let width = $state(block.layout?.width ?? 0)
  let height = $state(block.layout?.height ?? 0)
</script>

<div
  bind:this={targetRef}
  class="block-moveable"
  style="transform: translate({x}px, {y}px); {width ? `width: ${width}px;` : ''} {height ? `height: ${height}px;` : ''}"
>
  {@render children()}
</div>

<Moveable
  target={targetRef}
  draggable={true}
  resizable={true}
  snappable={true}
  on:drag={({ detail }) => {
    x += detail.delta[0]
    y += detail.delta[1]
  }}
  on:dragEnd={() => {
    onLayoutChange(block.id, { x, y, width, height })
  }}
  on:resize={({ detail }) => {
    width = detail.width
    height = detail.height
    x += detail.drag.delta[0]
    y += detail.drag.delta[1]
  }}
  on:resizeEnd={() => {
    onLayoutChange(block.id, { x, y, width, height })
  }}
/>
```

Note: Check the actual svelte-moveable API for the installed version — event names may differ (e.g., `onDrag` vs `on:drag`). The component may use a different pattern for Svelte 5. Read the svelte-moveable docs/README in node_modules.

- [ ] **Step 3: Integrate BlockWrapper into SlideRenderer**

When `editable=true` and the slide is in free-form layout mode, wrap each block in BlockWrapper:

```svelte
{#each sortedBlocks as block (block.id)}
  {#if editable && freeFormLayout}
    <BlockWrapper {block} {deckId} {slideId} onLayoutChange={handleLayoutChange}>
      <BlockRenderer {block} {editable} />
    </BlockWrapper>
  {:else}
    <BlockRenderer {block} {editable} />
  {/if}
{/each}
```

The `handleLayoutChange` callback should persist the layout via the API.

- [ ] **Step 4: Persist layout changes**

Add to `apps/web/src/lib/utils/mutations.ts` or inline in the component:

```typescript
async function handleLayoutChange(blockId: string, layout: { x: number; y: number; width: number; height: number }) {
  await apiCall(`/api/decks/${deckId}/slides/${slideId}/blocks/${blockId}`, 'PATCH', { layout })
  updateSlideInDeck(slideId, (s) => ({
    ...s,
    blocks: s.blocks.map((b) => b.id === blockId ? { ...b, layout } : b),
  }))
}
```

Also update the PATCH block API endpoint in `apps/api/src/routes/decks.ts` to accept a `layout` field:

```typescript
// In the PATCH /:id/slides/:slideId/blocks/:blockId handler
if (body.layout !== undefined) {
  updateData.layout = body.layout
}
```

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add block resize and drag on canvas via svelte-moveable

Blocks can be resized via corner/edge handles and dragged to
reposition. Layout persisted to DB. Moveable handles shown on
editable slides."
```

---

## Task 6: Text Reflow via chenglou/pretext

**Files:**
- Create: `apps/web/src/lib/utils/text-measure.ts`
- Modify: `apps/web/src/lib/components/renderers/TextBlock.svelte`
- Modify: `apps/web/src/lib/components/renderers/HeadingBlock.svelte`
- Modify: `apps/web/src/lib/components/renderers/QuoteBlock.svelte`

- [ ] **Step 1: Install @chenglou/pretext**

```bash
cd apps/web && pnpm add @chenglou/pretext
```

- [ ] **Step 2: Create text measurement wrapper**

Create `apps/web/src/lib/utils/text-measure.ts`:

```typescript
import { prepare, layout } from '@chenglou/pretext'

/**
 * Measure text and return the optimal font size that fits within
 * the given container dimensions.
 */
export function fitText(
  text: string,
  fontFamily: string,
  baseFontSize: number,
  fontWeight: number | string,
  containerWidth: number,
  containerHeight: number,
  lineHeight: number = 1.5,
  minFontSize: number = 10,
): { fontSize: number; lineCount: number; height: number } {
  let fontSize = baseFontSize

  while (fontSize >= minFontSize) {
    const font = `${fontWeight} ${fontSize}px ${fontFamily}`
    const prepared = prepare(text, font)
    const result = layout(prepared, containerWidth, fontSize * lineHeight)

    if (result.height <= containerHeight) {
      return { fontSize, lineCount: result.lineCount, height: result.height }
    }

    fontSize -= 1
  }

  // Return minimum size even if it overflows
  const font = `${fontWeight} ${minFontSize}px ${fontFamily}`
  const prepared = prepare(text, font)
  const result = layout(prepared, containerWidth, minFontSize * lineHeight)
  return { fontSize: minFontSize, lineCount: result.lineCount, height: result.height }
}

/**
 * Check if text overflows the given container at the specified font size.
 */
export function textOverflows(
  text: string,
  fontFamily: string,
  fontSize: number,
  fontWeight: number | string,
  containerWidth: number,
  containerHeight: number,
  lineHeight: number = 1.5,
): boolean {
  const font = `${fontWeight} ${fontSize}px ${fontFamily}`
  const prepared = prepare(text, font)
  const result = layout(prepared, containerWidth, fontSize * lineHeight)
  return result.height > containerHeight
}
```

- [ ] **Step 3: Integrate into TextBlock**

Modify `TextBlock.svelte` to detect overflow and auto-shrink:

- Add a `containerRef` binding to the text-block div
- Use `$effect` to measure the container dimensions
- If the rendered text overflows, use `fitText()` to calculate a smaller font size
- Apply the computed font size as an inline style

```svelte
<script lang="ts">
  import { fitText } from '$lib/utils/text-measure'

  // ... existing props and derived values

  let containerRef: HTMLDivElement | undefined = $state()
  let computedFontSize = $state<number | null>(null)

  $effect(() => {
    if (!containerRef || !text) return
    const rect = containerRef.getBoundingClientRect()
    if (rect.width === 0 || rect.height === 0) return

    const baseFontSize = 18 // base px corresponding to the clamp value
    const result = fitText(
      text,
      'Inter, system-ui, sans-serif',
      baseFontSize,
      400,
      rect.width,
      rect.height,
      1.7,
      12,
    )

    // Only shrink, never enlarge past the CSS default
    computedFontSize = result.fontSize < baseFontSize ? result.fontSize : null
  })
</script>

<div
  bind:this={containerRef}
  class="text-block"
  style={computedFontSize ? `font-size: ${computedFontSize}px;` : ''}
  ...
>
```

- [ ] **Step 4: Integrate into HeadingBlock and QuoteBlock**

Apply the same pattern: measure, detect overflow, auto-shrink the font size. Headings should shrink from their large base size down to a minimum. Quotes similarly.

For HeadingBlock: base size depends on level (h1=48, h2=32, h3=24, h4=18), shrink down to level-appropriate minimums.

For QuoteBlock: base size ~22px, shrink to ~14px minimum.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add text reflow via @chenglou/pretext

Text blocks auto-shrink font size when content overflows container.
Headings and quotes also auto-fit. Uses chenglou/pretext for fast
text measurement without DOM reflow."
```

---

## Task 7: Multi-Column Slide Layouts

**Files:**
- Modify: `apps/web/src/lib/components/canvas/SlideRenderer.svelte`
- Modify: `apps/api/src/db/schema.ts` — add layout field to slides table
- Modify: `apps/api/src/prompts/system.ts` — tell AI about column layouts

- [ ] **Step 1: Add layout field to slides table**

Add to the `slides` table in `apps/api/src/db/schema.ts`:

```typescript
layout: text('layout', { enum: ['single', 'two-column', 'two-column-wide-left', 'two-column-wide-right'] }).notNull().default('single'),
```

Run `pnpm drizzle-kit push` to update the DB.

- [ ] **Step 2: Update SlideRenderer for multi-column**

When `slide.layout === 'two-column'` (or variants), render a CSS grid:

```svelte
{#if slideLayout === 'two-column'}
  <div class="slide-columns two-col">
    <div class="col col-left">
      {#each leftBlocks as block (block.id)}
        <BlockRenderer {block} {editable} />
      {/each}
    </div>
    <div class="col col-right">
      {#each rightBlocks as block (block.id)}
        <BlockRenderer {block} {editable} />
      {/each}
    </div>
  </div>
{:else}
  <!-- existing single-column rendering -->
{/if}
```

Where `leftBlocks` = blocks with `data.column === 'left'` or no column specified (default left), and `rightBlocks` = blocks with `data.column === 'right'`.

CSS:
```css
.slide-columns.two-col {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: clamp(1rem, 2vw, 2rem);
  height: 100%;
}
.two-col-wide-left { grid-template-columns: 3fr 2fr; }
.two-col-wide-right { grid-template-columns: 2fr 3fr; }
.col { display: flex; flex-direction: column; gap: 0.75rem; }
```

- [ ] **Step 3: Update system prompt**

Add to the system prompt in `apps/api/src/prompts/system.ts`:

```
## Slide Layouts
Slides support a `layout` field: "single" (default), "two-column", "two-column-wide-left", "two-column-wide-right".
For two-column slides, set block data.column to "left" or "right" to place blocks in the appropriate column.
Use two-column layouts for text+image pairs, comparison slides, and side-by-side content.
```

Add a `updateSlideLayout` mutation or include layout in the existing `updateSlide` action.

- [ ] **Step 4: Update addSlide mutation to support layout**

In the system prompt mutation docs, the `addSlide` payload should accept an optional `layout` field. Update the API's POST /:id/slides endpoint to accept and store the layout field.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add multi-column slide layouts

Two-column, wide-left, and wide-right grid layouts. Blocks placed
by data.column field. AI agent can create columnar slides."
```

---

## Task 8: Bug Fixes from v1 Testing

**Files:**
- Modify: `apps/web/src/routes/(app)/deck/[id]/+page.svelte` — load chat history
- Modify: `apps/web/src/routes/(app)/+page.svelte` — refresh gallery after deck creation
- Modify: `apps/web/src/lib/components/chat/ChatPanel.svelte` — loading indicator
- Modify: `apps/web/src/lib/components/outline/SlideOutline.svelte` — scroll to new slide

- [ ] **Step 1: Load chat history when opening a deck**

In `apps/web/src/routes/(app)/deck/[id]/+page.svelte`, after loading the deck, also load chat history:

```typescript
// After setting currentDeck
const historyRes = await api.getChatHistory(deckId)
if (historyRes?.messages) {
  chatMessages.set(historyRes.messages.map((m: any, i: number) => ({
    id: `hist-${i}`,
    role: m.role,
    content: m.content,
    streaming: false,
  })))
}
```

Add to `api.ts`:
```typescript
getChatHistory: (deckId: string) =>
  request<{ messages: any[] }>(`/api/chat/${deckId}/history`),
```

- [ ] **Step 2: Add loading indicator before first AI chunk**

In `ChatPanel.svelte`, after creating the streaming assistant message and before the first chunk arrives, show "Thinking..." in the assistant bubble. The existing blinking cursor handles this partly, but the message should show the text "Thinking..." that gets replaced by the first chunk:

```typescript
appendToAssistant(assistantId, 'Thinking...')

await streamChat(
  text, deck.id, slideId, modelId, history,
  (chunk) => {
    if (fullText === '') {
      // Replace "Thinking..." with first real chunk
      chatMessages.update((msgs) =>
        msgs.map((m) => m.id === assistantId ? { ...m, content: chunk } : m)
      )
    } else {
      appendToAssistant(assistantId, chunk)
    }
    fullText += chunk
  },
  // ... rest unchanged
)
```

- [ ] **Step 3: Scroll to newly created slide in outline**

In `SlideOutline.svelte`, when `activeSlideId` changes, scroll the active card into view:

```svelte
$effect(() => {
  if (activeId) {
    const el = document.querySelector(`[data-slide-id="${activeId}"]`)
    el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }
})
```

Add `data-slide-id={slide.id}` to SlideCard's root element.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "fix: load chat history, add thinking indicator, scroll to new slides"
```

---

## Task 9: Export Improvements — Include Uploaded Images

**Files:**
- Modify: `apps/api/src/export/index.ts`
- Modify: `apps/api/src/export/html-renderer.ts`
- Modify: `apps/api/src/routes/export.ts`

- [ ] **Step 1: Include uploaded files in export zip**

In `apps/api/src/routes/export.ts`, after loading the deck, also load uploaded files:

```typescript
const files = await db.select().from(uploadedFiles)
  .where(eq(uploadedFiles.deckId, deckId)).all()
```

Pass them to `exportDeckAsZip()`.

In `apps/api/src/export/index.ts`, add uploaded files to the archive:

```typescript
// Add uploaded files
for (const file of files) {
  const filePath = path.join(UPLOAD_DIR, file.path)
  if (fs.existsSync(filePath)) {
    archive.file(filePath, { name: `${slug}/assets/${file.filename}` })
  }
}
```

- [ ] **Step 2: Rewrite image src in exported HTML**

In `html-renderer.ts`, when rendering image blocks, replace API URLs (`/api/decks/.../files/...`) with relative paths (`assets/filename.ext`):

```typescript
case 'image':
  let src = data.src ?? data.url ?? ''
  // Rewrite API file URLs to local paths
  if (src.includes('/api/decks/') && src.includes('/files/')) {
    const fileId = src.split('/files/').pop()
    const file = files?.find(f => f.id === fileId)
    if (file) src = `assets/${file.filename}`
  }
  return `<figure><img src="${escapeHtml(src)}" alt="${escapeHtml(data.alt ?? '')}">...</figure>`
```

Pass the files array into `renderDeckHtml()`.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: include uploaded images in exported zip

Image src rewritten from API URLs to local asset paths.
Uploaded files bundled in assets/ directory."
```

---

## Task 10: Fragment/Progressive Disclosure

**Files:**
- Modify: `apps/api/src/db/schema.ts` — add fragmentOrder to content_blocks
- Modify: `apps/web/src/lib/components/renderers/BlockRenderer.svelte`
- Modify: `apps/api/src/export/html-renderer.ts`
- Modify: `apps/api/src/prompts/system.ts`

- [ ] **Step 1: Add fragmentOrder to content_blocks**

```typescript
fragmentOrder: integer('fragment_order'), // nullable — null means not a fragment
```

Run `pnpm drizzle-kit push`.

- [ ] **Step 2: Render fragments on canvas**

In `BlockRenderer.svelte`, if `block.fragmentOrder !== null`, apply a visual indicator:

```svelte
<div class="block-wrapper" class:editable class:is-fragment={block.fragmentOrder != null}>
  {#if block.fragmentOrder != null}
    <span class="fragment-badge">Step {block.fragmentOrder + 1}</span>
  {/if}
  <!-- renderer -->
</div>

<style>
  .is-fragment { opacity: 0.6; border-left: 3px solid var(--teal); padding-left: 8px; }
  .fragment-badge {
    position: absolute; top: -8px; right: 4px;
    background: var(--teal); color: white; font-size: 10px;
    padding: 1px 6px; border-radius: 8px; font-weight: 600;
  }
</style>
```

- [ ] **Step 3: Export fragments**

In `html-renderer.ts`, blocks with `fragmentOrder` get `class="fragment"` and `style="--fragment-order: N"`:

```typescript
const fragmentClass = block.fragmentOrder != null ? ' fragment' : ''
const fragmentStyle = block.fragmentOrder != null ? ` style="--fragment-order: ${block.fragmentOrder}"` : ''
return `<div class="block${fragmentClass}"${fragmentStyle}>${innerHtml}</div>`
```

The navigation engine already handles `.fragment` → `.visible` toggling.

- [ ] **Step 4: Update system prompt**

Add fragment support to the mutation docs:
```
Blocks can have a "fragmentOrder" field (integer, starting at 0) to make them
reveal progressively. Set fragmentOrder on blocks within the addSlide or addBlock
payload to create step-by-step reveals.
```

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add fragment/progressive disclosure support

Blocks with fragmentOrder render with step badges on canvas
and as .fragment elements in export. Navigation engine handles
sequential reveal."
```

---

## Task 11: Remaining Polish & Deploy Prep

**Files:**
- Modify: `apps/web/src/app.css` — add JetBrains Mono font import
- Create: `.github/workflows/deploy.yml` — staging deploy workflow
- Create: `nginx/slide-maker.conf` — Nginx config for staging

- [ ] **Step 1: Add JetBrains Mono font**

Add to the Google Fonts import in `apps/web/src/app.css`:

```css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&family=Outfit:wght@400;500;600;700;800&display=swap');
```

- [ ] **Step 2: Create Nginx config**

Create `nginx/slide-maker.conf`:

```nginx
location /slide-maker/ {
    proxy_pass http://127.0.0.1:5173/;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_cache_bypass $http_upgrade;
}

location /slide-maker/api/ {
    proxy_pass http://127.0.0.1:3001/api/;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_read_timeout 300s;  # Long timeout for SSE streaming
}
```

- [ ] **Step 3: Create deploy workflow**

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Staging
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Deploy via SSH
        uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.DEPLOY_HOST }}
          username: ${{ secrets.DEPLOY_USER }}
          key: ${{ secrets.DEPLOY_KEY }}
          script: |
            cd /opt/slide-maker
            git pull origin main
            pnpm install --frozen-lockfile
            pnpm build
            pnpm db:push
            pnpm db:seed
            pm2 restart slide-maker-api
            pm2 restart slide-maker-web
```

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: add JetBrains Mono font, Nginx config, and deploy workflow

Staging deploy to tools.cuny.qzz.io/slide-maker via GitHub Actions.
Nginx reverse proxy config for SvelteKit + Hono API."
```
