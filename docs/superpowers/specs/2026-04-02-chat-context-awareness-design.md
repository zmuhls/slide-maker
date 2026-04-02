# Chat Context Awareness + Interactive Mutations

**Date:** 2026-04-02
**Status:** Proposed
**Scope:** System prompt optimization, action telemetry, suggestion chips, per-mutation accept/reject

## Problem

The AI chat assistant sees a static snapshot of the full deck — every module's data JSON-serialized on every slide — but has zero awareness of what the user just did. No action history, no workflow momentum. Mutations apply live during streaming with no way to accept or reject individually. Users want: compact context, action awareness, suggested next steps as clickable chips, and per-mutation accept/reject.

**Already done:** Brevity guidance in system prompt (line 396: "1-2 sentences max"), compressed few-shot patterns, debug event bus + transcript logging in chat route.

**Related:** `docs/TODO.md` lines 23-41 ("Chat-to-Editor Coverage") wants every module field reachable via mutations. Tiered serialization + edit bias complement that effort.

---

## Phase 1: Compact, Action-Aware Context Window

### 1A. Tiered slide serialization

**File:** `apps/api/src/prompts/system.ts` (lines 110-121)

Replace flat `slidesSummary` with tiered approach:
- **Full detail:** Active slide + order ±1 neighbors + explicitly expanded slides → current format with `JSON.stringify(b.data)`
- **Skeleton:** All other slides → one-liner: `Slide 3: "What Are LLMs?" (layout-split) → heading, text, image[stage]` (extract first heading text, list module types with zones, omit data payloads)

Add to `BuildPromptOptions`:
```ts
expandSlideIds?: string[]
recentActions?: string[]
lastAgentSlideId?: string | null
```

New helper: `serializeSlideTiered(slide, tier)` returns full or skeleton string. Tier determined by: is it active? Is it ±1 neighbor? Is it in `expandSlideIds`? Is it `lastAgentSlideId`?

**Token impact:** A 20-slide deck with 4 modules each goes from ~20 full JSON blocks to 3 full + 17 skeleton one-liners. Roughly 60-80% reduction in the slide section.

### 1B. Slide reference detection in chat route

**File:** `apps/api/src/routes/chat.ts` (~line 208)

Before calling `buildSystemPrompt()`:
1. Destructure `recentActions` and `lastAgentSlideId` from request `body`
2. Scan user `message` with `/(?:slide|page)\s*(\d+)/gi`, map matched numbers to slide IDs via `slidesWithBlocks[n-1]`
3. Pass as `expandSlideIds` to `buildSystemPrompt()`

### 1C. Frontend action buffer

**New file:** `apps/web/src/lib/stores/actions.ts`

```ts
import { writable } from 'svelte/store'
const MAX_ACTIONS = 15

export const recentActions = writable<string[]>([])
export const lastAgentSlideId = writable<string | null>(null)

export function logAction(desc: string) {
  recentActions.update(a => {
    const next = [...a, desc]
    return next.length > MAX_ACTIONS ? next.slice(-MAX_ACTIONS) : next
  })
}

export function consumeActions(): string[] {
  let result: string[] = []
  recentActions.update(a => { result = a; return [] })
  return result
}
```

### 1D. Instrument action logging

Add `logAction()` calls at these touchpoints:
- `apps/web/src/lib/stores/ui.ts` — wrap `activeSlideId` with `setActiveSlide(id, slideOrder)` that sets store + logs `"Selected slide N"`
- `apps/web/src/lib/utils/mutations.ts` — inside `applyMutation()`, after each successful case, log `"AI: added slide (layout-split)"`, etc. (prefix "AI:" to distinguish from manual)
- Outline reorder handler → `"Reordered slides"`
- Theme change handler → `"Changed theme to X"`
- File upload handler → `"Uploaded file: X.png"`
- Manual module add/delete in edit mode → `"Added text module to slide N"` / `"Deleted module"`
- Template apply handler → `"Applied template X"`

### 1E. Send actions in SSE payload

**File:** `apps/web/src/lib/utils/sse.ts` (line 19)

Add `recentActions` and `lastAgentSlideId` to `streamChat()` signature and JSON body.

**File:** `apps/web/src/lib/components/chat/ChatPanel.svelte` (~line 156)

Before `streamChat()`: call `consumeActions()`, pass result + `get(lastAgentSlideId)`.
After streaming completes: if any mutation was `addSlide` or targeted a `slideId`, update `lastAgentSlideId`.

### 1F. Inject into system prompt + edit bias

**File:** `apps/api/src/prompts/system.ts`

Inject before Guidelines section:
```
## Recent User Actions
- Selected slide 4
- Uploaded file: diagram.png

## Agent Memory
Last slide you modified: Slide 5 (id="xyz")
```

Add to Guidelines (after existing brevity rule):
```
- Prefer editing existing slides and modules over creating new ones. Only add new slides when the user explicitly requests new content.
- When the user describes changes, check if the active slide already has a suitable module to update before adding a new one.
```

---

## Phase 2: Suggested Next Steps (Chip Buttons)

### 2A. Suggestion format in system prompt

**File:** `apps/api/src/prompts/system.ts` (Guidelines section)

```
## Suggestions
After completing a request, optionally include 2-3 brief follow-up suggestions. Format:
[suggest: Short action phrase]
Place at end of response. Keep each under 60 characters. Only when contextually relevant.
```

### 2B. Parse + render suggestion chips

**File:** `apps/web/src/lib/components/chat/ChatMessage.svelte`

