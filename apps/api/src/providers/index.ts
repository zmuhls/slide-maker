import { streamAnthropic, ANTHROPIC_MODELS } from './anthropic.js'
import { streamOpenRouter, OPENROUTER_MODELS } from './openrouter.js'
import { streamBedrock, BEDROCK_MODELS } from './bedrock.js'
import { env } from '../env.js'

export const ALL_MODELS = [...ANTHROPIC_MODELS, ...OPENROUTER_MODELS, ...BEDROCK_MODELS]

export function getModelStream(
  modelId: string,
  systemPrompt: string,
  messages: { role: 'user' | 'assistant'; content: string }[],
): AsyncGenerator<string> {
  const model = ALL_MODELS.find((m) => m.id === modelId)
  if (!model) throw new Error(`Unknown model: ${modelId}`)
  if (env.aiProvider && model.provider !== env.aiProvider) {
    throw new Error(`Model provider '${model.provider}' not allowed by AI_PROVIDER=${env.aiProvider}`)
  }
  if (model.provider === 'anthropic') return streamAnthropic(systemPrompt, messages, modelId)
  if (model.provider === 'bedrock') return streamBedrock(systemPrompt, messages, modelId)
  return streamOpenRouter(systemPrompt, messages, modelId)
}
