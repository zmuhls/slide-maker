# Claude Code Automation Recommendations

## Codebase Profile
- **Type**: TypeScript monorepo (pnpm + Turborepo)
- **Framework**: SvelteKit 5 + Hono API
- **Key Libraries**: TipTap, Drizzle ORM, Playwright, svelte-dnd-action
- **Tests**: 16 test files (437 tests), plus Playwright e2e

## Rollout Order

1. **Auto-format hook** — immediate style consistency
2. **`context7` MCP** — correct API lookups for fast-moving libraries
3. **`security-reviewer` subagent** — quality gate for auth/upload/export changes
4. **`gen-test` skill** — productivity multiplier for test coverage
5. **`deploy-staging` skill** — runbook automation (move up if deploying daily)

---

## 1. `context7` MCP

### Implementation

**Install**: `claude mcp add context7 -- npx -y @upwind-media/context7-mcp@latest`

Use `context7` as a docs source for:
- Svelte 5 runes when touching `apps/web/src/**`
- Hono/Drizzle/Lucia when touching `apps/api/src/**`
- TipTap when editing rich text behavior
- Playwright when adding e2e coverage
- `svelte-dnd-action` event semantics

After lookup, cross-check against local constraints:
- `${base}` path requirement in SvelteKit
- No new module types
- Raw `sqlite.transaction()` for atomic operations (not Drizzle async)
- DOMPurify on web renderers, `sanitize-html` on export
- Native artifacts stay first-party only

### Additional: project-constraints skill

Create `.claude/skills/project-constraints/SKILL.md` as a companion — summarizes non-obvious local rules `context7` will never know (base path, artifact sandbox, security files, Drizzle transaction gotcha, test import conventions, staging topology).

---

## 2. Auto-format Hook

### Implementation

**Files**: `.claude/settings.json` + `.claude/hooks/format-edited-file.sh`

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Edit|Write",
        "command": ".claude/hooks/format-edited-file.sh"
      }
    ]
  }
}
```

**Script** (`.claude/hooks/format-edited-file.sh`):
```bash
#!/usr/bin/env bash
set -euo pipefail

file="${TOOL_INPUT_FILE_PATH:-}"
[ -n "$file" ] || exit 0
[ -f "$file" ] || exit 0

case "$file" in
  *.ts|*.tsx|*.js|*.mjs|*.cjs|*.svelte|*.css|*.json|*.md)
    pnpm exec prettier --write "$file" >/dev/null 2>&1 || true
    ;;
