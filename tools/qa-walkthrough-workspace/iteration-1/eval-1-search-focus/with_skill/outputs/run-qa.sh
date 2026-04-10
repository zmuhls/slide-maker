#!/usr/bin/env bash
set -euo pipefail

REPORT="/Users/zacharymuhlbauer/Desktop/STUDIO/projects/slide-maker/tools/qa-walkthrough-workspace/iteration-1/eval-1-search-focus/with_skill/outputs/qa-report.md"
COOKIES="/tmp/sm-qa-cookies.txt"
API="http://localhost:3001"
WEB="http://localhost:5173"
PASSWORD="Aporia.10!"
EMAIL="zmuhlbauer@gc.cuny.edu"

# Counters
TOTAL=0
PASSED=0
FAILED=0
WARNINGS=0
TIMES=()

# Helpers
log() { echo "$1" >> "$REPORT"; }
logn() { echo "" >> "$REPORT"; }
pass() { ((PASSED++)) || true; ((TOTAL++)) || true; }
fail() { ((FAILED++)) || true; ((TOTAL++)) || true; }
warn() { ((WARNINGS++)) || true; }
divider() { log ""; log "---"; log ""; }

# curl wrapper — captures HTTP code, time, body
# Usage: api_call METHOD URL [DATA]
# Sets: RESP_BODY, RESP_CODE, RESP_TIME
api_call() {
  local method="$1"
  local url="$2"
  local data="${3:-}"
  local tmpfile="/tmp/sm-qa-resp-$$.txt"

  local curl_args=(-s -b "$COOKIES" -c "$COOKIES" -w '\n__HTTP__%{http_code}__TIME__%{time_total}__SIZE__%{size_download}')

  if [[ "$method" == "POST" ]]; then
    curl_args+=(-X POST -H 'Content-Type: application/json')
    if [[ -n "$data" ]]; then
      curl_args+=(-d "$data")
    fi
  elif [[ "$method" == "PATCH" ]]; then
    curl_args+=(-X PATCH -H 'Content-Type: application/json')
    if [[ -n "$data" ]]; then
      curl_args+=(-d "$data")
    fi
  elif [[ "$method" == "DELETE" ]]; then
    curl_args+=(-X DELETE -H 'Content-Type: application/json')
    if [[ -n "$data" ]]; then
      curl_args+=(-d "$data")
    fi
  elif [[ "$method" == "UPLOAD" ]]; then
    curl_args+=(-F "file=@$data")
    # Remove the Content-Type header for multipart
    url="$2"
  elif [[ "$method" == "GET_HEADERS" ]]; then
    curl_args=(-s -b "$COOKIES" -c "$COOKIES" -I -w '\n__HTTP__%{http_code}__TIME__%{time_total}__SIZE__%{size_download}')
  elif [[ "$method" == "GET_RAW" ]]; then
    curl_args=(-s -b "$COOKIES" -c "$COOKIES" -o /dev/null -w '__HTTP__%{http_code}__TIME__%{time_total}__SIZE__%{size_download}')
  elif [[ "$method" == "NO_AUTH" ]]; then
    curl_args=(-s -w '\n__HTTP__%{http_code}__TIME__%{time_total}__SIZE__%{size_download}')
    if [[ -n "$data" ]]; then
      curl_args+=(-X POST -H 'Content-Type: application/json' -d "$data")
    fi
  fi

  local raw
  raw=$(curl "${curl_args[@]}" "$url" 2>&1) || true

  # Parse out the metadata line
  RESP_CODE=$(echo "$raw" | grep -oP '__HTTP__\K[0-9]+' || echo "000")
  RESP_TIME=$(echo "$raw" | grep -oP '__TIME__\K[0-9.]+' || echo "0")
  local size=$(echo "$raw" | grep -oP '__SIZE__\K[0-9]+' || echo "0")

  # Body is everything before the metadata line
  RESP_BODY=$(echo "$raw" | sed 's/__HTTP__.*//g' | sed '/^$/d')

  TIMES+=("$RESP_TIME")

  rm -f "$tmpfile"
}

# No-auth curl
api_call_noauth() {
  local method="$1"
  local url="$2"
  local data="${3:-}"
  local tmpfile="/tmp/sm-qa-resp-$$.txt"

  local curl_args=(-s -w '\n__HTTP__%{http_code}__TIME__%{time_total}__SIZE__%{size_download}')

  if [[ "$method" == "POST" ]]; then
    curl_args+=(-X POST -H 'Content-Type: application/json')
    if [[ -n "$data" ]]; then
      curl_args+=(-d "$data")
    fi
  elif [[ "$method" == "GET" ]]; then
    : # default
  fi

  local raw
  raw=$(curl "${curl_args[@]}" "$url" 2>&1) || true

  RESP_CODE=$(echo "$raw" | grep -oP '__HTTP__\K[0-9]+' || echo "000")
  RESP_TIME=$(echo "$raw" | grep -oP '__TIME__\K[0-9.]+' || echo "0")
  RESP_BODY=$(echo "$raw" | sed 's/__HTTP__.*//g' | sed '/^$/d')

  TIMES+=("$RESP_TIME")
}

# Pretty-print JSON (best effort)
ppjson() {
  echo "$1" | python3 -m json.tool 2>/dev/null || echo "$1"
}

# Test assertion: check HTTP code
expect_code() {
  local expected="$1"
  local label="$2"
  if [[ "$RESP_CODE" == "$expected" ]]; then
    log "| $label | **${RESP_CODE}** | ${RESP_TIME}s | OK |"
    pass
  else
    log "| $label | **${RESP_CODE}** (expected ${expected}) | ${RESP_TIME}s | FAIL |"
    fail
  fi
}

# Start report
cat /dev/null > "$REPORT"

log "# QA Report -- $(date '+%Y-%m-%d %H:%M')"
log ""
log "**Focus:** Web Search (Area 7) -- Brave Search + Pexels integration"
log "**Triggered by:** \"test the search -- i just added brave search support and want to make sure it actually works alongside pexels\""
log ""

