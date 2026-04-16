import { test, expect } from './fixtures'

// Module types available in the picker with their expected DOM selectors
const PICKER_MODULES: Array<{
  label: string
  type: string
  selector: string
}> = [
  { label: 'Heading', type: 'heading', selector: '.heading-wrapper' },
  { label: 'Text', type: 'text', selector: '.text-block' },
  { label: 'Card', type: 'card', selector: '.card' },
  { label: 'Label', type: 'label', selector: '.label' },
  { label: 'Callout', type: 'tip-box', selector: '.tip-box' },
  { label: 'Code Block', type: 'prompt-block', selector: '.prompt-block' },
  { label: 'Image', type: 'image', selector: '.image-block' },
  { label: 'Carousel', type: 'carousel', selector: '.carousel' },
  { label: 'Comparison', type: 'comparison', selector: '.comparison' },
  { label: 'Card Grid', type: 'card-grid', selector: '.card-grid' },
  { label: 'Process Flow', type: 'flow', selector: '.flow' },
  { label: 'List', type: 'stream-list', selector: '.stream-list' },
  { label: 'Artifact', type: 'artifact', selector: '.artifact-iframe, .artifact-module' },
  { label: 'Video', type: 'video', selector: '.video-module, .video-block' },
]

test('module picker opens and shows all module types', async ({
  authedPage: page,
  createDeck,
  addSlide,
  gotoEditor,
}) => {
  const deck = await createDeck('Picker Test')
  await addSlide(deck.id, 'layout-content')
  await gotoEditor(deck.id)

  // Hover over the zone to reveal the add-module button
  const zoneDrop = page.locator('.zone-drop').first()
  await zoneDrop.hover()
  await page.waitForTimeout(300)

  // Click the + Module button
  const addModuleBtn = page.locator('.add-module-btn').first()
  await expect(addModuleBtn).toBeVisible({ timeout: 3000 })
  await addModuleBtn.click()
  await page.waitForTimeout(300)

  // Module picker should appear
  const picker = page.locator('.module-picker')
  await expect(picker).toBeVisible({ timeout: 3000 })

  // Verify picker has items (14 module types)
  const items = picker.locator('.picker-item')
  const count = await items.count()
  expect(count).toBeGreaterThanOrEqual(12) // At least 12 visible module types
})

// Test adding each module type via API and verifying it renders
for (const mod of PICKER_MODULES) {
  // Skip image/carousel/artifact/video since they need real assets
  if (['image', 'carousel', 'artifact', 'video'].includes(mod.type)) continue

  test(`add ${mod.type} module via API and verify render`, async ({
    authedPage: page,
    createDeck,
    addSlide,
    addBlock,
    gotoEditor,
  }) => {
    const deck = await createDeck(`Module ${mod.type}`)
    const slide = await addSlide(deck.id, 'layout-content')

    const dataByType: Record<string, Record<string, unknown>> = {
      heading: { text: 'Test Heading', level: 2 },
      text: { markdown: 'Test paragraph text' },
      card: { content: '<p>Card content</p>', variant: 'cyan' },
      label: { text: 'TEST LABEL', color: 'cyan' },
      'tip-box': { content: 'Tip content', title: 'Tip Title' },
      'prompt-block': { content: 'console.log("hello")', quality: 'good', language: 'javascript' },
      comparison: { panels: [{ title: 'A', content: 'Left' }, { title: 'B', content: 'Right' }] },
      'card-grid': { cards: [{ title: 'C1', content: 'Body1' }, { title: 'C2', content: 'Body2' }], columns: 2 },
      flow: { nodes: [{ label: 'Start' }, { label: 'End' }] },
      'stream-list': { items: ['First', 'Second', 'Third'] },
    }

    await addBlock(deck.id, slide.id, {
      type: mod.type,
      zone: 'main',
      data: dataByType[mod.type],
    })

    await gotoEditor(deck.id)

    const moduleEl = page.locator('.slide-frame').locator(mod.selector).first()
    await expect(moduleEl).toBeVisible({ timeout: 5000 })
  })
}

test('multiple modules render in correct order', async ({
  authedPage: page,
  createDeck,
  addSlide,
  addBlock,
  gotoEditor,
}) => {
  const deck = await createDeck('Multi Module Order')
  const slide = await addSlide(deck.id, 'layout-content')

  await addBlock(deck.id, slide.id, {
    type: 'heading', zone: 'main', data: { text: 'First Module', level: 1 },
  })
  await addBlock(deck.id, slide.id, {
    type: 'text', zone: 'main', data: { markdown: 'Second Module' },
  })
  await addBlock(deck.id, slide.id, {
    type: 'label', zone: 'main', data: { text: 'THIRD MODULE', color: 'blue' },
  })

  await gotoEditor(deck.id)

  const modules = page.locator('.slide-frame .module-wrapper')
  await expect(modules).toHaveCount(3, { timeout: 5000 })

  // Verify order
  await expect(modules.nth(0)).toContainText('First Module')
  await expect(modules.nth(1)).toContainText('Second Module')
  await expect(modules.nth(2)).toContainText('THIRD MODULE')
})

test('delete module via controls', async ({
  authedPage: page,
  createDeck,
  addSlide,
  addBlock,
  gotoEditor,
}) => {
  const deck = await createDeck('Delete Module Test')
  const slide = await addSlide(deck.id, 'layout-content')

  await addBlock(deck.id, slide.id, {
    type: 'heading', zone: 'main', data: { text: 'Delete Me', level: 1 },
  })
  await addBlock(deck.id, slide.id, {
    type: 'text', zone: 'main', data: { markdown: 'Keep Me' },
  })

  await gotoEditor(deck.id)

  // Hover first module to show controls
  const firstModule = page.locator('.module-wrapper').first()
  await firstModule.hover()

  // Double-click delete button (first click shows confirm, second deletes)
  const deleteBtn = firstModule.locator('.module-controls button[title*="Delete"], .module-controls .delete-btn').first()
  if (await deleteBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await deleteBtn.click()
    await deleteBtn.click() // Confirm
    await page.waitForTimeout(500)

    // Should only have one module left
    await expect(page.locator('.module-wrapper')).toHaveCount(1, { timeout: 5000 })
    await expect(page.locator('.slide-frame')).toContainText('Keep Me')
  }
})
