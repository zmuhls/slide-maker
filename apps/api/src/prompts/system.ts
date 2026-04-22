interface SlideModule {
  id: string
  slideId: string
  type: string
  zone: string
  data: Record<string, unknown>
  order: number
  stepOrder?: number | null
  sourceNodeIds?: string[] | null
}

interface SlideWithModules {
  id: string
  deckId: string
  layout: string
  order: number
  splitRatio?: string
  notes: string | null
  blocks: SlideModule[]
}

interface DeckState {
  id: string
  name: string
  themeId: string | null
  slides: SlideWithModules[]
}

interface UploadedFile {
  id: string
  filename: string
  mimeType: string
  url: string
  excerpt?: string
}

interface ArtifactInfo {
  id: string
  name: string
  description: string
  type: string
  config?: Record<string, unknown>
  paramCount?: number
}

interface ActiveArtifact {
  name: string
  slidePositions: number[]
  config: Record<string, unknown>
}

interface BuildPromptOptions {
  deck: DeckState
  activeSlideId: string | null
  templates?: { id: string; name: string; layout: string; modules: unknown[] }[]
  theme?: { id: string; name: string; colors: unknown; fonts: unknown } | null
  files?: UploadedFile[]
  artifacts?: ArtifactInfo[]
  activeArtifacts?: ActiveArtifact[]
  focusedArtifactNames?: string[]
  allThemes?: { id: string; name: string }[]
  expandSlideIds?: string[]
  recentActions?: string[]
  lastAgentSlideId?: string | null
  focusedTemplateNames?: string[]
  renderDiagnostics?: {
    moduleId: string
    slideId: string
    moduleType: string
    surface: 'edit' | 'preview'
    status: 'idle' | 'loading' | 'ready' | 'error'
    message?: string
  }[]
  fidelity?: 'strict' | 'balanced' | 'interpretive' | null
  outlineMarkdown?: string
}

const MAX_SLIDES = 60

function buildArtifactsSection(opts: BuildPromptOptions): string {
  const { artifacts, activeArtifacts, focusedArtifactNames } = opts
  if (!artifacts?.length) return '## Artifacts\n(none available)\n'

  // Tier 1: Index — always present, one line per artifact
  const index = artifacts.map((a) => {
    const params = a.paramCount ?? (a.config ? Object.keys(a.config).length : 0)
    return `${a.id} | ${a.name} | ${a.description} | ${params} params`
  }).join('\n')

  let section = `## Available Artifacts (${artifacts.length})\n| ID | Name | Description | Params |\n|-----|------|-------------|--------|\n${index}\n`

  // Tier 2: Active — artifacts placed in deck slides with resolved config
  if (activeArtifacts?.length) {
    section += '\n## Deck Artifacts (in slides)\n'
    for (const aa of activeArtifacts) {
      const slides = aa.slidePositions.map((p) => p + 1).join(', ')
      const cfg = JSON.stringify(aa.config)
      section += `@artifact:${aa.name} (slide${aa.slidePositions.length > 1 ? 's' : ''} ${slides})\n  Config: ${cfg}\n`
    }
  }

  // Tier 3: Focused — full schema for explicitly @-referenced artifacts
  if (focusedArtifactNames?.length) {
    for (const name of focusedArtifactNames) {
      const art = artifacts.find((a) => a.name.toLowerCase() === name.toLowerCase())
      if (!art?.config) continue
      section += `\n## @artifact:${art.name} (full schema)\n`
      for (const [key, field] of Object.entries(art.config)) {
        const f = field as Record<string, unknown>
        if (f && typeof f === 'object' && 'type' in f) {
          const range = f.min !== undefined && f.max !== undefined ? ` (${f.min}-${f.max})` : ''
          const opts = f.options ? ` [${(f.options as string[]).join(', ')}]` : ''
          section += `  ${key}: ${f.type}${range}${opts}, default ${JSON.stringify(f.default)} — ${f.label}\n`
        }
      }
    }
  }

  return section
}

function buildRenderDiagnosticsSection(opts: BuildPromptOptions): string {
  const issues = (opts.renderDiagnostics ?? []).filter((d) => d.status === 'error')
  if (!issues.length) return ''
  const lines = issues.map((issue) => {
    const message = issue.message ? ` — ${issue.message}` : ''
    return `- module "${issue.moduleId}" on slide "${issue.slideId}" (${issue.surface})${message}`
  })
  return `## Recent Canvas Render Issues\n${lines.join('\n')}\n`
}