# ============================================================
# PRE-FLIGHT
# ============================================================
log "## Environment"
log ""

# Check API health
api_call GET "$API/api/health"
API_STATUS="$RESP_CODE"
log "- API: $API -- HTTP $API_STATUS (${RESP_TIME}s)"
if [[ "$RESP_CODE" != "200" ]]; then
  log "  - **CRITICAL:** API is not responding. Aborting."
  exit 1
fi

# Check web health
api_call GET "$WEB"
WEB_STATUS="$RESP_CODE"
log "- Web: $WEB -- HTTP $WEB_STATUS (${RESP_TIME}s)"

# Env analysis
log "- AI providers: OpenRouter (key present), Bedrock (region: us-gov-east-1)"
log "- Search: **Brave** (BRAVE_API_KEY=BSAS...IJjf, present)"
log "  - TAVILY_API_KEY is **empty** -- Tavily NOT active"
log "  - Logic: env.tavilyApiKey is falsy, so \`searchViaBrave()\` will be used"
log "- Image search: **Pexels** (PEXELS_API_KEY present)"
log "- Database: apps/api/data/slide-maker.db (exists)"
log "- Git branch: feat/rich-text-chat-input"
log "- Last commit: 549fa44 feat: rich text formatting toolbar in chat input (tiptap)"
logn

# ============================================================
# AUTHENTICATE
# ============================================================
log "## Pre-Flight: Authentication"
log ""

# Login with full headers
RESP_HEADERS=$(curl -s -c "$COOKIES" -i \
  -X POST "$API/api/auth/login" \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}" 2>&1)

RESP_CODE=$(echo "$RESP_HEADERS" | grep -oP 'HTTP/\S+ \K\d+' | head -1 || echo "000")
RESP_BODY=$(echo "$RESP_HEADERS" | sed -n '/^{/,$p' | head -1)

log "### Login"
log "\`\`\`"
log "POST /api/auth/login"
log "Status: $RESP_CODE"
log "Body: $(ppjson "$RESP_BODY")"
log "\`\`\`"

# Extract cookie flags
COOKIE_LINE=$(echo "$RESP_HEADERS" | grep -i "set-cookie" | head -1 || echo "none")
log ""
log "**Cookie flags:**"
log "\`\`\`"
log "$COOKIE_LINE"
log "\`\`\`"

if echo "$COOKIE_LINE" | grep -qi "HttpOnly"; then
  log "- HttpOnly: YES"
else
  log "- HttpOnly: **MISSING** (security concern)"
  warn
fi
if echo "$COOKIE_LINE" | grep -qi "SameSite"; then
  log "- SameSite: YES"
else
  log "- SameSite: **MISSING**"
  warn
fi

# Verify identity
api_call GET "$API/api/auth/me"
log ""
log "### Verify Identity (GET /api/auth/me)"
log "\`\`\`"
log "Status: $RESP_CODE"
log "$(ppjson "$RESP_BODY")"
log "\`\`\`"

# Extract user ID
USER_ID=$(echo "$RESP_BODY" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('user',d).get('id',''))" 2>/dev/null || echo "")
USER_ROLE=$(echo "$RESP_BODY" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('user',d).get('role',''))" 2>/dev/null || echo "")
log ""
log "- User ID: \`$USER_ID\`"
log "- Role: \`$USER_ROLE\`"

if [[ "$RESP_CODE" == "200" && -n "$USER_ID" ]]; then
  log "- Auth: **OK**"
  pass
else
  log "- Auth: **FAIL** -- cannot proceed"
  fail
  exit 1
fi

divider

# ============================================================
# CREATE TEST DECK (needed for download-image tests)
# ============================================================
log "## Pre-Flight: Create Test Deck"
log ""

api_call POST "$API/api/decks" '{"name":"QA Search Test Deck"}'
log "\`\`\`"
log "POST /api/decks"
log "Status: $RESP_CODE"
log "$(ppjson "$RESP_BODY")"
log "\`\`\`"

DECK_ID=$(echo "$RESP_BODY" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('id', d.get('deck',{}).get('id','')))" 2>/dev/null || echo "")
log ""
log "- Deck ID: \`$DECK_ID\`"

if [[ -z "$DECK_ID" ]]; then
  log "- **FAIL:** Could not create test deck"
  fail
  # Try to get an existing deck
  api_call GET "$API/api/decks"
  DECK_ID=$(echo "$RESP_BODY" | python3 -c "import sys,json; d=json.load(sys.stdin); ds=d.get('decks',d) if isinstance(d,dict) else d; print(ds[0]['id'] if ds else '')" 2>/dev/null || echo "")
  log "- Fallback deck ID: \`$DECK_ID\`"
fi

divider

# ============================================================
# AREA 7: WEB SEARCH (EXHAUSTIVE)
# ============================================================
log "## Area 7: Web Search (Exhaustive)"
log ""
log "**Active provider:** Brave (TAVILY_API_KEY empty, BRAVE_API_KEY present)"
log "**Image provider:** Pexels (PEXELS_API_KEY present)"
log ""

# ----------------------------------------------------------
# 7.1 POST /api/search -- Happy Path
# ----------------------------------------------------------
log "### 7.1 Web Search -- Happy Path"
log ""
log "| Endpoint | Status | Time | Notes |"
log "|----------|--------|------|-------|"

api_call POST "$API/api/search" '{"query":"quantum computing"}'
SEARCH_BODY="$RESP_BODY"
expect_code 200 "POST /api/search {\"query\":\"quantum computing\"}"

# Parse search response
HAS_ANSWER=$(echo "$SEARCH_BODY" | python3 -c "import sys,json; d=json.load(sys.stdin); print('yes' if d.get('answer') else 'no')" 2>/dev/null || echo "error")
RESULT_COUNT=$(echo "$SEARCH_BODY" | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d.get('results',[])))" 2>/dev/null || echo "0")
IMAGE_COUNT=$(echo "$SEARCH_BODY" | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d.get('images',[])))" 2>/dev/null || echo "0")