1. Add prop: `onsuggest?: (text: string) => void`
2. Extract suggestions from content: regex `/\[suggest:\s*([^\]]+)\]/g` → array, strip from display
3. Render below message content (only when `!message.streaming && role === 'assistant'`)

Style: ghost convention — transparent bg, 1px `var(--color-border)`, `var(--color-primary)` text, `var(--color-ghost-bg)` hover, `var(--radius-sm)`, 11px font.

### 2C. Wire to chat send

**File:** `apps/web/src/lib/components/chat/ChatPanel.svelte`

Pass `onsuggest={handleSend}` to each `<ChatMessage>`. Clicking a chip sends it as a new user message.

---

## Phase 3: Per-Mutation Accept/Reject

### 3A. Pending mutations store

**New file:** `apps/web/src/lib/stores/pending-mutations.ts`

```ts
export type MutationStatus = 'pending' | 'accepted' | 'rejected'

export interface PendingMutation {
  id: string
  messageId: string
  mutation: Record<string, unknown>
  status: MutationStatus
  summary: string
}

export const pendingMutations = writable<PendingMutation[]>([])
export const autoApply = writable<boolean>(false)
```

`summarizeMutation(m)` helper reads `m.action` + `m.payload` → human-readable: "Add slide (layout-split, 4 modules)", "Update module", "Change theme", etc.

### 3B. Deferred collection in ChatPanel

**File:** `apps/web/src/lib/components/chat/ChatPanel.svelte` (lines 174-181)

Replace live application with conditional:
```ts
const mutations = extractMutations(fullText)
while (appliedMutationCount < mutations.length) {
  const mut = mutations[appliedMutationCount]
  if (get(autoApply)) {
    applyMutation(mut).catch(...)
  } else {
    addPendingMutation(assistantId, mut)
  }
  appliedMutationCount++
}
```

### 3C. MutationCard component

**New file:** `apps/web/src/lib/components/chat/MutationCard.svelte`

Svelte 5 component. Props: `mutation: PendingMutation`, `onaccept`, `onreject`.

Card: horizontal flex, summary text + Accept ✓ / Reject ✕ ghost buttons. Left border color: `var(--color-primary)` pending, `#10b981` accepted, `#ef4444` rejected. Rejected at 50% opacity.

### 3D. Render mutation cards in ChatMessage

**File:** `apps/web/src/lib/components/chat/ChatMessage.svelte`

- Keep stripping mutation blocks from rendered text
- Render mutation cards below content, filtered by `messageId`
- "Accept All (N)" ghost button when multiple pending
- Accept: `applyMutation()` then `acceptMutation()`
- Reject: `rejectMutation()` (no side effects)

### 3E. Auto-apply toggle

**File:** `apps/web/src/lib/components/chat/ChatPanel.svelte` (header)

Checkbox: `bind:checked={$autoApply}` with "Auto" label. Default: off (deferred). When on, mutations apply live during streaming (legacy behavior).

### 3F. Dependency ordering

Sequential mutations (addSlide → addBlock for new slide): mutation 2 depends on 1.
- "Accept All" applies in order (safe)
- Individual accept: validate target exists. If prerequisite is pending, auto-accept it first.
- On chat reset: `pendingMutations.set([])`

---

## Implementation Order

```
Phase 1 (highest impact):
  1A → 1B → 1C → 1D → 1E → 1F

Phase 2 (small, can parallel with late Phase 1):
  2A → 2B → 2C

Phase 3 (largest, after Phase 1/2 stable):
  3A → 3B → 3C → 3D → 3E → 3F
```

## Files Modified

| File | Phase | Change |
|------|-------|--------|
| `apps/api/src/prompts/system.ts` | 1A,1F,2A | Tiered serialization, edit bias, suggestions, action injection |
| `apps/api/src/routes/chat.ts` | 1B,1E | Slide ref detection, receive recentActions/lastAgentSlideId |
| `apps/web/src/lib/utils/sse.ts` | 1D | Add recentActions + lastAgentSlideId to payload |
| `apps/web/src/lib/stores/ui.ts` | 1D | Export setActiveSlide helper |
| `apps/web/src/lib/utils/mutations.ts` | 1D | Log actions after mutation apply |
| `apps/web/src/lib/components/chat/ChatPanel.svelte` | 1E,2C,3B,3E | Action consumption, suggestions, deferred mutations, toggle |
| `apps/web/src/lib/components/chat/ChatMessage.svelte` | 2B,3D | Suggestion chips, mutation cards |

## New Files

| File | Phase | Purpose |
|------|-------|---------|
| `apps/web/src/lib/stores/actions.ts` | 1C | Action telemetry buffer |
| `apps/web/src/lib/stores/pending-mutations.ts` | 3A | Deferred mutation queue + auto-apply |
| `apps/web/src/lib/components/chat/MutationCard.svelte` | 3C | Accept/reject card |

## Verification

1. **Phase 1:** Chat on 10+ slide deck. Log system prompt. Active + neighbors full, others skeleton. Actions section appears. AI edits existing over creating new.
2. **Phase 2:** Suggestion chips render after streaming. Click sends as user message. No chips during streaming.
3. **Phase 3:** Mutations appear as cards, not applied. Accept → applies. Reject → nothing. Auto-apply toggle restores live behavior. "Accept All" works in order.
4. **Edge:** "fix slide 8" → slide 8 gets full detail via `expandSlideIds`.
5. **Edge:** Sequential mutations → Accept All safe. Individual accept of dependent mutation auto-accepts prerequisite.
