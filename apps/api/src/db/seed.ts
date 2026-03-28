import { hash } from '@node-rs/argon2'
import { createId } from '@paralleldrive/cuid2'
import { db } from './index.js'
import { users } from './schema.js'
import { eq } from 'drizzle-orm'

async function main() {
  const args = process.argv.slice(2)

  // Parse --admin flag
  const adminIndex = args.indexOf('--admin')
  if (adminIndex === -1) {
    console.error('Usage: tsx src/db/seed.ts --admin email@gc.cuny.edu [--password yourpassword]')
    process.exit(1)
  }

  const email = args[adminIndex + 1]
  if (!email) {
    console.error('Please provide an email after --admin')
    process.exit(1)
  }

  // Parse optional --password flag
  const passwordIndex = args.indexOf('--password')
  const password = passwordIndex !== -1 && args[passwordIndex + 1]
    ? args[passwordIndex + 1]
    : 'changeme123'

  // Check if user already exists
  const existing = await db.select().from(users).where(eq(users.email, email.toLowerCase())).get()
  if (existing) {
    console.log(`User with email ${email} already exists. Updating to admin...`)
    await db.update(users).set({
      role: 'admin',
      status: 'approved',
      emailVerified: true,
    }).where(eq(users.email, email.toLowerCase()))
    console.log(`Updated ${email} to admin.`)
    process.exit(0)
  }

  const passwordHash = await hash(password)
  const userId = createId()

  await db.insert(users).values({
    id: userId,
    email: email.toLowerCase(),
    name: 'Admin',
    passwordHash,
    emailVerified: true,
    status: 'approved',
    role: 'admin',
    createdAt: new Date(),
  })

  console.log(`Admin user created: ${email}`)
  console.log(`Password: ${password}`)
  process.exit(0)
}

main().catch((err) => {
  console.error('Seed failed:', err)
  process.exit(1)
})