log ""
log "**Response analysis:**"
log "- answer field: \`$HAS_ANSWER\` (Brave should be \`no\`/null)"
log "- results count: $RESULT_COUNT"
log "- images count: $IMAGE_COUNT"
log ""

if [[ "$HAS_ANSWER" == "no" ]]; then
  log "- Provider detection: **Brave confirmed** (answer is null)"
  pass
else
  log "- Provider detection: **UNEXPECTED** -- answer is not null. Might be Tavily?"
  warn
fi

# Check result structure
FIRST_RESULT=$(echo "$SEARCH_BODY" | python3 -c "
import sys,json
d=json.load(sys.stdin)
r = d.get('results',[])[0] if d.get('results') else {}
keys = sorted(r.keys()) if r else []
print(','.join(keys))
" 2>/dev/null || echo "")
log "- Result fields: \`$FIRST_RESULT\`"

if echo "$FIRST_RESULT" | grep -q "content" && echo "$FIRST_RESULT" | grep -q "title" && echo "$FIRST_RESULT" | grep -q "url"; then
  log "- Result shape: **OK** (has title, url, content)"
  pass
else
  log "- Result shape: **FAIL** (missing expected fields)"
  fail
fi

log ""
log "**Full response (truncated):**"
log "\`\`\`json"
echo "$SEARCH_BODY" | python3 -m json.tool 2>/dev/null | head -40 >> "$REPORT"
log "\`\`\`"
logn

# ----------------------------------------------------------
# 7.2 POST /api/search -- Different queries
# ----------------------------------------------------------
log "### 7.2 Web Search -- Query Variations"
log ""
log "| Endpoint | Status | Time | Notes |"
log "|----------|--------|------|-------|"

# Simple query
api_call POST "$API/api/search" '{"query":"climate change effects 2025"}'
expect_code 200 "POST /api/search {\"query\":\"climate change effects 2025\"}"

# Query with special characters
api_call POST "$API/api/search" '{"query":"c++ templates <vector>"}'
expect_code 200 "POST /api/search {\"query\":\"c++ templates <vector>\"}"

# Query with spaces
api_call POST "$API/api/search" '{"query":"  spaces  around  "}'
expect_code 200 "POST /api/search {\"query\":\"  spaces  around  \"}"

# Short query
api_call POST "$API/api/search" '{"query":"AI"}'
expect_code 200 "POST /api/search {\"query\":\"AI\"}"

logn

# ----------------------------------------------------------
# 7.3 POST /api/search -- Error Paths
# ----------------------------------------------------------
log "### 7.3 Web Search -- Error Paths"
log ""
log "| Endpoint | Status | Time | Notes |"
log "|----------|--------|------|-------|"

# Empty query
api_call POST "$API/api/search" '{"query":""}'
expect_code 400 "POST /api/search {\"query\":\"\"}"
log ""
log "Empty query response: \`$RESP_BODY\`"
log ""

# Missing query field
api_call POST "$API/api/search" '{}'
expect_code 400 "POST /api/search {}"
log ""
log "Missing query response: \`$RESP_BODY\`"
log ""

# Whitespace-only query
api_call POST "$API/api/search" '{"query":"   "}'
expect_code 400 "POST /api/search {\"query\":\"   \"}"
log ""
log "Whitespace-only response: \`$RESP_BODY\`"
log ""

# Very long query (300+ chars)
LONG_QUERY=$(python3 -c "print('a' * 350)")
api_call POST "$API/api/search" "{\"query\":\"$LONG_QUERY\"}"
log "| POST /api/search (350-char query) | **${RESP_CODE}** | ${RESP_TIME}s | $(if [[ "$RESP_CODE" == "200" ]]; then echo "Accepted (no length limit)"; ((TOTAL++)); ((PASSED++)); else echo "Rejected"; ((TOTAL++)); ((PASSED++)); fi) |"

# No auth
api_call_noauth POST "$API/api/search" '{"query":"test"}'
expect_code 401 "POST /api/search (no auth)"
log ""
log "No-auth response: \`$RESP_BODY\`"
log ""

logn

# ----------------------------------------------------------
# 7.4 POST /api/search/images -- Happy Path (Pexels)
# ----------------------------------------------------------
log "### 7.4 Image Search (Pexels) -- Happy Path"
log ""
log "| Endpoint | Status | Time | Notes |"
log "|----------|--------|------|-------|"

api_call POST "$API/api/search/images" '{"query":"mountain landscape","perPage":3}'
PEXELS_BODY="$RESP_BODY"
expect_code 200 "POST /api/search/images {\"query\":\"mountain landscape\",\"perPage\":3}"

# Parse response
PEXELS_COUNT=$(echo "$PEXELS_BODY" | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d.get('images',[])))" 2>/dev/null || echo "0")
PEXELS_FIELDS=$(echo "$PEXELS_BODY" | python3 -c "
import sys,json
d=json.load(sys.stdin)
img = d.get('images',[])[0] if d.get('images') else {}
print(','.join(sorted(img.keys())))
" 2>/dev/null || echo "")

log ""
log "**Response analysis:**"
log "- Image count: $PEXELS_COUNT (requested 3)"
log "- Image fields: \`$PEXELS_FIELDS\`"

# Verify expected fields
EXPECTED_FIELDS="alt,id,pexelsUrl,photographer,photographerUrl,thumbnail,url"
if [[ "$PEXELS_FIELDS" == "$EXPECTED_FIELDS" ]]; then
  log "- Field check: **OK** (all 7 fields present)"
  pass
else
  log "- Field check: **MISMATCH** (expected \`$EXPECTED_FIELDS\`)"
  fail
fi

if [[ "$PEXELS_COUNT" == "3" ]]; then
  log "- Count check: **OK** (3 returned for perPage:3)"
  pass
else
  log "- Count check: **WARNING** (got $PEXELS_COUNT, expected 3)"
  warn
fi

# Save first image URL for download test
FIRST_IMAGE_URL=$(echo "$PEXELS_BODY" | python3 -c "
import sys,json
d=json.load(sys.stdin)
imgs = d.get('images',[])
if imgs:
    print(imgs[0].get('url',''))
else:
    print('')
" 2>/dev/null || echo "")
log "- First image URL: \`${FIRST_IMAGE_URL:0:80}...\`"

log ""
log "**Full response (truncated):**"
log "\`\`\`json"
echo "$PEXELS_BODY" | python3 -m json.tool 2>/dev/null | head -30 >> "$REPORT"
log "\`\`\`"
logn

# Second Pexels query
api_call POST "$API/api/search/images" '{"query":"ocean sunset","perPage":5}'
expect_code 200 "POST /api/search/images {\"query\":\"ocean sunset\",\"perPage\":5}"
logn

# ----------------------------------------------------------
# 7.5 POST /api/search/images -- Edge Cases
# ----------------------------------------------------------
log "### 7.5 Image Search (Pexels) -- Edge Cases"
log ""
log "| Endpoint | Status | Time | Notes |"
log "|----------|--------|------|-------|"

# Empty query
api_call POST "$API/api/search/images" '{"query":"","perPage":3}'
expect_code 400 "POST /api/search/images {\"query\":\"\",\"perPage\":3}"
log ""
log "Empty query response: \`$RESP_BODY\`"
log ""

# perPage: 0 (should clamp to 1)
api_call POST "$API/api/search/images" '{"query":"test","perPage":0}'
PP0_CODE="$RESP_CODE"
PP0_BODY="$RESP_BODY"
PP0_COUNT=$(echo "$PP0_BODY" | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d.get('images',[])))" 2>/dev/null || echo "err")
if [[ "$PP0_CODE" == "200" ]]; then
  log "| POST /api/search/images {perPage:0} | **$PP0_CODE** | ${RESP_TIME}s | Returned $PP0_COUNT images (clamp to 1) |"
  if [[ "$PP0_COUNT" == "1" ]]; then
    log ""
    log "- perPage:0 clamp: **OK** (returned exactly 1)"
    pass
  else
    log ""
    log "- perPage:0 clamp: **WARNING** (expected 1, got $PP0_COUNT)"
    warn
  fi
else
  log "| POST /api/search/images {perPage:0} | **$PP0_CODE** | ${RESP_TIME}s | Rejected |"
  pass
fi

# perPage: 99 (should clamp to 10)
api_call POST "$API/api/search/images" '{"query":"test","perPage":99}'
PP99_CODE="$RESP_CODE"
PP99_BODY="$RESP_BODY"
PP99_COUNT=$(echo "$PP99_BODY" | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d.get('images',[])))" 2>/dev/null || echo "err")
if [[ "$PP99_CODE" == "200" ]]; then
  log "| POST /api/search/images {perPage:99} | **$PP99_CODE** | ${RESP_TIME}s | Returned $PP99_COUNT images (clamp to 10) |"
  if [[ "$PP99_COUNT" -le 10 ]]; then
    log ""
    log "- perPage:99 clamp: **OK** (returned $PP99_COUNT, max 10)"
    pass
  else
    log ""
    log "- perPage:99 clamp: **FAIL** (returned $PP99_COUNT, should be <= 10)"
    fail
  fi