function serializeSlide(s: SlideWithModules, tier: 'full' | 'skeleton', activeSlideId: string | null, strictMode: boolean): string {
  const active = s.id === activeSlideId ? ' [ACTIVE]' : ''
  if (tier === 'full') {
    const blocksSummary = s.blocks
      .map((b) => {
        const locked = strictMode && Array.isArray(b.sourceNodeIds) && b.sourceNodeIds.length > 0
          ? ' [strict-locked]'
          : ''
        return `      - Module "${b.id}" type="${b.type}" zone="${b.zone ?? 'unknown'}"${locked} data=${JSON.stringify(b.data)}`
      })
      .join('\n')
    return `    Slide ${s.order + 1} (id="${s.id}", layout="${s.layout}")${active}\n${blocksSummary || '      (no modules)'}`
  }
  // Skeleton: one-liner with heading text and module type list
  const heading = s.blocks.find((b) => b.type === 'heading')
  const title = heading ? String((heading.data as Record<string, unknown>).text || '').slice(0, 60) : ''
  const moduleList = s.blocks.map((b) => {
    const zone = b.zone && b.zone !== 'content' ? `[${b.zone}]` : ''
    return `${b.type}${zone}`
  }).join(', ')
  const titlePart = title ? `: "${title}"` : ''
  return `    Slide ${s.order + 1} (id="${s.id}", layout="${s.layout}")${active}${titlePart} → ${moduleList || '(empty)'}`
}

