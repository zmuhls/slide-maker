import { streamAnthropic, ANTHROPIC_MODELS } from './anthropic.js'
import { streamOpenRouter, OPENROUTER_MODELS } from './openrouter.js'

export const ALL_MODELS = [...ANTHROPIC_MODELS, ...OPENROUTER_MODELS]

export function getModelStream(
  modelId: string,
  systemPrompt: string,
  messages: { role: 'user' | 'assistant'; content: string }[],
): AsyncGenerator<string> {
  const model = ALL_MODELS.find((m) => m.id === modelId)
  if (!model) throw new Error(`Unknown model: ${modelId}`)
  if (model.provider === 'anthropic') return streamAnthropic(systemPrompt, messages, modelId)
  return streamOpenRouter(systemPrompt, messages, modelId)
}
