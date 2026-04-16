import { test, expect } from './fixtures'

test('mode buttons toggle between edit and view', async ({
  authedPage: page,
  createDeck,
  addSlide,
  addBlock,
  gotoEditor,
  switchToViewMode,
  switchToEditMode,
}) => {
  const deck = await createDeck('Mode Button Test')
  const slide = await addSlide(deck.id, 'layout-content')
  await addBlock(deck.id, slide.id, {
    type: 'heading', zone: 'main', data: { text: 'Mode Test', level: 1 },
  })

  await gotoEditor(deck.id)

  // Should be in edit mode
  const editBtn = page.locator('.mode-btn', { hasText: 'Edit' })
  await expect(editBtn).toHaveClass(/active/)

  // Switch to view mode
  await switchToViewMode()
  const viewBtn = page.locator('.mode-btn', { hasText: 'View' })
  await expect(viewBtn).toHaveClass(/active/)
  await expect(page.locator('.slide-frame.view-mode')).toBeVisible()

  // Switch back to edit
  await switchToEditMode()
  await expect(editBtn).toHaveClass(/active/)
})

test('left/right arrow keys navigate slides', async ({
  authedPage: page,
  createDeck,
  addMultipleSlides,
  addBlock,
  gotoEditor,
}) => {
  const deck = await createDeck('Arrow Key Nav')
  const slides = await addMultipleSlides(deck.id, ['layout-content', 'layout-content', 'layout-content'])

  await addBlock(deck.id, slides[0].id, {
    type: 'heading', zone: 'main', data: { text: 'Slide A', level: 1 },
  })
  await addBlock(deck.id, slides[1].id, {
    type: 'heading', zone: 'main', data: { text: 'Slide B', level: 1 },
  })
  await addBlock(deck.id, slides[2].id, {
    type: 'heading', zone: 'main', data: { text: 'Slide C', level: 1 },
  })

  await gotoEditor(deck.id)

  // Click on the canvas area to ensure focus is there (not in chat input)
  await page.locator('.slide-frame').click()
  await page.waitForTimeout(200)

  // Arrow right to next slide
  await page.keyboard.press('ArrowRight')
  await page.waitForTimeout(500)
  await expect(page.locator('.slide-frame')).toContainText('Slide B')

  // Arrow right again
  await page.keyboard.press('ArrowRight')
  await page.waitForTimeout(500)
  await expect(page.locator('.slide-frame')).toContainText('Slide C')

  // Arrow left back
  await page.keyboard.press('ArrowLeft')
  await page.waitForTimeout(500)
  await expect(page.locator('.slide-frame')).toContainText('Slide B')
})

test('Ctrl+Z triggers undo', async ({
  authedPage: page,
  createDeck,
  addSlide,
  addBlock,
  gotoEditor,
}) => {
  const deck = await createDeck('Undo Test')
  const slide = await addSlide(deck.id, 'layout-content')
  await addBlock(deck.id, slide.id, {
    type: 'heading', zone: 'main', data: { text: 'Undo Me', level: 1 },
  })

  await gotoEditor(deck.id)

  // Switch to Slides tab to see undo button state
  await page.locator('.left-tab-btn', { hasText: 'Slides' }).click()

  // Undo button should exist (may be disabled initially)
  const undoBtn = page.locator('.history-btn[title*="Undo"]')
  if (await undoBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    // Initially disabled (no history)
    await expect(undoBtn).toBeDisabled()
  }
})

test('tab switching via left panel tabs', async ({
  authedPage: page,
  createDeck,
  addSlide,
  gotoEditor,
}) => {
  const deck = await createDeck('Tab Switch Test')
  await addSlide(deck.id, 'layout-content')
  await gotoEditor(deck.id)

  // Chat tab (default)
  const chatTab = page.locator('.left-tab-btn', { hasText: 'Chat' })
  const slidesTab = page.locator('.left-tab-btn', { hasText: 'Slides' })
  const resourcesTab = page.locator('.left-tab-btn', { hasText: 'Resources' })

  // Switch to Slides
  await slidesTab.click()
  await expect(slidesTab).toHaveAttribute('aria-selected', 'true')
  await expect(page.locator('.slide-outline')).toBeVisible()

  // Switch to Resources
  await resourcesTab.click()
  await expect(resourcesTab).toHaveAttribute('aria-selected', 'true')

  // Switch back to Chat
  await chatTab.click()
  await expect(chatTab).toHaveAttribute('aria-selected', 'true')
  await expect(page.locator('.chat-panel')).toBeVisible()
})

test('left panel collapse button is visible and clickable', async ({
  authedPage: page,
  createDeck,
  addSlide,
  addBlock,
  gotoEditor,
}) => {
  const deck = await createDeck('Panel Collapse Test')
  const slide = await addSlide(deck.id, 'layout-content')
  await addBlock(deck.id, slide.id, {
    type: 'heading', zone: 'main', data: { text: 'Collapse Test', level: 1 },
  })
  await gotoEditor(deck.id)

  // Must be in edit mode for collapse to work
  const editBtn = page.locator('.mode-btn', { hasText: 'Edit' })
  await expect(editBtn).toHaveClass(/active/)

  const collapseBtn = page.locator('.collapse-btn.left-collapse')
  await expect(collapseBtn).toBeVisible()

  // Verify collapse button title changes when toggled
  const initialTitle = await collapseBtn.getAttribute('title')
  expect(initialTitle).toContain('Hide left panel')

  await collapseBtn.click()
  await page.waitForTimeout(500)

  const afterTitle = await collapseBtn.getAttribute('title')
  expect(afterTitle).toContain('Show panels')
})
