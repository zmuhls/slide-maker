import { promises as fs } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

export type TranscriptEntry = {
  id: string
  timestamp: string
  userEmail: string
  deckId: string
  model: string
  provider: string
  systemPromptChars: number
  historyLength: number
  inputTokens: number
  outputTokens: number
  durationMs: number
  userMessage: string
  assistantMessage: string
  mutations: string[]
  error: string | null
}

type ReadOpts = { limit?: number; deck?: string; model?: string }

function resolveLogFile() {
  // Allow override for tests
  const override = process.env.DEBUG_TRANSCRIPT_LOG
  if (override) return override
  const __dirname = path.dirname(fileURLToPath(import.meta.url))
  return path.resolve(__dirname, '../../data/debug-logs/transcripts.ndjson')
}

async function ensureDir(filePath: string) {
  const dir = path.dirname(filePath)
  await fs.mkdir(dir, { recursive: true }).catch(() => {})
}

export async function appendTranscript(entry: TranscriptEntry): Promise<void> {
  const file = resolveLogFile()
  await ensureDir(file)
  // Append-only NDJSON — no read-modify-write race condition
  await fs.appendFile(file, JSON.stringify(entry) + '\n', 'utf8')

  // Truncate if file exceeds ~500 entries (check periodically, not every write)
  if (Math.random() < 0.05) {
    try {
      const raw = await fs.readFile(file, 'utf8')
      const lines = raw.trim().split('\n')
      if (lines.length > 500) {
        const kept = lines.slice(-500).join('\n') + '\n'
        await fs.writeFile(file, kept, 'utf8')
      }
    } catch { /* ignore truncation errors */ }
  }
}

export async function readTranscripts(opts: ReadOpts = {}): Promise<TranscriptEntry[]> {
  const { limit = 50, deck, model } = opts
  const file = resolveLogFile()
  try {
    const raw = await fs.readFile(file, 'utf8')
    let arr: TranscriptEntry[] = []
    for (const line of raw.trim().split('\n')) {
      if (!line) continue
      try { arr.push(JSON.parse(line)) } catch { /* skip malformed lines */ }
    }
    // Newest first
    arr.reverse()
    if (deck) arr = arr.filter((e) => e.deckId === deck)
    if (model) arr = arr.filter((e) => e.model === model)
    return arr.slice(0, Math.max(1, Math.min(500, limit)))
  } catch {
    return []
  }
}

export async function clearTranscripts(): Promise<void> {
  const file = resolveLogFile()
  await ensureDir(file)
  await fs.writeFile(file, '', 'utf8')
}
