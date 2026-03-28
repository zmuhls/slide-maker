import type { Context, Next } from 'hono'
import { getCookie } from 'hono/cookie'
import { lucia } from '../auth/lucia.js'

export async function authMiddleware(c: Context, next: Next) {
  const sessionId = getCookie(c, lucia.sessionCookieName)
  if (!sessionId) {
    return c.json({ error: 'Unauthorized' }, 401)
  }

  const { session, user } = await lucia.validateSession(sessionId)
  if (!session) {
    const blankCookie = lucia.createBlankSessionCookie()
    c.header('Set-Cookie', blankCookie.serialize())
    return c.json({ error: 'Unauthorized' }, 401)
  }

  if (session.fresh) {
    const sessionCookie = lucia.createSessionCookie(session.id)
    c.header('Set-Cookie', sessionCookie.serialize())
  }

  c.set('user', user)
  c.set('session', session)
  return next()
}
