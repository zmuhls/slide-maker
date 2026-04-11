# Playwright Visual Testing Plan

> Generated from resource registry audit (2026-04-09, updated 2026-04-10). 484 unit tests across 15 files. 59 commits since original plan.
> This plan is for Claude Opus to initiate Playwright in Chrome via the
> chrome-devtools MCP or playwright MCP to visually test the slide-maker app.

## Prerequisites

```bash
pnpm install          # install all deps
pnpm dev              # start API (3001) + web (5173)
pnpm db:push && pnpm db:seed   # ensure DB is seeded with templates/themes/artifacts
```

Login credentials: use a seeded admin account (zmuhlbauer@gc.cuny.edu or smorello@gc.cuny.edu).

---

## Existing E2E Specs (automated — do not duplicate)

| File | Covers |
|------|--------|
| `e2e/artifacts.spec.ts` | iframe sandbox/CSP, external URL artifacts, `.corner-resize` handle visibility |
| `e2e/canvas-modes.spec.ts` | edit/view mode toggle, native rendering (no iframe), split layout two-zone rendering |
| `e2e/modules.spec.ts` | 12 module types rendered in edit + view mode, artifact iframe in both modes |
| `e2e/responsive.spec.ts` | desktop/laptop/narrow viewport rendering, aspect ratio check |
| `e2e/upload-doc-to-md.spec.ts` | PDF upload, markdown sidecar extraction |

Phases below focus on visual/interactive checks not covered by these specs. Where overlap exists, the phase notes it.

---

## Phase 1: Smoke Test (Login + Deck Creation)

- [ ] Navigate to `http://localhost:5173`
- [ ] Log in with admin credentials
- [ ] Create a new deck ("Audit Test Deck")
- [ ] Verify three-panel UI loads: chat panel (left), canvas (center), resources panel (right)
- [ ] Verify outline sidebar shows "Slide 1" (default title-slide)
- [ ] Screenshot baseline

## Phase 2: Template Application (All Layout Types)

For each layout, apply a template from the Resources panel and verify rendering:

| Layout | Template | Verify |
|--------|----------|--------|
| `title-slide` | "Branded Hero" | Hero zone centered, heading + label visible |
| `layout-split` | "Text & Image" | Two columns, content (left) + stage (right), split handle visible |
| `layout-content` | "Full Text" | Full-width main zone, heading + text visible |
| `layout-grid` | "Card Grid (3)" | Card grid with 3 columns |
| `layout-full-dark` | "Overview" | Dark background, main zone |
| `layout-divider` | "Section Break" | Hero zone centered, large heading |
| `closing-slide` | "Recap" | Hero zone, heading visible |

Steps per layout:
- [ ] Click "+" in outline to add new slide
- [ ] Open Resources panel > Templates tab
- [ ] Click the template to inject `@template:` ref into chat
- [ ] Send the chat message
- [ ] Wait for AI to apply template mutation
- [ ] Verify canvas renders the correct layout (check for layout-specific CSS classes)
- [ ] Screenshot each slide

## Phase 3: Theme Application (All 9 Themes)

Apply each theme and verify CSS variables propagate:

Themes: Studio Dark, Studio Light, CUNY AI Lab, CUNY Dark, CUNY Light, Warm Academic, Slate Minimal, Midnight, Forest

Steps:
- [ ] Open Resources panel > Themes tab
- [ ] Click each theme
- [ ] Verify canvas background color changes (`--slide-bg`)
- [ ] Verify heading color changes (`--slide-heading-color`)
- [ ] Verify font family changes (`--slide-font-heading`)
- [ ] Screenshot with each theme applied

**Key check**: Dark themes (Studio Dark, CUNY Dark, Midnight) should show light text on dark backgrounds. Light themes should show dark text on light backgrounds. The luminance-based auto-detection should handle this.

**New check** (from `18d39aa`): On primary-bg slides (title-slide, layout-divider, closing-slide), verify theme vars remap so module text/accents contrast against the primary color background, not the slide background.

