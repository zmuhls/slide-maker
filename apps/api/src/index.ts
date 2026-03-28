import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { env } from './env.js'
import auth from './routes/auth.js'
import admin from './routes/admin.js'
import { decksRouter } from './routes/decks.js'
import chat from './routes/chat.js'
import providers from './routes/providers.js'

const app = new Hono()

app.use('/*', cors({
  origin: env.publicUrl,
  credentials: true,
}))

app.get('/api/health', (c) => c.json({ status: 'ok' }))

app.route('/api/auth', auth)
app.route('/api/admin', admin)
app.route('/api/decks', decksRouter)
app.route('/api/chat', chat)
app.route('/api/providers', providers)

serve({
  fetch: app.fetch,
  port: env.port,
}, () => {
  console.log(`API server running on http://localhost:${env.port}`)
})

export default app