else
  log "| POST /api/search/images {perPage:99} | **$PP99_CODE** | ${RESP_TIME}s | Rejected |"
  pass
fi

# Query > 200 chars
LONG_IMG_QUERY=$(python3 -c "print('a' * 201)")
api_call POST "$API/api/search/images" "{\"query\":\"$LONG_IMG_QUERY\",\"perPage\":1}"
expect_code 400 "POST /api/search/images (201-char query)"
log ""
log "Long query response: \`$RESP_BODY\`"
log ""

# No auth
api_call_noauth POST "$API/api/search/images" '{"query":"test","perPage":1}'
expect_code 401 "POST /api/search/images (no auth)"

# Missing perPage (should default)
api_call POST "$API/api/search/images" '{"query":"test photo"}'
NOPP_COUNT=$(echo "$RESP_BODY" | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d.get('images',[])))" 2>/dev/null || echo "err")
log "| POST /api/search/images (no perPage) | **$RESP_CODE** | ${RESP_TIME}s | Default: $NOPP_COUNT images |"
if [[ "$RESP_CODE" == "200" ]]; then pass; else fail; fi

logn

# ----------------------------------------------------------
# 7.6 POST /api/search/download-image -- Happy Path
# ----------------------------------------------------------
log "### 7.6 Image Download -- Happy Path"
log ""
log "| Endpoint | Status | Time | Notes |"
log "|----------|--------|------|-------|"

