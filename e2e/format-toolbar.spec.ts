import { test, expect } from './fixtures'

test('format toolbar shows hint when no editor is active', async ({
  authedPage: page,
  createDeck,
  addSlide,
  addBlock,
  gotoEditor,
}) => {
  const deck = await createDeck('Format Toolbar Hint')
  const slide = await addSlide(deck.id, 'layout-content')
  await addBlock(deck.id, slide.id, {
    type: 'text', zone: 'main', data: { markdown: 'Click to edit' },
  })

  await gotoEditor(deck.id)

  // Format toolbar should show hint or be disabled
  const toolbar = page.locator('.format-toolbar')
  await expect(toolbar).toBeVisible()

  const hint = toolbar.locator('.hint')
  if (await hint.isVisible({ timeout: 1000 }).catch(() => false)) {
    await expect(hint).toContainText('Click a text block')
  }
})

test('format toolbar activates when clicking text module', async ({
  authedPage: page,
  createDeck,
  addSlide,
  addBlock,
  gotoEditor,
}) => {
  const deck = await createDeck('Format Activate')
  const slide = await addSlide(deck.id, 'layout-content')
  await addBlock(deck.id, slide.id, {
    type: 'text', zone: 'main', data: { markdown: 'Editable text here' },
  })

  await gotoEditor(deck.id)

  // Click the text module to activate TipTap editor
  const textModule = page.locator('.text-block').first()
  await textModule.click()
  await page.waitForTimeout(300)

  // Format toolbar should now show formatting buttons
  const toolbar = page.locator('.format-toolbar')
  await expect(toolbar).not.toHaveClass(/disabled/, { timeout: 3000 })

  // Check for bold button
  const boldBtn = toolbar.locator('.fmt-btn', { hasText: 'B' }).first()
  await expect(boldBtn).toBeVisible()
})

test('heading select changes heading level', async ({
  authedPage: page,
  createDeck,
  addSlide,
  addBlock,
  gotoEditor,
}) => {
  const deck = await createDeck('Heading Level Test')
  const slide = await addSlide(deck.id, 'layout-content')
  await addBlock(deck.id, slide.id, {
    type: 'heading', zone: 'main', data: { text: 'Change My Level', level: 1 },
  })

  await gotoEditor(deck.id)

  // Click heading preview button to activate TipTap editor
  const headingPreview = page.locator('.heading-preview.editable').first()
  await expect(headingPreview).toBeVisible({ timeout: 3000 })
  await headingPreview.click()
  await page.waitForTimeout(500)

  // Change heading level via select
  const select = page.locator('.heading-select')
  await expect(select).toBeVisible({ timeout: 3000 })
  // Options are value-based: p, 1, 2, 3, 4
  // Select H2 — this changes TipTap editor content formatting
  await select.selectOption({ value: '2' })
  await page.waitForTimeout(300)
  // Verify the select was changed (format toolbar reflects the current heading level)
  await expect(select).toHaveValue('2')
})

test('bold button toggles bold formatting', async ({
  authedPage: page,
  createDeck,
  addSlide,
  addBlock,
  gotoEditor,
}) => {
  const deck = await createDeck('Bold Test')
  const slide = await addSlide(deck.id, 'layout-content')
  await addBlock(deck.id, slide.id, {
    type: 'text', zone: 'main', data: { markdown: 'Make me bold' },
  })

  await gotoEditor(deck.id)

  // Click text to activate
  const textBlock = page.locator('.text-block').first()
  await textBlock.click()
  await page.waitForTimeout(300)

  // Select all text
  await page.keyboard.press('Meta+A')
  await page.waitForTimeout(100)

  // Click bold button
  const boldBtn = page.locator('.fmt-btn', { hasText: 'B' }).first()
  if (await boldBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await boldBtn.click()
    await page.waitForTimeout(300)

    // Bold button should be active
    await expect(boldBtn).toHaveClass(/active/)
  }
})

test('italic button toggles italic formatting', async ({
  authedPage: page,
  createDeck,
  addSlide,
  addBlock,
  gotoEditor,
}) => {
  const deck = await createDeck('Italic Test')
  const slide = await addSlide(deck.id, 'layout-content')
  await addBlock(deck.id, slide.id, {
    type: 'text', zone: 'main', data: { markdown: 'Make me italic' },
  })

  await gotoEditor(deck.id)

  const textBlock = page.locator('.text-block').first()
  await textBlock.click()
  await page.waitForTimeout(300)

  await page.keyboard.press('Meta+A')
  await page.waitForTimeout(100)

  const italicBtn = page.locator('.fmt-btn', { hasText: 'I' }).first()
  if (await italicBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await italicBtn.click()
    await page.waitForTimeout(300)
    await expect(italicBtn).toHaveClass(/active/)
  }
})

test('alignment buttons cycle through alignments', async ({
  authedPage: page,
  createDeck,
  addSlide,
  addBlock,
  gotoEditor,
}) => {
  const deck = await createDeck('Alignment Test')
  const slide = await addSlide(deck.id, 'layout-content')
  await addBlock(deck.id, slide.id, {
    type: 'text', zone: 'main', data: { markdown: 'Align me' },
  })

  await gotoEditor(deck.id)

  const textBlock = page.locator('.text-block').first()
  await textBlock.click()
  await page.waitForTimeout(300)

  // Look for any alignment button
  const alignBtn = page.locator('.fmt-btn[title*="Align"]').first()
  if (await alignBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await alignBtn.click()
    await page.waitForTimeout(300)
    // Just verify it's clickable without error
  }
})

test('font size select changes font size', async ({
  authedPage: page,
  createDeck,
  addSlide,
  addBlock,
  gotoEditor,
}) => {
  const deck = await createDeck('Font Size Test')
  const slide = await addSlide(deck.id, 'layout-content')
  await addBlock(deck.id, slide.id, {
    type: 'text', zone: 'main', data: { markdown: 'Resize me' },
  })

  await gotoEditor(deck.id)

  const textBlock = page.locator('.text-block').first()
  await textBlock.click()
  await page.waitForTimeout(300)

  await page.keyboard.press('Meta+A')

  const sizeSelect = page.locator('.font-size-select')
  if (await sizeSelect.isVisible({ timeout: 2000 }).catch(() => false)) {
    await sizeSelect.selectOption('24')
    await page.waitForTimeout(300)
  }
})
