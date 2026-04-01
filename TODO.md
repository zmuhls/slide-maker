# TODO

Working list of near-term fixes and enhancements. Grouped by area and written as small, verifiable tasks. Checked items indicate work landed in this branch/session.

## Editor Interaction
- [ ] Module drag & drop within zones (ZoneDrop)
  - [ ] Integrate `svelte-dnd-action` for vertical reordering without fighting resize controls
  - [ ] Keyboard reorder (focusable list items; Alt+Arrow or Cmd/Ctrl+Arrow to move)
  - [ ] Live order persistence and optimistic update (keeps current `reorderBlocks` API)
- [ ] Drag from Resources → Canvas
  - [ ] Drop images/files/artifacts into a zone to auto-create modules
  - [ ] Visual drop affordances and a11y roles/labels
- [ ] Split handle a11y
  - [ ] Focusable handle with arrow-key resizing and value change announcements

## Undo / Redo Hardening
- [ ] Group/coalesce rapid mutations (typing, quick slider changes) into a single history entry
- [ ] Ensure reverse mutations exist for all actions (slides, blocks, steps, theme, metadata, split ratio)
- [ ] Preserve redo branch only when appropriate; clear on new divergent edits (current behavior is partial)
- [ ] Optional: persist limited history to `sessionStorage` to survive accidental reloads within a session
- [ ] Add unit tests for history push/pop, grouped mutations, and failure paths

## Chat-to-Editor Coverage
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
  - [ ] Slide: `layout`, `splitRatio`
  - [ ] Deck: `name`, `themeId`, branding metadata
- [ ] System prompt: list features + examples as key–value JSON mutations (keeps fence format ```mutation)
- [ ] E2E: chat can add a slide, add module, and set fields end‑to‑end

## Accessibility
- [ ] Replace ad-hoc popovers/dialogs with an ARIA‑compliant pattern (or a small utility wrapper)
- [ ] Remove `a11y_*` suppressions across components and add axe checks in CI
- [ ] Ensure all canvas controls are keyboard navigable (module move, delete, step select)

## Export/Preview Consistency
- [x] Unify artifact sizing across editor/preview/export (wrapper + iframe aspect rules)
- [ ] View mode WYSIWYG: render view mode via iframe srcdoc using FRAMEWORK_CSS_PREVIEW + client-side renderSlideHtml (mirrors API html-renderer) so canvas view matches preview/export exactly
- [ ] Export: optional artifact size report (per‑artifact byte size and total) in `manifest.json`
- [ ] Add checksum to extracted artifact filenames for cacheability
- [ ] Integration test: unzip export and assert artifact files + iframe `src` references

## Performance
- [ ] Virtualize large template lists and long slide decks in outline
- [ ] Defer non-critical editor work to rAF/time‑slicing (e.g., text fit)

## Testing
- [ ] Unit: ZoneDrop reorder → `reorderBlocks` mapping (including keyboard path)
- [ ] Unit: History store coalescing and redo branch behavior
- [ ] E2E: drag from Resources to canvas creates expected module
- [ ] Expand framework CSS tests for future modules (e.g., charts)

## Security
- [ ] Re‑verify CSP in artifact HTML when user‑provided `rawSource` is injected
- [ ] Keep iframe sandbox minimal; consider `allow-same-origin` only when required and safe

## Documentation
- [ ] Update JS_SLIDE_MAKER_BLOCKS.md with finalized DnD/undo semantics and keyboard shortcuts
- [ ] Add short “Chat Mutations Cheatsheet” under `docs/prompts/`

