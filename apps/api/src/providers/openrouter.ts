import OpenAI from 'openai'
import { env } from '../env.js'

const client = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: env.openrouterApiKey,
})

export async function* streamOpenRouter(
  systemPrompt: string,
  messages: { role: 'user' | 'assistant'; content: string }[],
  model: string = 'meta-llama/llama-3.1-70b-instruct',
): AsyncGenerator<string> {
  const stream = await client.chat.completions.create({
    model,
    stream: true,
    messages: [
      { role: 'system', content: systemPrompt },
      ...messages,
    ],
  })

  for await (const chunk of stream) {
    const text = chunk.choices[0]?.delta?.content
    if (text) yield text
  }
}

export const OPENROUTER_MODELS = [
  { id: 'meta-llama/llama-3.1-70b-instruct', name: 'Llama 3.1 70B', provider: 'openrouter' },
  { id: 'meta-llama/llama-3.1-8b-instruct', name: 'Llama 3.1 8B', provider: 'openrouter' },
  { id: 'google/gemini-2.0-flash-001', name: 'Gemini 2.0 Flash', provider: 'openrouter' },
  { id: 'mistralai/mistral-large-latest', name: 'Mistral Large', provider: 'openrouter' },
]
