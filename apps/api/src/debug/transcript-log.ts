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
  return path.resolve(__dirname, '../../data/debug-logs/transcripts.json')
}

async function ensureDir(filePath: string) {
  const dir = path.dirname(filePath)
  await fs.mkdir(dir, { recursive: true }).catch(() => {})
}

export async function appendTranscript(entry: TranscriptEntry): Promise<void> {
  const file = resolveLogFile()
  await ensureDir(file)
  let arr: TranscriptEntry[] = []
  try {
    const raw = await fs.readFile(file, 'utf8')
    arr = JSON.parse(raw)
    if (!Array.isArray(arr)) arr = []
  } catch {
    arr = []
  }

  arr.push(entry)
  // Cap at 500 entries, keep newest
  if (arr.length > 500) arr = arr.slice(-500)
  await fs.writeFile(file, JSON.stringify(arr, null, 2), 'utf8')
}

export async function readTranscripts(opts: ReadOpts = {}): Promise<TranscriptEntry[]> {
  const { limit = 50, deck, model } = opts
  const file = resolveLogFile()
  try {
    const raw = await fs.readFile(file, 'utf8')
    let arr: TranscriptEntry[] = []
    try { arr = JSON.parse(raw) } catch { arr = [] }
    if (!Array.isArray(arr)) arr = []
    // Newest first
    arr = arr.slice().reverse()
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
  await fs.writeFile(file, JSON.stringify([], null, 2), 'utf8')
}

