# Accessibility, Contrast & Responsiveness Audit

**Date:** 2026-04-10
**Tool:** OpenAI Codex CLI (gpt-5.4, read-only sandbox)
**Scope:** Full codebase — WCAG contrast, semantic HTML/ARIA, keyboard nav, responsive layout, touch targets, screen readers, reduced motion

---

## 1. Color Contrast

| File:Line | Sev | Issue | Fix |
|---|---|---|---|
| `apps/api/src/export/html-renderer.ts:519` | **HIGH** | Exported `.label-cyan` uses raw theme accent — fails WCAG AA in 6/9 themes (as low as 2.35:1 on white) | Derive a darker light-surface label token in export, matching client-side `accentLabel` logic in `slide-html.ts` |
| `apps/api/src/export/html-renderer.ts:520` | **HIGH** | Exported `.label-blue` uses raw secondary — misses AA in studio-light, cuny-light, warm-academic, midnight, forest | Compute a theme-aware `secondaryLabel` token for export |
| `packages/shared/src/framework-css.ts:130` | **MED** | Base label colors assume dark slides (`#79c0ff`/`#3B73E6`) — fail on light backgrounds until overridden | Replace hard-coded label colors with theme custom properties that branch for light vs dark |
| `packages/shared/src/framework-css.ts:38` | **MED** | Skip-link text is white on `--accent-blue`, only ~3.68:1 | Darken the skip-link bg or use dark text on blue |
| `apps/web/src/app.css:56` | **MED** | Dark-mode `--color-text-muted` (#6b7280 on #1a1a2e) = ~3.53:1, used for 10-13px UI text | Lighten muted token for dark mode or reserve it for large/non-essential text |

### Computed Theme Contrast Ratios

Text-muted (alpha-blended) on each theme background — all pass AA for normal text (>4.5:1):

| Theme | Ratio |
|---|---|
| studio-dark | 7.32 |
| studio-light | 5.33 |
| cuny-ai-lab-default | 5.33 |
| cuny-dark | 7.12 |
| cuny-light | 5.33 |
| warm-academic | 5.14 |
| slate-minimal | 5.24 |
| midnight | 7.44 |
| forest | 5.25 |

Editor chrome globals:

| Pairing | Ratio |
|---|---|
| root text (#333 on #fff) | 12.63 |
| root secondary (#64748b on #fff) | 4.76 |
| root muted (#636b75 on #fff) | 5.40 |
| dark text (#e0e0e0 on #1a1a2e) | 12.92 |
| dark secondary (#94a3b8 on #1a1a2e) | 6.65 |
| dark muted (#6b7280 on #1a1a2e) | 3.53 |
| framework text (#f0f0f0 on #111827) | 15.57 |
| framework muted alpha | 7.12 |
| skiplink (#fff on #3b82f6) | 3.68 |

---

## 2. Semantic HTML & ARIA

| File:Line | Sev | Issue | Fix |
|---|---|---|---|
| `PromptBlockModule.svelte:56` | **HIGH** | Editable prompt is bare `pre[contenteditable]` — no textbox role, label, or multiline semantics | Add `role="textbox"`, `aria-multiline="true"`, accessible label |
| `ArtifactModule.svelte:463` | **HIGH** | Artifact editor modal lacks `aria-labelledby`, focus trap, escape handling, focus return | Implement proper modal dialog pattern |
| `ArtifactModule.svelte:485` | **MED** | Data-entry fields rely on visual header row only — screen readers encounter unlabeled inputs | Add per-field `<label>` or `aria-label`s |
| `VideoModule.svelte:116` | **MED** | "Add video URL" is `div[role=button]` with incomplete keyboard semantics | Replace with native `<button>` |
| `FlowModule.svelte:44` | **MED** | Process flow uses generic divs — no ordered/step semantics for AT | Render as `<ol>`/`<li>`, mark arrows `aria-hidden` |
| `CardGridModule.svelte:51` | **LOW** | Card collection has no list/article semantics | Use `<ul>`/`<li>` or `<article>` per card |
| `ComparisonModule.svelte:44` | **LOW** | Panes are generic containers, headings not tied to sections | Render as `<section aria-labelledby="...">` |

---

## 3. Keyboard Navigation & Focus

| File:Line | Sev | Issue | Fix |
|---|---|---|---|
| `SlideCanvas.svelte:83` | **HIGH** | Global Arrow L/R fires from anywhere except form fields — can unexpectedly change slides while typing | Scope slide shortcuts to canvas focus only |
| `ModuleRenderer.svelte:45` | **HIGH** | Module controls popover doesn't trap/return focus | Focus first control on open, restore on close |
| `SplitHandle.svelte:34` | **HIGH** | Split ratio separator is pointer-only — no keyboard or AT value exposure | Add Arrow/Home/End resizing + ARIA value attributes |
| `EditorShell.svelte:142` | **HIGH** | Panel separators use `onmousedown` only — unusable from keyboard/touch | Switch to pointer events + keyboard resizing |
| `ModuleRenderer.svelte:267` | **HIGH** | Module resize handles are pointer-only with no keyboard affordance | Add keyboard resizing + expose size to AT |
| `EditorShell.svelte:117` | **MED** | Left-panel tablist lacks `aria-controls`/`id` linkage and arrow-key behavior | Wire tabs to tabpanels + implement roving tabindex |
| `SlideCard.svelte:119` | **MED** | Expandable slide header handles Enter but not Space | Use native `<button>` or add Space activation |
| `BlockItem.svelte:113` | **MED** | Same non-native button pattern as SlideCard | Convert to native buttons |

---

## 4. Responsive Layout

| File:Line | Sev | Issue | Fix |
|---|---|---|---|
| `EditorShell.svelte:84` | **HIGH** | Side panels auto-collapse below 1024px — tablet loses chat/outline/resources | Introduce off-canvas drawers or stacked panels |
| `EditorShell.svelte:454` | **HIGH** | Below 640px both panels hard-hidden with `display:none` — mobile can't access chat/resources | Replace with mobile sheets/drawers controlled by state |
| `CanvasToolbar.svelte:161` | **MED** | Toolbar has no wrap/overflow strategy — actions clip on narrow screens | Allow wrapping or collapse into menu |
| `SlideCanvas.svelte:205` | **MED** | Canvas keeps tall `clamp(420px, ...)` min-height — pushes controls below fold on short/mobile viewports | Reduce min-height on small screens |

---

## 5. Touch Targets

| File:Line | Sev | Issue | Fix |
|---|---|---|---|
| `EditorShell.svelte:349` | **HIGH** | Panel resize handles only 6px wide | Expand interactive hit box to 24-44px via pseudo-element |
| `SplitHandle.svelte:53` | **HIGH** | Split handle also 6px — touch-unreliable | Enlarge touch target, preserve visual line |
| `ModuleRenderer.svelte:519` | **HIGH** | Corner resize handles only 16x16 | Enlarge handles and/or add edge resize |
| `ModuleRenderer.svelte:340` | **MED** | Drag handle + overflow trigger 22x22 (under 44x44 guidance) | Increase hit area or add invisible padding on coarse pointers |
| `CanvasToolbar.svelte:171` | **MED** | Toolbar buttons 26-28px tall/wide | Bump to 40-44px on coarse-pointer devices |
| `SlideOutline.svelte:125` | **MED** | Outline header controls 22x22 | Enlarge hit area |
| `MutationCard.svelte:65` | **MED** | Accept/reject controls 22x22 | Increase to touch-friendly targets |
| `ChatInput.svelte:553` | **MED** | Mention-chip remove controls 14x14 | Make chip or larger trailing button removable |
| `CarouselModule.svelte:130,152` | **MED** | Nav buttons ~24px, dot controls 8px | Raise nav to 44px, give dots larger hit area |

---

## 6. Screen Readers & Live Regions

| File:Line | Sev | Issue | Fix |
|---|---|---|---|
| `ChatPanel.svelte:354` | **HIGH** | `aria-live="polite"` on entire message container — re-announces old content on DOM updates | Use `role="log"` with `aria-relevant="additions text"`, or separate offscreen live region |
| `ChatPanel.svelte:230` | **HIGH** | Auto-applied mutations modify deck with no spoken confirmation | Add `role="status"` live region for mutation outcomes |
| `ArtifactModule.svelte:452` | **MED** | Loading/error states are plain divs — silent to AT | Use `role="status"` for loading, `role="alert"` for failures |
| `MutationCard.svelte:24` | **MED** | Accepted/rejected status changes are visual-only | Announce via live region |

---

## 7. Reduced Motion & Color Scheme

| File:Line | Sev | Issue | Fix |
|---|---|---|---|
| `editor-theme.ts:7` | **MED** | Editor theming ignores `prefers-color-scheme`, defaults to light | Initialize from `matchMedia('(prefers-color-scheme: dark)')` |
| `SlideOutline.svelte:36` | **MED** | Forced `behavior: 'smooth'` ignores `prefers-reduced-motion` | Switch to `'instant'` when reduced motion matches |
| `ChatInput.svelte:421` | **LOW** | Loading spinner animates without reduced-motion override | Disable/simplify under `prefers-reduced-motion: reduce` |
| `ChatMessage.svelte:265` | **LOW** | Streaming caret blinks without respecting reduced-motion | Suppress blink animation |

---

## Summary

| Severity | Count |
|---|---|
| HIGH | 14 |
| MEDIUM | 19 |
| LOW | 4 |
| **Total** | **37** |

**Highest-impact clusters:**
1. Pointer-only resize handles (keyboard-inaccessible) — 5 HIGH findings
2. Mobile layout hard-hiding side panels — 2 HIGH findings
3. Live region misconfiguration on chat container — 2 HIGH findings
4. Label color contrast failures in exported slides — 2 HIGH findings
