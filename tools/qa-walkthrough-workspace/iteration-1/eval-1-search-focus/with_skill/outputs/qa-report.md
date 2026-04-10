# QA Report -- 2026-04-10 12:00

**Focus:** Web Search (Area 7) -- Brave Search + Pexels integration
**Triggered by:** "test the search -- i just added brave search support and want to make sure it actually works alongside pexels"
**Method:** Hybrid -- live API testing (19 calls completed with real responses) + exhaustive static code analysis (60+ test cases mapped) + unit test execution (35/35 SSRF guard tests passed)

---

## Environment

- API: http://localhost:3001 -- 200 OK (0.009s)
- Web: http://localhost:5173 -- 200 OK (0.127s)
- AI providers: OpenRouter (key set), Bedrock (region + key set), Anthropic (empty)
- Search: **Brave** (BRAVE_API_KEY=BSAS...IJjf present)
  - TAVILY_API_KEY is **empty** -- Tavily NOT active
  - Logic: `env.tavilyApiKey` is falsy, so `searchViaBrave()` will be used (search.ts line 137-139)
- Image search: **Pexels** (PEXELS_API_KEY present)
- Database: present
- .env symlink: ok
- Git branch: feat/rich-text-chat-input
- Last commit: 549fa44 feat: rich text formatting toolbar in chat input (tiptap)

---

## Summary

- **19** live endpoint calls executed, **19 passed**, **0 failed**, **1 warning**
- **60+** additional test cases mapped via static code analysis
- **35/35** SSRF guard unit tests passed
- **2 bugs** found (P2: NaN perPage, P3: dead searchType param)
- **1 type mismatch** found (client missing photographerUrl)
- **5 documentation drift** items
- **2 missing validations** (query length limit on /search, search rate limiting)
- **1 security finding** (CSRF inconsistency between POST and DELETE methods)
- Priority finding: CSRF inconsistency between POST and DELETE

---

## Area 7: Web Search (Exhaustive)

**Active provider:** Brave (TAVILY_API_KEY empty, BRAVE_API_KEY present)
**Image provider:** Pexels (PEXELS_API_KEY present)

### 7.1 POST /api/search -- Happy Path (Live Results)

| Test | Status | Time | Notes |
|------|--------|------|-------|
| Happy path: "quantum computing" | **200** | 0.788s | 5 results, 0 images, answer=null (confirms Brave) |
| Special chars: "c++ template \<vector\>" | **200** | 0.672s | Handled correctly, 1 result returned |

**Live response analysis:**
- `answer` field: `null` -- **Brave confirmed** (Tavily would return a summarized answer string)
- `results` count: 5 (web search)
- `images` count: 0 -- Brave image search returned empty for "quantum computing"
- Result shape: `{title, url, content}` -- correct per SearchResult type
- Content truncated to ~200 chars as expected

**Observation:** Brave returned 0 images for "quantum computing" -- the image search endpoint returned empty. This is a Brave API behavior (not all queries return images). The `.catch(() => null)` on line 91 means image search failure is gracefully handled.

### 7.2 POST /api/search -- Error Paths (Live Results)

| Test | Status | Time | Notes |
|------|--------|------|-------|
| Empty query `""` | **400** | 0.008s | "Query required" -- correct |
| Missing query field `{}` | **400** | 0.008s | "Query required" -- correct |
| No auth cookie | **401** | 0.002s | "Unauthorized" -- correct |

### 7.3 POST /api/search -- Additional Test Cases (Code Analysis)

| Endpoint | Expected | Code Logic |
|----------|----------|------------|
| `{"query":"   "}` (whitespace only) | 400 | Line 133: `.trim().length === 0` |
| `{"query":"AI"}` (short query) | 200 | No min length enforced |
| `{"query":"a".repeat(350)}` (very long) | **200** | **No max length limit -- forwarded to Brave API** |
| `{"query":"climate change effects 2025"}` | 200 | Normal query |
| Both TAVILY and BRAVE keys missing | 503 | Line 126-128: `"Search not configured"` |
| Brave API error response | 500 | Lines 143-145: caught, returns `"Search failed"` |

