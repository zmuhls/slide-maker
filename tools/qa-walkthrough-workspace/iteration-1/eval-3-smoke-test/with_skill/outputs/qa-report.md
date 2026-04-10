# QA Smoke Test -- 2026-04-10

## Environment
- API: http://localhost:3001 -- UP (0.009s)
- Web: http://localhost:5173 -- UP (0.127s)
- Search: Brave | Images: Pexels
- AI: OpenRouter (6 models), Bedrock (configured)
- DB: seeded, symlink OK

## Resource Health
| Endpoint | Status | Time | Count |
|----------|--------|------|-------|
| GET /api/templates | 200 | 0.015s | 16 templates |
| GET /api/themes | 200 | 0.002s | 9 themes |
| GET /api/artifacts | 200 | 0.038s | 19 artifacts |
| GET /api/providers | 200 | 0.002s | 6 models |

## Auth
| Check | Status |
|-------|--------|
| POST /api/auth/login | 200, cookie set |
| GET /api/auth/me | 200, role=admin |
| Cookie flags | HttpOnly, SameSite=Lax |

## Deck Lifecycle
| Operation | Status | Notes |
|-----------|--------|-------|
| POST /api/decks | 201 | Created "QA Test Deck" |
| GET /api/decks/:id | 200 | Full deck with slides array |
| DELETE /api/decks/:id | 200 | Requires Origin header (CSRF) |

## Search
| Endpoint | Status | Time | Notes |
|----------|--------|------|-------|
| POST /api/search | 200 | 0.788s | Brave, 5 results |
| POST /api/search/images | 200 | 0.188s | Pexels, 3 images |
| POST /api/search/download-image | 200 | 0.493s | File saved and serves |

## Verdict: HEALTHY
All core systems operational. 16 templates, 9 themes, 19 artifacts, 6 models available. Search (Brave + Pexels) functional. One note: DELETE requires Origin header for CSRF.
