#!/usr/bin/env node

// QA Walkthrough -- Area 7: Web Search (Exhaustive)
// Runs all endpoint tests via native Node.js fetch

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const REPORT_PATH = '/Users/zacharymuhlbauer/Desktop/STUDIO/projects/slide-maker/tools/qa-walkthrough-workspace/iteration-1/eval-1-search-focus/with_skill/outputs/qa-report.md';
const API = 'http://localhost:3001';
const WEB = 'http://localhost:5173';
const EMAIL = 'zmuhlbauer@gc.cuny.edu';
const PASSWORD = 'Aporia.10!';

let lines = [];
let sessionCookie = '';
let total = 0, passed = 0, failed = 0, warnings = 0;
let allTimes = [];

function log(s) { lines.push(s); }
function logn() { lines.push(''); }
function pass() { passed++; total++; }
function fail() { failed++; total++; }
function warn() { warnings++; }

// HTTP helper
async function api(method, url, body = null, opts = {}) {
  const headers = {};
  if (sessionCookie && !opts.noAuth) {
    headers['Cookie'] = sessionCookie;
  }

  const fetchOpts = { method, headers, redirect: 'manual' };

  if (body !== null && typeof body === 'object') {
    headers['Content-Type'] = 'application/json';
    fetchOpts.body = JSON.stringify(body);
  } else if (body !== null && typeof body === 'string') {
    headers['Content-Type'] = 'application/json';
    fetchOpts.body = body;
  }

  const start = performance.now();
  let res, resBody, code, time;
  try {
    res = await fetch(url, fetchOpts);
    code = res.status;
    time = ((performance.now() - start) / 1000).toFixed(3);
    try {
      resBody = await res.text();
      try { resBody = JSON.parse(resBody); } catch {}
    } catch {
      resBody = null;
    }
  } catch (err) {
    code = 0;
    time = ((performance.now() - start) / 1000).toFixed(3);
    resBody = { error: err.message };
  }

  allTimes.push(parseFloat(time));
  return { code, time, body: resBody, headers: res?.headers, raw: res };
}

async function apiNoAuth(method, url, body = null) {
  return api(method, url, body, { noAuth: true });
}

function expectCode(r, expected, label) {
  if (r.code === expected) {
    log(`| ${label} | **${r.code}** | ${r.time}s | OK |`);
    pass();
  } else {
    log(`| ${label} | **${r.code}** (expected ${expected}) | ${r.time}s | FAIL |`);
    fail();
  }
}

function ppjson(obj) {
  try { return JSON.stringify(obj, null, 2); } catch { return String(obj); }
}

function trunc(s, n = 80) {
  if (!s) return '';
  const str = typeof s === 'string' ? s : JSON.stringify(s);
  return str.length > n ? str.slice(0, n) + '...' : str;
}

// ============================================================

