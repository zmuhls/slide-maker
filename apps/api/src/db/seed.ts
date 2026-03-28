import { hash } from '@node-rs/argon2'
import { createId } from '@paralleldrive/cuid2'
import { db } from './index.js'
import { users, templates, themes } from './schema.js'
import { eq } from 'drizzle-orm'
import fs from 'node:fs'
import path from 'node:path'

// Resolve project root (seed runs from apps/api/)
const scriptDir = import.meta.dirname ?? path.dirname(new URL(import.meta.url).pathname)
const projectRoot = path.resolve(scriptDir, '..', '..', '..', '..')
const templatesDir = path.join(projectRoot, 'templates')

async function seedTemplates() {
  // Check if built-in templates already exist
  const existing = await db
    .select()
    .from(templates)
    .where(eq(templates.builtIn, true))
    .all()

  if (existing.length > 0) {
    console.log(`Skipping templates — ${existing.length} built-in templates already exist.`)
    return
  }

  const subdirs = ['title', 'section-divider', 'body', 'resources']
  let count = 0

  for (const subdir of subdirs) {
    const dir = path.join(templatesDir, subdir)
    if (!fs.existsSync(dir)) continue

    const files = fs.readdirSync(dir).filter((f) => f.endsWith('.json'))
    for (const file of files) {
      const raw = fs.readFileSync(path.join(dir, file), 'utf-8')
      const tmpl = JSON.parse(raw)

      await db
        .insert(templates)
        .values({
          id: createId(),
          name: tmpl.name,
          slideType: tmpl.slideType,
          blocks: tmpl.blocks,
          builtIn: true,
          createdBy: null,
        })
        .onConflictDoNothing()

      count++
    }
  }

  console.log(`Seeded ${count} templates.`)
}

async function seedThemes() {
  const defaultTheme = {
    id: 'cuny-ai-lab-default',
    name: 'CUNY AI Lab',
    css: `
:root {
  --slide-bg: #ffffff;
  --slide-text: #333333;
  --slide-heading-color: #1D3A83;
  --slide-accent: #3B73E6;
  --slide-accent-secondary: #2FB8D6;
  --slide-font-heading: 'Outfit', system-ui, sans-serif;
  --slide-font-body: 'Inter', system-ui, sans-serif;
}
    `,
    fonts: { heading: 'Outfit', body: 'Inter' },
    colors: { primary: '#1D3A83', secondary: '#3B73E6', accent: '#2FB8D6', bg: '#ffffff' },
    builtIn: true,
    createdBy: null,
  }

  await db.insert(themes).values(defaultTheme).onConflictDoNothing()
  console.log('Seeded default theme: CUNY AI Lab')
}

async function seedAdmin(args: string[]) {
  const adminIndex = args.indexOf('--admin')
  const email = args[adminIndex + 1]
  if (!email) {
    console.error('Please provide an email after --admin')
    process.exit(1)
  }

  // Parse optional --password flag
  const passwordIndex = args.indexOf('--password')
  const password =
    passwordIndex !== -1 && args[passwordIndex + 1] ? args[passwordIndex + 1] : 'changeme123'

  // Check if user already exists
  const existing = await db.select().from(users).where(eq(users.email, email.toLowerCase())).get()
  if (existing) {
    console.log(`User with email ${email} already exists. Updating to admin...`)
    await db
      .update(users)
      .set({
        role: 'admin',
        status: 'approved',
        emailVerified: true,
      })
      .where(eq(users.email, email.toLowerCase()))
    console.log(`Updated ${email} to admin.`)
    return
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
}

async function main() {
  const args = process.argv.slice(2)
  const hasAdmin = args.includes('--admin')

  // Always seed templates and themes
  await seedTemplates()
  await seedThemes()

  // Optionally seed admin user
  if (hasAdmin) {
    await seedAdmin(args)
  }

  process.exit(0)
}

main().catch((err) => {
  console.error('Seed failed:', err)
  process.exit(1)
})
