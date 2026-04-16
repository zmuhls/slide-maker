import { test, expect } from './fixtures'

const API_URL = process.env.PUBLIC_API_URL ?? 'http://localhost:3001'

test('split layout stage zone is vertically centered in preview', async ({
  authedPage: page,
  createDeck,
  addSlide,
  addBlock,
}) => {
  const deck = await createDeck('Split Centering Test')
  const slide = await addSlide(deck.id, 'layout-split')

  // Content zone: heading + text (fills left side)
  await addBlock(deck.id, slide.id, {
    type: 'heading', zone: 'content',
    data: { text: 'Left Heading', level: 2 },
  })
  await addBlock(deck.id, slide.id, {
    type: 'text', zone: 'content',
    data: { markdown: '- Item one\n- Item two\n- Item three' },
  })

  // Stage zone: single small heading (should be vertically centered)
  await addBlock(deck.id, slide.id, {
    type: 'heading', zone: 'stage',
    data: { text: 'Stage Content', level: 3 },
  })

  // Open the full preview page (uses FRAMEWORK_CSS_EXPORT)
  await page.goto(`${API_URL}/api/decks/${deck.id}/preview`)
  await page.waitForSelector('.slide.layout-split', { timeout: 10000 })

  // The .stage zone should stretch to the full slide height (not collapse to content)
  const metrics = await page.evaluate(() => {
    const stage = document.querySelector('.slide.layout-split .stage') as HTMLElement
    if (!stage) return null
    const stageRect = stage.getBoundingClientRect()
    const slideRect = stage.closest('.slide')!.getBoundingClientRect()
    return {
      stageHeight: stageRect.height,
      slideHeight: slideRect.height,
      stageTop: stageRect.top,
      slideTop: slideRect.top,
    }
  })

  expect(metrics).not.toBeNull()

  // Stage zone height should be close to slide height minus padding (120px for 60px top+bottom)
  // Allow some tolerance for borders/gaps
  const expectedMinHeight = metrics!.slideHeight - 200
  expect(metrics!.stageHeight).toBeGreaterThan(expectedMinHeight)

  // Verify the stage content is vertically centered (not at the top)
  const centerMetrics = await page.evaluate(() => {
    const stage = document.querySelector('.slide.layout-split .stage') as HTMLElement
    if (!stage) return null
    const firstChild = stage.firstElementChild as HTMLElement
    if (!firstChild) return null
    const stageRect = stage.getBoundingClientRect()
    const childRect = firstChild.getBoundingClientRect()
    const childCenter = childRect.top + childRect.height / 2
    const stageCenter = stageRect.top + stageRect.height / 2
    return {
      childCenter,
      stageCenter,
      offset: Math.abs(childCenter - stageCenter),
      stageHeight: stageRect.height,
    }
  })

  expect(centerMetrics).not.toBeNull()
  // Child should be roughly centered — offset from center less than 15% of zone height
  const maxOffset = centerMetrics!.stageHeight * 0.15
  expect(centerMetrics!.offset).toBeLessThan(maxOffset)
})

test('split layout stage zone is vertically centered on canvas', async ({
  authedPage: page,
  createDeck,
  addSlide,
  addBlock,
  gotoEditor,
}) => {
  const deck = await createDeck('Split Canvas Center')
  const slide = await addSlide(deck.id, 'layout-split')

  await addBlock(deck.id, slide.id, {
    type: 'heading', zone: 'content',
    data: { text: 'Left Side', level: 2 },
  })
  await addBlock(deck.id, slide.id, {
    type: 'heading', zone: 'stage',
    data: { text: 'Right Centered', level: 3 },
  })

  await gotoEditor(deck.id)

  // Canvas uses .zone-right for the stage zone
  const centerMetrics = await page.evaluate(() => {
    const zone = document.querySelector('.zone-right') as HTMLElement
    if (!zone) return null
    const firstChild = zone.querySelector('.module-wrapper') as HTMLElement
    if (!firstChild) return null
    const zoneRect = zone.getBoundingClientRect()
    const childRect = firstChild.getBoundingClientRect()
    const childCenter = childRect.top + childRect.height / 2
    const zoneCenter = zoneRect.top + zoneRect.height / 2
    return {
      childCenter,
      zoneCenter,
      offset: Math.abs(childCenter - zoneCenter),
      zoneHeight: zoneRect.height,
    }
  })

  expect(centerMetrics).not.toBeNull()
  // Should be centered — offset less than 15% of zone height
  const maxOffset = centerMetrics!.zoneHeight * 0.15
  expect(centerMetrics!.offset).toBeLessThan(maxOffset)
})
