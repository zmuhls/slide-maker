---
name: qa-walkthrough
description: Exhaustive QA testing walkthrough for the slide-maker app. Autonomously probes every API endpoint (happy paths, error paths, edge cases, security checks), automates browser verification via chrome tools, collects verbose diagnostic logs, and surfaces issues with actionable improvement recommendations. Use whenever the user wants to test the app, verify features work, check for regressions, audit API responses, or gather diagnostic information. Also trigger when the user asks to "test search", "check the API", "run QA", "verify deployment", "test locally", "smoke test", or mentions testing any specific feature area like auth, chat, export, themes, search, or admin. Even if the user just says "let's test" or "does it work" in the context of this project, use this skill.
---

# QA Walkthrough for Slide Maker

You are an autonomous QA agent. You do the heavy lifting: hit every endpoint, probe error paths, automate browser checks, capture verbose diagnostics. The user watches, answers questions about visual state when you can't assess it yourself, and reviews your report.

Your job is to surface three things:
1. **Broken behavior** -- endpoints returning wrong data, UI not matching API, features that don't work
2. **Gaps** -- missing validation, undocumented error codes, inconsistent response shapes
3. **Improvement opportunities** -- slow endpoints, confusing API patterns, stale documentation

## Before You Start

### 1. Gather context (run all of these in parallel)

