import { Hono } from 'hono'
import { eq } from 'drizzle-orm'
import type { Session, User } from 'lucia'
import { db } from '../db/index.js'
import { users } from '../db/schema.js'
import { authMiddleware } from '../middleware/auth.js'
import { adminMiddleware } from '../middleware/admin.js'

type AdminEnv = {
  Variables: {
    user: User
    session: Session
  }
}

const admin = new Hono<AdminEnv>()

// All admin routes require auth + admin
admin.use('*', authMiddleware, adminMiddleware)

// GET /users
admin.get('/users', async (c) => {
  const status = c.req.query('status')

  let query = db.select({
    id: users.id,
    email: users.email,
    name: users.name,
    role: users.role,
    status: users.status,
    emailVerified: users.emailVerified,
    createdAt: users.createdAt,
  }).from(users)

  if (status) {
    const result = await query.where(eq(users.status, status as 'pending' | 'approved' | 'rejected'))
    return c.json({ users: result })
  }

  const result = await query
  return c.json({ users: result })
})

// POST /users/:id/approve
admin.post('/users/:id/approve', async (c) => {
  const id = c.req.param('id')
  const user = await db.select().from(users).where(eq(users.id, id)).get()

  if (!user) {
    return c.json({ error: 'User not found' }, 404)
  }

  await db.update(users).set({ status: 'approved' }).where(eq(users.id, id))
  return c.json({ message: 'User approved', userId: id })
})

// POST /users/:id/reject
admin.post('/users/:id/reject', async (c) => {
  const id = c.req.param('id')
  const user = await db.select().from(users).where(eq(users.id, id)).get()

  if (!user) {
    return c.json({ error: 'User not found' }, 404)
  }

  await db.update(users).set({ status: 'rejected' }).where(eq(users.id, id))
  return c.json({ message: 'User rejected', userId: id })
})

export default admin