## Phase 4: Module Rendering (All 14 Types)

> **Note**: 12/14 module types are already tested for render correctness in `e2e/modules.spec.ts`. This phase adds visual screenshot comparison and AI-chat-driven creation, which the automated specs do not cover.

Use the AI chat to create a slide with each module type and verify visual rendering:

```
Test sequence via chat prompts:
1. "Add a heading that says 'Visual Test'" → verify <h2> renders
2. "Add a text block with bold and italic" → verify rich text
3. "Add a cyan card with title 'Info'" → verify card-cyan class
4. "Add a cyan label saying 'Section'" → verify label badge
5. "Add a tip box with title 'Note'" → verify tip-box styling
6. "Add a prompt block with quality good" → verify prompt-good class
7. "Add an image" → verify figure/img placeholder
8. "Add a carousel with 2 images" → verify prev/next buttons, dots
9. "Add a comparison with 2 panels" → verify side-by-side
10. "Add a card grid with 3 cards" → verify 3-column grid
11. "Add a flow diagram: Start → Process → End" → verify flow-node and arrows
12. "Add a bullet list: apple, banana, cherry" → verify stream-list
13. "Add a Timeline artifact" → verify artifact-native with data-artifact="Timeline"
14. "Add a video: https://youtube.com/watch?v=dQw4w9WgXcQ" → verify iframe embed
```

For each module:
- [ ] Verify it renders without fallback (no raw JSON visible)
- [ ] Verify correct CSS classes are applied
- [ ] Screenshot

## Phase 5: Rich Text Editing (Tiptap Integration)

Added 2026-04-10. Tiptap rich text editing is now integrated across 9 module renderers via shared `RichTextEditor.svelte`, plus FormatToolbar controls and rich chat input.

### Tiptap activation in renderers
- [ ] Enter edit mode, click into a `text` module — verify tiptap editor activates (`.tiptap` element visible inside `.tiptap-mount`)
- [ ] Click into a `heading` module — verify tiptap activates with heading content
- [ ] Click into a `card` module — verify tiptap activates for card body
- [ ] Click into a `tip-box` module — verify tiptap activates for tip content
- [ ] Click into a `label` module — verify tiptap activates for label text
- [ ] Click into a `comparison` module panel — verify tiptap activates
- [ ] Click into a `card-grid` card — verify tiptap activates
- [ ] Click into a `stream-list` item — verify tiptap activates
- [ ] Click into a `flow` node — verify tiptap activates for node label

### FormatToolbar controls (`FormatToolbar.svelte`)
- [ ] Select text, click Bold — verify `<strong>` wraps selection
- [ ] Click Italic — verify `<em>` wraps selection
- [ ] Use heading-select dropdown (Normal/H1/H2/H3/H4) — verify heading level changes
- [ ] Use font-size-select dropdown (12-32px) — verify inline `font-size` style applied to selected text via `TextStyleKit` (`setFontSize()`)
- [ ] Select "Size" (default) — verify inline style removed (`unsetFontSize()`)
- [ ] Click Link button, enter URL — verify `<a href>` wraps selection; click again to unlink
- [ ] Toggle bullet list / ordered list — verify `<ul>`/`<ol>` rendering
- [ ] Use alignment buttons (left/center/right) — verify `text-align` changes
- [ ] Verify FormatToolbar shows "Click a text block to edit" when no editor active

### Chat rich text
- [ ] Open chat input — verify `ChatRichTextEditor` activates with tiptap
- [ ] Use `ChatFormattingToolbar` — verify bold/italic/strike/heading/code block toggles work

### Persistence
- [ ] Edit text, click away — verify 500ms debounce save fires (content persists on reload)
- [ ] Screenshot: FormatToolbar active state vs disabled state

## Phase 6: Artifact Loading (Native + Iframe)

> **Note**: Artifact iframe sandbox, CSP blob URLs, and external URL rendering are covered by `e2e/artifacts.spec.ts`. This phase adds visual verification of native artifact canvas/SVG init and artifact config interaction.