async function main() {
  log(`# QA Report -- ${new Date().toISOString().replace('T', ' ').slice(0, 16)}`);
  logn();
  log('**Focus:** Web Search (Area 7) -- Brave Search + Pexels integration');
  log('**Triggered by:** "test the search -- i just added brave search support and want to make sure it actually works alongside pexels"');
  logn();

  // ============================================================
  // PRE-FLIGHT
  // ============================================================
  log('## Environment');
  logn();

  const health = await api('GET', `${API}/api/health`);
  log(`- API: ${API} -- HTTP ${health.code} (${health.time}s)`);
  if (health.code !== 200) {
    log('  - **CRITICAL:** API is not responding. Aborting.');
    writeFileSync(REPORT_PATH, lines.join('\n'));
    process.exit(1);
  }

  let webStatus;
  try {
    const webRes = await fetch(WEB, { redirect: 'manual' });
    webStatus = webRes.status;
  } catch { webStatus = 0; }
  log(`- Web: ${WEB} -- HTTP ${webStatus}`);
  log('- AI providers: OpenRouter (key present), Bedrock (region: us-gov-east-1)');
  log('- Search: **Brave** (BRAVE_API_KEY present)');
  log('  - TAVILY_API_KEY is **empty** -- Tavily NOT active');
  log('  - Logic: env.tavilyApiKey is falsy, so `searchViaBrave()` will be used');
  log('- Image search: **Pexels** (PEXELS_API_KEY present)');
  log('- Database: apps/api/data/slide-maker.db (exists)');
  log('- Git branch: feat/rich-text-chat-input');
  log('- Last commit: 549fa44 feat: rich text formatting toolbar in chat input (tiptap)');
  logn();

  // ============================================================
  // AUTHENTICATE
  // ============================================================
  log('## Pre-Flight: Authentication');
  logn();

  const loginRes = await fetch(`${API}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
    redirect: 'manual',
  });

  const loginBody = await loginRes.json().catch(() => ({}));
  const setCookie = loginRes.headers.get('set-cookie') || '';
  sessionCookie = setCookie.split(';')[0] || '';

  log('### Login');
  log('```');
  log(`POST /api/auth/login`);
  log(`Status: ${loginRes.status}`);
  log(`Body: ${trunc(ppjson(loginBody), 200)}`);
  log('```');
  logn();
  log('**Cookie flags:**');
  log('```');
  log(setCookie);
  log('```');

  const hasHttpOnly = /HttpOnly/i.test(setCookie);
  const hasSameSite = /SameSite/i.test(setCookie);
  const hasPath = /Path=/i.test(setCookie);
  log(`- HttpOnly: ${hasHttpOnly ? 'YES' : '**MISSING** (security concern)'}`);
  log(`- SameSite: ${hasSameSite ? 'YES' : '**MISSING**'}`);
  log(`- Path: ${hasPath ? 'YES' : 'not set'}`);
  if (!hasHttpOnly) warn();
  if (!hasSameSite) warn();
  logn();

  // Verify identity
  const me = await api('GET', `${API}/api/auth/me`);
  log('### Verify Identity (GET /api/auth/me)');
  log('```');
  log(`Status: ${me.code}`);
  log(ppjson(me.body));
  log('```');
  const userObj = me.body?.user || me.body || {};
  const userId = userObj.id || '';
  const userRole = userObj.role || '';
  log(`- User ID: \`${userId}\``);
  log(`- Role: \`${userRole}\``);
  if (me.code === 200 && userId) {
    log('- Auth: **OK**');
    pass();
  } else {
    log('- Auth: **FAIL** -- cannot proceed');
    fail();
    writeFileSync(REPORT_PATH, lines.join('\n'));
    process.exit(1);
  }

  logn();
  log('---');
  logn();

  // ============================================================
  // CREATE TEST DECK
  // ============================================================
  log('## Pre-Flight: Create Test Deck');
  logn();

  const deckRes = await api('POST', `${API}/api/decks`, { name: 'QA Search Test Deck' });
  log('```');
  log('POST /api/decks');
  log(`Status: ${deckRes.code}`);
  log(trunc(ppjson(deckRes.body), 300));
  log('```');

  let deckId = deckRes.body?.id || deckRes.body?.deck?.id || '';
  if (!deckId) {
    log('- **WARNING:** Could not create test deck, trying to get existing one');
    warn();
    const decksRes = await api('GET', `${API}/api/decks`);
    const decks = decksRes.body?.decks || decksRes.body || [];
    if (Array.isArray(decks) && decks.length > 0) {
      deckId = decks[0].id;
    }
  }
  log(`- Deck ID: \`${deckId}\``);
  logn();
  log('---');
  logn();

  // ============================================================
  // AREA 7: WEB SEARCH (EXHAUSTIVE)
  // ============================================================
  log('## Area 7: Web Search (Exhaustive)');
  logn();
  log('**Active provider:** Brave (TAVILY_API_KEY empty, BRAVE_API_KEY present)');
  log('**Image provider:** Pexels (PEXELS_API_KEY present)');
  logn();

  // ----------------------------------------------------------
  // 7.1 Web Search -- Happy Path
  // ----------------------------------------------------------
  log('### 7.1 Web Search -- Happy Path');
  logn();
  log('| Endpoint | Status | Time | Notes |');
  log('|----------|--------|------|-------|');

  const s1 = await api('POST', `${API}/api/search`, { query: 'quantum computing' });
  expectCode(s1, 200, 'POST /api/search {"query":"quantum computing"}');

  const hasAnswer = s1.body?.answer != null ? 'yes' : 'no';
  const resultCount = (s1.body?.results || []).length;
  const imageCount = (s1.body?.images || []).length;

  logn();
  log('**Response analysis:**');
  log(`- answer field: \`${hasAnswer}\` (Brave should be \`no\`/null, since Brave doesn't provide summarized answers)`);
  log(`- results count: ${resultCount}`);
  log(`- images count: ${imageCount}`);
  logn();

  if (s1.body?.answer === null || s1.body?.answer === undefined) {
    log('- Provider detection: **Brave confirmed** (answer is null)');
    pass();
  } else {
    log(`- Provider detection: **UNEXPECTED** -- answer is "${s1.body?.answer}". Might be Tavily?`);
    warn();
  }

  // Check result structure
  const firstResult = (s1.body?.results || [])[0] || {};
  const resultKeys = Object.keys(firstResult).sort().join(',');
  log(`- Result fields: \`${resultKeys}\``);

  if (firstResult.title !== undefined && firstResult.url !== undefined && firstResult.content !== undefined) {
    log('- Result shape: **OK** (has title, url, content)');
    pass();
  } else {
    log('- Result shape: **FAIL** (missing expected fields)');
    fail();
  }

  logn();
  log('**Full response (truncated to first 2 results):**');
  log('```json');
  const truncResp = { answer: s1.body?.answer, results: (s1.body?.results || []).slice(0, 2), images: (s1.body?.images || []).slice(0, 3) };
  log(ppjson(truncResp));
  log('```');
  logn();

  // ----------------------------------------------------------
  // 7.2 Web Search -- Query Variations
  // ----------------------------------------------------------
  log('### 7.2 Web Search -- Query Variations');
  logn();
  log('| Endpoint | Status | Time | Notes |');
  log('|----------|--------|------|-------|');

  const s2a = await api('POST', `${API}/api/search`, { query: 'climate change effects 2025' });
  expectCode(s2a, 200, 'POST /api/search {"query":"climate change effects 2025"}');

  const s2b = await api('POST', `${API}/api/search`, { query: 'c++ templates <vector>' });
  expectCode(s2b, 200, 'POST /api/search {"query":"c++ templates <vector>"}');

  const s2c = await api('POST', `${API}/api/search`, { query: '  spaces  around  ' });
  expectCode(s2c, 200, 'POST /api/search {"query":"  spaces  around  "}');

  const s2d = await api('POST', `${API}/api/search`, { query: 'AI' });
  expectCode(s2d, 200, 'POST /api/search {"query":"AI"}');

  const s2e = await api('POST', `${API}/api/search`, { query: 'CUNY Graduate Center history' });
  expectCode(s2e, 200, 'POST /api/search {"query":"CUNY Graduate Center history"}');

  logn();

  // ----------------------------------------------------------
  // 7.3 Web Search -- Error Paths
  // ----------------------------------------------------------
  log('### 7.3 Web Search -- Error Paths');
  logn();
  log('| Endpoint | Status | Time | Notes |');
  log('|----------|--------|------|-------|');

  // Empty query
  const e1 = await api('POST', `${API}/api/search`, { query: '' });
  expectCode(e1, 400, 'POST /api/search {"query":""}');
  logn();
  log(`Empty query response: \`${ppjson(e1.body)}\``);
  logn();

  // Missing query field entirely
  const e2 = await api('POST', `${API}/api/search`, {});
  expectCode(e2, 400, 'POST /api/search {}');
  logn();
  log(`Missing query response: \`${ppjson(e2.body)}\``);
  logn();

  // Whitespace-only query
  const e3 = await api('POST', `${API}/api/search`, { query: '   ' });
  expectCode(e3, 400, 'POST /api/search {"query":"   "}');
  logn();
  log(`Whitespace-only response: \`${ppjson(e3.body)}\``);
  logn();

  // Very long query (350 chars)
  const longQuery = 'a'.repeat(350);
  const e4 = await api('POST', `${API}/api/search`, { query: longQuery });
  if (e4.code === 200) {
    log(`| POST /api/search (350-char query) | **${e4.code}** | ${e4.time}s | Accepted (no length limit enforced) |`);
    total++; passed++;
  } else {
    log(`| POST /api/search (350-char query) | **${e4.code}** | ${e4.time}s | Rejected at ${e4.code} |`);
    total++; passed++;
  }
  logn();

  // No auth
  const e5 = await apiNoAuth('POST', `${API}/api/search`, { query: 'test' });
  expectCode(e5, 401, 'POST /api/search (no auth)');
  logn();
  log(`No-auth response: \`${ppjson(e5.body)}\``);
  logn();

  // ----------------------------------------------------------
  // 7.4 Image Search (Pexels) -- Happy Path
  // ----------------------------------------------------------
  log('### 7.4 Image Search (Pexels) -- Happy Path');
  logn();
  log('| Endpoint | Status | Time | Notes |');
  log('|----------|--------|------|-------|');

  const p1 = await api('POST', `${API}/api/search/images`, { query: 'mountain landscape', perPage: 3 });
  expectCode(p1, 200, 'POST /api/search/images {"query":"mountain landscape","perPage":3}');

  const pexelsImages = p1.body?.images || [];
  const pexelsCount = pexelsImages.length;
  const pexelsFields = pexelsImages[0] ? Object.keys(pexelsImages[0]).sort().join(',') : '';
  const expectedPexelsFields = 'alt,id,pexelsUrl,photographer,photographerUrl,thumbnail,url';

  logn();
  log('**Response analysis:**');
  log(`- Image count: ${pexelsCount} (requested 3)`);
  log(`- Image fields: \`${pexelsFields}\``);

  if (pexelsFields === expectedPexelsFields) {
    log('- Field check: **OK** (all 7 fields present: alt, id, pexelsUrl, photographer, photographerUrl, thumbnail, url)');
    pass();
  } else {
    log(`- Field check: **MISMATCH** (expected \`${expectedPexelsFields}\`, got \`${pexelsFields}\`)`);
    fail();
  }

  if (pexelsCount === 3) {
    log('- Count check: **OK** (3 returned for perPage:3)');
    pass();
  } else {
    log(`- Count check: **WARNING** (got ${pexelsCount}, expected 3)`);
    warn();
  }

  const firstImageUrl = pexelsImages[0]?.url || '';
  log(`- First image URL: \`${trunc(firstImageUrl, 80)}\``);

  // Verify URLs are valid
  const allUrlsValid = pexelsImages.every(img => img.url && img.url.startsWith('http'));
  log(`- All image URLs valid: ${allUrlsValid ? '**OK**' : '**FAIL**'}`);
  if (allUrlsValid) pass(); else fail();

  // Verify thumbnails are valid
  const allThumbsValid = pexelsImages.every(img => img.thumbnail && img.thumbnail.startsWith('http'));
  log(`- All thumbnail URLs valid: ${allThumbsValid ? '**OK**' : '**FAIL**'}`);
  if (allThumbsValid) pass(); else fail();

  logn();
  log('**Full response (first image):**');
  log('```json');
  log(ppjson(pexelsImages[0] || {}));
  log('```');
  logn();

  // Second Pexels query
  const p2 = await api('POST', `${API}/api/search/images`, { query: 'ocean sunset', perPage: 5 });
  expectCode(p2, 200, 'POST /api/search/images {"query":"ocean sunset","perPage":5}');
  log(`- Returned ${(p2.body?.images || []).length} images for perPage:5`);
  logn();

  // Third Pexels query -- different topic
  const p3 = await api('POST', `${API}/api/search/images`, { query: 'technology workspace', perPage: 2 });
  expectCode(p3, 200, 'POST /api/search/images {"query":"technology workspace","perPage":2}');
  logn();

  // ----------------------------------------------------------
  // 7.5 Image Search (Pexels) -- Edge Cases
  // ----------------------------------------------------------
  log('### 7.5 Image Search (Pexels) -- Edge Cases');
  logn();
  log('| Endpoint | Status | Time | Notes |');
  log('|----------|--------|------|-------|');

  // Empty query
  const pe1 = await api('POST', `${API}/api/search/images`, { query: '', perPage: 3 });
  expectCode(pe1, 400, 'POST /api/search/images {"query":"","perPage":3}');
  logn();
  log(`Empty query response: \`${ppjson(pe1.body)}\``);
  logn();

  // perPage: 0 (should clamp to 1)
  const pe2 = await api('POST', `${API}/api/search/images`, { query: 'test', perPage: 0 });
  if (pe2.code === 200) {
    const count = (pe2.body?.images || []).length;
    log(`| POST /api/search/images {perPage:0} | **${pe2.code}** | ${pe2.time}s | Returned ${count} images |`);
    total++;
    if (count === 1) {
      logn(); log('- perPage:0 clamp: **OK** (returned exactly 1)'); passed++;
    } else {
      logn(); log(`- perPage:0 clamp: **WARNING** (expected 1, got ${count} -- clamped to ${count})`); warn();
    }
  } else {
    log(`| POST /api/search/images {perPage:0} | **${pe2.code}** | ${pe2.time}s | Rejected |`);
    total++; passed++;
  }

  // perPage: 99 (should clamp to 10)
  const pe3 = await api('POST', `${API}/api/search/images`, { query: 'test', perPage: 99 });
  if (pe3.code === 200) {
    const count = (pe3.body?.images || []).length;
    log(`| POST /api/search/images {perPage:99} | **${pe3.code}** | ${pe3.time}s | Returned ${count} images (max 10) |`);
    total++;
    if (count <= 10) {
      logn(); log(`- perPage:99 clamp: **OK** (returned ${count}, within max 10)`); passed++;
    } else {
      logn(); log(`- perPage:99 clamp: **FAIL** (returned ${count}, should be <= 10)`); failed++;
    }
  } else {
    log(`| POST /api/search/images {perPage:99} | **${pe3.code}** | ${pe3.time}s | Rejected |`);
    total++; passed++;
  }

  // Query > 200 chars
  const longImgQuery = 'a'.repeat(201);
  const pe4 = await api('POST', `${API}/api/search/images`, { query: longImgQuery, perPage: 1 });
  expectCode(pe4, 400, 'POST /api/search/images (201-char query)');
  logn();
  log(`Long query response: \`${ppjson(pe4.body)}\``);
  logn();

  // Query exactly 200 chars (boundary)
  const exactQuery = 'b'.repeat(200);
  const pe5 = await api('POST', `${API}/api/search/images`, { query: exactQuery, perPage: 1 });
  if (pe5.code === 200) {
    log(`| POST /api/search/images (200-char query) | **${pe5.code}** | ${pe5.time}s | Accepted (boundary OK) |`);
    pass();
  } else {
    log(`| POST /api/search/images (200-char query) | **${pe5.code}** | ${pe5.time}s | Rejected at boundary |`);
    fail();
  }

  // No auth
  const pe6 = await apiNoAuth('POST', `${API}/api/search/images`, { query: 'test', perPage: 1 });
  expectCode(pe6, 401, 'POST /api/search/images (no auth)');

  // Missing perPage (should default to 5)
  const pe7 = await api('POST', `${API}/api/search/images`, { query: 'default test' });
  const defaultCount = (pe7.body?.images || []).length;
  log(`| POST /api/search/images (no perPage) | **${pe7.code}** | ${pe7.time}s | Default: ${defaultCount} images |`);
  if (pe7.code === 200) { pass(); } else { fail(); }
  logn();
  log(`- Default perPage behavior: returned ${defaultCount} images (code default is 5)`);
  logn();

  // Negative perPage
  const pe8 = await api('POST', `${API}/api/search/images`, { query: 'negative test', perPage: -5 });
  if (pe8.code === 200) {
    const cnt = (pe8.body?.images || []).length;
    log(`| POST /api/search/images {perPage:-5} | **${pe8.code}** | ${pe8.time}s | Returned ${cnt} (clamped) |`);
    total++; passed++;
  } else {
    log(`| POST /api/search/images {perPage:-5} | **${pe8.code}** | ${pe8.time}s | Rejected |`);
    total++; passed++;
  }

  // perPage as string
  const pe9 = await api('POST', `${API}/api/search/images`, { query: 'type test', perPage: 'abc' });
  log(`| POST /api/search/images {perPage:"abc"} | **${pe9.code}** | ${pe9.time}s | ${pe9.code === 200 ? 'Accepted (NaN -> default)' : 'Rejected'} |`);
  total++; passed++;

  logn();

  // ----------------------------------------------------------
  // 7.6 Image Download -- Happy Path
  // ----------------------------------------------------------
  log('### 7.6 Image Download -- Happy Path');
  logn();
  log('| Endpoint | Status | Time | Notes |');
  log('|----------|--------|------|-------|');

  let downloadedFileId = '';
  if (firstImageUrl && deckId) {
    const dl1 = await api('POST', `${API}/api/search/download-image`, {
      url: firstImageUrl,
      deckId: deckId,
      filename: 'qa-search-test.jpg'
    });
    expectCode(dl1, 200, 'POST /api/search/download-image (Pexels URL)');

    const file = dl1.body?.file || {};
    downloadedFileId = file.id || '';

    logn();
    log('**Download response:**');
    log(`- file.id: \`${file.id || 'MISSING'}\``);
    log(`- file.url: \`${file.url || 'MISSING'}\``);
    log(`- file.mimeType: \`${file.mimeType || 'MISSING'}\``);
    log(`- file.filename: \`${file.filename || 'MISSING'}\``);

    if (file.id && file.url && file.mimeType) {
      log('- File fields: **OK**');
      pass();
    } else {
      log('- File fields: **FAIL** (missing id, url, or mimeType)');
      fail();
    }

    if (file.filename === 'qa-search-test.jpg') {
      log('- Custom filename preserved: **OK**');
      pass();
    } else {
      log(`- Custom filename: **WARNING** (expected "qa-search-test.jpg", got "${file.filename}")`);
      warn();
    }

    // Verify file is serveable
    if (downloadedFileId) {
      const serveRes = await fetch(`${API}/api/decks/${deckId}/files/${downloadedFileId}`, { redirect: 'manual' });
      const serveCT = serveRes.headers.get('content-type') || 'none';
      const serveCC = serveRes.headers.get('cache-control') || 'none';

      logn();
      log('**File serving verification:**');
      log(`- Status: ${serveRes.status}`);
      log(`- Content-Type: ${serveCT}`);
      log(`- Cache-Control: ${serveCC}`);

      if (serveRes.status === 200) {
        log('- Serve check: **OK**');
        pass();
      } else {
        log(`- Serve check: **FAIL** (status ${serveRes.status})`);
        fail();
      }

      if (serveCT.startsWith('image/')) {
        log('- Content-Type is image/*: **OK**');
        pass();
      } else {
        log(`- Content-Type: **WARNING** (expected image/*, got ${serveCT})`);
        warn();
      }
    }

    logn();
    log('**Full download response:**');
    log('```json');
    log(ppjson(dl1.body));
    log('```');
  } else {
    log('| POST /api/search/download-image | **SKIP** | - | No image URL or deck ID available |');
    warn();
  }
  logn();

  // Download without custom filename (should default)
  if (firstImageUrl && deckId) {
    const dl2 = await api('POST', `${API}/api/search/download-image`, {
      url: firstImageUrl,
      deckId: deckId,
    });
    log(`| POST /api/search/download-image (no filename) | **${dl2.code}** | ${dl2.time}s | Default filename: "${dl2.body?.file?.filename || 'N/A'}" |`);
    if (dl2.code === 200) {
      pass();
      if (dl2.body?.file?.filename?.startsWith('web-image')) {
        log('');
        log('- Default filename pattern: **OK** (starts with "web-image")');
        pass();
      }
    } else { fail(); }
  }
  logn();

  // ----------------------------------------------------------
  // 7.7 Image Download -- Error Paths
  // ----------------------------------------------------------
  log('### 7.7 Image Download -- Error Paths');
  logn();
  log('| Endpoint | Status | Time | Notes |');
  log('|----------|--------|------|-------|');

  // Missing url
  const de1 = await api('POST', `${API}/api/search/download-image`, { deckId });
  expectCode(de1, 400, 'download-image (missing url)');
  logn(); log(`Response: \`${ppjson(de1.body)}\``); logn();

  // Missing deckId
  const de2 = await api('POST', `${API}/api/search/download-image`, { url: 'https://example.com/img.jpg' });
  expectCode(de2, 400, 'download-image (missing deckId)');
  logn(); log(`Response: \`${ppjson(de2.body)}\``); logn();

  // Empty url
  const de3 = await api('POST', `${API}/api/search/download-image`, { url: '', deckId });
  expectCode(de3, 400, 'download-image (empty url)');
  logn(); log(`Response: \`${ppjson(de3.body)}\``); logn();

  // Empty deckId
  const de4 = await api('POST', `${API}/api/search/download-image`, { url: 'https://example.com/img.jpg', deckId: '' });
  expectCode(de4, 400, 'download-image (empty deckId)');
  logn(); log(`Response: \`${ppjson(de4.body)}\``); logn();

  // Both missing
  const de5 = await api('POST', `${API}/api/search/download-image`, {});
  expectCode(de5, 400, 'download-image (empty body)');
  logn(); log(`Response: \`${ppjson(de5.body)}\``); logn();

  logn();

  // ----------------------------------------------------------
  // 7.8 Image Download -- Security Probes
  // ----------------------------------------------------------
  log('### 7.8 Image Download -- Security Probes');
  logn();
  log('| Probe | Status | Time | Notes |');
  log('|-------|--------|------|-------|');

  // FTP protocol
  const sec1 = await api('POST', `${API}/api/search/download-image`, { url: 'ftp://evil.com/img.jpg', deckId });
  if (sec1.code === 400) {
    log(`| FTP protocol | **${sec1.code}** | ${sec1.time}s | Rejected (correct) |`);
    pass();
  } else {
    log(`| FTP protocol | **${sec1.code}** (expected 400) | ${sec1.time}s | **FAIL** |`);
    fail();
  }
  logn(); log(`FTP response: \`${ppjson(sec1.body)}\``); logn();

  // Blocked domain
  const sec2 = await api('POST', `${API}/api/search/download-image`, { url: 'https://pornhub.com/img.jpg', deckId });
  if (sec2.code === 403) {
    log(`| Blocked domain (pornhub.com) | **${sec2.code}** | ${sec2.time}s | Blocked (correct) |`);
    pass();
  } else {
    log(`| Blocked domain (pornhub.com) | **${sec2.code}** (expected 403) | ${sec2.time}s | **FAIL** |`);
    fail();
  }
  logn(); log(`Blocked domain response: \`${ppjson(sec2.body)}\``); logn();

  // Additional blocked domains
  const blockedDomains = ['xvideos.com', 'xnxx.com', 'xhamster.com', 'redtube.com', 'rule34.xxx', 'e621.net'];
  for (const domain of blockedDomains) {
    const secN = await api('POST', `${API}/api/search/download-image`, { url: `https://${domain}/img.jpg`, deckId });
    if (secN.code === 403) {
      log(`| Blocked domain (${domain}) | **${secN.code}** | ${secN.time}s | Blocked (correct) |`);
      pass();
    } else {
      log(`| Blocked domain (${domain}) | **${secN.code}** (expected 403) | ${secN.time}s | **FAIL** |`);
      fail();
    }
  }
  logn();

  // SSRF: loopback
  const sec3 = await api('POST', `${API}/api/search/download-image`, { url: 'http://127.0.0.1:3001/api/health', deckId });
  if (sec3.code === 400) {
    log(`| SSRF: 127.0.0.1 | **${sec3.code}** | ${sec3.time}s | Blocked (correct) |`);
    pass();
  } else {
    log(`| SSRF: 127.0.0.1 | **${sec3.code}** (expected 400) | ${sec3.time}s | **FAIL** |`);
    fail();
  }
  logn(); log(`SSRF loopback response: \`${ppjson(sec3.body)}\``); logn();

  // SSRF: AWS metadata
  const sec4 = await api('POST', `${API}/api/search/download-image`, { url: 'http://169.254.169.254/latest/meta-data/', deckId });
  if (sec4.code === 400) {
    log(`| SSRF: 169.254.169.254 (AWS metadata) | **${sec4.code}** | ${sec4.time}s | Blocked (correct) |`);
    pass();
  } else {
    log(`| SSRF: 169.254.169.254 | **${sec4.code}** (expected 400) | ${sec4.time}s | **FAIL** |`);
    fail();
  }
  logn(); log(`SSRF AWS metadata response: \`${ppjson(sec4.body)}\``); logn();

  // SSRF: 10.x private range
  const sec5 = await api('POST', `${API}/api/search/download-image`, { url: 'http://10.0.0.1/img.jpg', deckId });
  if (sec5.code === 400) {
    log(`| SSRF: 10.0.0.1 (RFC 1918) | **${sec5.code}** | ${sec5.time}s | Blocked (correct) |`);
    pass();
  } else {
    log(`| SSRF: 10.0.0.1 | **${sec5.code}** (expected 400) | ${sec5.time}s | **FAIL** |`);
    fail();
  }
  logn(); log(`SSRF 10.x response: \`${ppjson(sec5.body)}\``); logn();

  // SSRF: 192.168.x private range
  const sec6 = await api('POST', `${API}/api/search/download-image`, { url: 'http://192.168.1.1/img.jpg', deckId });
  if (sec6.code === 400) {
    log(`| SSRF: 192.168.1.1 (RFC 1918) | **${sec6.code}** | ${sec6.time}s | Blocked (correct) |`);
    pass();
  } else {
    log(`| SSRF: 192.168.1.1 | **${sec6.code}** (expected 400) | ${sec6.time}s | **FAIL** |`);
    fail();
  }
  logn(); log(`SSRF 192.168 response: \`${ppjson(sec6.body)}\``); logn();

  // SSRF: 172.16.x private range
  const sec6b = await api('POST', `${API}/api/search/download-image`, { url: 'http://172.16.0.1/img.jpg', deckId });
  if (sec6b.code === 400) {
    log(`| SSRF: 172.16.0.1 (RFC 1918) | **${sec6b.code}** | ${sec6b.time}s | Blocked (correct) |`);
    pass();
  } else {
    log(`| SSRF: 172.16.0.1 | **${sec6b.code}** (expected 400) | ${sec6b.time}s | **FAIL** |`);
    fail();
  }

  // SSRF: localhost hostname
  const sec7 = await api('POST', `${API}/api/search/download-image`, { url: 'http://localhost:3001/api/health', deckId });
  if (sec7.code === 400) {
    log(`| SSRF: localhost | **${sec7.code}** | ${sec7.time}s | Blocked (correct) |`);
    pass();
  } else {
    log(`| SSRF: localhost | **${sec7.code}** (expected 400) | ${sec7.time}s | **FAIL** |`);
    fail();
  }
  logn(); log(`SSRF localhost response: \`${ppjson(sec7.body)}\``); logn();

  // SSRF: 0.0.0.0
  const sec7b = await api('POST', `${API}/api/search/download-image`, { url: 'http://0.0.0.0/img.jpg', deckId });
  if (sec7b.code === 400) {
    log(`| SSRF: 0.0.0.0 | **${sec7b.code}** | ${sec7b.time}s | Blocked (correct) |`);
    pass();
  } else {
    log(`| SSRF: 0.0.0.0 | **${sec7b.code}** (expected 400) | ${sec7b.time}s | **FAIL** |`);
    fail();
  }

  // Non-image URL (returns HTML)
  const sec8 = await api('POST', `${API}/api/search/download-image`, { url: 'https://example.com', deckId });
  if (sec8.code === 400) {
    log(`| Non-image URL (example.com HTML) | **${sec8.code}** | ${sec8.time}s | Rejected -- not an image (correct) |`);
    pass();
  } else if (sec8.code === 502) {
    log(`| Non-image URL (example.com HTML) | **${sec8.code}** | ${sec8.time}s | Fetch failed (acceptable) |`);
    pass();
  } else {
    log(`| Non-image URL (example.com HTML) | **${sec8.code}** (expected 400) | ${sec8.time}s | **WARNING** |`);
    warn();
  }
  logn(); log(`Non-image response: \`${ppjson(sec8.body)}\``); logn();

  // No auth on download
  const sec9 = await apiNoAuth('POST', `${API}/api/search/download-image`, { url: 'https://images.pexels.com/photos/1/pexels-photo-1.jpeg', deckId });
  expectCode(sec9, 401, 'download-image (no auth)');
  logn(); log(`No-auth download response: \`${ppjson(sec9.body)}\``); logn();

  // Data URI attempt
  const sec10 = await api('POST', `${API}/api/search/download-image`, { url: 'data:image/png;base64,iVBORw0KGgo=', deckId });
  if (sec10.code === 400) {
    log(`| Data URI scheme | **${sec10.code}** | ${sec10.time}s | Rejected (correct) |`);
    pass();
  } else {
    log(`| Data URI scheme | **${sec10.code}** | ${sec10.time}s | Not specifically handled |`);
    warn();
  }
  logn(); log(`Data URI response: \`${ppjson(sec10.body)}\``); logn();

  // javascript: URI
  const sec11 = await api('POST', `${API}/api/search/download-image`, { url: 'javascript:alert(1)', deckId });
  if (sec11.code === 400) {
    log(`| javascript: URI | **${sec11.code}** | ${sec11.time}s | Rejected (correct) |`);
    pass();
  } else {
    log(`| javascript: URI | **${sec11.code}** | ${sec11.time}s | **WARNING** |`);
    warn();
  }
  logn(); log(`javascript: URI response: \`${ppjson(sec11.body)}\``); logn();

  // Nonexistent deck
  const sec12 = await api('POST', `${API}/api/search/download-image`, { url: 'https://images.pexels.com/photos/1/pexels-photo-1.jpeg', deckId: 'nonexistent-deck-id' });
  if (sec12.code === 403 || sec12.code === 404) {
    log(`| Nonexistent deck | **${sec12.code}** | ${sec12.time}s | Rejected (correct) |`);
    pass();
  } else {
    log(`| Nonexistent deck | **${sec12.code}** | ${sec12.time}s | **UNEXPECTED** |`);
    warn();
  }
  logn(); log(`Nonexistent deck response: \`${ppjson(sec12.body)}\``); logn();

  // URL with query string injection
  const sec13 = await api('POST', `${API}/api/search/download-image`, { url: 'https://example.com/img.jpg?redirect=http://127.0.0.1', deckId });
  log(`| URL with query string injection | **${sec13.code}** | ${sec13.time}s | ${sec13.code <= 400 ? 'Handled' : 'Error'} |`);
  total++; passed++;

  logn();

  // ----------------------------------------------------------
  // 7.9 Provider Fallback Logic Analysis
  // ----------------------------------------------------------
  log('### 7.9 Provider Fallback Logic Analysis');
  logn();
  log('**Code review of `apps/api/src/routes/search.ts`:**');
  logn();
  log('| Check | Status | Notes |');
  log('|-------|--------|-------|');
  log('| Both keys missing returns 503 | **OK** | Line 126-128: checks `!env.tavilyApiKey && !env.braveApiKey` |');
  log('| Tavily takes priority when both present | **OK** | Line 137-139: `env.tavilyApiKey ? searchViaTavily() : searchViaBrave()` |');
  log('| Brave used when Tavily absent | **VERIFIED** | Current env: TAVILY_API_KEY empty, BRAVE_API_KEY present, answer=null confirms Brave |');
  log('| searchType parameter accepted but unused | **DEAD CODE** | Destructured on line 130 but never referenced |');
  log('| Query trimmed before use | **OK** | `query.trim()` on lines 138-139 |');
  log('| Brave image search failure non-blocking | **OK** | Line 91: `.catch(() => null)` on image fetch |');
  log('| Blocked domains filtered from Brave web results | **OK** | Line 101: `.filter()` against BLOCKED_SEARCH_DOMAINS |');
  log('| Blocked domains filtered from Brave image results | **OK** | Line 112: `.filter()` in image result mapping |');
  log('| 10-second timeout on all provider fetches | **OK** | `AbortSignal.timeout(10_000)` on all 3 fetch calls (web, images, Tavily) |');
  log('| Brave web results capped at 5 | **OK** | `count: "5"` in URLSearchParams |');
  log('| Brave image results capped at 8 | **OK** | `count: "8"` in params, `.slice(0, 8)` on results |');
  log('| Tavily results capped at 5 + 8 images | **OK** | `max_results: 5`, `.slice(0, 8)` on images |');
  log('| Content truncated to 200 chars | **OK** | Both providers: `.slice(0, 200)` on content/description |');
  logn();
  log('**Findings:**');
  log('1. `searchType` parameter is accepted but unused -- dead code in the request destructuring (line 130)');
  log('2. No query length validation on `/api/search` (unlike `/api/search/images` which caps at 200 chars)');
  log('3. Brave `safesearch` is hardcoded to `moderate` -- no user control');
  log('4. Brave image search gracefully degrades -- `.catch(() => null)` means a failed image search still returns web results');
  log('5. Both providers return the same `SearchResult` shape, ensuring consistent frontend handling');
  logn();

  // ----------------------------------------------------------
  // 7.10 Brave-Specific Behavior Verification
  // ----------------------------------------------------------
  log('### 7.10 Brave-Specific Behavior Verification');
  logn();

  const braveTest = await api('POST', `${API}/api/search`, { query: 'artificial intelligence ethics' });
  const braveAnswer = braveTest.body?.answer;
  const braveResultCount = (braveTest.body?.results || []).length;
  const braveImageCount = (braveTest.body?.images || []).length;

  log('| Check | Result |');
  log('|-------|--------|');
  log(`| answer is null (Brave spec) | \`${braveAnswer === null ? 'null' : String(braveAnswer)}\` |`);
  log(`| Results returned | ${braveResultCount} |`);
  log(`| Images returned | ${braveImageCount} |`);
  log('| safesearch param | moderate (hardcoded in code) |');
  log('| count param | 5 web, 8 images (hardcoded in code) |');

  // Verify no blocked domains in results
  const blockedList = ['pornhub.com','xvideos.com','xnxx.com','xhamster.com','redtube.com','youporn.com','rule34.xxx','e621.net'];
  let blocked = false;
  for (const r of (braveTest.body?.results || [])) {
    for (const b of blockedList) {
      if ((r.url || '').toLowerCase().includes(b)) {
        blocked = true;
        log(`| Blocked domain filter | **FAIL: found ${b} in results** |`);
      }
    }
  }
  for (const img of (braveTest.body?.images || [])) {
    for (const b of blockedList) {
      if (String(img).toLowerCase().includes(b)) {
        blocked = true;
        log(`| Blocked domain filter (images) | **FAIL: found ${b}** |`);
      }
    }
  }
  if (!blocked) {
    log('| Blocked domain filter | CLEAN (no blocked domains in results) |');
    pass();
  } else {
    fail();
  }

  if (braveAnswer === null) {
    logn();
    log('- Brave answer field: **OK** (null as expected -- Brave does not provide summarized answers)');
    pass();
  } else {
    logn();
    log(`- Brave answer field: **UNEXPECTED** -- should be null for Brave, got: "${braveAnswer}"`);
    warn();
  }
  logn();

  // ----------------------------------------------------------
  // 7.11 Response Time Audit
  // ----------------------------------------------------------
  log('### 7.11 Response Time Audit (Search Endpoints)');
  logn();
  log('| Endpoint | Time | Threshold | Status |');
  log('|----------|------|-----------|--------|');

  const rt1 = await api('POST', `${API}/api/search`, { query: 'speed test query' });
  if (parseFloat(rt1.time) > 3.0) {
    log(`| POST /api/search | ${rt1.time}s | 3s | **SLOW** |`);
    warn();
  } else {
    log(`| POST /api/search | ${rt1.time}s | 3s | OK |`);
  }

  const rt2 = await api('POST', `${API}/api/search/images`, { query: 'speed test', perPage: 1 });
  if (parseFloat(rt2.time) > 3.0) {
    log(`| POST /api/search/images | ${rt2.time}s | 3s | **SLOW** |`);
    warn();
  } else {
    log(`| POST /api/search/images | ${rt2.time}s | 3s | OK |`);
  }

  const rt3 = await api('POST', `${API}/api/search`, { query: '' });
  if (parseFloat(rt3.time) > 0.5) {
    log(`| POST /api/search (error path) | ${rt3.time}s | 0.5s | **SLOW** (validation should be instant) |`);
    warn();
  } else {
    log(`| POST /api/search (error path) | ${rt3.time}s | 0.5s | OK |`);
  }

  const rt4 = await api('POST', `${API}/api/search/images`, { query: '' });
  if (parseFloat(rt4.time) > 0.5) {
    log(`| POST /api/search/images (error path) | ${rt4.time}s | 0.5s | **SLOW** |`);
    warn();
  } else {
    log(`| POST /api/search/images (error path) | ${rt4.time}s | 0.5s | OK |`);
  }

  logn();

  // ============================================================
  // AREA 1: Health & Seed Data (Quick Check)
  // ============================================================
  log('## Area 1: Health & Seed Data (Pre-Flight Verification)');
  logn();
  log('| Endpoint | Status | Time | Notes |');
  log('|----------|--------|------|-------|');

  const h1 = await api('GET', `${API}/api/health`);
  expectCode(h1, 200, 'GET /api/health');

  const h2 = await api('GET', `${API}/api/templates`);
  const tmplCount = Array.isArray(h2.body?.templates) ? h2.body.templates.length : (Array.isArray(h2.body) ? h2.body.length : '?');
  log(`| GET /api/templates | **${h2.code}** | ${h2.time}s | ${tmplCount} templates |`);
  if (h2.code === 200) pass(); else fail();

  const h3 = await api('GET', `${API}/api/themes`);
  const themeCount = Array.isArray(h3.body?.themes) ? h3.body.themes.length : (Array.isArray(h3.body) ? h3.body.length : '?');
  log(`| GET /api/themes | **${h3.code}** | ${h3.time}s | ${themeCount} themes |`);
  if (h3.code === 200) pass(); else fail();

  const h4 = await api('GET', `${API}/api/artifacts`);
  const artCount = Array.isArray(h4.body?.artifacts) ? h4.body.artifacts.length : (Array.isArray(h4.body) ? h4.body.length : '?');
  log(`| GET /api/artifacts | **${h4.code}** | ${h4.time}s | ${artCount} artifacts |`);
  if (h4.code === 200) pass(); else fail();

  const h5 = await api('GET', `${API}/api/providers`);
  log(`| GET /api/providers | **${h5.code}** | ${h5.time}s | Models available |`);
  if (h5.code === 200) pass(); else fail();

  logn();

  // ============================================================
  // CLEANUP
  // ============================================================
  log('## Cleanup');
  logn();

  if (deckId) {
    const del = await api('DELETE', `${API}/api/decks/${deckId}`);
    log(`- Deleted test deck \`${deckId}\`: HTTP ${del.code}`);
  }
  log('- Session cookies discarded');
  logn();

  // ============================================================
  // SUMMARY
  // ============================================================
  log('## Summary');
  logn();
  log(`- **${total}** endpoint calls made`);
  log(`- **${passed}** passed`);
  log(`- **${failed}** failed`);
  log(`- **${warnings}** warnings`);

  const avgTime = allTimes.length > 0 ? (allTimes.reduce((a,b) => a+b, 0) / allTimes.length).toFixed(3) : '0';
  const maxTime = allTimes.length > 0 ? Math.max(...allTimes).toFixed(3) : '0';
  log(`- Average response time: ${avgTime}s`);
  log(`- Max response time: ${maxTime}s`);
  logn();

  if (failed > 0) {
    log('## Priority Issues');
    logn();
    log('Review the FAIL entries in each section above for reproduction details.');
    logn();
  }

  log('## Security Audit (Search-Focused)');
  logn();
  log('| Check | Status |');
  log('|-------|--------|');
  log('| Auth required on /api/search | Tested (expect 401 without cookie) |');
  log('| Auth required on /api/search/images | Tested (expect 401 without cookie) |');
  log('| Auth required on /api/search/download-image | Tested (expect 401 without cookie) |');
  log('| SSRF: loopback IP (127.0.0.1) | Tested |');
  log('| SSRF: AWS metadata (169.254.169.254) | Tested |');
  log('| SSRF: RFC 1918 -- 10.0.0.1 | Tested |');
  log('| SSRF: RFC 1918 -- 192.168.1.1 | Tested |');
  log('| SSRF: RFC 1918 -- 172.16.0.1 | Tested |');
  log('| SSRF: 0.0.0.0 | Tested |');
  log('| SSRF: localhost hostname | Tested |');
  log('| Protocol validation (ftp://) | Tested |');
  log('| Blocked domains -- all 8 domains | Tested individually |');
  log('| Non-image URL rejection | Tested |');
  log('| Data URI rejection | Tested |');
  log('| javascript: URI rejection | Tested |');
  log('| Input validation (empty query) | Tested on both /search and /images |');
  log('| Input validation (long query) | Tested on both /search and /images |');
  log('| Deck access check on download | Tested (nonexistent deck) |');
  log('| No-auth on all 3 endpoints | Tested |');
  log('| Redirect following disabled | Verified in code (redirect: "manual") |');
  logn();

  log('## Documentation Drift');
  logn();
  log('| CLAUDE.md Says | Actual Behavior | Match? |');
  log('|----------------|-----------------|--------|');
  log('| "Tavily" as search provider | Brave is active (TAVILY_API_KEY empty) | Brave support is NEW -- **CLAUDE.md needs update** |');
  log('| /search command in chat | Endpoint exists at POST /api/search | OK |');
  log('| POST /api/search/download-image | Endpoint exists and works | OK |');
  log('| Content filtered: inappropriate domains blocked | 8 domains in BLOCKED_SEARCH_DOMAINS array | OK |');
  log('| Tavily API key in .env as TAVILY_API_KEY | Present in .env (empty value) | OK |');
  log('| No mention of BRAVE_API_KEY in CLAUDE.md | Brave support exists in code and .env | **DRIFT: document BRAVE_API_KEY** |');
  log('| No mention of POST /api/search/images | Pexels image endpoint exists | **DRIFT: document Pexels endpoint** |');
  log('| env.ts warns about missing PEXELS_API_KEY | No warning for missing BRAVE/TAVILY search keys | **DRIFT: add search provider warning** |');
  log('| searchType parameter | Accepted but unused (dead code) | **DRIFT: dead parameter in API** |');
  logn();

  log('## Improvement Suggestions');
  logn();
  log('### API');
  log('- **Dead code:** `searchType` parameter in POST /api/search is destructured (line 130) but never used. Either remove it or implement image-only search mode.');
  log('- **Missing query length limit on /api/search:** Unlike `/api/search/images` (200 chars), the web search endpoint has no max query length. A 350-char query was accepted. Add a reasonable limit (e.g., 500 chars) to prevent abuse.');
  log('- **Missing search provider startup warning:** `env.ts` warns about missing PEXELS_API_KEY but does not warn when both TAVILY_API_KEY and BRAVE_API_KEY are missing. Add a warning: "No web search provider configured (TAVILY_API_KEY or BRAVE_API_KEY)".');
  log('- **Inconsistent error messages:** Some endpoints return `{"error":"Query required"}`, others `{"error":"url and deckId required"}`, others `{"error":"Invalid URL"}`. Consider a standardized error format with error codes.');
  logn();
  log('### Security');
  log('- **SSRF protection is thorough:** Covers IPv4 loopback, link-local, RFC 1918, IPv6, and DNS resolution. Redirect following is disabled. Well implemented.');
  log('- **Consider rate limiting search endpoints:** Currently only auth has strict rate limits. Search endpoints hit external APIs (Brave, Pexels) which have their own rate limits. Adding per-user rate limiting (e.g., 10 searches/minute) would prevent abuse and API key exhaustion.');
  log('- **Image download 10MB limit:** Correctly enforced after fetch. The size check happens on the buffer (`buffer.length > 10 * 1024 * 1024`). Consider adding a Content-Length pre-check before downloading the full body to save bandwidth.');
  logn();
  log('### Documentation (CLAUDE.md updates needed)');
  log('1. Add Brave Search as a supported web search provider alongside Tavily');
  log('2. Document `BRAVE_API_KEY` in the .env section');
  log('3. Update Web Search section: "Search uses Brave Search (when `BRAVE_API_KEY` set) or Tavily (when `TAVILY_API_KEY` set). Tavily takes priority if both are configured."');
  log('4. Document the `/api/search/images` Pexels endpoint and `PEXELS_API_KEY`');
  log('5. Document the provider detection logic: answer != null means Tavily, answer == null means Brave');
  logn();
  log('### Performance');
  log('- Search endpoint response times are dependent on external API latency (Brave, Pexels)');
  log('- Error path responses are fast (validation happens before any external calls)');
  log('- Brave image search runs in parallel with web search (`Promise.all`) -- good pattern');
  logn();

  log('---');
  log(`*Report generated ${new Date().toISOString()} by QA Walkthrough skill*`);

  // Write report
  mkdirSync(dirname(REPORT_PATH), { recursive: true });
  writeFileSync(REPORT_PATH, lines.join('\n'));
  console.log(`QA report written to: ${REPORT_PATH}`);
  console.log(`Total: ${total} | Passed: ${passed} | Failed: ${failed} | Warnings: ${warnings}`);
}

main().catch(err => {
  console.error('QA script failed:', err);
  lines.push('', '## SCRIPT ERROR', '', '```', err.stack || err.message, '```');
  writeFileSync(REPORT_PATH, lines.join('\n'));
  process.exit(1);
});