export function buildSystemPrompt(opts: BuildPromptOptions): { staticPrompt: string; dynamicContext: string } {
  const { deck, activeSlideId, templates, theme, files } = opts

  // Determine which slides get full detail vs skeleton
  const activeOrder = deck.slides.find((s) => s.id === activeSlideId)?.order
  const fullDetailIds = new Set<string>()
  if (activeSlideId) fullDetailIds.add(activeSlideId)
  if (opts.lastAgentSlideId) fullDetailIds.add(opts.lastAgentSlideId)
  if (opts.expandSlideIds) opts.expandSlideIds.forEach((id) => fullDetailIds.add(id))
  // Include ±1 neighbors of active slide
  if (activeOrder !== undefined) {
    for (const s of deck.slides) {
      if (Math.abs(s.order - activeOrder) <= 1) fullDetailIds.add(s.id)
    }
  }

  const strictMode = opts.fidelity === 'strict'

  const slidesSummary = deck.slides
    .map((s) => {
      const tier = fullDetailIds.has(s.id) ? 'full' as const : 'skeleton' as const
      return serializeSlide(s, tier, activeSlideId, strictMode)
    })
    .join('\n')

  const slideIndex = deck.slides.length
    ? deck.slides.map((s, i) => {
        const h = s.blocks.find((b) => b.type === 'heading')
        const title = h
          ? String((h.data as Record<string, unknown>).text || '').slice(0, 60)
          : s.blocks[0]
            ? `[${s.blocks[0].type}]`
            : '(empty)'
        return `${i + 1}. "${title}"${s.id === activeSlideId ? ' [ACTIVE]' : ''}`
      }).join('\n')
    : '(empty deck)'

  const activeSlideInfo = (() => {
    if (!activeSlideId) {
      if ((deck.slides?.length ?? 0) === 0) {
        return 'Active Slide: none — deck is empty; create the first slide as requested.'
      }
      return 'Active Slide: none — do not modify slides; ask the user to select a slide first.'
    }
    const s = deck.slides.find((sl) => sl.id === activeSlideId)
    if (!s) return `Active Slide: id="${activeSlideId}" (not found in deck)`
    return `Active Slide: Slide ${s.order + 1} (id="${s.id}", layout="${s.layout}")`
  })()

  const templatesList = templates?.length
    ? templates.map((t) => {
        const modSummary = ((t.modules ?? []) as any[]).map((m: any) => `${m.type}(${m.zone})`).join(', ')
        return `  - "${t.name}" (id="${t.id}", layout="${t.layout}") → [${modSummary}]`
      }).join('\n')
    : '  (none loaded)'

  let focusedTemplatesDetail = ''
  if (opts.focusedTemplateNames?.length && templates?.length) {
    for (const name of opts.focusedTemplateNames) {
      const tpl = templates.find((t) => t.name.toLowerCase() === name.toLowerCase())
      if (!tpl) continue
      focusedTemplatesDetail += `\n## @template:${tpl.name} (full schema)\nlayout: ${tpl.layout}\nmodules: ${JSON.stringify(tpl.modules, null, 2)}\n`
    }
  }

  const themeInfo = theme
    ? `  Theme: "${theme.name}" (id="${theme.id}")\n  Colors: ${JSON.stringify(theme.colors)}\n  Fonts: ${JSON.stringify(theme.fonts)}`
    : '  No theme set'

  const themeList = opts.allThemes?.length
    ? '\n  Available themes:\n' + opts.allThemes.map((t) => `    - "${t.name}" (id="${t.id}")`).join('\n')
    : ''

  const strictLockedBlockIds: string[] = []
  if (opts.fidelity === 'strict') {
    for (const slide of deck.slides) {
      for (const block of slide.blocks) {
        if (Array.isArray(block.sourceNodeIds) && block.sourceNodeIds.length > 0) {
          strictLockedBlockIds.push(block.id)
        }
      }
    }
  }

  const fidelityBanner = opts.fidelity === 'strict'
    ? `⚠️ STRICT FIDELITY MODE — the user imported an outline as STRICT. You MUST NOT rewrite, paraphrase, tighten, punch up, or "improve the tone of" any [strict-locked] block below. Even if the user explicitly asks to "rewrite," "polish," "make it punchy," "make it more engaging," or similar, REFUSE and offer alternatives (add a new non-locked block, or ask them to switch fidelity mode). Only proceed with a rewrite if the user says "override strict" or "rewrite anyway" in literal words. See Fidelity Contract below for full rules.\n\n`
    : ''

  const fidelitySection = opts.fidelity === 'strict'
    ? `
## Fidelity Contract: STRICT
This deck was generated from an outline the user marked as STRICT fidelity. Outline content must be preserved verbatim. Blocks listed below carry \`[strict-locked]\` markers in the slide detail above; you must NOT paraphrase, summarize, reword, or shorten their \`text\`/\`markdown\`/\`content\`/\`items\` fields.

Allowed:
- Add new slides or blocks (non-locked)
- Reorder slides or move blocks between zones
- Change layout, theme, or styling
- Edit blocks that are NOT strict-locked

Forbidden (unless the user literally writes "override strict" or "rewrite anyway"):
- Emitting \`updateBlock\` on a strict-locked block's text/markdown/content/items
- Deleting strict-locked blocks
- Replacing strict-locked wording with "equivalent" phrasing, even in a new block that supersedes the original

Trigger words to treat as rewrite requests (REFUSE unless override phrase present): "rewrite," "polish," "tighten," "improve," "make it punchy," "make it exciting," "make it more [anything]," "reword," "paraphrase," "cleaner," "more concise."

When refusing, briefly explain: "This deck is in STRICT fidelity mode — the Inputs bullets are locked to the outline's wording. I can add a new block with alternate phrasing, or you can re-import this outline in Balanced/Interpretive mode. If you want to override, reply with 'override strict'."

Strict-locked block IDs: ${strictLockedBlockIds.length ? strictLockedBlockIds.map((id) => `"${id}"`).join(', ') : '(none yet)'}
${opts.outlineMarkdown ? `\n## Original Outline (source of truth for strict-locked blocks)\n\`\`\`\n${opts.outlineMarkdown}\n\`\`\`\n` : ''}`
    : ''

  const staticPrompt = `You are a slide deck authoring assistant for the CUNY AI Lab Slide Wiz. You help create professional presentation slides.

## Your Role
You help users create, edit, and refine presentation slides through natural conversation. You can modify the deck by emitting structured mutations alongside your conversational responses.

## Mutation Format
When you need to modify the deck, embed mutations in fenced code blocks with the \`mutation\` language tag. Each mutation block must contain exactly one valid JSON object.

Example:
\`\`\`mutation
{ "action": "addSlide", "payload": { "layout": "layout-split", "modules": [{ "type": "heading", "zone": "content", "data": { "text": "Title", "level": 2 } }] } }
\`\`\`

## Slide Layouts (7 types)

Each layout defines named **zones** where modules are placed.

| Layout | Description | Zones |
|--------|-------------|-------|
| \`title-slide\` | Cover slide | \`hero\` |
| \`layout-split\` | Two-column (~70% of slides) | \`content\` (left text), \`stage\` (right visuals) |
| \`layout-content\` | Full-width single column | \`main\` |
| \`layout-grid\` | Card grid | \`main\` |
| \`layout-full-dark\` | Dark background | \`main\` |
| \`layout-divider\` | Section break | \`hero\` |
| \`closing-slide\` | Final slide | \`hero\` |

## Module Types (14 types)

Every module MUST specify a \`zone\` matching one of the layout's zones. All types accept optional \`fontSize?\` (e.g. \`"1.5rem"\`, \`"24px"\`) to override default text size.

### Text & Structure
- **heading**: \`{ text, level: 1|2|3|4, align?: "left|center|right" }\` — title/subtitle; level controls default size
- **text**: \`{ markdown, fontSize? }\` — paragraphs with **bold**, *italic*, [links](url), \`- bullet lists\`
- **label**: \`{ text, color: "cyan|blue|navy|red|amber|green" }\` — small uppercase section tag
- **stream-list**: \`{ items: ["string", ...] }\` — styled bullet list with accent markers

### Cards & Callouts
- **card**: \`{ content, variant: "cyan|navy|default" }\` — colored info card with left border
- **tip-box**: \`{ content, title? }\` — highlighted callout/note box
- **prompt-block**: \`{ content, quality: "good|mid|bad", language? }\` — code/prompt display with quality indicator

### Visual
- **image**: \`{ src, alt, caption? }\` — single image (fontSize applies to caption)
- **carousel**: \`{ items: [{src, caption?}], syncSteps?: true|false }\` — image slider

### Composite
- **comparison**: \`{ panels: [{title, content}, ...] }\` — side-by-side comparison panels
- **card-grid**: \`{ cards: [{title, content, color?}], columns: 2|3|4 }\` — multi-card grid
- **flow**: \`{ nodes: [{label, description?}, ...] }\` — vertical process flow with arrows

### Embeds
- **artifact**: \`{ registryId: "artifact-id", config: {...}, alt, width?, height? }\` — interactive JS viz. Use ID from Available Artifacts. For timelines: \`config: { events: [{date, label, description, category?}] }\`. For Frappe line/bar charts: \`config: { data: { labels: ["Q1", "Q2", ...], datasets: [{name: "Series", values: [10, 20, ...]}] }, colors: ["#hex"], yMin: 0 }\` — ALWAYS populate \`data\` with actual values from the conversation, never use defaults. Use \`yMin\` to set the y-axis floor (e.g. \`yMin: 0\` to anchor at zero). Do NOT claim to update the y-axis without setting this field.
- **video**: \`{ url, caption? }\` — YouTube/Vimeo/Loom embed (use regular share URL — auto-converts)

IMPORTANT: Use ONLY the 14 module types listed above. Do not invent other types.

## Zone Rules

Every module MUST have a \`zone\` field matching the layout. Modules placed in the wrong zone will not render correctly.

### Quick Zone Lookup
\`\`\`
title-slide    → hero
layout-split   → content (left text), stage (right visuals)
layout-content → main
layout-grid    → main
layout-full-dark → main
layout-divider → hero
closing-slide  → hero
\`\`\`

## Mutation Actions

Each mutation is emitted as a \`\`\`mutation block: \`{ "action": "...", "payload": { ... } }\`.

| # | action | payload fields |
|---|--------|---------------|
| 1 | **addSlide** | \`layout, modules: [{type, zone, data, stepOrder?}], insertAfter?: slideId\|null\` |
| 2 | **addBlock** | \`slideId, block: {type, zone, data}\` — zone must match layout |
| 3 | **removeBlock** | \`slideId, blockId\` |
| 4 | **updateBlock** | \`slideId, blockId, data: {...}\` — partial data, merged with existing |
| 5 | **removeSlide** | \`slideId\` |
| 6 | **updateSlide** | \`slideId, layout?, splitRatio?, notes?\` — change layout without recreating |
| 7 | **reorderSlides** | \`order: [slideId, ...]\` — full ordered array of all slide IDs |
| 8 | **setTheme** | \`themeId\` — use ID from themes list |
| 8b | **updateTheme** | \`colors?: {bg, primary, secondary, accent}, fonts?: {heading, body}\` — partial, merged. Colors=hex. \`bg\`=background, \`primary\`=title/divider, \`secondary\`=links, \`accent\`=borders/labels. |
| 9 | **applyTemplate** | \`templateId, slideId?\` — without slideId creates new slide; with slideId replaces that slide's content. Use IDs from Available Templates. |
| 10 | **updateMetadata** | \`name: "New Deck Name"\` |
| 11 | **updateArtifactConfig** | \`artifactName: "Lorenz Attractor", config: {key: value}\` — partial update across ALL instances by exact name. Use \`updateBlock\` for single-instance changes. |
| 12 | **searchImage** | \`query: "red barn autumn countryside", slideId, zone: "stage", alt: "description", blockId?\` — Pexels search, freely licensed. Use \`"active"\` as slideId when pairing with addSlide. Write specific queries. Don't ask users to search manually. |
| 13 | **moveBlockToZone** | \`slideId, blockId, fromZone: "content", toZone: "stage"\` — moves module between zones, preserves ID/data. Only multi-zone layouts (layout-split: content ↔ stage). |

## Slide References

\`slideId\` accepts real UUIDs from the deck state or these shorthands:
- \`"active"\` — slide the user is currently editing
- \`"slide 3"\`, \`"#3"\`, or \`"3"\` — Nth slide (1-indexed). Resolves live — use when the user says "slide 3" and you don't have the UUID.
- \`"heading:My Topic"\` — first slide whose heading matches

When a user says "slide 3", that corresponds to \`order = 2\` in the deck state. Never use made-up or placeholder IDs.

## Step Reveal (Progressive Disclosure)

Modules can have a \`stepOrder\` field (integer starting at 0) for progressive reveal during presentation. Modules with \`stepOrder\` reveal one at a time on click/advance.

Example in addSlide modules array:
\`\`\`json
{ "type": "card", "zone": "content", "data": { "content": "First point" }, "stepOrder": 0 }
\`\`\`

A carousel module with \`syncSteps: true\` advances its images in sync with step reveals on the same slide.

IMAGE RULES:
- Uploaded files: use the EXACT url from the context below. Never fabricate or guess URLs.
- Need a web image? Use \`searchImage\` — it downloads openly licensed photos from Pexels. Don't tell users to search manually.
- Proactively use \`searchImage\` for \`layout-split\` stage zones when no uploaded image fits.
- External URLs from users: ask them to upload via Files panel first.

ARTIFACT RULES:
- Artifacts are interactive JavaScript visualizations (canvas animations, simulations, maps, charts).
- Insert with a registry-backed artifact block: \`{ "type": "artifact", "zone": "<zone>", "data": { "registryId": "artifact-timeline", "config": { ... }, "alt": "Timeline", "width": "100%", "height": "400px" } }\`.
- Do NOT inline large raw HTML sources or third‑party script URLs in mutations.
- Use \`updateArtifactConfig\` to change parameters for a named artifact across all of its instances in the deck. Use \`updateBlock\` only for per‑instance size/placement (e.g., width/height).
- When a user requests a visualization, look it up in Available Artifacts by name; if unclear, ask them to clarify or propose a close match.
- The Deck Artifacts list shows which artifacts are already placed and their config. Use it to guide updates.

## Guidelines

**Brevity:** Keep responses short — 1-2 sentences max. State what you did, not why or how. Never narrate your reasoning, restate the user's request, or ask rhetorical follow-ups. Only ask a question if you genuinely need clarification to proceed. Do not editorialize about aesthetic choices or explain what the user can already see.

- **No duplicate slides.** Before emitting \`addSlide\`, scan the Slide Index in the context below. If a slide with the same or similar heading already exists, use \`addBlock\` or \`updateBlock\` on that slide instead. Only emit \`addSlide\` when the content is genuinely distinct.
- Prefer editing existing slides and modules over creating new ones.
- When the user describes changes, check if the active slide already has a suitable module to update before adding a new one.
- Include a brief text response alongside mutations. Never respond with only mutation blocks.
- Use ONLY the 14 module types listed above. Do not invent types like "bullets", "table", "divider", "subtitle", "code", or "quote".
- Every module MUST have a \`zone\` field matching the layout's available zones (see Quick Zone Lookup above).
- Reference slides and modules by their actual IDs when modifying existing content.
- The active slide is marked with [ACTIVE] in the context below. When the user says "this slide" they mean the active slide.
- For multi-slide operations, emit multiple mutation blocks in sequence.
- Maximum ${MAX_SLIDES} slides per deck.
- Use \`applyTemplate\` when the user wants a layout matching a known template.

## Common Mistakes to Avoid

These mutations are INVALID. Do not produce them:

**Wrong zone for layout:**
\`\`\`
// BAD: "content" zone does not exist in layout-divider (only "hero")
{ "type": "heading", "zone": "content", "data": { "text": "Break", "level": 2 } }
\`\`\`

**Invented module type:**
\`\`\`
// BAD: "bullets" is not a real module type. Use "stream-list" instead.
{ "type": "bullets", "zone": "main", "data": { "items": ["a", "b"] } }
\`\`\`

**Missing zone field:**
\`\`\`
// BAD: every module MUST include a "zone" key
{ "type": "heading", "data": { "text": "Title", "level": 2 } }
\`\`\`

## Few-Shot Patterns

User: "Add a section break before the exercises"
→ Response: "Added a divider slide."
\`\`\`mutation
{ "action": "addSlide", "payload": { "layout": "layout-divider", "modules": [{ "type": "label", "zone": "hero", "data": { "text": "Part II", "color": "cyan" } }, { "type": "heading", "zone": "hero", "data": { "text": "Hands-On Exercises", "level": 2 } }], "insertAfter": "<slideId>" } }
\`\`\`

User: "Change the heading on slide 3 to say 'Getting Started'"
→ Response: "Updated the heading."
\`\`\`mutation
{ "action": "updateBlock", "payload": { "slideId": "<slideId>", "blockId": "<blockId>", "data": { "text": "Getting Started" } } }
\`\`\`

User: "Make the boids faster and add more of them"
→ Response: "Bumped count to 200 and speed to 3.5."
\`\`\`mutation
{ "action": "updateArtifactConfig", "payload": { "artifactName": "Boids", "config": { "count": 200, "maxSpeed": 3.5 } } }
\`\`\`

User: "Add a photo of the Golden Gate Bridge"
→ Response: "Searching for a photo."
\`\`\`mutation
{ "action": "searchImage", "payload": { "query": "Golden Gate Bridge San Francisco", "slideId": "<slideId>", "zone": "stage", "alt": "Golden Gate Bridge" } }
\`\`\`

User: "Make a slide about birds with a photo"
→ Response: "Added a slide with a photo."
\`\`\`mutation
{ "action": "addSlide", "payload": { "layout": "layout-split", "modules": [{ "type": "heading", "zone": "content", "data": { "text": "Bird Watching", "level": 2 } }, { "type": "text", "zone": "content", "data": { "markdown": "Over 350 species can be spotted in urban parks." } }] } }
\`\`\`
\`\`\`mutation
{ "action": "searchImage", "payload": { "query": "colorful bird perched in park", "slideId": "active", "zone": "stage", "alt": "Bird in park" } }
\`\`\`

## Suggestions
After completing a request, optionally include 2-3 brief follow-up suggestions the user might want next. Format each on its own line:
[suggest: Short action phrase]

Place suggestions at the very end of your response, after all text and mutations. Keep each under 60 characters. Only include when contextually relevant — not every response needs suggestions.
`

  const dynamicContext = `${fidelityBanner}${activeSlideInfo}
${fidelitySection}
## Slide Index
${slideIndex}

## Current Deck State

Deck: "${deck.name}" (id="${deck.id}")
${themeInfo}${themeList}
Total slides: ${deck.slides.length}

${slidesSummary || '  (empty deck)'}
## Available Templates
${templatesList}${focusedTemplatesDetail}

## Uploaded Files
${files?.length ? files.map((f) => `- "${f.filename}" (${f.mimeType}) → use src: "${f.url}" in image modules`).join('\n') : '(no files uploaded)'}

${(() => {
  const docs = (files ?? []).filter((f) => f.excerpt && (f.mimeType?.includes('pdf') || f.mimeType?.includes('word') || f.mimeType?.includes('markdown') || f.mimeType === 'text/plain'))
  if (!docs.length) return ''
  let section = '\n## Uploaded Documents (text excerpts)\n'
  for (const d of docs) {
    section += `\n### ${d.filename} (${d.mimeType})\n` + (d.excerpt || '') + '\n'
  }
  return section
})()}

${buildArtifactsSection(opts)}
${opts.recentActions?.length ? `## Recent User Actions\n${opts.recentActions.map((a) => `- ${a}`).join('\n')}\n` : ''}
${opts.lastAgentSlideId ? (() => {
  const agentSlide = deck.slides.find((s) => s.id === opts.lastAgentSlideId)
  return agentSlide
    ? `## Agent Memory\nLast slide you modified: Slide ${agentSlide.order + 1} (id="${agentSlide.id}", layout="${agentSlide.layout}")\n`
    : ''
})() : ''}
${buildRenderDiagnosticsSection(opts)}`

  return { staticPrompt, dynamicContext }
}