### Native artifacts (13 total)
Test at least 3 representative native artifacts:

- [ ] **Timeline**: Add via chat ("add a timeline of AI history"). Verify `artifact-native` div, `data-artifact="Timeline"`, canvas/SVG renders
- [ ] **Leaflet Map**: Add via chat ("add a map of New York"). Verify map tiles load, markers visible
- [ ] **Boids**: Add via Artifacts tab. Verify canvas animation runs

### Iframe artifacts (Frappe charts)
- [ ] **Bar Chart**: Add via Artifacts tab. Verify iframe renders with srcdoc, chart visible
- [ ] **Line Chart**: Add via Artifacts tab. Verify chart renders

### Artifact rendering (from recent fixes)
- [ ] Native artifacts render on canvas without iframe (`260b2b2`)
- [ ] Artifact overflow clipped within slide frame (`6932604`)
- [ ] Artifacts use srcdoc instead of base64 data URLs (`5e374f8`)

### Artifact config
- [ ] Open artifact config panel (if available) and modify a parameter
- [ ] Verify artifact re-renders with new config

## Phase 7: Canvas Edit Mode Operations

> **Note**: `e2e/canvas-modes.spec.ts` covers edit/view mode toggle and control visibility. `e2e/artifacts.spec.ts` covers `.corner-resize` handle visibility. This phase adds resize drag behavior, FormatToolbar interaction, and recent fixes.

- [ ] Click "Edit" button on canvas toolbar to enter edit mode
- [ ] Verify format toolbar appears (heading levels, font-size, bold, italic, etc.)
- [ ] Click into a text module — verify TipTap editor activates
- [ ] Type text and apply bold formatting
- [ ] Verify formatting persists after clicking away

### Resize handles (2 bottom corners: `bl`, `br`)
- [ ] Hover a module — verify two bottom-corner resize handles appear (`.corner-bl`, `.corner-br`, 16x16px)
- [ ] Drag the `br` handle on an image/artifact — verify width/height persist after release (stored in `module.data`)
- [ ] Drag the `br` handle on a text module — verify live CSS `scale()` during drag, resets on release (non-persisted)
- [ ] Hold Shift while dragging — verify aspect-ratio lock (resize tooltip shows ⊟)

### Module controls
- [ ] Click the drag handle (top-left grip `⠿`) — verify module can be dragged
- [ ] Click "+" module button — verify module picker overlay appears
- [ ] Press Escape — verify returns to view mode

### Recent fixes
- [ ] Heading fontSize applies in both edit and view mode (`1b5fc71`)
- [ ] Theme vars remap on primary-bg slides for module contrast (`18d39aa`)
- [ ] Zone overflow clipping works correctly (`abf0043`)
- [ ] Stream-list raw HTML renders in preview (`abf0043`)

- [ ] Screenshot edit mode vs view mode

## Phase 8: DnD Operations

### Outline reorder
- [ ] Create 3+ slides
- [ ] Drag a slide card in the outline to reorder
- [ ] Verify order updates in both outline and canvas

### Cross-zone drag (layout-split)
- [ ] Navigate to a layout-split slide with modules in both zones
- [ ] In edit mode, drag a module from content zone to stage zone
- [ ] Verify module appears in new zone with correct order
- [ ] Verify undo (Ctrl+Z) restores original position

### Split handle resize
- [ ] In a layout-split slide, drag the split handle
- [ ] Verify left/right zone proportions change
- [ ] Verify modules re-layout within new proportions

## Phase 9: Export Fidelity

- [ ] Click "Preview" in toolbar — verify new tab opens with full deck
- [ ] In preview: navigate slides with arrow keys
- [ ] Verify step reveals work (click/arrow advances through steps)
- [ ] Verify carousel navigation works
- [ ] Verify native artifacts render in preview (Timeline, Leaflet Map)
- [ ] Download export ZIP
- [ ] Extract and open `index.html` — verify self-contained deck works
- [ ] Verify `css/styles.css`, `js/engine.js`, `js/artifacts.js` are present
- [ ] Verify theme CSS variables are applied in exported HTML
- [ ] Verify uploaded images are in `assets/` folder with rewritten URLs