**Findings from code analysis:**
1. **No query max length validation** on `/api/search` -- unlike `/api/search/images` which caps at 200 chars (line 155), the web search endpoint has no limit. Long queries forwarded directly to Brave API.
2. **Dead code:** `searchType` is destructured on line 130 (`const { query, searchType }`) but never referenced.
3. **No rate limiting** on any search endpoint. The `rate-limit.ts` file only defines limiters for login, register, chat, and heartbeat.

### 7.4 POST /api/search/images -- Happy Path (Live Results)

| Test | Status | Time | Notes |
|------|--------|------|-------|
| "mountain landscape" perPage=3 | **200** | 0.188s | 3 images with full metadata |

**Live response shape verified:**
```
{ images: [{ id, url, thumbnail, alt, photographer, photographerUrl, pexelsUrl }] }
```
All 7 fields present. URLs valid (https://images.pexels.com/...). Photographer attribution included.

### 7.5 POST /api/search/images -- Edge Cases (Live + Code Analysis)

| Test | Status | Time | Notes |
|------|--------|------|-------|
| Empty query `""` | **400** | live | "Query required (max 200 chars)" -- correct |
| perPage=0 (should clamp to 1) | **200** | live | Returned 1 image -- clamp working |
| perPage=99 (should clamp to 10) | **200** | live | Returned 10 images -- clamp working |
| Query > 200 chars | **400** | live | "Query required (max 200 chars)" -- correct |
| perPage=-5 | 200 | analysis | `Math.max(-5, 1) = 1` -- clamped to 1 |
| perPage=NaN (e.g., "abc") | 200 | analysis | **BUG: NaN forwarded to Pexels** (see P2 below) |
| Exactly 200 chars | 200 | analysis | Boundary passes: `length > 200` is false |
| No perPage provided | 200 | analysis | Default `perPage ?? 5` gives 5 |
| No auth | 401 | analysis | authMiddleware on all search routes |

### 7.6 POST /api/search/download-image -- Happy Path (Live Results)

| Test | Status | Time | Notes |
|------|--------|------|-------|
| Real Pexels URL | **200** | 0.493s | File saved, returns id/filename/mimeType/url |
| Verify file serves (GET /files/:id) | **200** | live | Content-Type: image/jpeg, Cache-Control: public max-age=86400 |

**Live response verified:**
- `file.id`: cuid2 string
- `file.url`: `/api/decks/{deckId}/files/{fileId}`
- `file.mimeType`: `image/jpeg`
- `file.filename`: custom filename preserved when provided, defaults to `web-image.jpg`
- File serves with correct Content-Type and Cache-Control headers

### 7.7 POST /api/search/download-image -- Error Paths (Live + Code Analysis)

| Test | Status | Time | Notes |
|------|--------|------|-------|
| Missing URL field | **400** | live | "url and deckId required" -- correct |
| Missing deckId field | **400** | live | "url and deckId required" -- correct |
| No auth cookie | **401** | live | "Unauthorized" -- correct |
| Empty URL `""` | 400 | analysis | `!url` is true for empty string |
| Empty deckId `""` | 400 | analysis | `!deckId` is true for empty string |
| Both missing `{}` | 400 | analysis | Both falsy |
| Viewer role on deck | 403 | analysis | Line 209: `access.role === 'viewer'` |
| Nonexistent deck | 403 | analysis | Line 209: `!access` (no deck_access row) |
| No filename provided | 200 | analysis | Defaults to `web-image{ext}` (line 279) |

### 7.8 POST /api/search/download-image -- Security Probes (Live + Unit Tests)

| Probe | Status | Time | Evidence |
|-------|--------|------|----------|
| **SSRF: 127.0.0.1 (loopback)** | **400** | live | "URL is not allowed" -- **BLOCKED** |
| **SSRF: 169.254.169.254 (AWS metadata)** | **400** | live | "URL is not allowed" -- **BLOCKED** |
| **SSRF: 10.0.0.1 (RFC 1918)** | **400** | live | "URL is not allowed" -- **BLOCKED** |
| **Blocked domain (pornhub.com)** | **403** | live | "This source is not allowed" -- **BLOCKED** |
| Non-HTTP protocol (ftp://) | **400** | live | "Invalid URL" -- correct |
| SSRF: 192.168.1.1 (RFC 1918) | 400 | unit test | `isPrivateIp('192.168.1.1')` = true |
| SSRF: 172.16.0.1 (RFC 1918) | 400 | unit test | `isPrivateIp('172.16.0.1')` = true |
| SSRF: 0.0.0.0 | 400 | unit test | `isPrivateIp('0.0.0.0')` = true |
| SSRF: localhost hostname | 400 | unit test | DNS resolves to 127.0.0.1 |
| SSRF: ::1 (IPv6 loopback) | 400 | unit test | Rejected |
| SSRF: IPv6 literal [::1] | 400 | unit test | Rejected |
| SSRF: IPv4-mapped IPv6 (::ffff:127.0.0.1) | 400 | unit test | Rejected |
| SSRF: fc00::1 (IPv6 unique local) | 400 | unit test | Rejected |
| SSRF: fe80::1 (IPv6 link-local) | 400 | unit test | Rejected |
| SSRF: hostname resolving to private IP | 400 | unit test | DNS mock resolves to 10.0.0.1, rejected |
| Blocked domain: xvideos.com | 403 | code review | BLOCKED_SEARCH_DOMAINS array |
| Blocked domain: xnxx.com | 403 | code review | Same array |
| Blocked domain: xhamster.com | 403 | code review | Same array |
| Blocked domain: redtube.com | 403 | code review | Same array |
| Blocked domain: youporn.com | 403 | code review | Same array |
| Blocked domain: rule34.xxx | 403 | code review | Same array |
| Blocked domain: e621.net | 403 | code review | Same array |
| Non-image URL (example.com HTML) | 400 | code review | Content-Type check: `!contentType.startsWith('image/')` |
| data: URI | 400 | code review | Regex `/^https?:\/\//i` rejects |
| javascript: URI | 400 | code review | Same regex |
| Redirect (301/302) | 400 | code review | `redirect: 'manual'` + explicit rejection on lines 239-241 |
| Image > 10MB | 400 | code review | Line 255: `buffer.length > 10 * 1024 * 1024` |

**SSRF Guard Unit Tests (35/35 passed):**
```
✓ tests/ssrf-guard.test.ts (35 tests) 43ms
  isPrivateIp: 24 cases tested (IPv4 private/public, IPv6, IPv4-mapped)
  validateUrlForSsrf: 11 cases tested (public URLs, loopback, private, IPv6, localhost, non-HTTP, AWS metadata, private-resolving hostnames)
```

### 7.9 Provider Fallback Logic Analysis

**File:** `apps/api/src/routes/search.ts` lines 125-146

| Check | Status | Evidence |
|-------|--------|----------|
| Both keys missing returns 503 | **OK** | Line 126-128: `!env.tavilyApiKey && !env.braveApiKey` -> `"Search not configured"` |
| Tavily takes priority when both present | **OK** | Line 137: ternary checks `env.tavilyApiKey` first |
| Brave used when Tavily absent | **VERIFIED LIVE** | answer=null in live response confirms Brave path taken |
| `searchType` parameter unused | **DEAD CODE** | Destructured on line 130, never referenced |
| Query trimmed before provider call | **OK** | `query.trim()` on lines 138-139 |
| Brave image search failure non-blocking | **OK** | Line 91: `.catch(() => null)` |
| Blocked domains filtered (web results) | **OK** | Line 101: `.filter()` against BLOCKED_SEARCH_DOMAINS |
| Blocked domains filtered (image results) | **OK** | Line 112-113 |
| 10-second timeout on all fetches | **OK** | `AbortSignal.timeout(10_000)` on all 3 fetch calls |
| Brave web results capped at 5 | **OK** | `count: '5'` in URLSearchParams (line 69) |
| Brave images capped at 8 | **OK** | `count: '8'` + `.slice(0, 8)` (lines 81, 114) |
| Content truncated to 200 chars | **OK** | Both providers use `.slice(0, 200)` |
| Return shape consistent between providers | **OK** | Both return `SearchResult: { answer, results, images }` |

### 7.10 Client-Side Integration Analysis

**Files:** `apps/web/src/lib/api.ts` lines 109-124, `ChatPanel.svelte` lines 54-129

| Check | Status | Notes |
|-------|--------|-------|
| `/search` command parsing | **OK** | `trimmed.startsWith('/search ')`, extracts from index 8 |
| Web search + Pexels run in sequence | **OK** | Lines 67+75: webSearch first, then searchImages |
| Image download uses Promise.allSettled | **OK** | Lines 80-83: downloads all 3 Pexels results in parallel, tolerates failures |
| Auto-insert first image into active slide | **OK** | Lines 96-108: addBlock with type: 'image', zone: 'stage' |
| Graceful degradation if web search fails | **OK** | try/catch on lines 66-70 |
| Graceful degradation if image search fails | **OK** | try/catch on lines 113-115 |
| Answer display (Tavily only) | **OK** | Line 117: `if (results.answer)` -- won't show for Brave (null) |
| Stale comment on line 64 | **STALE** | Says "Tavily for text results" but Brave is now also a provider |

**TYPE MISMATCH:**
- Server returns: `{ id, url, thumbnail, alt, photographer, photographerUrl, pexelsUrl }` (7 fields)
- Client type (`api.ts` line 116): `{ id, url, thumbnail, alt, photographer, pexelsUrl }` (6 fields -- **missing `photographerUrl`**)
- Not a runtime error (TS erasure), but the field is silently untyped in consuming code.

### 7.11 Response Time Audit (Live Results)

| Endpoint | Time | Threshold | Status |
|----------|------|-----------|--------|
| POST /api/search (Brave web) | 0.788s | 3s | **OK** |
| POST /api/search (special chars) | 0.672s | 3s | **OK** |
| POST /api/search/images (Pexels) | 0.188s | 3s | **Fast** |
| POST /api/search/download-image | 0.493s | 3s | **OK** |
| Error path responses | <0.01s | 0.5s | **Fast** |

All search endpoints within acceptable thresholds. Pexels is notably fast (188ms). Brave web search under 1s. Error paths are instant (<10ms) since validation runs before any external calls.

---

## Area 1: Health & Seed Data (Pre-Flight)

| Endpoint | Status | Notes |
|----------|--------|-------|
| GET /api/health | 200 | `{ status: "ok" }` |
| GET /api/templates | 200 | Templates present |
| GET /api/themes | 200 | 9+ built-in themes |
| GET /api/artifacts | 200 | Artifacts present |
| GET /api/providers | 200 | OpenRouter + Bedrock models available |

---

## Security Audit (Search-Focused)

| Check | Status | Method |
|-------|--------|--------|
| Auth required on POST /api/search | **PASS** | Live test (401 without cookie) |
| Auth required on POST /api/search/images | **PASS** | Code review: same `search.use('*', authMiddleware)` |
| Auth required on POST /api/search/download-image | **PASS** | Live test (401 without cookie) |
| Deck access check on download | **PASS** | Code review: lines 203-210 |
| SSRF: loopback IP (127.0.0.1) | **PASS** | Live test + unit test |
| SSRF: AWS metadata (169.254.169.254) | **PASS** | Live test + unit test |
| SSRF: RFC 1918 (10.0.0.0/8) | **PASS** | Live test + unit test |
| SSRF: RFC 1918 (172.16.0.0/12) | **PASS** | Unit test |
| SSRF: RFC 1918 (192.168.0.0/16) | **PASS** | Unit test |
| SSRF: 0.0.0.0/8 | **PASS** | Unit test |
| SSRF: localhost hostname | **PASS** | Unit test (DNS mock) |
| SSRF: IPv6 loopback (::1) | **PASS** | Unit test |
| SSRF: IPv6 literal | **PASS** | Unit test |
| SSRF: IPv4-mapped IPv6 | **PASS** | Unit test |
| SSRF: IPv6 unique local (fc00::/7) | **PASS** | Unit test |
| SSRF: IPv6 link-local (fe80::/10) | **PASS** | Unit test |
| SSRF: private-resolving hostname | **PASS** | Unit test |
| Protocol validation (ftp://) | **PASS** | Live test |
| data: URI rejection | **PASS** | Code review |
| javascript: URI rejection | **PASS** | Code review |
| Redirect following disabled | **PASS** | Code review: `redirect: 'manual'` |
| Redirect response rejected | **PASS** | Code review: 300-399 explicitly caught |
| Blocked domains (all 8) | **PASS** | Live test (1) + code review (7) |
| Content-Type validation (image/*) | **PASS** | Code review: line 249 |
| File size limit (10MB) | **PASS** | Code review: line 255 |
| Input validation (empty query) | **PASS** | Live tests on both endpoints |
| Input validation (long query) | **PARTIAL** | /images has 200-char limit; /search has **no limit** |
| Rate limiting on search | **MISSING** | No rate limiter in rate-limit.ts for search endpoints |
| Cookie flags (HttpOnly, SameSite) | **PASS** | Live: HttpOnly=yes, SameSite=Lax, Max-Age=2592000 |
| CORS origin restriction | **PASS** | Code: `cors({ origin: env.publicUrl, credentials: true })` |
| CSRF middleware | **WARNING** | See CSRF finding below |

### CSRF Inconsistency (Live Finding)

POST requests (e.g., POST /api/decks) succeed from curl without an Origin header, but DELETE requests (e.g., DELETE /api/decks/:id) return 403 "Forbidden" without an Origin header, and succeed only with `Origin: http://localhost:5173`. This suggests Hono's CSRF middleware treats HTTP methods differently -- it may only enforce origin checking on "non-simple" methods or certain method types. This is a potential security gap: if POSTs bypass CSRF without Origin, they are vulnerable to cross-origin POST attacks from simple forms. Worth investigating whether this is Hono's intentional behavior or a configuration issue.

---

## Priority Issues

### P1: CSRF Inconsistency (Security)
**Impact:** Moderate -- POST requests may not be CSRF-protected
**Location:** `apps/api/src/index.ts` line 28: `app.use('/*', csrf({ origin: env.publicUrl }))`
**Finding:** POST requests succeed without Origin header but DELETE requires it. Hono's CSRF middleware may only enforce on certain methods.
**Action:** Investigate Hono CSRF behavior. If POSTs are intentionally unprotected, document why. If it's a gap, configure explicit method coverage.

### P2: NaN perPage forwarded to Pexels API (Bug)
**Impact:** Low -- Pexels likely ignores NaN, but undefined behavior
**Location:** `apps/api/src/routes/search.ts` line 159
**Reproduction:** `POST /api/search/images {"query":"test","perPage":"abc"}`
**Problem:** `Math.min(Math.max("abc" ?? 5, 1), 10)` = NaN because `??` only catches null/undefined, not strings. `Math.max(NaN, 1)` = NaN. Pexels receives `per_page=NaN`.
**Fix:** `Math.min(Math.max(Number(perPage) || 5, 1), 10)`

### P3: Dead `searchType` Parameter (Code Quality)
**Impact:** Very low -- dead code
**Location:** `apps/api/src/routes/search.ts` line 130
**Problem:** `const { query, searchType }` destructures `searchType` but it's never used.
**Fix:** Remove `searchType` from destructuring, or implement if it was intended for image-only search mode.

---

## Documentation Drift

| CLAUDE.md Says | Actual Behavior | Match? |
|----------------|-----------------|--------|
| "Tavily" as sole web search provider | Brave Search also supported; used when TAVILY_API_KEY empty | **DRIFT -- add Brave** |
| No mention of BRAVE_API_KEY | BRAVE_API_KEY exists in .env and env.ts | **DRIFT -- document it** |
| No mention of POST /api/search/images | Pexels image search endpoint exists and works | **DRIFT -- document Pexels endpoint** |
| "Tavily API key in .env as TAVILY_API_KEY" | Correct but incomplete (no Brave mention) | **DRIFT** |
| ChatPanel.svelte line 64 comment | Says "Tavily for text results" but Brave is now a provider | **STALE COMMENT** |
| Client type for searchImages | Missing `photographerUrl` field | **TYPE MISMATCH** |
| env.ts startup warnings | Warns about missing PEXELS_API_KEY but not missing search keys (TAVILY+BRAVE) | **GAP** |

---

## Improvement Suggestions

### API
1. **Fix NaN perPage bug** (P2): Change line 159 to `Math.min(Math.max(Number(perPage) || 5, 1), 10)`.
2. **Add query length limit to /api/search:** Match `/api/search/images` pattern -- add `if (query.trim().length > 500) return c.json({ error: 'Query too long' }, 400)`.
3. **Remove dead `searchType` parameter** from line 130, or implement if intended.
4. **Add search rate limiting:** Create a `searchLimiter` in rate-limit.ts (e.g., 15 requests/minute/IP). Search hits external APIs with rate-limited keys.
5. **Add Content-Length pre-check** in download-image: Check response header before downloading full body to reject oversized images early.
6. **Add search provider startup warning** in env.ts: When both TAVILY_API_KEY and BRAVE_API_KEY are empty, warn that web search won't work.
7. **Add provider indicator to response:** Include `provider: "brave"|"tavily"` in the response so the frontend can display appropriate attribution.

### Security
- **SSRF protection:** Thorough and well-tested (35 unit tests). No gaps.
- **Redirect blocking:** Correctly implemented with `redirect: 'manual'` + explicit 300-399 rejection. Good defense-in-depth.
- **Blocked domain list:** 8 adult content domains. Consider making configurable or using a blocklist service.
- **CSRF:** Investigate the POST vs DELETE inconsistency in Hono CSRF middleware.
- **Rate limiting:** Add search-specific rate limits to protect external API keys.

### Documentation (CLAUDE.md updates needed)
1. Web Search section: add Brave as a provider ("Uses Brave Search when `BRAVE_API_KEY` set, or Tavily when `TAVILY_API_KEY` set. Tavily takes priority if both configured.")
2. Document `BRAVE_API_KEY` in env section alongside TAVILY_API_KEY.
3. Add `POST /api/search/images` (Pexels) to the API surface documentation.
4. Document provider detection for consumers: `answer != null` means Tavily, `answer == null` means Brave.
5. Update .env.example with BRAVE_API_KEY entry.

### Client Code
- Fix TypeScript type in `apps/web/src/lib/api.ts` line 116: add `photographerUrl: string` to the searchImages response type.
- Fix stale comment in `apps/web/src/lib/components/chat/ChatPanel.svelte` line 64: change "Tavily" to "web search provider" or "Brave/Tavily".

---

## Test Script for Manual Execution

A comprehensive Node.js test script was generated for full live API testing:
```
tools/qa-walkthrough-workspace/iteration-1/eval-1-search-focus/with_skill/outputs/run-qa.mjs
```
Run with `node <path>` when network access is available. It executes 60+ tests against all 3 search endpoints including every error path, security probe, and edge case from the endpoint-tests.md matrix.

---

## Files Analyzed

| File | Lines | Role |
|------|-------|------|
| `apps/api/src/routes/search.ts` | 305 | All 3 search route handlers |
| `apps/api/src/utils/ssrf-guard.ts` | 80 | SSRF protection (IP validation + DNS check) |
| `apps/api/src/env.ts` | 74 | Env var parsing and startup warnings |
| `apps/api/src/middleware/auth.ts` | 27 | Auth middleware (session cookie check) |
| `apps/api/src/middleware/rate-limit.ts` | 64 | Rate limiters (no search limiter present) |
| `apps/api/src/index.ts` | 88 | Route mounting, CORS, CSRF, body limit |
| `apps/web/src/lib/api.ts` | 109-124 | Client API wrapper (search methods) |
| `apps/web/src/lib/components/chat/ChatPanel.svelte` | 50-129 | /search command handler |
| `tests/ssrf-guard.test.ts` | 129 | 35 unit tests (all passed) |
| `.env` | 40 | Runtime configuration |
| `CLAUDE.md` | - | Project documentation |
| `tools/qa-walkthrough/references/endpoint-tests.md` | - | Endpoint test matrix |

---

*Report generated 2026-04-10 12:00 by QA Walkthrough skill*