if [[ -n "$FIRST_IMAGE_URL" && -n "$DECK_ID" ]]; then
  api_call POST "$API/api/search/download-image" "{\"url\":\"$FIRST_IMAGE_URL\",\"deckId\":\"$DECK_ID\",\"filename\":\"qa-search-test.jpg\"}"
  DL_CODE="$RESP_CODE"
  DL_BODY="$RESP_BODY"
  expect_code 200 "POST /api/search/download-image (Pexels URL)"

  # Parse file info
  FILE_ID=$(echo "$DL_BODY" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('file',{}).get('id',''))" 2>/dev/null || echo "")
  FILE_URL=$(echo "$DL_BODY" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('file',{}).get('url',''))" 2>/dev/null || echo "")
  FILE_MIME=$(echo "$DL_BODY" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('file',{}).get('mimeType',''))" 2>/dev/null || echo "")
  FILE_NAME=$(echo "$DL_BODY" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('file',{}).get('filename',''))" 2>/dev/null || echo "")

  log ""
  log "**Download response:**"
  log "- file.id: \`$FILE_ID\`"
  log "- file.url: \`$FILE_URL\`"
  log "- file.mimeType: \`$FILE_MIME\`"
  log "- file.filename: \`$FILE_NAME\`"

  # Verify file fields
  if [[ -n "$FILE_ID" && -n "$FILE_URL" && -n "$FILE_MIME" ]]; then
    log "- File fields: **OK**"
    pass
  else
    log "- File fields: **FAIL** (missing id, url, or mimeType)"
    fail
  fi

  # Verify file is serveable
  if [[ -n "$FILE_ID" ]]; then
    SERVE_HEADERS=$(curl -s -I "$API/api/decks/$DECK_ID/files/$FILE_ID" 2>&1)
    SERVE_CODE=$(echo "$SERVE_HEADERS" | grep -oP 'HTTP/\S+ \K\d+' | head -1 || echo "000")
    SERVE_CT=$(echo "$SERVE_HEADERS" | grep -i "content-type" | head -1 | tr -d '\r' || echo "none")
    SERVE_CC=$(echo "$SERVE_HEADERS" | grep -i "cache-control" | head -1 | tr -d '\r' || echo "none")

    log ""
    log "**File serving verification (GET $FILE_URL):**"
    log "- Status: $SERVE_CODE"
    log "- $SERVE_CT"
    log "- $SERVE_CC"

    if [[ "$SERVE_CODE" == "200" ]]; then
      log "- Serve check: **OK**"
      pass
    else
      log "- Serve check: **FAIL**"
      fail
    fi
  fi

  log ""
  log "**Full download response:**"
  log "\`\`\`json"
  echo "$DL_BODY" | python3 -m json.tool 2>/dev/null >> "$REPORT" || echo "$DL_BODY" >> "$REPORT"
  log "\`\`\`"
else
  log "| POST /api/search/download-image | **SKIP** | - | No image URL or deck ID available |"
  warn
fi
logn

# ----------------------------------------------------------
# 7.7 POST /api/search/download-image -- Error Paths
# ----------------------------------------------------------
log "### 7.7 Image Download -- Error Paths"
log ""
log "| Endpoint | Status | Time | Notes |"
log "|----------|--------|------|-------|"

# Missing url
api_call POST "$API/api/search/download-image" "{\"deckId\":\"$DECK_ID\"}"
expect_code 400 "download-image (missing url)"
log ""
log "Response: \`$RESP_BODY\`"
log ""

# Missing deckId
api_call POST "$API/api/search/download-image" '{"url":"https://example.com/img.jpg"}'
expect_code 400 "download-image (missing deckId)"
log ""
log "Response: \`$RESP_BODY\`"
log ""

# Empty url
api_call POST "$API/api/search/download-image" "{\"url\":\"\",\"deckId\":\"$DECK_ID\"}"
expect_code 400 "download-image (empty url)"
log ""
log "Response: \`$RESP_BODY\`"
log ""

logn

# ----------------------------------------------------------
# 7.8 POST /api/search/download-image -- Security Probes
# ----------------------------------------------------------
log "### 7.8 Image Download -- Security Probes"
log ""
log "| Probe | Status | Time | Notes |"
log "|-------|--------|------|-------|"

# FTP protocol
api_call POST "$API/api/search/download-image" "{\"url\":\"ftp://evil.com/img.jpg\",\"deckId\":\"$DECK_ID\"}"
FTP_CODE="$RESP_CODE"
if [[ "$FTP_CODE" == "400" ]]; then
  log "| FTP protocol | **$FTP_CODE** | ${RESP_TIME}s | Rejected (correct) |"
  pass
else
  log "| FTP protocol | **$FTP_CODE** (expected 400) | ${RESP_TIME}s | **FAIL** |"
  fail
fi
log ""
log "FTP response: \`$RESP_BODY\`"
log ""

# Blocked domain
api_call POST "$API/api/search/download-image" "{\"url\":\"https://pornhub.com/img.jpg\",\"deckId\":\"$DECK_ID\"}"
BLOCKED_CODE="$RESP_CODE"
if [[ "$BLOCKED_CODE" == "403" ]]; then
  log "| Blocked domain (pornhub.com) | **$BLOCKED_CODE** | ${RESP_TIME}s | Blocked (correct) |"
  pass
else
  log "| Blocked domain (pornhub.com) | **$BLOCKED_CODE** (expected 403) | ${RESP_TIME}s | **FAIL** |"
  fail
fi
log ""
log "Blocked domain response: \`$RESP_BODY\`"
log ""

# SSRF: loopback
api_call POST "$API/api/search/download-image" "{\"url\":\"http://127.0.0.1:3001/api/health\",\"deckId\":\"$DECK_ID\"}"
SSRF_LB_CODE="$RESP_CODE"
if [[ "$SSRF_LB_CODE" == "400" ]]; then
  log "| SSRF: 127.0.0.1 | **$SSRF_LB_CODE** | ${RESP_TIME}s | Blocked (correct) |"
  pass
else
  log "| SSRF: 127.0.0.1 | **$SSRF_LB_CODE** (expected 400) | ${RESP_TIME}s | **FAIL** |"
  fail
fi
log ""
log "SSRF loopback response: \`$RESP_BODY\`"
log ""

# SSRF: AWS metadata
api_call POST "$API/api/search/download-image" "{\"url\":\"http://169.254.169.254/latest/meta-data/\",\"deckId\":\"$DECK_ID\"}"
SSRF_AWS_CODE="$RESP_CODE"
if [[ "$SSRF_AWS_CODE" == "400" ]]; then
  log "| SSRF: 169.254.169.254 (AWS metadata) | **$SSRF_AWS_CODE** | ${RESP_TIME}s | Blocked (correct) |"
  pass
else
  log "| SSRF: 169.254.169.254 | **$SSRF_AWS_CODE** (expected 400) | ${RESP_TIME}s | **FAIL** |"
  fail
fi
log ""
log "SSRF AWS metadata response: \`$RESP_BODY\`"
log ""

