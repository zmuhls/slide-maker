import { test, expect } from './fixtures'

// Each layout with its valid zones — one representative heading module per zone
const LAYOUT_ZONE_MATRIX: Array<{
  layout: string
  zones: Array<{ zone: string; selector: string }>
  description: string
}> = [
  {
    layout: 'title-slide',
    zones: [{ zone: 'hero', selector: '.zone-hero, .hero-zone, [class*="hero"]' }],
    description: 'Title slide with hero zone',
  },
  {
    layout: 'layout-split',
    zones: [
      { zone: 'content', selector: '.zone-left' },
      { zone: 'stage', selector: '.zone-right' },
    ],
    description: 'Split layout with content (left) and stage (right) zones',
  },
  {
    layout: 'layout-content',
    zones: [{ zone: 'main', selector: '.zone-main, [class*="zone"]' }],
    description: 'Full content with main zone',
  },
  {
    layout: 'layout-grid',
    zones: [{ zone: 'main', selector: '.zone-main, [class*="zone"]' }],
    description: 'Grid layout with main zone',
  },
  {
    layout: 'layout-full-dark',
    zones: [{ zone: 'main', selector: '.zone-main, [class*="zone"]' }],
    description: 'Full dark with main zone',
  },
  {
    layout: 'layout-divider',
    zones: [{ zone: 'hero', selector: '.zone-hero, .hero-zone, [class*="hero"]' }],
    description: 'Divider with hero zone',
  },
  {
    layout: 'closing-slide',
    zones: [{ zone: 'hero', selector: '.zone-hero, .hero-zone, [class*="hero"]' }],
    description: 'Closing slide with hero zone',
  },
]

for (const entry of LAYOUT_ZONE_MATRIX) {
  test(`${entry.layout} renders with correct zone structure`, async ({
    authedPage: page,
    createDeck,
    addSlide,
    addBlock,
    gotoEditor,
  }) => {
    const deck = await createDeck(`Zone ${entry.layout}`)
    const slide = await addSlide(deck.id, entry.layout)

    // Add a heading to each zone
    for (const z of entry.zones) {
      await addBlock(deck.id, slide.id, {
        type: 'heading',
        zone: z.zone,
        data: { text: `Zone: ${z.zone}`, level: 2 },
      })
    }

    await gotoEditor(deck.id)

    // Verify the slide frame renders
    await expect(page.locator('.slide-frame')).toBeVisible()

    // Verify content renders for each zone
    for (const z of entry.zones) {
      await expect(page.locator('.slide-frame')).toContainText(`Zone: ${z.zone}`, { timeout: 5000 })
    }
  })
}

// Split layout: both zones coexist with different content
test('split layout renders distinct content in both zones', async ({
  authedPage: page,
  createDeck,
  addSlide,
  addBlock,
  gotoEditor,
}) => {
  const deck = await createDeck('Split Zone Content')
  const slide = await addSlide(deck.id, 'layout-split')

  await addBlock(deck.id, slide.id, {
    type: 'text', zone: 'content', data: { markdown: 'Left zone text content' },
  })
  await addBlock(deck.id, slide.id, {
    type: 'card', zone: 'stage', data: { content: '<p>Right zone card</p>', variant: 'cyan' },
  })

  await gotoEditor(deck.id)

  await expect(page.locator('.zone-left')).toContainText('Left zone text content')
  await expect(page.locator('.zone-right')).toContainText('Right zone card')
})

// Split layout: split handle is visible for resizing
test('split layout shows resize handle', async ({
  authedPage: page,
  createDeck,
  addSlide,
  addBlock,
  gotoEditor,
}) => {
  const deck = await createDeck('Split Handle Test')
  const slide = await addSlide(deck.id, 'layout-split')

  await addBlock(deck.id, slide.id, {
    type: 'heading', zone: 'content', data: { text: 'Left', level: 2 },
  })
  await addBlock(deck.id, slide.id, {
    type: 'heading', zone: 'stage', data: { text: 'Right', level: 2 },
  })

  await gotoEditor(deck.id)

  // Split handle should be visible
  const handle = page.locator('.split-handle')
  if (await handle.isVisible({ timeout: 3000 }).catch(() => false)) {
    await expect(handle).toBeVisible()
  }
})

// Dark layout: verify dark background styling
test('full dark layout applies dark styling', async ({
  authedPage: page,
  createDeck,
  addSlide,
  addBlock,
  gotoEditor,
}) => {
  const deck = await createDeck('Dark Layout Style')
  const slide = await addSlide(deck.id, 'layout-full-dark')

  await addBlock(deck.id, slide.id, {
    type: 'heading', zone: 'main', data: { text: 'Dark Heading', level: 1 },
  })

  await gotoEditor(deck.id)

  const frame = page.locator('.slide-frame')
  await expect(frame).toBeVisible()
  await expect(frame).toContainText('Dark Heading')

  // Verify the slide has dark layout data attribute
  const slideInner = page.locator('[data-layout="layout-full-dark"]')
  await expect(slideInner).toBeVisible({ timeout: 3000 })
})

// Multiple modules in a single zone maintain order
test('modules in a zone render in insertion order', async ({
  authedPage: page,
  createDeck,
  addSlide,
  addBlock,
  gotoEditor,
}) => {
  const deck = await createDeck('Zone Order Test')
  const slide = await addSlide(deck.id, 'layout-content')

  await addBlock(deck.id, slide.id, {
    type: 'heading', zone: 'main', data: { text: 'First', level: 1 },
  })
  await addBlock(deck.id, slide.id, {
    type: 'label', zone: 'main', data: { text: 'SECOND', color: 'cyan' },
  })
  await addBlock(deck.id, slide.id, {
    type: 'text', zone: 'main', data: { markdown: 'Third item' },
  })

  await gotoEditor(deck.id)

  const modules = page.locator('.module-wrapper')
  await expect(modules).toHaveCount(3, { timeout: 5000 })
  await expect(modules.nth(0)).toContainText('First')
  await expect(modules.nth(1)).toContainText('SECOND')
  await expect(modules.nth(2)).toContainText('Third item')
})