## Phase 10: Undo/Redo

- [ ] Add a module via chat
- [ ] Press Ctrl+Z — verify module is removed
- [ ] Press Ctrl+Shift+Z — verify module is restored
- [ ] Reorder slides in outline
- [ ] Undo — verify original order restored
- [ ] Cross-zone drag a module
- [ ] Undo — verify module returns to original zone

## Phase 11: Edge Cases

> **Note**: Viewport responsiveness at 3 breakpoints is covered by `e2e/responsive.spec.ts`.

- [ ] Empty slide (no modules) — verify canvas shows empty state gracefully
- [ ] Maximum modules in one zone (10+) — verify scrolling/overflow
- [ ] Very long text content — verify text wraps, no overflow
- [ ] Missing image src — verify placeholder renders
- [ ] Invalid video URL — verify graceful empty state
- [ ] Switch themes rapidly — verify no CSS variable leakage between themes
- [ ] Zone overflow clipping — verify content stays within zone bounds (`abf0043`)
- [ ] Artifact overflow — verify clipped within slide frame (`6932604`)

## Phase 12: Accessibility Regression Checks

Derived from `docs/a11y-audit-codex-2026-04-10.md` (37 issues: 14 HIGH, 19 MED, 4 LOW) and `docs/a11y-audit-2026-04-10.md`. Focus on HIGH-severity clusters.

### Cluster 1: Keyboard-accessible resize handles (5 HIGH findings)
- [ ] Tab to a module `.corner-resize` handle — verify it receives focus (currently pointer-only, `ModuleRenderer.svelte:267`)
- [ ] Use Arrow keys on a focused resize handle — verify module resizes
- [ ] Tab to the split-handle separator in `layout-split` — verify keyboard resizing with Arrow/Home/End (`SplitHandle.svelte:34`, currently pointer-only)
- [ ] Tab to panel resize handles in EditorShell — verify keyboard operability (`EditorShell.svelte:142`, currently `onmousedown` only)

### Cluster 2: Mobile panel access (2 HIGH findings)
- [ ] Set viewport to 640x480 — verify chat and resources panels are accessible (currently `display:none` below 640px, `EditorShell.svelte:454`)
- [ ] Set viewport to 960x600 (tablet) — verify side panels accessible via drawers/buttons (panels auto-collapse below 1024px)

### Cluster 3: Live region configuration (2 HIGH findings)
- [ ] Open chat, trigger AI response — verify screen reader announces new messages without re-reading entire history (`ChatPanel.svelte:354`, `aria-live="polite"` on full container)
- [ ] Trigger auto-applied mutation — verify spoken confirmation announced (`ChatPanel.svelte:230`)

### Cluster 4: Export label contrast (2 HIGH findings)
- [ ] Export deck with studio-light theme — inspect `.label-cyan` and `.label-blue` in exported CSS for WCAG AA contrast (≥4.5:1, `html-renderer.ts:519-520`)
- [ ] Repeat with cuny-light and warm-academic themes

### Additional HIGH findings
- [ ] `PromptBlockModule.svelte:56` — verify editable `pre` has `role="textbox"`, `aria-multiline="true"`
- [ ] `ArtifactModule.svelte:463` — verify artifact editor modal has `aria-labelledby`, focus trap, Escape close, focus return
- [ ] `SlideCanvas.svelte:83` — verify Arrow L/R does not change slides while typing in chat/outline text fields

---

## Agent Prompt for Playwright Execution

When ready to execute, use this prompt with the Playwright MCP or chrome-devtools MCP:

