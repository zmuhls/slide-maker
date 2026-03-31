# Slide Builder Tool — Claude Code Prompt (Part 1: Vision & Architecture)

## What We're Building

A two-panel Svelte slide builder tool designed for teams that are prepping decks the night before or the morning of. The goal is fast, consistent, template-driven slide creation with on-screen editing — not just prompting.

### How This Differs from Site Studio

Site Studio https://github.com/CUNY-AI-Lab/site-studio produces inconsistent output across projects — there's no design continuity when you create multiple decks. This tool solves that with:

- **Reusable, plug-and-play slide templates** derived from decomposing our existing decks into generalizable parts
- **On-screen editing** with free-flowing, draggable, interactive text — not prompt-only interaction
- **Consistent theming** enforced across projects through a shared template and theme system

We are not building another Site Studio. This is a focused slide authoring environment, not a general site builder.

---

## Hosting & Output

Each completed slide deck will eventually be hosted at an endpoint following the pattern:

```
projects.ailab.gc.cuny.edu/[name-of-deck]
```

For now, use a preliminary local/dev solution — static export, local preview server, or equivalent — so the hosting integration can be wired up later without rearchitecting anything.

---

## On-Screen Text Editing: Two Pretext Libraries

A core differentiator of this tool is that text content on slides can be edited directly on screen and moved around freely and fluidly — via drag-and-drop, resize handles, and other interactive inputs. This is powered by integrating two complementary libraries, both called "pretext":