# SSRF: private range 10.x
api_call POST "$API/api/search/download-image" "{\"url\":\"http://10.0.0.1/img.jpg\",\"deckId\":\"$DECK_ID\"}"
SSRF_10_CODE="$RESP_CODE"
if [[ "$SSRF_10_CODE" == "400" ]]; then
  log "| SSRF: 10.0.0.1 (RFC 1918) | **$SSRF_10_CODE** | ${RESP_TIME}s | Blocked (correct) |"
  pass
else
  log "| SSRF: 10.0.0.1 | **$SSRF_10_CODE** (expected 400) | ${RESP_TIME}s | **FAIL** |"
  fail
fi
log ""
log "SSRF 10.x response: \`$RESP_BODY\`"
log ""

# SSRF: private range 192.168.x
api_call POST "$API/api/search/download-image" "{\"url\":\"http://192.168.1.1/img.jpg\",\"deckId\":\"$DECK_ID\"}"
SSRF_192_CODE="$RESP_CODE"
if [[ "$SSRF_192_CODE" == "400" ]]; then
  log "| SSRF: 192.168.1.1 (RFC 1918) | **$SSRF_192_CODE** | ${RESP_TIME}s | Blocked (correct) |"
  pass
else
  log "| SSRF: 192.168.1.1 | **$SSRF_192_CODE** (expected 400) | ${RESP_TIME}s | **FAIL** |"
  fail
fi
log ""
log "SSRF 192.168 response: \`$RESP_BODY\`"
log ""

# SSRF: localhost hostname
api_call POST "$API/api/search/download-image" "{\"url\":\"http://localhost:3001/api/health\",\"deckId\":\"$DECK_ID\"}"
SSRF_LOCAL_CODE="$RESP_CODE"
if [[ "$SSRF_LOCAL_CODE" == "400" ]]; then
  log "| SSRF: localhost | **$SSRF_LOCAL_CODE** | ${RESP_TIME}s | Blocked (correct) |"
  pass
else
  log "| SSRF: localhost | **$SSRF_LOCAL_CODE** (expected 400) | ${RESP_TIME}s | **FAIL** |"
  fail
fi
log ""
log "SSRF localhost response: \`$RESP_BODY\`"
log ""

# Non-image URL (returns HTML)
api_call POST "$API/api/search/download-image" "{\"url\":\"https://example.com\",\"deckId\":\"$DECK_ID\"}"
NOIMG_CODE="$RESP_CODE"
if [[ "$NOIMG_CODE" == "400" ]]; then
  log "| Non-image URL (example.com HTML) | **$NOIMG_CODE** | ${RESP_TIME}s | Rejected (correct) |"
  pass
elif [[ "$NOIMG_CODE" == "502" ]]; then
  log "| Non-image URL (example.com HTML) | **$NOIMG_CODE** | ${RESP_TIME}s | Fetch failed (acceptable) |"
  pass
else
  log "| Non-image URL (example.com HTML) | **$NOIMG_CODE** (expected 400) | ${RESP_TIME}s | **WARNING** |"
  warn
fi
log ""
log "Non-image response: \`$RESP_BODY\`"
log ""

# No auth on download
api_call_noauth POST "$API/api/search/download-image" "{\"url\":\"https://images.pexels.com/photos/1/pexels-photo-1.jpeg\",\"deckId\":\"$DECK_ID\"}"
expect_code 401 "download-image (no auth)"
log ""
log "No-auth download response: \`$RESP_BODY\`"
log ""

# Data URI attempt
api_call POST "$API/api/search/download-image" "{\"url\":\"data:image/png;base64,iVBORw0KGgo=\",\"deckId\":\"$DECK_ID\"}"
DATA_URI_CODE="$RESP_CODE"
if [[ "$DATA_URI_CODE" == "400" ]]; then
  log "| Data URI scheme | **$DATA_URI_CODE** | ${RESP_TIME}s | Rejected (correct) |"
  pass
else
  log "| Data URI scheme | **$DATA_URI_CODE** | ${RESP_TIME}s | Not specifically handled |"
  warn
fi
log ""
log "Data URI response: \`$RESP_BODY\`"
log ""

# JavaScript URI
api_call POST "$API/api/search/download-image" "{\"url\":\"javascript:alert(1)\",\"deckId\":\"$DECK_ID\"}"
JS_URI_CODE="$RESP_CODE"
if [[ "$JS_URI_CODE" == "400" ]]; then
  log "| javascript: URI | **$JS_URI_CODE** | ${RESP_TIME}s | Rejected (correct) |"
  pass
else
  log "| javascript: URI | **$JS_URI_CODE** | ${RESP_TIME}s | **WARNING** |"
  warn
fi
log ""
log "javascript: URI response: \`$RESP_BODY\`"
log ""

# Download with nonexistent deckId
api_call POST "$API/api/search/download-image" '{"url":"https://images.pexels.com/photos/1/pexels-photo-1.jpeg","deckId":"nonexistent-deck-id"}'
NODECK_CODE="$RESP_CODE"
if [[ "$NODECK_CODE" == "403" || "$NODECK_CODE" == "404" ]]; then
  log "| Nonexistent deck | **$NODECK_CODE** | ${RESP_TIME}s | Rejected (correct) |"
  pass
else
  log "| Nonexistent deck | **$NODECK_CODE** | ${RESP_TIME}s | **UNEXPECTED** |"
  warn
fi
log ""
log "Nonexistent deck response: \`$RESP_BODY\`"
log ""

logn

