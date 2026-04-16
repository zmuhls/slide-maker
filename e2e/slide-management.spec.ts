import { test, expect } from './fixtures'

const LAYOUTS = [
  { key: 'title-slide', label: 'Title Slide' },
  { key: 'layout-split', label: 'Split (Text + Visual)' },
  { key: 'layout-content', label: 'Full Content' },
  { key: 'layout-grid', label: 'Card Grid' },
  { key: 'layout-full-dark', label: 'Dark Section' },
  { key: 'layout-divider', label: 'Section Break' },
  { key: 'closing-slide', label: 'Closing' },
]

for (const layout of LAYOUTS) {
  test(`add ${layout.key} slide via outline menu`, async ({
    authedPage: page,
    createDeck,
    addSlide,
  }) => {
    // Create deck with one initial slide so the editor loads properly
    const deck = await createDeck(`Add Slide ${layout.key}`)
    await addSlide(deck.id, 'layout-content')

    await page.goto(`/deck/${deck.id}`)
    await page.waitForSelector('.slide-frame', { timeout: 10000 })

    // Switch to Slides tab
    await page.locator('.left-tab-btn', { hasText: 'Slides' }).click()
    await page.waitForTimeout(300)

    // Open add slide menu
    const addBtn = page.locator('.add-btn')
    await expect(addBtn).toBeVisible({ timeout: 3000 })
    await addBtn.click()

    // Click the layout option
    const dropdown = page.locator('.dropdown')
    await expect(dropdown).toBeVisible()
    await dropdown.locator('.item-label', { hasText: layout.label }).click()

    // Wait for new slide to appear
    await page.waitForTimeout(500)

    // Should now have 2 slides (the initial one + the new one)
    const slideCards = page.locator('.slide-card')
    await expect(slideCards).toHaveCount(2, { timeout: 5000 })
  })
}

test('navigate between multiple slides via outline', async ({
  authedPage: page,
  createDeck,
  addMultipleSlides,
  addBlock,
  gotoEditor,
}) => {
  const deck = await createDeck('Multi Slide Nav')
  const slides = await addMultipleSlides(deck.id, ['layout-content', 'layout-split', 'layout-content'])

  await addBlock(deck.id, slides[0].id, {
    type: 'heading', zone: 'main', data: { text: 'Slide One', level: 1 },
  })
  await addBlock(deck.id, slides[1].id, {
    type: 'heading', zone: 'content', data: { text: 'Slide Two', level: 1 },
  })
  await addBlock(deck.id, slides[2].id, {
    type: 'heading', zone: 'main', data: { text: 'Slide Three', level: 1 },
  })

  await gotoEditor(deck.id)

  // Switch to Slides tab
  await page.locator('.left-tab-btn', { hasText: 'Slides' }).click()

  // Click second slide card
  const slideCards = page.locator('.slide-card .card-header')
  await slideCards.nth(1).click()
  await page.waitForTimeout(300)

  // Canvas should show slide two content
  await expect(page.locator('.slide-frame')).toContainText('Slide Two')

  // Click third slide
  await slideCards.nth(2).click()
  await page.waitForTimeout(300)
  await expect(page.locator('.slide-frame')).toContainText('Slide Three')
})

test('navigate slides with arrow buttons in toolbar', async ({
  authedPage: page,
  createDeck,
  addMultipleSlides,
  addBlock,
  gotoEditor,
}) => {
  const deck = await createDeck('Arrow Nav Test')
  const slides = await addMultipleSlides(deck.id, ['layout-content', 'layout-content', 'layout-content'])

  await addBlock(deck.id, slides[0].id, {
    type: 'heading', zone: 'main', data: { text: 'First', level: 1 },
  })
  await addBlock(deck.id, slides[1].id, {
    type: 'heading', zone: 'main', data: { text: 'Second', level: 1 },
  })
  await addBlock(deck.id, slides[2].id, {
    type: 'heading', zone: 'main', data: { text: 'Third', level: 1 },
  })

  await gotoEditor(deck.id)

  // Should show slide counter
  await expect(page.locator('.slide-counter')).toContainText('1')

  // Next slide
  await page.locator('.nav-btn[aria-label="Next slide"]').click()
  await page.waitForTimeout(300)
  await expect(page.locator('.slide-frame')).toContainText('Second')

  // Next again
  await page.locator('.nav-btn[aria-label="Next slide"]').click()
  await page.waitForTimeout(300)
  await expect(page.locator('.slide-frame')).toContainText('Third')

  // Previous
  await page.locator('.nav-btn[aria-label="Previous slide"]').click()
  await page.waitForTimeout(300)
  await expect(page.locator('.slide-frame')).toContainText('Second')
})

test('delete slide via outline', async ({
  authedPage: page,
  createDeck,
  addMultipleSlides,
  gotoEditor,
}) => {
  const deck = await createDeck('Delete Slide Test')
  await addMultipleSlides(deck.id, ['layout-content', 'layout-content'])

  await gotoEditor(deck.id)

  // Switch to Slides tab
  await page.locator('.left-tab-btn', { hasText: 'Slides' }).click()

  // Should have 2 slides
  await expect(page.locator('.slide-card')).toHaveCount(2, { timeout: 5000 })

  // Hover first slide to reveal delete button
  const firstSlide = page.locator('.slide-card').first()
  await firstSlide.hover()
  await page.waitForTimeout(200)

  // Click delete (single click — no confirm needed)
  const deleteBtn = firstSlide.locator('.delete-btn')
  await expect(deleteBtn).toBeVisible()
  await deleteBtn.click()

  await page.waitForTimeout(1000)

  // Should have 1 slide left
  await expect(page.locator('.slide-card')).toHaveCount(1, { timeout: 5000 })
})

test('slide counter updates when slides are added', async ({
  authedPage: page,
  createDeck,
  addSlide,
  gotoEditor,
}) => {
  const deck = await createDeck('Counter Test')
  await addSlide(deck.id, 'layout-content')
  await gotoEditor(deck.id)

  await expect(page.locator('.slide-counter')).toContainText('1')

  // Add another slide via API and reload
  await addSlide(deck.id, 'layout-content')
  await page.reload()
  await page.waitForSelector('.slide-frame', { timeout: 10000 })

  // Counter should reflect 2 slides total
  const counterText = await page.locator('.slide-counter').textContent()
  expect(counterText).toContain('2')
})
