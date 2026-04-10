# TODO

Working list of near-term fixes and enhancements. Grouped by area and written as small, verifiable tasks. Checked items indicate work landed in this branch/session.

## Editor Interaction
- [x] Module drag & drop within zones (ZoneDrop)
  - [x] Integrate `svelte-dnd-action` for vertical reordering without fighting resize controls
  - [ ] Keyboard reorder (focusable list items; Alt+Arrow or Cmd/Ctrl+Arrow to move)
  - [x] Live order persistence and optimistic update (`POST blocks/reorder` batch endpoint)
  - [x] `dragDisabled` in view mode, `pointer-events: auto` on drag handle, `dragging` guard timing fix
  - [x] Carousel nav hidden in edit mode to avoid DnD overlap
  - [x] Compact controls (16px handles, inset step badge, smaller popover)
- [ ] Drag from Resources → Canvas
  - [ ] Drop images/files/artifacts into a zone to auto-create modules
  - [ ] Visual drop affordances and a11y roles/labels
- [ ] Split handle a11y
  - [ ] Focusable handle with arrow-key resizing and value change announcements
- [x] Arrow key slide navigation in edit mode (left/right to switch slides)
- [x] Global keyboard nav — arrow keys for slides, Escape for gallery

## New Module Types
- [x] Video module (`video`) — YouTube, Vimeo, Loom embed support
  - [x] Renderer (`VideoModule.svelte`), export support, framework CSS
  - [x] Added to `VALID_BLOCK_TYPES` whitelist and `ModulePicker`
  - [x] URL input UX fixes (focus, click propagation, save flow)

## Undo / Redo Hardening
- [ ] Group/coalesce rapid mutations (typing, quick slider changes) into a single history entry
- [ ] Ensure reverse mutations exist for all actions (slides, blocks, steps, theme, metadata, split ratio)
- [ ] Preserve redo branch only when appropriate; clear on new divergent edits (current behavior is partial)
- [ ] Optional: persist limited history to `sessionStorage` to survive accidental reloads within a session
- [ ] Add unit tests for history push/pop, grouped mutations, and failure paths

## Chat-to-Editor Coverage
- [x] Chat context awareness, suggestion chips, per-mutation accept/reject
- [ ] Expand mutations exposed to the assistant so every module’s key–value pairs are reachable
  - [ ] Artifact: `artifactName`, `config` fields, `width`, `height`, `align`
  - [ ] Heading: `text`, `level`
  - [ ] Text: `markdown` or `html`
  - [ ] Card: `content`, `variant`
  - [ ] Label: `text`, `color`
  - [ ] Tip Box: `content`, `title`
  - [ ] Prompt Block: `content`, `quality`, `language`
  - [ ] Image: `src`, `alt`, `caption`, `fit`
  - [ ] Carousel: `items[]`, `syncSteps`, `interval`
  - [ ] Comparison: `panels[]`
  - [ ] Card Grid: `cards[]`, `columns`
  - [ ] Flow: `nodes[]`
  - [ ] Stream List: `items[]`
  - [ ] Video: `url`, `caption`
  - [ ] Slide: `layout`, `splitRatio`
  - [ ] Deck: `name`, `themeId`, branding metadata
- [ ] System prompt: list features + examples as key–value JSON mutations (keeps fence format ```mutation)
- [ ] E2E: chat can add a slide, add module, and set fields end‑to‑end

## Sharing
- [x] Share button in editor toolbar

## Resource Panel Redesign
- [ ] Evaluate alternative panel layouts (wireframes at `docs/wireframes/resource-panel-alternatives.html`)
  - [ ] Option A: Accordion stack — all sections visible, collapsible
  - [ ] Option B: Search palette + pinned shelf — unified search across all resource types
  - [ ] Option C: Icon dock + context view — contextual suggestions based on active slide
- [ ] Implement chosen design
- [ ] Add search/filter capability across resource types

## Accessibility
- [ ] Replace ad-hoc popovers/dialogs with an ARIA‑compliant pattern (or a small utility wrapper)
- [ ] Remove `a11y_*` suppressions across components and add axe checks in CI
- [ ] Ensure all canvas controls are keyboard navigable (module move, delete, step select)

## Export/Preview Consistency
- [x] Unify artifact sizing across editor/preview/export (wrapper + iframe aspect rules)
- [x] Video module export support (html-renderer)
- [ ] View mode WYSIWYG: render view mode via iframe srcdoc using FRAMEWORK_CSS_PREVIEW + client-side renderSlideHtml (mirrors API html-renderer) so canvas view matches preview/export exactly
- [ ] Export: optional artifact size report (per‑artifact byte size and total) in `manifest.json`
- [ ] Add checksum to extracted artifact filenames for cacheability
- [ ] Integration test: unzip export and assert artifact files + iframe `src` references

## Performance
- [ ] Virtualize large template lists and long slide decks in outline
- [ ] Defer non-critical editor work to rAF/time‑slicing (e.g., text fit)

## Testing
- [x] Unit: DnD transform functions (reorderBlocksInZone, moveBlockBetweenZones, reorderSlides) — 15 tests
- [ ] Unit: ZoneDrop reorder → `reorderBlocks` mapping (including keyboard path)
- [ ] Unit: History store coalescing and redo branch behavior
- [ ] Unit: Batch block reorder API endpoint (POST blocks/reorder)
- [ ] E2E: drag from Resources to canvas creates expected module
- [ ] Expand framework CSS tests for future modules (e.g., video, charts)

## Security
- [ ] Re‑verify CSP in artifact HTML when user‑provided `rawSource` is injected
- [ ] Keep iframe sandbox minimal; consider `allow-same-origin` only when required and safe

## Documentation
- [ ] Update JS_SLIDE_MAKER_BLOCKS.md with finalized DnD/undo semantics and keyboard shortcuts
- [ ] Add short “Chat Mutations Cheatsheet” under `docs/prompts/`