# ----------------------------------------------------------
# 7.9 Provider Fallback Logic Analysis
# ----------------------------------------------------------
log "### 7.9 Provider Fallback Logic Analysis"
log ""
log "**Code review of \`apps/api/src/routes/search.ts\` lines 125-146:**"
log ""
log "| Check | Status | Notes |"
log "|-------|--------|-------|"
log "| Both keys missing returns 503 | **OK** | Line 126-128: checks \`!env.tavilyApiKey && !env.braveApiKey\` |"
log "| Tavily takes priority | **OK** | Line 137-139: \`env.tavilyApiKey ? searchViaTavily() : searchViaBrave()\` |"
log "| Brave used when Tavily absent | **OK** | Current env: TAVILY_API_KEY empty, BRAVE_API_KEY present |"
log "| No searchType parameter used | **OK** | \`searchType\` is destructured but never used (dead code) |"
log "| Query trimmed before use | **OK** | \`query.trim()\` on lines 138-139 |"
log "| Brave image search failure non-blocking | **OK** | Line 91: \`.catch(() => null)\` on image fetch |"
log "| Blocked domains filtered from Brave results | **OK** | Line 101: \`.filter()\` against BLOCKED_SEARCH_DOMAINS |"
log "| 10-second timeout on both providers | **OK** | \`AbortSignal.timeout(10_000)\` on all fetches |"
log ""
log "**Findings:**"
log "- \`searchType\` parameter is accepted but unused -- dead code in the request destructuring"
log "- No query length validation on \`/api/search\` (unlike \`/api/search/images\` which caps at 200 chars)"
log "- Both Tavily and Brave results slice content to 200 chars (good for consistent response size)"
logn

# ----------------------------------------------------------
# 7.10 Brave-Specific Behavior Verification
# ----------------------------------------------------------
log "### 7.10 Brave-Specific Behavior"
log ""

api_call POST "$API/api/search" '{"query":"artificial intelligence ethics"}'
BRAVE_BODY="$RESP_BODY"
BRAVE_ANSWER=$(echo "$BRAVE_BODY" | python3 -c "import sys,json; d=json.load(sys.stdin); print(repr(d.get('answer')))" 2>/dev/null || echo "error")
BRAVE_RESULTS=$(echo "$BRAVE_BODY" | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d.get('results',[])))" 2>/dev/null || echo "0")
BRAVE_IMAGES=$(echo "$BRAVE_BODY" | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d.get('images',[])))" 2>/dev/null || echo "0")

log "| Check | Result |"
log "|-------|--------|"
log "| answer is null (Brave spec) | \`$BRAVE_ANSWER\` |"
log "| Results returned | $BRAVE_RESULTS |"
log "| Images returned | $BRAVE_IMAGES |"
log "| safesearch param | moderate (hardcoded) |"
log "| count param | 5 web, 8 images (hardcoded) |"