esac
```

### Key details
- Use `pnpm exec` not `npx` (pnpm monorepo)
- Format only the single edited file, not the whole workspace
- Keep hooks fast — no lint/test execution here

### Additional checks to pair with formatting
- **Base-path guard**: scan touched `apps/web/src/**` files for `goto('/` and `href="/` without `${base}`
- **Svelte 5 rune check**: flag old `<slot />` patterns in touched `.svelte` files
- **Drizzle transaction guard**: warn on `db.transaction(async` in API files

---

## 3. `deploy-staging` Skill

### Implementation

**Path**: `.claude/skills/deploy-staging/SKILL.md`
**Mode**: `disable-model-invocation: true` (user-only via `/deploy-staging`)

### What it encodes

**Preconditions**:
- [ ] Clean working tree, correct branch
- [ ] Tailscale/CUNY VPN active
- [ ] `apps/api/.env -> ../../.env` symlink exists

**Local checks**:
- [ ] `pnpm build` passes
- [ ] Targeted tests if critical files changed

**Remote checks** (SSH to `100.111.252.53`):
- [ ] `df -h / /data` — root disk not full
- [ ] App code under `/data/slide-maker`
- [ ] Storage on `/data/slide-maker-storage`

**Deploy**:
- [ ] Run `/data/slide-maker/deploy.sh` (git pull, pnpm install, build, db:push, seed, pm2 restart)

**Post-deploy**:
- [ ] `pm2 status` — both processes running
- [ ] PM2 logs clean for `slide-maker-api` and `slide-maker-web`
- [ ] Smoke test `https://tools.cuny.qzz.io/slide-maker`
- [ ] Routes respect `/slide-maker` base path
- [ ] If Nginx changed: `nginx -t` then reload

### Repo-specific knowledge
- API PM2 uses dev/tsx (not compiled dist) — shared package exports raw `.ts`
- Web PM2 runs Vite preview from `apps/web`
- Nginx config shared across apps in `/etc/nginx/sites-enabled/alt-text.conf` — never `sed` it
- Root disk 8.9GB only; `/data` is the safe volume

### Additional: `deploy-smoke` skill
Lightweight post-deploy verification: base path routes, PM2 status, static assets, API proxy, chat streaming, uploaded image rendering.

---

## 4. `gen-test` Skill

### Implementation

**Path**: `.claude/skills/gen-test/SKILL.md`
**Mode**: User-only (`disable-model-invocation: true`)

### Testing conventions it should know
- Tests live in `tests/*.test.ts`
- Vitest, pure TS utility tests only
- No Svelte component tests
- Import from source paths (`packages/shared/src/`, `apps/web/src/lib/utils/`), never `$lib`
- Table-driven tests preferred for renderer/layout/transform logic
- Minimal fixtures

### Built-in templates by category

| Category | Covers |
|----------|--------|
| **Renderer** | Module output, sanitization, layout/zone validation |
| **DnD transforms** | Reorder within zone, move across zones, undo/redo compat |
| **Rich text** | TipTap HTML I/O, DOMPurify parity, markdown round-tripping |
| **Export** | ZIP structure, asset path rewriting, sanitize-html output |
| **Security** | SSRF guards, path traversal, URL validation, ownership checks |
| **Prompt/system** | Module type parity, template constraints, diagnostics |

### Additional: `gen-e2e` skill
Playwright deserves its own skill for high-value flows: auth, deck editing, TipTap, drag-and-drop, uploads, SSE chat, base-path navigation.

---

## 5. `security-reviewer` Subagent

### Implementation

**Path**: `.claude/agents/security-reviewer.md`

### Audit checklist

- **Auth/session**: Lucia cookies, session handling, role assumptions
- **XSS/sanitization**: DOMPurify (web renderers), sanitize-html (export), TipTap HTML
- **CSRF/CORS**: Hono CSRF middleware still applied
- **SSRF**: search/download-image, any remote fetch logic
- **Uploads**: body limits, content-type checks, path traversal, deck ownership
- **SSE/chat**: stream termination, rate limiting, prompt/context leakage
- **Artifacts**: native artifacts remain first-party only, no user code crosses sandbox
- **Routes**: block ownership verification, admin checks not client-only
- **Deploy/config**: debug routes guarded, no accidental header weakening

### Sensitive files (high scrutiny)
`decks.ts`, `files.ts`, `chat.ts`, `auth.ts`, `index.ts`, `export/index.ts`, `export/html-renderer.ts`, `lucia.ts`

### Additional checks
- **Sanitization parity**: preview and export sanitization stay aligned
- **Prompt injection surface**: chat prompts, uploaded file URLs in prompts, SSE transcripts, debug routes
- **Secret leak review**: detect logging of tokens, provider keys, session data

---

## Cross-Cutting Automations (Missed in Original)

### `base-path-review` check
Scan touched `apps/web/src/**` for hardcoded root-relative navigation (`goto('/`, `href="/`, `fetch('/api/`). Staging base path makes this one of the highest-value custom checks.

### `drizzle-sqlite-review` guard
Flag async `db.transaction(...)` usage. Remind to use raw `sqlite.transaction()` for atomic ordering.

### `sanitization-parity` check
If touched files include renderer/export/rich-text code, confirm preview and export sanitization both exist with aligned allowed tags/attributes.

### `sse-review` check
For `chat.ts` or streaming changes: verify SSE headers, error paths don't hang, rate limits apply, partial content isn't persisted unsafely.

---

## Setup Phases

| Phase | What | Why |
|-------|------|-----|
| **1. Guardrails** | auto-format hook | Edit quality + style consistency |
| **2. Context** | `context7`, `project-constraints` skill | Correct API usage for fast-moving libs |
| **3. Quality** | `security-reviewer`, `gen-test`, `gen-e2e` | Review gates + test coverage |
| **4. Operations** | `deploy-staging`, `deploy-smoke` | Deployment automation |
