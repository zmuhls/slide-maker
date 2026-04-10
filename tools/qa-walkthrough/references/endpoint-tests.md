# Endpoint Test Matrix

Complete per-endpoint test payloads, expected responses, and error-path probes. Referenced by the main skill when testing each area.

## Table of Contents
- [Auth (5 endpoints)](#auth)
- [Decks (5 endpoints)](#decks)
- [Slides (4 endpoints)](#slides)
- [Blocks (4 endpoints)](#blocks)
- [Chat (4 endpoints)](#chat)
- [Search (3 endpoints)](#search)
- [Files (4 endpoints)](#files)
- [Export & Preview (2 endpoints)](#export--preview)
- [Resources (5 endpoints)](#resources)
- [Admin (5 endpoints)](#admin)
- [Sharing (4 endpoints)](#sharing)
- [Locking & Presence (5 endpoints)](#locking--presence)
- [Static & Health (3 endpoints)](#static--health)

---

## Auth

### POST /api/auth/register
**Rate limited:** 3/hour

Happy path:
```json
{"email":"testuser@gc.cuny.edu","password":"TestPass123","name":"Test User"}
```
Expect: 201, `{ message: "..." }`

Error paths:
| Payload | Expect | Check |
|---------|--------|-------|
| `{"email":"test@gmail.com","password":"12345678","name":"X"}` | 400 | Non-CUNY email rejected |
| `{"email":"test@gc.cuny.edu","password":"short","name":"X"}` | 400 | Password < 8 chars |
| `{"email":"","password":"12345678","name":"X"}` | 400 | Empty email |
| `{"password":"12345678","name":"X"}` | 400 | Missing email field |
| `{"email":"zmuhlbauer@gc.cuny.edu","password":"12345678","name":"Dup"}` | 400 | Duplicate email |

### POST /api/auth/login
**Rate limited:** 5/15 min

Happy path:
```json
{"email":"zmuhlbauer@gc.cuny.edu","password":"<from .env>"}
```
Expect: 200, `{ user: { id, email, name, role, status } }` + Set-Cookie header

Error paths:
| Payload | Expect | Check |
|---------|--------|-------|
| `{"email":"zmuhlbauer@gc.cuny.edu","password":"wrong"}` | 400 | Generic error (no info leak) |
| `{"email":"nobody@gc.cuny.edu","password":"anything"}` | 400 | Same generic error (no enumeration) |
| `{}` | 400 | Empty body |
| `{"email":"zmuhlbauer@gc.cuny.edu"}` | 400 | Missing password |

### GET /api/auth/me
Expect: 200, `{ user: { id, email, name, role, status } }`

Error paths:
| Condition | Expect |
|-----------|--------|
| No cookie | 401 |
| Expired/invalid cookie | 401 |

### POST /api/auth/logout
Expect: 200, `{ message: "..." }`, session cookie cleared

### GET /api/auth/verify?token=xxx
Expect: 200 for valid token, 400 for invalid/expired/missing

---

## Decks

### POST /api/decks
```json
{"name":"QA Test Deck"}
```
Expect: 201, `{ id, name, slug }` -- slug derived from name

Error paths:
| Payload | Expect |
|---------|--------|
| `{}` | 400 (missing name) |
| `{"name":""}` | 400 |
| No auth | 401 |

### GET /api/decks
Expect: 200, `{ decks: [...] }` -- only decks user has access to, ordered by updatedAt DESC

### GET /api/decks/:id
Expect: 200, full deck with nested slides array, each slide has blocks array

Error paths:
| Condition | Expect |
|-----------|--------|
| Nonexistent ID | 404 |
| No access | 404 |
| No auth | 401 |

### PATCH /api/decks/:id
```json
{"name":"Updated Name","themeId":"<theme_id>"}
```
Expect: 200, updated deck object

Error paths:
| Condition | Expect |
|-----------|--------|
| Viewer role | 403 |
| No access | 404 |

### DELETE /api/decks/:id
Expect: 200, `{ message: "..." }` -- cascading delete

Error paths:
| Condition | Expect |
|-----------|--------|
| Not owner | 403 |
| No access | 404 |

---

## Slides

### POST /api/decks/:id/slides
Happy path (simple):
```json
{"layout":"layout-split"}
```

Happy path (with modules):
```json
{
  "layout":"layout-split",
  "modules":[
    {"type":"heading","zone":"content","data":{"text":"Test","level":1}},
    {"type":"text","zone":"stage","data":{"html":"<p>Body</p>"}}
  ]
}
```

With insertAfter:
```json
{"layout":"layout-content","insertAfter":"<existing_slide_id>"}
```

Error paths:
| Payload | Expect | Check |
|---------|--------|-------|
| `{"layout":"invalid"}` | Check | Does it reject or default? |
| `{"modules":[{"type":"fake","zone":"content","data":{}}]}` | 400 | Invalid block type |
| `{"insertAfter":"nonexistent"}` | 400 | Bad insertAfter ID |
| Viewer role | 403 | |

### PATCH /api/decks/:id/slides/:slideId
```json
{"splitRatio":"40/60","notes":"Speaker notes here","layout":"layout-content"}
```

### DELETE /api/decks/:id/slides/:slideId
Expect: 200, remaining slides re-ordered

### POST /api/decks/:id/slides/reorder
```json
{"order":["<slideId3>","<slideId1>","<slideId2>"]}
```

Error paths:
| Payload | Expect |
|---------|--------|
| `{"order":"not-array"}` | 400 |
| `{}` | 400 |

---

## Blocks

### POST /api/decks/:id/slides/:slideId/blocks

Test payloads for all 14 module types:

```json
// heading
{"type":"heading","zone":"content","data":{"text":"QA Heading","level":2}}

// text
{"type":"text","zone":"content","data":{"html":"<p>QA paragraph with <strong>bold</strong></p>"}}

// card
{"type":"card","zone":"content","data":{"title":"QA Card","body":"Card content here","variant":"cyan"}}

// label
{"type":"label","zone":"content","data":{"text":"QA Label","color":"blue"}}

// tip-box
{"type":"tip-box","zone":"content","data":{"title":"QA Tip","content":"Tip box content"}}

// prompt-block
{"type":"prompt-block","zone":"stage","data":{"content":"console.log('hello world')","quality":"good","language":"javascript"}}

// image (placeholder — use a real file URL after uploading)
{"type":"image","zone":"stage","data":{"src":"/api/decks/<deckId>/files/<fileId>","alt":"QA test image","caption":"Test caption"}}

// carousel
{"type":"carousel","zone":"stage","data":{"items":[{"src":"/api/decks/<deckId>/files/<fileId>","caption":"Slide 1"}],"syncSteps":false}}

// comparison
{"type":"comparison","zone":"stage","data":{"panels":[{"title":"Before","content":"Old approach"},{"title":"After","content":"New approach"}]}}

// card-grid
{"type":"card-grid","zone":"stage","data":{"cards":[{"title":"Card A","content":"First card","color":"cyan"},{"title":"Card B","content":"Second card","color":"navy"}],"columns":2}}

// flow
{"type":"flow","zone":"content","data":{"nodes":[{"label":"Input","description":"Raw data"},{"label":"Process","description":"Transform"},{"label":"Output","description":"Results"}]}}

// stream-list
{"type":"stream-list","zone":"content","data":{"items":["First item","Second item","Third item"]}}

// artifact (native — use a known built-in name)
{"type":"artifact","zone":"stage","data":{"artifactName":"truchet-tiles","config":{}}}

// video
{"type":"video","zone":"stage","data":{"url":"https://www.youtube.com/watch?v=dQw4w9WgXcQ","caption":"Test video embed"}}
```

Error paths:
| Payload | Expect |
|---------|--------|
| `{"type":"nonexistent","zone":"content","data":{}}` | 400 |
| `{"type":"heading","zone":"content"}` (no data) | Check behavior |
| Wrong slideId | 404 |
| Viewer role | 403 |

### PATCH /api/decks/:id/slides/:slideId/blocks/:blockId
Data is shallow-merged with existing. Test:
```json
{"data":{"text":"Updated heading text"}}
```
Zone transfer:
```json
{"zone":"stage"}
```
Step order:
```json
{"stepOrder":2}
```

### DELETE /api/decks/:id/slides/:slideId/blocks/:blockId
Expect: 200, `{ message: "..." }`

### POST /api/decks/:id/slides/:slideId/blocks/reorder
```json
{"order":["<blockId3>","<blockId1>","<blockId2>"]}
```

---

## Chat

### POST /api/chat
**Rate limited:** 30/minute
**Response:** SSE stream

```json
{
  "message": "say hello in exactly 5 words",
  "deckId": "<deck_id>",
  "modelId": "<model_id from /api/providers>",
  "activeSlideId": "<slide_id or null>"
}
```

SSE events to expect:
- `data: {"type":"text","content":"..."}`
- `data: {"type":"done"}`
- On error: `data: {"type":"error","message":"..."}`

Error paths:
| Payload | Expect |
|---------|--------|
| Missing `message` | 400 |
| Missing `deckId` | 400 |
| Missing `modelId` | 400 |
| Nonexistent deck | 404 |
| No auth | 401 |
| Token cap exceeded (if testable) | 429 |

### POST /api/chat/:deckId/messages
```json
{"messages":[{"role":"user","content":"test"},{"role":"assistant","content":"response"}]}
```

Error paths:
| Payload | Expect |
|---------|--------|
| `{"messages":[]}` | 400 (min 1) |
| 11+ messages | 400 (max 10) |
| `{"messages":[{"role":"system","content":"x"}]}` | 400 (invalid role) |
| `{"messages":[{"role":"user","content":""}]}` | 400 (empty content) |
| Viewer role | 403 |

### GET /api/chat/:deckId/history
Expect: 200, `{ messages: [...] }` ordered by createdAt ASC

### DELETE /api/chat/:deckId/history
```json
{"confirm":"<deckId>"}
```

Error paths:
| Payload | Expect |
|---------|--------|
| `{"confirm":"wrong-id"}` | 400 |
| `{}` | 400 |
| Viewer role | 403 |

---

## Search

### POST /api/search
```json
{"query":"quantum computing"}
```
Expect: `{ answer: string|null, results: [{title,url,content}], images: string[] }`

Brave response: answer is null, results from web.results, images from image search
Tavily response: answer is a string, results from Tavily results

Error paths:
| Payload | Expect |
|---------|--------|
| `{"query":""}` | 400 |
| `{}` | 400 |
| No auth | 401 |
| Both keys missing | 503 |

Edge cases:
| Payload | Check |
|---------|-------|
| `{"query":"c++ templates <vector>"}` | Special chars handled |
| `{"query":"a".repeat(500)}` | Very long query |
| `{"query":"  spaces  "}` | Trimming |

### POST /api/search/images
```json
{"query":"mountain landscape","perPage":3}
```
Expect: `{ images: [{ id, url, thumbnail, alt, photographer, photographerUrl, pexelsUrl }] }`

Edge cases:
| Payload | Expected Behavior |
|---------|-------------------|
| `{"query":"x","perPage":0}` | Clamped to 1 |
| `{"query":"x","perPage":99}` | Clamped to 10 |
| `{"query":"a".repeat(201)}` | 400 (max 200 chars) |
| `{"query":""}` | 400 |

### POST /api/search/download-image
```json
{"url":"<image_url>","deckId":"<id>","filename":"test.jpg"}
```
Expect: `{ file: { id, filename, mimeType, url } }`

Security probes:
| Payload | Expect | Check |
|---------|--------|-------|
| `{"url":"ftp://evil.com/x","deckId":"<id>"}` | 400 | Protocol validation |
| `{"url":"http://127.0.0.1:3001","deckId":"<id>"}` | 400 | SSRF: loopback |
| `{"url":"http://169.254.169.254/","deckId":"<id>"}` | 400 | SSRF: AWS metadata |
| `{"url":"http://10.0.0.1/","deckId":"<id>"}` | 400 | SSRF: private range |
| `{"url":"https://pornhub.com/x.jpg","deckId":"<id>"}` | 403 | Blocked domain |
| `{"url":"https://example.com","deckId":"<id>"}` | 400 | Not an image |
| `{"deckId":"<id>"}` | 400 | Missing URL |
| `{"url":"https://example.com/x.jpg"}` | 400 | Missing deckId |
| Viewer role | 403 | Access control |

---

## Files

### POST /api/decks/:deckId/files
Multipart form data with `file` field.

Allowed MIME types: images (jpeg, png, gif, webp, svg+xml), PDF, Office docs, text, JSON, GeoJSON.
Max 10MB per file, 50MB total per deck.

Error paths:
| Condition | Expect |
|-----------|--------|
| No file field | 400 |
| File > 10MB | 400 |
| Total > 50MB | 400 |
| Unsupported MIME | 400 |
| Viewer role | 403 |
| No deck access | 404 |

### GET /api/decks/:deckId/files
Expect: `{ files: [{ id, filename, mimeType, url, createdAt }] }`

### GET /api/decks/:deckId/files/:fileId
**No auth required** (CUID security)
Response: raw file data
Headers: Content-Type from record, Cache-Control: public, max-age=86400
SVG: Content-Disposition: attachment (XSS prevention)

### DELETE /api/decks/:deckId/files/:fileId
Expect: `{ success: true }`

---

## Export & Preview

### POST /api/decks/:id/export
Response: application/zip binary
Headers: Content-Disposition: attachment; filename="<slug>.zip"

Validate ZIP contents:
- `index.html` -- HTML5, sections per slide, layout classes
- `css/styles.css` -- non-empty, has layout classes
- `js/engine.js` -- non-empty
- `assets/` -- if deck has uploaded images
- `js/artifacts.js` -- if deck has native artifacts
- `artifacts/` -- if deck has iframe artifacts

### GET /api/decks/:id/preview
Response: text/html full deck preview
Check: slide sections, framework CSS inline, artifact references

---

## Resources

### GET /api/templates
Expect: `{ templates: [...] }` -- seeded templates with layout, modules

### GET /api/themes
Expect: `{ themes: [...] }` -- each has id, name, colors, fonts, css, builtIn

### POST /api/themes
```json
{
  "name": "QA Theme",
  "colors": {"primary":"#ff6600","secondary":"#003366","background":"#ffffff","text":"#111111","accent":"#00cc99"},
  "fonts": {"heading":"Georgia","body":"Verdana"}
}
```

Validation:
| Payload | Expect |
|---------|--------|
| `{"name":"Bad","colors":{"primary":"red"}}` | 400 (not hex) |
| `{"name":"Bad","fonts":{"heading":"<script>"}}` | 400 (invalid chars) |
| `{"colors":{"primary":"#fff"}}` | 400 (missing name) |

### DELETE /api/themes/:id
Custom theme: 200, `{ ok: true }`
Built-in theme: 403

### GET /api/artifacts
Expect: `{ artifacts: [...] }` -- each has name, type, description

---

## Admin

### GET /api/admin/users/all
Expect: `{ users: [...], stats: { totalUsers, pendingApproval, totalDecks, totalTokens } }`
Each user: id, name, email, role, status, emailVerified, createdAt, tokenCap, deckCount, tokensUsed, lastActive

### GET /api/admin/users?status=pending
Expect: filtered user list

### PATCH /api/admin/users/:id
```json
{"tokenCap": 2000000}
```

Validation:
| Payload | Expect |
|---------|--------|
| `{"role":"invalid"}` | 400 |
| `{"tokenCap":-1}` | 400 |
| Nonexistent user | 404 |

### GET /api/admin/users/:id/usage
Expect: `{ userId, userName, tokenCap, totalUsed, remaining, inputTotal, outputTotal, monthly: [...], byModel: [...] }`

### POST /api/admin/users/:id/approve
Expect: 200, sets status to "approved"

### POST /api/admin/users/:id/reject
Expect: 200, sets status to "rejected"

---

## Sharing

### GET /api/decks/users/search?q=xxx
Min 2 chars, max 8 results, approved users only
`?q=x` returns empty (too short)

### POST /api/decks/:id/share
```json
{"email":"other@gc.cuny.edu","role":"editor"}
```
Owner only. Cannot share with self.

### DELETE /api/decks/:id/share/:userId
Owner only. Cannot remove owner.

### GET /api/decks/:id/collaborators
Expect: `{ collaborators: [{ userId, role, name, email }] }`

---

## Locking & Presence

### POST /api/decks/:id/lock
Acquires 5-min lock. Returns `{ locked: true, by: "you" }` or 409 if held by another.

### DELETE /api/decks/:id/lock
Releases lock. Must be lock holder (403 otherwise).

### POST /api/decks/:id/lock/heartbeat
**Rate limited.** Extends lock TTL. Must be holder.

### POST /api/decks/:id/presence
```json
{"activeSlideId":"<slide_id>"}
```
Upserts presence. Cleans stale (>2 min). Returns all active presences.

### GET /api/decks/:id/presence
Returns active presences. Cleans stale first.

---

## Static & Health

### GET /
Expect: `{ name: "slide-wiz-dev", status: "ok" }`

### GET /api/health
Expect: `{ status: "ok" }`

### GET /api/static/:file
Serves from static/ directory. Path traversal guard (basename only).
Content-Type inferred: .js → application/javascript, .css → text/css
Cache-Control: public, max-age=86400
CORS: Access-Control-Allow-Origin: *