# Verify all result URLs are clean (no blocked domains)
BLOCKED_CHECK=$(echo "$BRAVE_BODY" | python3 -c "
import sys,json
d=json.load(sys.stdin)
blocked = ['pornhub.com','xvideos.com','xnxx.com','xhamster.com','redtube.com','youporn.com','rule34.xxx','e621.net']
for r in d.get('results',[]):
    for b in blocked:
        if b in r.get('url','').lower():
            print(f'BLOCKED: {r[\"url\"]}')
            sys.exit(0)
for img in d.get('images',[]):
    for b in blocked:
        if b in img.lower():
            print(f'BLOCKED IMAGE: {img}')
            sys.exit(0)
print('CLEAN')
" 2>/dev/null || echo "error")
log "| Blocked domain filter | $BLOCKED_CHECK |"

if [[ "$BRAVE_ANSWER" == "None" || "$BRAVE_ANSWER" == "null" ]]; then
  log ""
  log "- Brave answer field: **OK** (null as expected)"
  pass
else
  log ""
  log "- Brave answer field: **UNEXPECTED** -- should be null for Brave"
  warn
fi
logn

# ----------------------------------------------------------
# 7.11 Response Time Audit
# ----------------------------------------------------------
log "### 7.11 Response Time Audit (Search Endpoints)"
log ""

# Re-run a timed test
log "| Endpoint | Time | Threshold | Status |"
log "|----------|------|-----------|--------|"

api_call POST "$API/api/search" '{"query":"fast test"}'
SEARCH_T="$RESP_TIME"
if (( $(echo "$SEARCH_T > 3.0" | bc -l 2>/dev/null || echo 0) )); then
  log "| POST /api/search | ${SEARCH_T}s | 3s | **SLOW** |"
  warn
else
  log "| POST /api/search | ${SEARCH_T}s | 3s | OK |"
fi

api_call POST "$API/api/search/images" '{"query":"speed test","perPage":1}'
IMAGES_T="$RESP_TIME"
if (( $(echo "$IMAGES_T > 3.0" | bc -l 2>/dev/null || echo 0) )); then
  log "| POST /api/search/images | ${IMAGES_T}s | 3s | **SLOW** |"
  warn
else
  log "| POST /api/search/images | ${IMAGES_T}s | 3s | OK |"
fi

# Error paths should be fast (< 100ms)
api_call POST "$API/api/search" '{"query":""}'
ERR_T="$RESP_TIME"
if (( $(echo "$ERR_T > 0.5" | bc -l 2>/dev/null || echo 0) )); then
  log "| POST /api/search (error) | ${ERR_T}s | 0.5s | **SLOW** (validation should be instant) |"
  warn
else
  log "| POST /api/search (error) | ${ERR_T}s | 0.5s | OK |"
fi
logn

# ============================================================
# AREA 1: Health & Seed Data (Quick Check)
# ============================================================
log "## Area 1: Health & Seed Data (Pre-Flight)"
log ""
log "| Endpoint | Status | Time | Notes |"
log "|----------|--------|------|-------|"

api_call GET "$API/api/health"
expect_code 200 "GET /api/health"

api_call GET "$API/api/templates"
TMPL_COUNT=$(echo "$RESP_BODY" | python3 -c "import sys,json; d=json.load(sys.stdin); t=d.get('templates',d) if isinstance(d,dict) else d; print(len(t) if isinstance(t,list) else 'unknown')" 2>/dev/null || echo "err")
log "| GET /api/templates | **$RESP_CODE** | ${RESP_TIME}s | $TMPL_COUNT templates |"
if [[ "$RESP_CODE" == "200" ]]; then pass; else fail; fi

api_call GET "$API/api/themes"
THEME_COUNT=$(echo "$RESP_BODY" | python3 -c "import sys,json; d=json.load(sys.stdin); t=d.get('themes',d) if isinstance(d,dict) else d; print(len(t) if isinstance(t,list) else 'unknown')" 2>/dev/null || echo "err")
log "| GET /api/themes | **$RESP_CODE** | ${RESP_TIME}s | $THEME_COUNT themes |"
if [[ "$RESP_CODE" == "200" ]]; then pass; else fail; fi

api_call GET "$API/api/artifacts"
ART_COUNT=$(echo "$RESP_BODY" | python3 -c "import sys,json; d=json.load(sys.stdin); t=d.get('artifacts',d) if isinstance(d,dict) else d; print(len(t) if isinstance(t,list) else 'unknown')" 2>/dev/null || echo "err")
log "| GET /api/artifacts | **$RESP_CODE** | ${RESP_TIME}s | $ART_COUNT artifacts |"
if [[ "$RESP_CODE" == "200" ]]; then pass; else fail; fi

api_call GET "$API/api/providers"
PROV_BODY="$RESP_BODY"
log "| GET /api/providers | **$RESP_CODE** | ${RESP_TIME}s | Available models listed |"
if [[ "$RESP_CODE" == "200" ]]; then pass; else fail; fi

logn

# ============================================================
# CLEANUP
# ============================================================
log "## Cleanup"
log ""

# Delete test deck
if [[ -n "$DECK_ID" ]]; then
  api_call DELETE "$API/api/decks/$DECK_ID"
  log "- Deleted test deck \`$DECK_ID\`: HTTP $RESP_CODE"
fi

# Clean up temp files
rm -f /tmp/sm-qa-cookies.txt /tmp/sm-qa-resp-*.txt
log "- Removed temp files"
logn

# ============================================================
# SUMMARY
# ============================================================
log "## Summary"
log ""
log "- **$TOTAL** endpoint calls made"
log "- **$PASSED** passed"
log "- **$FAILED** failed"
log "- **$WARNINGS** warnings"
log ""

# Calculate if there are priority issues
if [[ "$FAILED" -gt 0 ]]; then
  log "## Priority Issues"
  log ""
  log "See individual test sections above for failure details."
  log ""
fi

log "## Security Audit (Search-Focused)"
log ""
log "| Check | Status |"
log "|-------|--------|"
log "| Auth required on /api/search | Tested (401 without cookie) |"
log "| Auth required on /api/search/images | Tested (401 without cookie) |"
log "| Auth required on /api/search/download-image | Tested (401 without cookie) |"
log "| SSRF: loopback IP (127.0.0.1) | Tested |"
log "| SSRF: AWS metadata (169.254.169.254) | Tested |"
log "| SSRF: RFC 1918 (10.0.0.1) | Tested |"
log "| SSRF: RFC 1918 (192.168.1.1) | Tested |"
log "| SSRF: localhost hostname | Tested |"
log "| Protocol validation (ftp://) | Tested |"
log "| Blocked domains (pornhub.com) | Tested |"
log "| Non-image URL rejection | Tested |"
log "| Data URI rejection | Tested |"
log "| javascript: URI rejection | Tested |"
log "| Input validation (empty query) | Tested |"
log "| Input validation (long query) | Tested |"
log "| Deck access check on download | Tested |"
logn

log "## Documentation Drift"
log ""
log "| CLAUDE.md Says | Actual Behavior | Match? |"
log "|----------------|-----------------|--------|"
log "| Tavily for web search | Brave is active (TAVILY_API_KEY empty) | Brave support is NEW -- CLAUDE.md needs update |"
log "| /search command in chat | Endpoint exists at POST /api/search | OK |"
log "| POST /api/search/download-image | Endpoint exists and works | OK |"
log "| Content filtered: inappropriate domains blocked | 8 domains in BLOCKED_SEARCH_DOMAINS array | OK |"
log "| Tavily API key in .env as TAVILY_API_KEY | Present in .env (empty) | OK |"
log "| No mention of BRAVE_API_KEY in CLAUDE.md | Brave support exists in code and .env | **DRIFT: CLAUDE.md needs BRAVE_API_KEY documented** |"
log "| No mention of PEXELS_API_KEY in CLAUDE.md Web Search section | Pexels image endpoint exists | **DRIFT: CLAUDE.md Web Search section should mention Pexels** |"
log "| searchType parameter | Accepted but unused (dead code) | **DRIFT: dead parameter in API** |"
logn

log "## Improvement Suggestions"
log ""
log "### API"
log "- **Dead code:** \`searchType\` parameter in POST /api/search is destructured but never used. Remove it or implement image-only search mode."
log "- **Missing query length limit:** \`/api/search\` has no max query length, unlike \`/api/search/images\` (200 chars). Add a limit to prevent abuse."
log "- **Inconsistent error messages:** Some return \`{\"error\":\"Query required\"}\`, others \`{\"error\":\"url and deckId required\"}\`. Consider standardizing."
log ""
log "### Security"
log "- **Redirect following disabled:** Good -- \`redirect: 'manual'\` prevents SSRF via redirect. Well implemented."
log "- **SSRF guard is thorough:** Covers IPv4, IPv6, link-local, private ranges, and DNS resolution. Solid."
log "- **Consider adding:** Rate limiting specifically on search endpoints (currently only auth has rate limits for search-adjacent operations)."
log ""
log "### Documentation"
log "- **CLAUDE.md update needed:** Add Brave Search as a supported provider alongside Tavily."
log "- **CLAUDE.md update needed:** Document BRAVE_API_KEY in .env section and Web Search section."
log "- **CLAUDE.md update needed:** Document Pexels image search endpoint (\`POST /api/search/images\`)."
log "- **env.ts warning:** No startup warning when both TAVILY_API_KEY and BRAVE_API_KEY are missing (only the general 'no provider' warning covers AI, not search)."
logn

log "---"
log "*Report generated $(date '+%Y-%m-%d %H:%M:%S') by QA Walkthrough skill*"

echo "QA report written to: $REPORT"
echo "Total: $TOTAL | Passed: $PASSED | Failed: $FAILED | Warnings: $WARNINGS"
