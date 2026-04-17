import type { Context } from 'hono'
import { eq } from 'drizzle-orm'
import { db } from '../db/index.js'
import { deckLocks } from '../db/schema.js'

/**
 * Advisory-turned-enforced edit lock check. Call at the top of every mutating
 * deck endpoint (POST/PATCH/DELETE on slides, blocks, plan apply, etc.).
 *
 * Allows the mutation if:
 *   - no lock row exists for this deck, OR
 *   - the existing lock is expired, OR
 *   - the caller holds the lock.
 *
 * Rejects with 409 and lockedBy payload when someone else holds a live lock.
 * Returns `null` on allow, a `Response` on reject.
 *
 *   const blocked = await checkDeckLock(c, deckId)
 *   if (blocked) return blocked
 */
export async function checkDeckLock(c: Context, deckId: string): Promise<Response | null> {
  const user = c.get('user') as { id: string } | undefined
  if (!user) return c.json({ error: 'Unauthorized' }, 401)

  const existingLock = await db
    .select()
    .from(deckLocks)
    .where(eq(deckLocks.deckId, deckId))
    .get()

  if (!existingLock) return null
  if (existingLock.expiresAt <= new Date()) return null
  if (existingLock.userId === user.id) return null

  return c.json(
    {
      error: 'Deck is locked by another editor',
      lockedBy: { name: existingLock.userName, since: existingLock.lockedAt },
    },
    409,
  )
}
