# QA Report -- 2026-04-10 11:40

## Scope
**Smoke test** -- triggered by user encountering a turborepo startup error. Addressed the turbo issue, then ran available smoke-level verification (unit test suite, infrastructure checks, env/config audit).

## Turbo Error Diagnosis

### Problem
```
$ pnpm dev --host

ERROR  unexpected argument '--host' found
  tip: to pass '--host' as a value, use '-- --host'
Usage: turbo [OPTIONS] [TASKS]... [-- <PASS_THROUGH_ARGS>...]
```

### Root Cause
`pnpm dev` invokes **turborepo**, which runs both the API and web dev servers. Turborepo does not recognize `--host` -- that flag belongs to **Vite** (the web app's dev server). Turbo interprets it as its own argument and rejects it.

### Fix
To pass flags through to individual workspace packages, use pnpm's `--filter` flag to target the specific workspace:

```bash
# Start web app with --host (exposes on LAN):
pnpm --filter @slide-maker/web dev -- --host 0.0.0.0

# Start API separately (in another terminal):
pnpm --filter @slide-maker/api dev
```

Alternatively, if you just need both running locally without `--host`:
```bash
pnpm dev
```

**Why `-- --host` (turbo's suggestion) is not ideal:** Turbo's pass-through (`-- --host`) forwards the flag to ALL tasks, including the API server, which may not understand `--host` the same way. Using `--filter` is more precise.

### Preventive Suggestion
Add a `dev:host` script to the root `package.json`:
```json
"dev:host": "concurrently \"pnpm --filter @slide-maker/api dev\" \"pnpm --filter @slide-maker/web dev -- --host 0.0.0.0\""
```
Or document the `--filter` pattern in CLAUDE.md under Dev Commands.

---

## Environment
- **API:** http://localhost:3001 -- assumed running (per user confirmation)
- **Web:** http://localhost:5173 -- assumed running (per user confirmation)
- **AI providers:**
  - OpenRouter: configured (key present)
  - Bedrock: configured (AWS region + bearer token present)
  - Anthropic: NOT configured (key empty)
- **Search:** Brave (key present), Tavily (key empty)
- **Image search:** Pexels (key present)
- **Database:** exists at `apps/api/data/slide-maker.db`
- **.env symlink:** OK (`apps/api/.env -> ../../.env`)
- **Git branch:** `feat/rich-text-chat-input`
- **Last commit:** `549fa44` feat: rich text formatting toolbar in chat input (tiptap)

## Summary
- **427 unit tests** across **15 test files** -- all passing
- Test duration: 3.00s (860ms test execution)
- 0 failures, 0 warnings
- Infrastructure checks: symlink OK, database present, env configured
- curl/WebFetch calls blocked by sandbox -- API endpoint probing not possible in this session

## Test Suite Results

| Test File | Tests | Status | Duration |
|-----------|-------|--------|----------|
| dnd-transforms.test.ts | 15 | PASS | fast |
| rich-text.test.ts | ~40 | PASS | fast |
| ssrf-guard.test.ts | ~16 | PASS | fast |
| module-type-parity.test.ts | varies | PASS | fast |
| resource-registry.test.ts | varies | PASS | fast |
| html-renderer-modules.test.ts | ~50 | PASS | fast |
| framework-css.test.ts | ~20 | PASS | fast |
| slide-layout.test.ts | ~14 | PASS | fast |
| artifact-config.test.ts | ~9 | PASS | fast |
| artifact-runtime.test.ts | 2 | PASS | 12ms |
| export-artifacts.test.ts | 8 | PASS | fast |
| export-zip-integration.test.ts | 1 | PASS | 413ms |
| canonical-template.test.ts | 1 | PASS | fast |
| system-prompt-render-diagnostics.test.ts | 1 | PASS | fast |
| system-prompt-docs-excerpts.test.ts | 1 | PASS | fast |
| **Total** | **427** | **ALL PASS** | **3.00s** |

## Areas Verified (Unit Level)

### DnD Transforms
- Block reordering within zones: correct
- Cross-zone block moves (content <-> stage): correct
- Slide reordering: correct
- Edge cases (single block, empty arrays, unknown IDs): handled

### Rich Text Pipeline
- HTML escaping: all sensitive characters covered
- HTML detection: tags detected, angle brackets without tags rejected
- Inline markdown (bold, italic, code, links): correct
- Block markdown (headings, lists, blockquotes, paragraphs): correct
- Rich text data rendering priority (html > markdown > content > text): correct
- Sanitizer invoked on all output paths: confirmed
- Link URL validation (https only, mailto allowed, non-http rejected): correct

### SSRF Guard
- Private IP detection: all RFC ranges covered (127.x, 10.x, 172.16-31.x, 192.168.x, 169.254.x, 0.x)
- IPv6 mapped addresses: detected correctly
- Public IPs: not falsely flagged

### Module Type Parity
- All 14 module types have matching renderers, prompt references, and phantom types
- No orphaned or missing module types

### HTML Renderer (Export)
- All 14 module types produce valid HTML output
- Step attributes applied correctly
- Artifact variants (native, URL iframe, rawSource iframe, placeholder): all rendered
- Video URL parsing (YouTube, youtu.be, Vimeo, Loom): correct
- Invalid/non-video URLs: return empty string (graceful)

### Framework CSS
- Layout-split specificity fix present in both preview and export variants
- Zone styling (content, stage) correct
- Layout center alignment (title-slide, layout-content, closing-slide): correct
- Preview variant: steps visible, slides flex
- Export variant: slides hidden by default, active shown, step reveals present
- Module CSS (card, comparison, card-grid, flow, artifact): all rules present

### Export Pipeline
- ZIP structure validated: index.html, css/styles.css, js/engine.js
- Artifact extraction: rawSource to separate files, deduplication by content hash
- Step attributes preserved on extracted artifacts
- URL artifacts: iframe src preserved

### Slide Layout Utilities
- Split ratio parsing with clamping (0.2-0.8): correct
- Slide title extraction from heading modules: correct
- Module ordering by order field: correct
- Zone section generation per layout type: correct

## Areas NOT Tested (Sandbox Limitations)

The following could not be tested because curl/HTTP requests were blocked by the execution sandbox:

- **API endpoint probing** (health, auth, CRUD, search, export, admin)
- **Auth flow** (login, session cookies, security headers)
- **Deck lifecycle** (create, read, update, delete)
- **Slide/block CRUD** against live API
- **AI chat streaming** (SSE)
- **Web search** (Brave, Pexels)
- **File upload/serve**
- **Export download** (ZIP from API)
- **Browser verification** (chrome tools available but not used since API unreachable from test context)

## Recent Changes Verification

Based on `git log --oneline -20`, the most recent work is on the `feat/rich-text-chat-input` branch:

| Commit | Area | Unit Test Coverage |
|--------|------|-------------------|
| `549fa44` rich text formatting toolbar (tiptap) | Rich text pipeline fully tested (40+ tests) |
| `dfa233b` hex colors to css variables | Framework CSS tests passing |
| `2654db9` add-module button contrast | Visual -- needs browser verification |
| `f463ee6` dnd/step controls, canvas contrast | DnD transforms tested (15 tests) |
| `18778a0` dnd drag handle events, batch reorder | DnD transforms tested |
| `c34bf8d` dnd props mutation, cross-zone race | Cross-zone moves tested |
| `7c8048a` sparse dnd ordering, empty heading | Edge cases tested |

## Documentation Drift

Based on comparing CLAUDE.md against the test results and .env:

1. **CLAUDE.md says 437 tests** -- actual count is **427**. The 10-test discrepancy should be investigated (tests may have been consolidated or removed during recent refactoring).
2. **AI_PROVIDER env var** is empty in .env -- CLAUDE.md documents this as optional (provider auto-detected from available keys). Consistent.
3. **ANTHROPIC_API_KEY** is empty -- CLAUDE.md says "At minimum set one provider" -- this is satisfied by OpenRouter and Bedrock keys being present.

## Improvement Suggestions

### Immediate
1. **Add a `dev:host` convenience script** to root `package.json` so users don't hit the turbo flag error again.
2. **Update CLAUDE.md test count** from 437 to 427 (or investigate the discrepancy).
3. **Document the `--filter` turbo pattern** in CLAUDE.md Dev Commands section -- this is a common pitfall.

### Testing Gaps
4. **No integration tests against the live API** -- the unit tests cover pure functions and rendering logic, but there are no tests that actually hit API endpoints. Consider adding a lightweight API test suite (e.g., using `supertest` or bare `fetch` against a test server).
5. **No browser/E2E tests** -- TODO.md lists several E2E items as unchecked. Playwright or similar would close this gap.
6. **No test for the chat streaming pipeline** -- the SSE chat flow is untested at the unit level.

### Process
7. **Run API smoke tests before declaring servers healthy** -- the QA skill relies heavily on curl. In sandboxed environments, consider adding an API health check to the vitest suite (import the Hono app directly and test routes without needing a running server).

## Cleanup

No test artifacts were created during this session (sandbox blocked API calls that would have created test decks/themes/files). No cleanup needed.
