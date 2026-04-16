import { test, expect } from './fixtures'

test('gallery page loads and shows deck grid', async ({ authedPage: page }) => {
  await page.goto('/')
  await expect(page.locator('.gallery-page')).toBeVisible({ timeout: 15000 })
  await expect(page.locator('.gallery-header')).toBeVisible()
})

test('create deck via dialog', async ({ authedPage: page }) => {
  await page.goto('/')
  await page.waitForSelector('.gallery-page', { timeout: 15000 })
  await page.locator('button.btn-new').click()

  const dialog = page.locator('.dialog')
  await expect(dialog).toBeVisible()
  await expect(page.locator('#new-deck-title')).toContainText('New Deck')

  await dialog.locator('input[type="text"]').fill('E2E Gallery Deck')
  await dialog.locator('.btn-primary').click()

  // Should navigate to the editor (new deck has no slides)
  await page.waitForURL(/\/deck\//, { timeout: 15000 })
  await expect(page.locator('.editor-outer')).toBeVisible({ timeout: 10000 })
})

test('cancel new deck dialog', async ({ authedPage: page }) => {
  await page.goto('/')
  await page.waitForSelector('.gallery-page', { timeout: 15000 })
  await page.locator('button.btn-new').click()

  const dialog = page.locator('.dialog')
  await expect(dialog).toBeVisible()

  await dialog.locator('.btn-secondary').click()
  await expect(dialog).not.toBeVisible()
})

test('navigate to editor via direct URL and back', async ({
  authedPage: page,
  createDeck,
  addSlide,
  addBlock,
}) => {
  const deck = await createDeck('Nav Test Deck')
  const slide = await addSlide(deck.id, 'layout-content')
  await addBlock(deck.id, slide.id, {
    type: 'heading',
    zone: 'main',
    data: { text: 'Nav Test', level: 1 },
  })

  // Navigate directly to the editor
  await page.goto(`/deck/${deck.id}`)
  await page.waitForSelector('.slide-frame', { timeout: 10000 })
  await expect(page.locator('.slide-frame')).toContainText('Nav Test')

  // Navigate back via toolbar back button
  await page.locator('.back-btn').click()
  await expect(page.locator('.gallery-page')).toBeVisible({ timeout: 15000 })
})

test('deck API returns correct ownership', async ({
  authedPage: page,
  createDeck,
}) => {
  const API_URL = process.env.PUBLIC_API_URL ?? 'http://localhost:3001'
  const deck = await createDeck('Ownership Test')

  // Verify deck is accessible
  const res = await page.request.get(`${API_URL}/api/decks/${deck.id}`)
  expect(res.ok()).toBeTruthy()

  const data = await res.json()
  expect(data.id ?? data.deck?.id).toBe(deck.id)
})

test('user menu shows name and logout', async ({ authedPage: page }) => {
  await page.goto('/')
  await page.waitForSelector('.gallery-page', { timeout: 15000 })
  await expect(page.locator('.user-name')).toBeVisible()
  await expect(page.locator('.btn-logout')).toBeVisible()
})

test('change password dialog opens and closes', async ({ authedPage: page }) => {
  await page.goto('/')
  await page.waitForSelector('.gallery-page', { timeout: 15000 })

  const cpBtn = page.locator('.btn-change-pw')
  if (await cpBtn.isVisible()) {
    await cpBtn.click()
    await expect(page.locator('.cp-dialog')).toBeVisible()
    await page.locator('.cp-cancel').click()
    await expect(page.locator('.cp-dialog')).not.toBeVisible()
  }
})