```
You are testing the slide-maker app at http://localhost:5173.
The app must be running (pnpm dev) with a seeded database.

Login with email: zmuhlbauer@gc.cuny.edu, password: [admin password]

Before starting, review the "Existing E2E Specs" section — skip checks already
covered by automated tests unless verifying visual fidelity specifically.

Execute the Playwright Visual Testing Plan phases 1-12 sequentially.
For each phase:
1. Take a screenshot BEFORE the action
2. Perform the action
3. Take a screenshot AFTER the action
4. Compare and report any visual issues

Report format per check:
  [PASS/FAIL] Phase N.M: <description>
  Screenshot: <path>
  Notes: <any visual issues>

After all phases, produce a summary:
  - Total checks: N
  - Passed: N
  - Failed: N
  - Warnings: N
  - Top issues (ranked by severity)

Focus on:
- Layout correctness (zones in right positions)
- Theme variable propagation (colors, fonts)
- Module rendering fidelity (no fallback JSON visible)
- Artifact initialization (canvas/SVG/iframe loads)
- Rich text editing fidelity (tiptap activates in all 9 module types, formatting persists)
- DnD operation integrity
- Export completeness
- Accessibility regressions (keyboard resize, mobile panels, live regions, contrast)
```

---

## Findings from Unit Test Audit

The resource-registry tests (484 total across 15 files) verified:

1. **Artifact factory parity**: 13/13 native artifacts match across client factories, export register() calls, and NATIVE_ARTIFACT_NAMES — no gaps
2. **Template zone validation**: All 15 slide templates use valid layouts, module types, and zones for their layout
3. **Artifact template structure**: All 19 artifact JSONs have valid id, name fields; 6 non-native artifacts have inline source HTML
4. **Seed directory coverage**: All 7 LAYOUT types have template directories; artifact directory exists
5. **Theme CSS generation**: All 7 required CSS variables generated with correct values
6. **Export integrity**: register() count matches NATIVE_ARTIFACT_NAMES.size; initArtifacts() auto-init present
7. **HTML renderer coverage**: All 14 MODULE_TYPES have case branches
8. **Tiptap rich text integration**: `RichTextEditor.svelte` shared across 9 module renderers (text, heading, card, tip-box, label, comparison, card-grid, stream-list, flow); `FormatToolbar.svelte` provides heading level, font-size (per-selection via `TextStyleKit`), bold, italic, link, lists, alignment

### Codex Audit Findings (2026-04-09, gpt-5.4)

- **Theme pipeline concern**: The seed's `generateThemeCss()` sets 7 CSS variables (`--slide-*`), but `FRAMEWORK_CSS_BASE` uses a different set of accent variables (`--accent-cyan`, `--accent-blue`, etc.) that are NOT overridden by themes. This means theme-specific accent colors don't propagate to card variants, label colors, or tip-box borders in exports. The default palette baked into `FRAMEWORK_CSS_BASE` always wins. **Severity: medium** — visual, not functional.
- **`renderSlideHtml` in slide-html.ts is unused** — no imports found. It has a more complete `buildThemeCss` that maps theme colors to accent variables. This function may have been superseded but never wired in. Worth investigating whether export should use this richer mapping.
- **`leaflet-markers.json` name collision**: Both `artifact-leaflet-markers` (iframe) and the native `Leaflet Map` factory share the name "Leaflet Map". Not a bug since native takes precedence via `NATIVE_ARTIFACT_NAMES` check, but confusing for users browsing the artifact catalog.

### Codex A11y Audit (2026-04-10, gpt-5.4)

Full report: `docs/a11y-audit-codex-2026-04-10.md`

**37 issues** (14 HIGH, 19 MED, 4 LOW). Highest-impact clusters:
1. **5 pointer-only resize handles** — module corner resize, split handle, panel separators all lack keyboard affordance
2. **2 mobile layout gaps** — side panels hard-hidden below 640px with no alternative access
3. **2 live region misconfigurations** — `aria-live="polite"` on full chat container re-announces history; auto-mutations have no spoken confirmation
4. **2 export label contrast failures** — `.label-cyan` and `.label-blue` fail WCAG AA in 6/9 themes
5. **PromptBlockModule** lacks `role="textbox"` / `aria-multiline` semantics
6. **Artifact editor modal** lacks focus management (no trap, no labelledby, no focus return)
