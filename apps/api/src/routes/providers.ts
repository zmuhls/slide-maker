import { Hono } from 'hono'
import { env } from '../env.js'
import { ANTHROPIC_MODELS } from '../providers/anthropic.js'
import { OPENROUTER_MODELS } from '../providers/openrouter.js'
import { authMiddleware } from '../middleware/auth.js'

const providers = new Hono()

// GET / — List available models (filtered by which API keys are configured)
providers.get('/', authMiddleware, (c) => {
  const models: { id: string; name: string; provider: string }[] = []

  if (env.anthropicApiKey) {
    models.push(...ANTHROPIC_MODELS)
  }

  if (env.openrouterApiKey) {
    models.push(...OPENROUTER_MODELS)
  }

  return c.json({ models })
})

export default providers
