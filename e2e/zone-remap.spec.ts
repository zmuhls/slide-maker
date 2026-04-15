import { test, expect } from './fixtures'

const API_URL = process.env.PUBLIC_API_URL ?? 'http://localhost:3001'

test('changing layout from full-dark to split remaps blocks from main to content', async ({
  authedPage: page,
  createDeck,
  addSlide,
  addBlock,
  gotoEditor,
}) => {
  const deck = await createDeck('Zone Remap Test')
  const slide = await addSlide(deck.id, 'layout-full-dark')

  // Add heading and stream-list in zone "main" (valid for layout-full-dark)
  await addBlock(deck.id, slide.id, {
    type: 'heading', zone: 'main', data: { text: 'Classic Methods', level: 2 },
  })
  await addBlock(deck.id, slide.id, {
    type: 'stream-list', zone: 'main', data: { items: ['Generative Geometry', 'Perlin Noise', 'Cellular Automata'] },
  })

  // Navigate to editor and verify content renders
  await gotoEditor(deck.id)
  await expect(page.locator('.slide-frame')).toContainText('Classic Methods', { timeout: 5000 })
  await expect(page.locator('.slide-frame')).toContainText('Generative Geometry')

  // Change layout to layout-split via API (simulates what the Wiz does)
  const res = await page.request.patch(`${API_URL}/api/decks/${deck.id}/slides/${slide.id}`, {
    data: { layout: 'layout-split' },
  })
  expect(res.ok()).toBeTruthy()

  // Reload to pick up the server-side zone remap
  await page.reload()
  await page.waitForSelector('.slide-frame', { timeout: 10000 })

  // Content should still be visible — blocks remapped from "main" to "content"
  await expect(page.locator('.slide-frame')).toContainText('Classic Methods', { timeout: 5000 })
  await expect(page.locator('.slide-frame')).toContainText('Generative Geometry')

  // Verify layout actually changed to split
  await expect(page.locator('[data-layout="layout-split"]')).toBeVisible({ timeout: 3000 })

  // Content should be in the left zone (content zone)
  await expect(page.locator('.zone-left')).toContainText('Classic Methods')
})

test('changing layout from split to full-dark remaps content/stage blocks to main', async ({
  authedPage: page,
  createDeck,
  addSlide,
  addBlock,
  gotoEditor,
}) => {
  const deck = await createDeck('Zone Remap Reverse')
  const slide = await addSlide(deck.id, 'layout-split')

  await addBlock(deck.id, slide.id, {
    type: 'heading', zone: 'content', data: { text: 'Left Side', level: 2 },
  })
  await addBlock(deck.id, slide.id, {
    type: 'text', zone: 'stage', data: { markdown: 'Right side text' },
  })

  await gotoEditor(deck.id)
  await expect(page.locator('.slide-frame')).toContainText('Left Side', { timeout: 5000 })

  // Change to layout-full-dark
  const res = await page.request.patch(`${API_URL}/api/decks/${deck.id}/slides/${slide.id}`, {
    data: { layout: 'layout-full-dark' },
  })
  expect(res.ok()).toBeTruthy()

  await page.reload()
  await page.waitForSelector('.slide-frame', { timeout: 10000 })

  // Both blocks should be visible — remapped to "main"
  await expect(page.locator('.slide-frame')).toContainText('Left Side', { timeout: 5000 })
  await expect(page.locator('.slide-frame')).toContainText('Right side text')
  await expect(page.locator('[data-layout="layout-full-dark"]')).toBeVisible({ timeout: 3000 })
})
