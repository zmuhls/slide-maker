# LLM Debug Dashboard

Local dev/debug tool for observing LLM streaming in real time and reviewing chat transcripts.

## Route & Access

- **URL:** `/debug/streams`
- **Auth:** Admin-only (same check as `/admin`)
- **Scope:** Dev and staging only — zero production overhead

## Panel 1: Live Stream

Real-time view of every token chunk as it arrives from the LLM provider.

### Data Flow

```
LLM provider yields chunk
  → chat.ts sends chunk to client SSE (existing behavior)
  → chat.ts emits chunk to DebugBus EventEmitter (new)
  → GET /api/debug/stream SSE relays to any connected dashboard
```

### DebugBus Events

```typescript
// Emitted when a chat request starts
{ event: 'stream:start', data: { streamId, userId, userEmail, deckId, model, provider, systemPromptChars, historyLength, timestamp } }

// Emitted per chunk from the LLM
{ event: 'stream:chunk', data: { streamId, text, chunkIndex, elapsedMs } }

// Emitted when the stream completes
{ event: 'stream:done', data: { streamId, totalChars, durationMs, inputTokens, outputTokens, mutations: string[] } }

// Emitted on error
{ event: 'stream:error', data: { streamId, error, elapsedMs } }
```

### UI

Each active stream renders as a card showing:
- **Header:** model badge, user email, deck ID, elapsed timer
- **Body:** raw text output, auto-scrolling, monospace font
- **Metrics bar:** tokens/sec (updated every 500ms), total chars, chunk count
- **Mutation highlighting:** text inside ` ```mutation ``` ` blocks gets a distinct background color

Multiple concurrent streams stack vertically. Completed streams fade to 50% opacity and collapse after 30s (click to re-expand). A "Clear" button dismisses all completed streams.

If no streams are active, show a muted "Waiting for chat requests..." message.

## Panel 2: Transcript Log

Browsable log of completed chat request/response pairs, persisted to a JSON file.

### Storage

File: `apps/api/data/debug-logs/transcripts.json`

Each entry:
```typescript
{
  id: string,              // nanoid
  timestamp: string,       // ISO 8601
  userEmail: string,
  deckId: string,
  model: string,
  provider: string,        // 'anthropic' | 'openrouter'
  systemPromptChars: number,
  historyLength: number,   // messages sent as context
  inputTokens: number,
  outputTokens: number,
  durationMs: number,
  userMessage: string,     // the user's chat message
  assistantMessage: string,// full assistant response
  mutations: string[],     // extracted mutation block contents
  error: string | null
}
```

The file is a JSON array. Appended on each chat completion. Capped at 500 entries (oldest trimmed on write). Created lazily on first write.

### API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/debug/stream` | SSE endpoint — relays live DebugBus events |
| `GET` | `/api/debug/transcripts` | Returns transcript log. Query: `?limit=50&deck=ID&model=ID` |
| `DELETE` | `/api/debug/transcripts` | Clears the log file |

All endpoints require admin auth.

### UI

Table with columns: timestamp, model, user, duration, tokens (in/out), status (success/error).

- Click row to expand: shows full user message, full assistant response (with markdown rendering), extracted mutations, and timing breakdown
- Filter bar: by model (dropdown), by deck, search in message content
- "Clear Log" button calls DELETE endpoint
- Auto-refreshes every 5s when tab is visible (or on SSE `stream:done` event)

## Files to Create

| File | Purpose |
|------|---------|
| `apps/api/src/debug/event-bus.ts` | EventEmitter singleton. Exports `debugBus.emit()` and `debugBus.on()`. No-op cost when no listeners. |
| `apps/api/src/debug/transcript-log.ts` | `appendTranscript(entry)`, `readTranscripts(opts)`, `clearTranscripts()`. Reads/writes JSON file. |
| `apps/api/src/routes/debug.ts` | Hono router: SSE stream endpoint, transcript CRUD. Admin-auth gated. |
| `apps/web/src/routes/(app)/debug/+page.svelte` | Dashboard UI: live stream panel + transcript table |
| `apps/web/src/routes/(app)/debug/+page.ts` | SvelteKit load function (fetch initial transcripts) |

## Files to Modify

| File | Change |
|------|--------|
| `apps/api/src/routes/chat.ts` | Emit `stream:start`, `stream:chunk`, `stream:done`, `stream:error` to debugBus at appropriate points in the streaming loop |
| `apps/api/src/index.ts` | Mount debug router at `/api/debug` |

## Design Constraints

- **No DB schema changes** — JSON file only
- **No production cost** — EventEmitter with no listeners is effectively free
- **No new dependencies** — Node EventEmitter, fs/promises, existing SSE patterns
- **Follows existing patterns** — admin auth check, ghost button styling, CSS custom properties, Svelte 5 runes
- **Base path aware** — all links use `${base}/` prefix