### 1. chenglou/pretext — Text Measurement & Reflow Engine
- [github.com/chenglou/pretext](https://github.com/chenglou/pretext)
- Pure JS/TS library for multiline text measurement and layout without DOM reflow
- Provides the low-level text reflow capability: measuring paragraph heights, breaking lines at precise widths, flowing text around other elements, and shrink-wrapping containers to content
- Supports rendering to DOM, Canvas, and SVG
- This is the engine that makes fluid on-screen text manipulation feel responsive — when a user drags a text block to a new size or position, chenglou/pretext recalculates the layout in pure arithmetic without expensive browser reflow

### 2. PreTeXtBook/pretext — Structured Authoring System
- [github.com/PreTeXtBook/pretext](https://github.com/PreTeXtBook/pretext)
- An authoring and publishing system for scholarly documents, built on structured XML markup
- Captures the semantic structure of content (sections, definitions, examples, figures, references) independently from visual presentation
- Outputs to multiple formats (HTML, PDF, etc.) from a single source
- In this tool, PreTeXtBook/pretext provides the **structured content layer**: slide text isn't just free-floating strings — it carries semantic meaning (heading, body, caption, citation, code block, etc.) that templates and themes can style consistently
- This structure is what makes drag-and-drop and rearrangement meaningful rather than chaotic: when a user moves a content block, the system knows *what kind* of content it is and can enforce layout rules, spacing, and styling accordingly

### PreTeXtBook Documentation

The following documentation should be consulted for the authoring vocabulary, element schema, and instructional slide patterns that inform how PreTeXtBook/pretext integrates into the builder:

- **[Quick Start Guide](https://pretextbook.org/quick-start.html)** — Setup pathways (PreTeXt.Plus online editor, GitHub Codespaces, local install) and entry points into the authoring system. Reference for understanding the minimal viable authoring workflow that the slide builder's structured content layer should parallel.
- **[PreTeXt for Instructors](https://pfi.mathtech.org/)** — Tutorial specifically for creating accessible, web-based course materials and **lecture slides** with PreTeXt. Covers creating course "books" with syllabi, printable activities, and notes; hosting on GitHub Pages; and embedding within an LMS. This is the most directly relevant reference for how PreTeXt's authoring model applies to slide creation.
- **[The PreTeXt Guide](https://pretextbook.org/guide.html)** — Comprehensive reference for the PreTeXt vocabulary, organized into sections for authors, publishers, and developers. Defines all available elements, their relationships, and conventions for structuring content. The authoritative source for how semantic elements (sections, blocks, figures, side-by-side layouts, exercises, activities) should behave.
- **[RELAX-NG Schema Documentation](https://pretextbook.org/doc/schema-litprog/html/pretext.html)** — The formal specification of every PreTeXt XML element and attribute, written as literate programming. Defines the exact grammar: document types (article, book), division hierarchy (part → chapter → section → subsection), block-level elements 

### Tool Architecture & Repos to Decompose

The builder's library of templates and artifacts should be composed from patterns extracted from our existing deck repos. This justifies the initial scope reductions and anchors the tool in concrete production needs rather than open-ended invention.

**Key libraries:**
- [chenglou/pretext](https://github.com/chenglou/pretext) — text measurement/reflow engine for fluid on-screen editing and drag-resize behavior without expensive DOM reflow
- [PreTeXtBook/pretext](https://github.com/PreTeXtBook/pretext) — XML-based authoring system. Provides the semantic content model (element types, division hierarchy, block structures) that gives slide content blocks their identity.
- [PreTeXt Quick Start](https://pretextbook.org/quick-start.html) — Setup pathways and entry points. Reference for the minimal authoring workflow the builder's content layer should parallel.
- [PreTeXt for Instructors](https://pfi.mathtech.org/) — Tutorial for creating lecture slides and accessible course materials with PreTeXt, including GitHub Pages hosting and LMS embedding. The most directly applicable reference for slide-specific authoring.
- [The PreTeXt Guide](https://pretextbook.org/guide.html) — Comprehensive element reference for authors, publishers, and developers. Defines all available content elements and their relationships.
- [PreTeXt RELAX-NG Schema](https://pretextbook.org/doc/schema-litprog/html/pretext.html) — Formal specification of every element and attribute. The definitive grammar for mapping PreTeXt's vocabulary to the builder's content block types (divisions, blocks, figures, side-by-side layouts, interactive elements, exercises, activities).

**Tool architecture & agent patterns:**
- [CUNY-AI-Lab/site-studio](https://github.com/CUNY-AI-Lab/site-studio) — Reference for the overall tool shell: panel layout, agent integration, and project management patterns. The slide builder draws from this architecture but is scoped narrowly to slide authoring.
- [CUNY-AI-Lab/agent-studio](https://github.com/CUNY-AI-Lab/agent-studio) — Reference for agent-driven workflows: how the Claude SDK connects to a builder UI, routes generated output to the correct panel, and supports iterative editing through conversation.

**Slide deck repos — decompose into plug-and-play templates:**

Each repo below contributes specific patterns to the template library. The builder should extract these patterns as reusable, composable template parts.

- [CUNY-AI-Lab/knowledge-collections](https://cuny-ai-lab.github.io/knowledge-collections/) — Multi-column text+screenshot layouts, process flow diagrams (student → AI → response), card-based workshop series timelines, comparative example progressions with color-coded indicators, and RAG-pipeline visual explainers. Uses `css/` and `js/` directory structure.
- [CUNY-AI-Lab/system-prompting](https://github.com/CUNY-AI-Lab/system-prompting) — Step-by-step procedure blocks with copy-to-clipboard prompt templates, iterative prompt-building exercises (vague → warmer → strong), section-labeled slide navigation, and blockquote callouts for key definitions. Uses `css/` and `js/` directory structure.
- [CUNY-AI-Lab/cali-brooklyn](https://github.com/CUNY-AI-Lab/cali-brooklyn) — Uses `src/` directory and CLAUDE.md agent instructions. Reference for the newer repo convention where Claude Code manages the deck via structured prompt files.
- [CUNY-AI-Lab/critical-play](https://github.com/CUNY-AI-Lab/critical-play) — Additional slide deck in the CUNY AI Lab collection.
- [CUNY-AI-Lab/creative-coding](https://github.com/CUNY-AI-Lab/creative-coding) — JS-heavy deck (66.5% JavaScript). Reference for how interactive code demonstrations and creative coding exercises are embedded directly into slides as live artifacts.
- [stefanomorello.com/dav/wba-maps](https://stefanomorello.com/dav/wba-maps) — Interactive data visualization suite: D3.js choropleth maps with TopoJSON, hover tooltips, temporal navigation sliders (stepping through historical data by year), and state-level color-gradient rendering. Demonstrates that slides can host full JS-powered interactive components, not just static content.
- [CUNY-AI-Lab/gen-dev-foundations](https://github.com/CUNY-AI-Lab/gen-dev-foundations) — Uses `src/` directory, CLAUDE.md. Reference for how generative development workshop content is structured and presented.
- [CUNY-AI-Lab/vibe-coding-prototypes](https://github.com/CUNY-AI-Lab/vibe-coding-prototypes) — Uses `src/` directory, CLAUDE.md. Reference for prototype-driven workshop flows where live coding artifacts are central to the presentation.
- [smorello87/psn2026](https://github.com/smorello87/psn2026) — Conference presentation deck. Reference for adapting personal/academic presentation conventions into the builder's template system. Should be decomposed into the same plug-and-play template format as the CUNY AI Lab decks above.
- [smorello87/calandra-slides](https://github.com/smorello87/calandra-slides) — Additional presentation deck. Reference for slide structures, layouts, and content patterns that should be generalized into reusable templates alongside the other source repos.

---

## Modular Slide Composition — "Choose a Type" Workflow

A defining interaction pattern for this tool: slides are composed **modularly**, not monolithically. Instead of starting with a blank canvas or a single fixed layout, users build each slide by selecting from a menu of **content block types** — and each type brings its own structure, data inputs, and rendering logic.

### How It Works

When a user adds or edits a slide, the workflow is:

1. **Choose a type** for the slide (or for a block within a slide) — e.g., map, chart, text block, code snippet, image panel, process diagram, comparison grid, quote callout
2. **Provide the data** — the builder presents input fields appropriate to that type (e.g., GeoJSON for a map, CSV/JSON for a chart, markdown for a text block, a URL for an embedded resource)
3. **The system builds it** — the tool renders the content block using the appropriate template, JS artifact, and theme styling, and drops it into the slide canvas
4. **Compose freely** — multiple blocks can be combined on a single slide, rearranged via drag-and-drop, and resized with live reflow

This is inspired by the modular composition model of **ArcGIS Story Maps**, where each "section" of a narrative is a self-contained content type (map, image, text, timeline, embed) that the author selects and configures independently. The slide builder applies this same principle at the slide level: each slide is a composition of typed, self-contained content modules.

### Where This Lives in the UI

- **Left panel — Slide outline with accordion expandables:** Each slide card in the outline below the chatbox is an **accordion expandable** (collapsed by default). Toggling a card open reveals that slide's content blocks and their types, and makes the slide live on the canvas. Users can edit block properties directly in the expanded accordion — changing data sources, reordering blocks, swapping types — and see changes reflected in real time on the canvas. The left panel is fully wired to the center canvas: what you toggle and edit on the left is what you see and manipulate in the center.

- **Right panel — Artifacts tab for interactive/containerized content:** When a user chooses a content block type that involves JS-powered interactivity — a D3 choropleth map, a timeline slider, an animated process diagram, a live code demo — that block type is sourced from the **Artifacts** tab on the right panel. Artifacts are reusable, containerized JS visualization components that can be dropped into any slide. The "Choose a type" menu surfaces these artifacts alongside simpler content types (text, image, quote), so the user experiences a single unified composition flow regardless of whether the block is static HTML/CSS or a full interactive JS component.

- **Chat agent integration:** The chat agent on the left panel is aware of the modular composition model. Users can ask the agent to "add a map to slide 3" or "replace the text block with a comparison grid," and the agent will select the appropriate content block type, prompt for (or generate) the required data, and insert it into the slide — all routed through the same type-selection and rendering pipeline.

### Relationship to Templates and Themes

Content block types are the atomic units; **templates** are pre-composed arrangements of those units (e.g., a "two-column explainer" template is a text block + image panel arranged side-by-side with specific proportions). **Themes** style everything consistently regardless of which types and templates are in use. The modular composition system sits between templates and raw editing: users can start from a template and swap individual blocks, or start from scratch and compose block by block.

---

## Key Design Principles

1. **Templates over freeform** — Consistency across decks comes from shared, reusable slide templates, not starting from scratch each time
2. **Edit on screen, not just in prompts** — chenglou/pretext provides fluid text reflow; PreTeXtBook/pretext provides structured authoring; together they enable drag-and-drop, resize, inline editing, and reordering directly on the canvas
3. **Decompose to generalize** — All existing slide decks should be broken open into their constituent parts (the CSS, JS, and HTML features inventoried above) so those parts can be recombined as plug-and-play templates
4. **Fork, don't freeze** — The agent can create offshoots of any existing template, theme, or artifact on the spot, so users are never locked into a resource they want to tweak
5. **Chat drives everything** — The left-panel chat is the primary control surface, wired into every resource tab and slide type, so generated output flows naturally into the right place
6. **Collaborative by design** — Built for sharing and collective intervention, with eventual hosting at projects.ailab.gc.cuny.edu/[name-of-deck]
7. **One focused tool** — This is not Site Studio. No tools on tools on tools.
8. **Modular composition** — Slides are built from typed, self-contained content blocks that users select, configure, and arrange — not from blank canvases or rigid fixed layouts. Inspired by ArcGIS Story Maps' section-based narrative model.
9. **Accessibility first** — All slide decks must comply with the latest ADA accessibility standards. This applies to generated output (semantic HTML, ARIA attributes, keyboard navigation, color contrast, screen reader compatibility) and to the builder UI itself.