- Read `CLAUDE.md` at project root for the full feature inventory, architecture, known issues
- Read `docs/TODO.md` for current task list (what's done, what's in progress, what's planned)
- Read `.env` for runtime configuration (API keys, ports, passwords)
- Run `git log --oneline -20` to identify recent changes that need verification
- Check if the .env symlink exists: `ls -la apps/api/.env`
- Check if the database file exists: `ls -la apps/api/data/slide-maker.db`

### 2. Verify infrastructure

Run these checks in parallel:

```bash
# Server health
curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/api/health
curl -s -o /dev/null -w "%{http_code}" http://localhost:5173

# .env symlink
readlink apps/api/.env

# Database exists and has tables
ls -la apps/api/data/slide-maker.db

# Node processes running
pgrep -fl "vite|tsx|node.*api" | head -5
```

If the API or web server is down, tell the user to run `pnpm dev`. If the symlink is broken, tell them to run `ln -s ../../.env apps/api/.env`. If the database is missing, `pnpm db:push && pnpm db:seed`.

### 3. Authenticate

Read the `ADMIN_SEED_PASSWORD` from `.env` and authenticate:

```bash
curl -s -c /tmp/sm-qa-cookies.txt -i \
  -X POST http://localhost:3001/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"zmuhlbauer@gc.cuny.edu","password":"<password from .env>"}'
```

Inspect the response headers for session cookie flags (HttpOnly, Secure, SameSite, Path). Log them. Then verify:

```bash
curl -s -b /tmp/sm-qa-cookies.txt http://localhost:3001/api/auth/me | python3 -m json.tool
```

Confirm the user object has: id, email, name, role (should be "admin"), status ("approved").

### 4. Scope the session

Present the user a summary of what's configured and what you'll test. If the user asked about a specific area, focus there but still run the pre-flight. If they said "full QA" or didn't specify, run everything.

Prioritize testing areas touched by recent git commits.

**Scope modes:**
- **Full QA**: all 13 areas, all happy paths, all error paths, security probes, browser checks
- **Focused** (e.g., "test search"): pre-flight + auth, then the specified area exhaustively
- **Smoke test**: pre-flight, auth, one GET per resource type, one deck create+fetch+delete cycle, one search call. Strictly one of each — do not expand scope. No error paths. Report under 100 lines.
- **Regression**: read `git log` + past QA reports, re-test only areas that recently changed or previously failed

### 5. Open the browser

Use chrome browser tools to open `http://localhost:5173` in a new tab. Read the console for any startup errors. This tab will be reused for browser verification throughout the session.

## Curl Pattern

Use this for EVERY API call so output is parseable and timing is captured:

```bash
curl -s -b /tmp/sm-qa-cookies.txt \
  -H 'Origin: http://localhost:5173' \
  -w "\nHTTP_STATUS=%{http_code} TIME=%{time_total}s SIZE=%{size_download}B" \
  [options] <URL> 2>&1
```

For write operations, add: `-X POST -H 'Content-Type: application/json' -d '<body>'`
For header inspection, add: `-i` (but parse separately from JSON body)

**CSRF note:** Hono's CSRF middleware requires the `Origin` header on DELETE requests (and possibly other methods). Always include `-H 'Origin: http://localhost:5173'` on all mutating calls. Without it, DELETE returns 403 "Forbidden" even with a valid session cookie. POST with `Content-Type: application/json` works without Origin, but include it anyway for consistency.

**Output note:** Avoid piping curl output through `python3 -m json.tool` — it swallows the `-w` timing suffix and fails on multi-line output. Use raw output and parse later, or redirect to a file.

## Fallback: When HTTP Tools Are Unavailable

If you are running as a subagent without Bash or WebFetch permission (tool calls denied), you cannot hit the API. In this case:

1. **Run the test suite** as a diagnostic proxy: `npx vitest run` — this exercises shared utilities, module types, export pipeline, SSRF guards, and framework CSS without needing a live server.
2. **Verify infrastructure** by reading files: check `.env` for keys, `apps/api/data/slide-maker.db` for DB existence, `apps/api/.env` symlink.
3. **Check for doc drift** by comparing CLAUDE.md assertions (test count, feature list) against actual file state.
4. **Report what you could and couldn't test**, and recommend the operator run the full QA session directly (not via subagent) for API endpoint coverage.

## Feature Areas

Read `references/endpoint-tests.md` for the complete per-endpoint test matrix with exact payloads, expected responses, and error-path probes. Below is the testing strategy for each area.

### Area 1: Health & Seed Data

**You do:** Hit all four resource endpoints in parallel:
- `GET /api/health` -- expect `{ status: "ok" }`
- `GET /api/templates` -- count templates, verify array structure
- `GET /api/themes` -- count themes (expect 9+ built-in), check each has colors/fonts/css
- `GET /api/artifacts` -- count artifacts, verify each has name/type/description
- `GET /api/providers` -- list available models, compare against .env keys

**Verify:** Template count > 0, theme count >= 9, provider list matches configured keys. If any return empty, the DB needs seeding.

**Browser:** Navigate to login page, read console for errors, take a screenshot.

### Area 2: Authentication & Security

**You do -- happy path:**
- `POST /api/auth/login` with valid admin creds -- verify 200 + session cookie
- `GET /api/auth/me` -- verify user object shape
- `POST /api/auth/logout` -- verify session invalidated
- Re-authenticate for remaining tests

**You do -- error paths:**
- `POST /api/auth/login` with wrong password -- expect 400, verify error message doesn't leak whether email exists
- `POST /api/auth/login` with nonexistent email -- expect 400, verify same generic message
- `POST /api/auth/login` with empty body -- expect 400
- `GET /api/auth/me` without cookie -- expect 401
- `POST /api/auth/register` with non-CUNY email -- expect 400
- `POST /api/auth/register` with short password (< 8 chars) -- expect 400
- `POST /api/auth/register` with duplicate email -- expect 400

**You do -- security checks:**
- Inspect Set-Cookie header flags: HttpOnly, SameSite, Path
- Check CORS headers on a preflight: `curl -s -I -X OPTIONS -H "Origin: http://evil.com" http://localhost:3001/api/auth/me`
- Check CSP headers on the web app: `curl -s -I http://localhost:5173 | grep -i content-security`
- **CSRF consistency check:** Verify whether POST and DELETE both enforce Origin header. Known behavior: Hono's CSRF middleware (`hono/csrf`) blocks DELETE without Origin but allows POST with `Content-Type: application/json`. Test both and log the results.

**Browser:** Navigate to login page, submit with bad credentials, verify error message shown. Then log in with good credentials, verify redirect to dashboard.

### Area 3: Deck CRUD

**You do -- full lifecycle:**
1. `POST /api/decks {"name":"QA Test Deck"}` -- save returned ID and slug
2. `GET /api/decks` -- verify test deck appears in list
3. `GET /api/decks/:id` -- verify full deck object (slides array, access info)
4. `PATCH /api/decks/:id {"name":"QA Updated Deck"}` -- verify name changed
5. Verify slug generation (if name has special chars)

**You do -- error paths:**
- `POST /api/decks {}` (missing name) -- expect 400
- `GET /api/decks/nonexistent-id` -- expect 404
- `PATCH /api/decks/:id` without cookie -- expect 401
- `DELETE /api/decks/:id` -- test at end of session during cleanup

**You do -- sharing sub-system:**
- `GET /api/decks/:id/collaborators` -- verify owner appears
- `GET /api/decks/users/search?q=sm` -- verify user search works (min 2 chars)
- `GET /api/decks/users/search?q=x` -- verify < 2 chars returns empty

**You do -- locking:**
- `POST /api/decks/:id/lock` -- acquire lock, verify response
- `POST /api/decks/:id/lock/heartbeat` -- extend lock
- `DELETE /api/decks/:id/lock` -- release lock

**You do -- presence:**
- `POST /api/decks/:id/presence {"activeSlideId":null}` -- register presence
- `GET /api/decks/:id/presence` -- verify presence list

**Browser:** Navigate to dashboard, verify deck card appears. Click into deck, verify three-panel editor loads. Check that deck title displays correctly.

### Area 4: Slides & Layouts

Using the test deck, create one slide per layout type (all 7):

**You do:** For each layout in `[title-slide, layout-split, layout-content, layout-grid, layout-full-dark, layout-divider, closing-slide]`:
```bash
POST /api/decks/:id/slides {"layout":"<type>"}
```
Verify each returns a slide with id, layout, order. Save all slide IDs.

**You do -- reorder:**
```bash
POST /api/decks/:id/slides/reorder {"order":["<id7>","<id1>","<id3>","<id2>","<id6>","<id5>","<id4>"]}
```
Then `GET /api/decks/:id` and verify order field matches the reorder request.

**You do -- error paths:**
- `POST /api/decks/:id/slides {"layout":"invalid-layout"}` -- check if it's rejected or defaults
- `DELETE /api/decks/:id/slides/:slideId` -- delete one slide, verify remaining slides re-order

**You do -- update:**
- `PATCH /api/decks/:id/slides/:slideId {"splitRatio":"40/60","notes":"Test notes"}` -- verify fields update

**Browser:** In the deck editor, verify carousel shows all slides. Click through each, verify layout structure (which zones appear). Check that slide navigation via carousel works.

### Area 5: Modules (All 14 Types)

Pick a `layout-split` slide (has `content` and `stage` zones).

**You do -- create all 14:** Send a `POST /api/decks/:id/slides/:slideId/blocks` for each type with the test payloads from `references/endpoint-tests.md`. Save all block IDs.

**You do -- update each:**
For each created block, send `PATCH /api/decks/:id/slides/:slideId/blocks/:blockId` with modified data. Verify the response merges correctly (data is shallow-merged with existing).

**You do -- reorder:**
```bash
POST /api/decks/:id/slides/:slideId/blocks/reorder {"order":["<id3>","<id1>","<id2>",...]}
```
Verify order changes persist.

**You do -- zone transfer:**
Move a block from `content` to `stage`:
```bash
PATCH /api/decks/:id/slides/:slideId/blocks/:blockId {"zone":"stage"}
```

**You do -- delete one:**
```bash
DELETE /api/decks/:id/slides/:slideId/blocks/:blockId
```
Verify 200, then GET the deck and verify block is gone.

**You do -- error paths:**
- `POST .../blocks {"type":"nonexistent-type","zone":"content","data":{}}` -- expect 400
- `POST .../blocks {"type":"heading","zone":"content"}` (missing data) -- check if it defaults or errors
- `PATCH .../blocks/:id` on a nonexistent block -- expect 404
- `DELETE .../blocks/:id` on a nonexistent block -- expect 404

**Browser:** Navigate to the slide. Verify each module type renders visually. Toggle edit mode and verify inline editing activates. Check that module order matches what the API returned.

### Area 6: AI Chat

**You do -- provider check:**
- `GET /api/providers` -- list what's available
- Verify at least one model is returned based on .env keys

**You do -- streaming test:**
- `POST /api/chat` with:
  ```json
  {"message":"say hello in exactly 5 words","deckId":"<test_deck_id>","modelId":"<first available model>"}
  ```
- Capture the SSE stream. Log event types, chunk count, total duration.
- Check for `type: "text"` events and `type: "done"` terminator.

**You do -- message persistence:**
- `POST /api/chat/:deckId/messages` with:
  ```json
  {"messages":[{"role":"user","content":"test message"},{"role":"assistant","content":"test response"}]}
  ```
- `GET /api/chat/:deckId/history` -- verify messages appear

**You do -- error paths:**
- `POST /api/chat` with missing deckId -- expect 400
- `POST /api/chat` with missing modelId -- expect 400
- `POST /api/chat` without cookie -- expect 401
- `POST /api/chat/:deckId/messages {"messages":[]}` -- expect 400 (min 1)
- `POST /api/chat/:deckId/messages {"messages":[{"role":"invalid","content":"x"}]}` -- expect 400

**You do -- history management:**
- `DELETE /api/chat/:deckId/history {"confirm":"wrong-id"}` -- expect 400
- `DELETE /api/chat/:deckId/history {"confirm":"<actual_deckId>"}` -- expect 200
- `GET /api/chat/:deckId/history` -- verify empty

**Browser:** Tell the user: "Send a message like 'add a title slide about climate change'. Watch for streaming text, a slide appearing on canvas, and the outline updating. Tell me what you see." Read the browser console for any errors during streaming.

### Area 7: Web Search

**You do -- detect active provider:**
Check .env: if TAVILY_API_KEY is set, Tavily is active. Otherwise if BRAVE_API_KEY is set, Brave is active. Log which one.

**You do -- web search (happy path):**
```bash
POST /api/search {"query":"quantum computing"}
```
Log: provider used (answer != null → Tavily, answer == null → Brave), result count, image count, response time. Verify results have title/url/content fields. Verify images are URL strings.

**Known behavior:** Brave's image search endpoint may return empty for some queries even when web results are fine. The `searchViaBrave()` function fetches web and image results in parallel from separate Brave endpoints. If `images` is empty, that's Brave's image API returning nothing — not a bug in our code. Note it but don't flag as a failure. The frontend also searches Pexels for images separately, so users still get image results.

**You do -- web search (edge cases):**
- Empty query: `POST /api/search {"query":""}` -- expect 400
- Very long query (300+ chars): test if it's handled or truncated
- Special characters: `POST /api/search {"query":"c++ template <vector>"}` -- verify no encoding issues
- Without cookie -- expect 401

**You do -- image search (Pexels):**
```bash
POST /api/search/images {"query":"mountain landscape","perPage":3}
```
Verify response has `images` array with: id, url, thumbnail, alt, photographer, photographerUrl, pexelsUrl.

**You do -- image search (edge cases):**
- `POST /api/search/images {"query":"","perPage":3}` -- expect 400
- `POST /api/search/images {"query":"test","perPage":0}` -- should clamp to 1
- `POST /api/search/images {"query":"test","perPage":99}` -- should clamp to 10
- Query > 200 chars -- expect 400

**You do -- image download:**
Use a real image URL from the Pexels results:
```bash
POST /api/search/download-image {"url":"<pexels_url>","deckId":"<test_deck_id>","filename":"qa-search-test.jpg"}
```
Verify response has file.id, file.url, file.mimeType. Then fetch the file:
```bash
GET /api/decks/:deckId/files/:fileId
```
Verify it returns image data with correct Content-Type.

**You do -- download security probes:**
- Non-HTTP URL: `{"url":"ftp://evil.com/img.jpg",...}` -- expect 400
- Blocked domain: `{"url":"https://pornhub.com/img.jpg",...}` -- expect 403
- SSRF attempt: `{"url":"http://127.0.0.1:3001/api/health",...}` -- expect 400 (SSRF guard)
- SSRF attempt: `{"url":"http://169.254.169.254/latest/meta-data/",...}` -- expect 400
- Missing deckId: `{"url":"https://example.com/img.jpg"}` -- expect 400
- Non-image URL: use a URL that returns HTML -- expect 400 ("not an image")

**Browser:** Tell the user: "Type `/search dolphins` in the chat and hit enter. Watch for the 'Searching the web...' status, results with images and links, and an image auto-inserted into the active slide. Tell me what you see and roughly how long it took."

Read the browser console for any fetch errors or warnings.

### Area 8: File Uploads & Serving

**You do -- upload a test file:**
Create a minimal test image and upload:
```bash
# Generate a 1x1 red PNG (smallest valid PNG)
printf '\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x02\x00\x00\x00\x90wS\xde\x00\x00\x00\x0cIDATx\x9cc\xf8\x0f\x00\x00\x01\x01\x00\x05\x18\xd8N\x00\x00\x00\x00IEND\xaeB`\x82' > /tmp/qa-test.png

curl -s -b /tmp/sm-qa-cookies.txt \
  -F "file=@/tmp/qa-test.png" \
  http://localhost:3001/api/decks/<deckId>/files
```

**You do -- verify upload:**
- Check response has file.id, file.filename, file.mimeType, file.url
- `GET /api/decks/:deckId/files` -- verify file appears in list
- `GET /api/decks/:deckId/files/:fileId` -- verify file serves with correct Content-Type and Cache-Control headers

**You do -- error paths:**
- Upload without file field -- expect 400
- Upload to nonexistent deck -- expect 404
- Upload without auth -- expect 401
- `GET /api/decks/:deckId/files/nonexistent` -- expect 404
- `DELETE /api/decks/:deckId/files/:fileId` -- verify deletion

**You do -- MIME type check:**
Upload a text file and verify MIME detection:
```bash
echo "test content" > /tmp/qa-test.txt
curl -s -b /tmp/sm-qa-cookies.txt -F "file=@/tmp/qa-test.txt" http://localhost:3001/api/decks/<deckId>/files
```

**Browser:** In the Files tab of the resource panel, verify uploaded files appear. Check that image thumbnails render.

### Area 9: Export

**You do -- export the test deck:**
```bash
curl -s -b /tmp/sm-qa-cookies.txt \
  -o /tmp/qa-deck-export.zip \
  -w "HTTP %{http_code} | %{time_total}s | %{size_download}B" \
  -X POST http://localhost:3001/api/decks/<deckId>/export
```

**You do -- validate ZIP structure:**
```bash
unzip -l /tmp/qa-deck-export.zip
```
Expected files: `index.html`, `css/styles.css`, `js/engine.js`. If the deck has uploaded images, expect `assets/` directory. If it has native artifacts, expect `js/artifacts.js`.

**You do -- validate HTML:**
```bash
unzip -p /tmp/qa-deck-export.zip index.html | head -100
```
Check for: proper HTML5 doctype, `<section>` elements for each slide, layout classes matching the slide layouts, CSS link, JS script tags.

**You do -- validate CSS:**
```bash
unzip -p /tmp/qa-deck-export.zip css/styles.css | wc -l
```
Should be non-empty. Check it contains layout classes (.layout-split, .layout-content, etc.).

**You do -- validate asset rewriting:**
If the deck has uploaded images, check that `index.html` references them via `assets/` paths, not `/api/decks/` paths.

**You do -- error paths:**
- `POST /api/decks/nonexistent/export` -- expect 404
- `POST /api/decks/:id/export` without auth -- expect 401

**Browser:** Open the exported HTML file in the browser (or offer to open it for the user). If chrome tools are available, navigate to `file:///tmp/qa-deck-export/index.html` and verify it renders.

### Area 10: Themes

**You do -- list and inspect:**
- `GET /api/themes` -- count total themes, identify built-in vs custom
- Verify each theme has: id, name, colors (object), fonts (object), css (string), builtIn (boolean)

**You do -- create a custom theme:**
```bash
POST /api/themes {
  "name":"QA Test Theme",
  "colors":{"primary":"#ff6600","secondary":"#003366","background":"#ffffff","text":"#111111","accent":"#00cc99"},
  "fonts":{"heading":"Georgia","body":"Verdana"}
}
```
Verify response has the theme with generated CSS containing custom properties.

**You do -- validation probes:**
- Invalid color (not hex): `{"name":"Bad","colors":{"primary":"red"}}` -- expect 400
- Invalid font (special chars): `{"name":"Bad","fonts":{"heading":"<script>"}}` -- expect 400
- Missing name: `{"colors":{"primary":"#fff"}}` -- expect 400
- Empty name: `{"name":""}` -- check behavior

**You do -- deletion:**
- `DELETE /api/themes/:id` (custom theme) -- expect 200
- `DELETE /api/themes/:id` (built-in theme) -- expect 403
- `GET /api/themes` -- verify custom theme is gone, built-ins remain

**Browser:** In the Themes tab, switch between themes. Verify the canvas re-renders with new colors and fonts. Check that the custom theme appears in the list before deletion.

### Area 11: Admin Dashboard

**You do -- stats and users:**
- `GET /api/admin/users/all` -- verify response has `users` array and `stats` object
- Check stats shape: totalUsers, pendingApproval, totalDecks, totalTokens
- Check each user has: id, name, email, role, status, deckCount, tokensUsed, lastActive, tokenCap

**You do -- user detail:**
- Pick a user ID from the list
- `GET /api/admin/users/:id/usage` -- verify token usage breakdown (monthly, byModel, totalUsed, remaining, tokenCap)

**You do -- user management (read-only probes):**
- `PATCH /api/admin/users/:id {"tokenCap":999999}` -- verify cap updates (then restore original)
- `PATCH /api/admin/users/:id {"role":"invalid"}` -- expect 400

**You do -- error paths:**
- All admin endpoints without cookie -- expect 401
- All admin endpoints with a non-admin user cookie (if available) -- expect 403
- `GET /api/admin/users/nonexistent/usage` -- expect 404

**Browser:** Navigate to `/admin`. Verify stats cards display real numbers. Verify user table populates with sortable columns. If chrome tools are available, check the table renders all users.

### Area 12: Preview

**You do:**
- `GET /api/decks/:id/preview` -- verify returns HTML
- Check response Content-Type is text/html
- Inspect HTML for: slide sections, framework CSS, artifact references

**Browser:** Open `http://localhost:3001/api/decks/:id/preview` in a new tab. Verify slides render with navigation.

### Area 13: Cross-Cutting Concerns

**You do -- response time audit:**
Review all logged response times. Flag anything:
- > 500ms for simple GETs (templates, themes, artifacts)
- > 1s for deck/slide operations
- > 3s for chat, search, or export

**You do -- response shape consistency:**
Review all logged responses. Flag:
- Endpoints that wrap data differently (some use `{ decks: [...] }`, some return bare objects)
- Missing fields compared to CLAUDE.md documentation
- Unexpected null values

**You do -- documentation drift:**
Compare actual API behavior against what CLAUDE.md documents. Flag any discrepancies:
- Endpoints that exist in code but aren't documented
- Documented behavior that doesn't match reality
- Response shapes that differ from documentation

**You do -- recent changes verification:**
Based on the `git log -20` output from step 1, verify that recently-changed features still work. If the last few commits touched search, focus extra testing there. If they touched export, validate the ZIP more thoroughly.

## Report

After completing testing, generate a structured report and save to `docs/qa-reports/YYYY-MM-DD-qa-report.md` (create the directory if needed).

Report structure:

```markdown
# QA Report -- YYYY-MM-DD HH:MM

## Environment
- API: http://localhost:{port} -- {status}
- Web: http://localhost:{port} -- {status}
- AI providers: {list with status}
- Search: {brave|tavily|none} (key: {present|missing})
- Image search: pexels (key: {present|missing})
- Database: {seeded/empty, file size}
- Git branch: {branch}, last commit: {hash} {message}

## Summary
- {N} endpoints tested, {P} passed, {F} failed, {W} warnings
- {T} total API calls made, average response time: {avg}ms
- Priority issues: {count}

## Priority Issues
{Top issues that need immediate attention, with reproduction steps}

## Results by Area

### Area {N}: {Name}
**Endpoints tested:** {count}
**Status:** {pass/fail/partial}

| Endpoint | Status | Time | Notes |
|----------|--------|------|-------|
| GET /api/... | 200 | 45ms | OK |
| POST /api/... | 400 | 12ms | Expected (error path) |

{Details for any failures or warnings}

## Security Audit
- Cookie flags: {details}
- CORS: {details}
- CSP: {details}
- SSRF guards: {tested/passed/failed}
- Input validation: {summary of edge case testing}

## Response Time Summary
| Endpoint Category | Avg | Max | Slow? |
|-------------------|-----|-----|-------|
| Resource GETs | {ms} | {ms} | {yes/no} |
| Deck operations | {ms} | {ms} | {yes/no} |
| Search | {ms} | {ms} | {yes/no} |

## Documentation Drift
{Any discrepancies between CLAUDE.md and actual behavior}

## Improvement Suggestions
{Actionable recommendations:}
- API: {response shape inconsistencies, missing validation, etc.}
- Performance: {slow endpoints, optimization opportunities}
- Security: {any gaps found}
- UX: {issues spotted in browser}
- Docs: {what needs updating in CLAUDE.md}

## Verbose Diagnostics
{Full request/response data for any failures, organized by area}
```

## Cleanup

After the session, offer to:
1. Delete the QA test deck and all its slides/blocks/files
2. Delete the custom test theme
3. Remove temporary files (/tmp/sm-qa-*, /tmp/qa-*)
4. Restore any admin user settings you changed during testing

The user may want to keep the test deck for further investigation -- ask first.
