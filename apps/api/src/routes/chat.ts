import { Hono } from 'hono'
import { streamSSE } from 'hono/streaming'
import { eq, and, inArray } from 'drizzle-orm'
import { createId } from '@paralleldrive/cuid2'
import type { Session, User } from 'lucia'
import { db } from '../db/index.js'
import { decks, deckAccess, slides, contentBlocks, chatMessages, templates, themes, uploadedFiles } from '../db/schema.js'
import { authMiddleware } from '../middleware/auth.js'
import { chatRateLimit } from '../middleware/rate-limit.js'
import { getModelStream } from '../providers/index.js'
import { buildSystemPrompt } from '../prompts/system.js'

type AuthEnv = {
  Variables: {
    user: User
    session: Session
  }
}

const chat = new Hono<AuthEnv>()

chat.use('*', authMiddleware)

// POST / — Stream chat response via SSE
chat.post('/', chatRateLimit, async (c) => {
  const user = c.get('user')
  const body = await c.req.json()
  const { message, deckId, activeSlideId, modelId, history } = body

  if (!message || !deckId || !modelId) {
    return c.json({ error: 'message, deckId, and modelId are required' }, 400)
  }

  // Check deck access
  const access = await db
    .select()
    .from(deckAccess)
    .where(and(eq(deckAccess.deckId, deckId), eq(deckAccess.userId, user.id)))
    .get()

  if (!access) {
    return c.json({ error: 'Not found or no access' }, 404)
  }

  // Load full deck state
  const deck = await db.select().from(decks).where(eq(decks.id, deckId)).get()
  if (!deck) {
    return c.json({ error: 'Deck not found' }, 404)
  }

  const deckSlides = await db
    .select()
    .from(slides)
    .where(eq(slides.deckId, deckId))
    .orderBy(slides.order)

  const slideIds = deckSlides.map((s) => s.id)
  let blocks: (typeof contentBlocks.$inferSelect)[] = []
  if (slideIds.length > 0) {
    blocks = await db
      .select()
      .from(contentBlocks)
      .where(inArray(contentBlocks.slideId, slideIds))
      .orderBy(contentBlocks.order)
  }

  const blocksBySlide = new Map<string, (typeof contentBlocks.$inferSelect)[]>()
  for (const block of blocks) {
    const arr = blocksBySlide.get(block.slideId) || []
    arr.push(block)
    blocksBySlide.set(block.slideId, arr)
  }

  const slidesWithBlocks = deckSlides.map((slide) => ({
    ...slide,
    blocks: (blocksBySlide.get(slide.id) || []).map((b) => ({
      id: b.id,
      slideId: b.slideId,
      type: b.type,
      zone: b.zone ?? 'content',
      data: (b.data ?? {}) as Record<string, unknown>,
      order: b.order,
      stepOrder: b.stepOrder ?? null,
    })),
  }))

  // Load uploaded files for context
  const deckFiles = await db.select().from(uploadedFiles).where(eq(uploadedFiles.deckId, deckId))
  const filesList = deckFiles.map((f) => ({
    id: f.id,
    filename: f.filename,
    mimeType: f.mimeType,
    url: `/api/decks/${deckId}/files/${f.id}`,
  }))

  // Load templates
  const allTemplates = await db.select().from(templates)
  const templatesList = allTemplates.map((t) => ({
    id: t.id,
    name: t.name,
    layout: t.layout,
    modules: (t.modules ?? []) as unknown[],
  }))

  // Load active theme
  let activeTheme = null
  if (deck.themeId) {
    const themeRow = await db.select().from(themes).where(eq(themes.id, deck.themeId)).get()
    if (themeRow) {
      activeTheme = {
        id: themeRow.id,
        name: themeRow.name,
        colors: themeRow.colors,
        fonts: themeRow.fonts,
      }
    }
  }

  // Build system prompt
  const systemPrompt = buildSystemPrompt({
    deck: {
      id: deck.id,
      name: deck.name,
      themeId: deck.themeId,
      slides: slidesWithBlocks,
    },
    activeSlideId: activeSlideId || null,
    templates: templatesList,
    theme: activeTheme,
    files: filesList,
  })

  // Prepare messages for the LLM
  // Reconstruct chat history server-side from DB (never trust client-supplied history)
  const dbMessages = await db
    .select()
    .from(chatMessages)
    .where(eq(chatMessages.deckId, deckId))
    .orderBy(chatMessages.createdAt)

  const chatHistory: { role: 'user' | 'assistant'; content: string }[] = dbMessages.map((m) => ({
    role: m.role as 'user' | 'assistant',
    content: m.content,
  }))

  chatHistory.push({ role: 'user', content: message })

  // Determine provider from model
  const model = modelId.includes('/') ? 'openrouter' : 'anthropic'

  // Save user message to DB
  const userMsgId = createId()
  const now = new Date()
  await db.insert(chatMessages).values({
    id: userMsgId,
    deckId,
    role: 'user',
    content: message,
    provider: model,
    createdAt: now,
  })

  // Stream response
  return streamSSE(c, async (stream) => {
    let fullResponse = ''

    try {
      const gen = getModelStream(modelId, systemPrompt, chatHistory)

      for await (const text of gen) {
        fullResponse += text
        await stream.writeSSE({
          data: JSON.stringify({ type: 'text', content: text }),
        })
      }

      await stream.writeSSE({
        data: JSON.stringify({ type: 'done' }),
      })

      // Save assistant message to DB
      const assistantMsgId = createId()
      await db.insert(chatMessages).values({
        id: assistantMsgId,
        deckId,
        role: 'assistant',
        content: fullResponse,
        provider: model,
        createdAt: new Date(),
      })
    } catch (err: unknown) {
      console.error('AI streaming error:', err)
      const errorMessage = 'An error occurred while generating the response'
      await stream.writeSSE({
        data: JSON.stringify({ type: 'error', message: errorMessage }),
      })
    }
  })
})

// GET /:deckId/history — Get chat history for a deck
chat.get('/:deckId/history', async (c) => {
  const user = c.get('user')
  const deckId = c.req.param('deckId')

  // Check access
  const access = await db
    .select()
    .from(deckAccess)
    .where(and(eq(deckAccess.deckId, deckId), eq(deckAccess.userId, user.id)))
    .get()

  if (!access) {
    return c.json({ error: 'Not found or no access' }, 404)
  }

  const messages = await db
    .select()
    .from(chatMessages)
    .where(eq(chatMessages.deckId, deckId))
    .orderBy(chatMessages.createdAt)

  return c.json({ messages })
})

export default chat
