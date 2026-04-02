import { EventEmitter } from 'node:events'

/**
 * Singleton event bus for debug streaming.
 * No-op cost when there are no listeners.
 */
export const debugBus = new EventEmitter()

// Avoid memory leak warnings when multiple dashboards connect in dev
debugBus.setMaxListeners(50)

export type StreamStartEvent = {
  streamId: string
  userId: string
  userEmail: string
  deckId: string
  model: string
  provider: string
  systemPromptChars: number
  historyLength: number
  timestamp: string
}

export type StreamChunkEvent = {
  streamId: string
  text: string
  chunkIndex: number
  elapsedMs: number
}

export type StreamDoneEvent = {
  streamId: string
  totalChars: number
  durationMs: number
  inputTokens: number
  outputTokens: number
  mutations: string[]
}

export type StreamErrorEvent = {
  streamId: string
  error: string
  elapsedMs: number
}

