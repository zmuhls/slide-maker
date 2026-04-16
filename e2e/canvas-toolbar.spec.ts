import { test, expect } from './fixtures'

test('mode switcher toggles between edit and view', async ({
  authedPage: page,
  createDeck,
  addSlide,
  addBlock,
  gotoEditor,
}) => {
  const deck = await createDeck('Mode Switch Test')
  const slide = await addSlide(deck.id, 'layout-content')
  await addBlock(deck.id, slide.id, {
    type: 'heading', zone: 'main', data: { text: 'Mode Test', level: 1 },
  })

  await gotoEditor(deck.id)

  // Should start in edit mode
  const editBtn = page.locator('.mode-btn', { hasText: 'Edit' })
  const viewBtn = page.locator('.mode-btn', { hasText: 'View' })

  await expect(editBtn).toHaveClass(/active/)

  // Switch to view mode
  await viewBtn.click()
  await page.waitForTimeout(300)
  await expect(viewBtn).toHaveClass(/active/)
  await expect(page.locator('.slide-frame.view-mode')).toBeVisible()

  // Switch back to edit
  await editBtn.click()
  await page.waitForTimeout(300)
  await expect(editBtn).toHaveClass(/active/)
})

test('theme panel opens and shows themes', async ({
  authedPage: page,
  createDeck,
  addSlide,
  gotoEditor,
}) => {
  const deck = await createDeck('Theme Panel Test')
  await addSlide(deck.id, 'layout-content')
  await gotoEditor(deck.id)

  // Open theme panel — click the button inside .theme-wrapper
  const themeBtn = page.getByRole('button', { name: 'Theme' })
  await expect(themeBtn).toBeVisible()

  // Use dispatchEvent to avoid any click interception issues
  await themeBtn.dispatchEvent('click')
  await page.waitForTimeout(300)

  const popover = page.locator('.theme-popover')
  // If the popover didn't open, try a regular click
  if (!await popover.isVisible().catch(() => false)) {
    await themeBtn.click()
    await page.waitForTimeout(300)
  }

  await expect(popover).toBeVisible({ timeout: 5000 })

  // Should show theme list
  await expect(popover.locator('.tp-list')).toBeVisible()

  // Should have at least one theme row
  const rows = popover.locator('.tp-row')
  await expect(rows.first()).toBeVisible()

  // Close by clicking backdrop
  await page.locator('.tp-backdrop').click()
  await expect(popover).not.toBeVisible()
})

test('apply a theme from the theme panel', async ({
  authedPage: page,
  createDeck,
  addSlide,
  gotoEditor,
}) => {
  const deck = await createDeck('Apply Theme Test')
  await addSlide(deck.id, 'layout-content')
  await gotoEditor(deck.id)

  // Open theme panel via the Theme button
  const themeBtn = page.locator('button.icon-btn[title="Theme"]')
  await expect(themeBtn).toBeVisible()
  await themeBtn.click()
  await page.waitForTimeout(500)

  const popover = page.locator('.theme-popover')
  // If popover didn't open, try clicking again (toggle might have been in wrong state)
  if (!await popover.isVisible().catch(() => false)) {
    await themeBtn.click()
    await page.waitForTimeout(500)
  }
  await expect(popover).toBeVisible({ timeout: 5000 })

  // There must be at least one theme row
  const rows = popover.locator('.tp-row')
  const rowCount = await rows.count()
  expect(rowCount).toBeGreaterThan(0)

  // Click the first theme row to apply
  const firstApply = rows.first().locator('.tp-row-main')
  await firstApply.click()
  await page.waitForTimeout(500)

  // After applying, that row should be active
  await expect(rows.first()).toHaveClass(/active/, { timeout: 3000 })
})

test('create custom theme via theme panel', async ({
  authedPage: page,
  createDeck,
  addSlide,
  gotoEditor,
}) => {
  const deck = await createDeck('Create Theme Test')
  await addSlide(deck.id, 'layout-content')
  await gotoEditor(deck.id)

  const themeBtn = page.getByRole('button', { name: 'Theme' })
  await themeBtn.click()

  const popover = page.locator('.theme-popover')
  await expect(popover).toBeVisible()

  // Click "+ New" toggle
  const createToggle = popover.locator('.tp-create-toggle')
  await createToggle.click()

  // Fill theme name
  const nameInput = popover.locator('.tp-input')
  await expect(nameInput).toBeVisible()
  await nameInput.fill('E2E Custom Theme')

  // Fill primary color
  const colorFields = popover.locator('.tp-color-field input')
  if (await colorFields.first().isVisible({ timeout: 2000 }).catch(() => false)) {
    await colorFields.first().fill('#FF5733')
  }

  // Save
  const saveBtn = popover.locator('.tp-save-btn')
  await saveBtn.click()
  await page.waitForTimeout(500)

  // Custom theme should appear in list
  await expect(popover.locator('.tp-name', { hasText: 'E2E Custom Theme' }).first()).toBeVisible({ timeout: 3000 })
})

test('dark mode toggle works', async ({
  authedPage: page,
  createDeck,
  addSlide,
  gotoEditor,
}) => {
  const deck = await createDeck('Dark Mode Test')
  await addSlide(deck.id, 'layout-content')
  await gotoEditor(deck.id)

  // Find the dark/light mode toggle
  const darkModeBtn = page.locator('.icon-btn[title="Dark mode"], .icon-btn[title="Light mode"]')
  await expect(darkModeBtn).toBeVisible()

  const initialTitle = await darkModeBtn.getAttribute('title')
  await darkModeBtn.click()
  await page.waitForTimeout(300)

  // Title should have toggled
  const newTitle = await darkModeBtn.getAttribute('title')
  expect(newTitle).not.toBe(initialTitle)
})

test('export button triggers download', async ({
  authedPage: page,
  createDeck,
  addSlide,
  addBlock,
  gotoEditor,
}) => {
  const deck = await createDeck('Export Test')
  const slide = await addSlide(deck.id, 'layout-content')
  await addBlock(deck.id, slide.id, {
    type: 'heading', zone: 'main', data: { text: 'Export Me', level: 1 },
  })

  await gotoEditor(deck.id)

  const exportBtn = page.locator('.icon-btn[title="Export deck"]')
  await expect(exportBtn).toBeVisible()

  // Set up download listener
  const [download] = await Promise.all([
    page.waitForEvent('download', { timeout: 15000 }),
    exportBtn.click(),
  ])

  expect(download.suggestedFilename()).toMatch(/\.zip$/)
})

test('share button opens share dialog', async ({
  authedPage: page,
  createDeck,
  addSlide,
  gotoEditor,
}) => {
  const deck = await createDeck('Share Dialog Test')
  await addSlide(deck.id, 'layout-content')
  await gotoEditor(deck.id)

  const shareBtn = page.locator('.icon-btn[title="Share deck"]')
  await expect(shareBtn).toBeVisible()
  await shareBtn.click()

  // Dialog should appear
  const dialog = page.locator('[role="dialog"]')
  await expect(dialog).toBeVisible()
  await expect(page.locator('#share-dialog-title')).toContainText('Share')

  // Should have search input
  await expect(dialog.locator('input[placeholder*="Search"]')).toBeVisible()

  // Close dialog
  await dialog.locator('.close-btn').click()
  await expect(dialog).not.toBeVisible()
})

test('branding panel opens and shows fields', async ({
  authedPage: page,
  createDeck,
  addSlide,
  gotoEditor,
}) => {
  const deck = await createDeck('Branding Test')
  await addSlide(deck.id, 'layout-content')
  await gotoEditor(deck.id)

  const brandingBtn = page.locator('.icon-btn[title="Branding / Logo"]')
  await expect(brandingBtn).toBeVisible()
  await brandingBtn.click()

  const panel = page.locator('.branding-panel')
  await expect(panel).toBeVisible()

  // Should have logo URL input and save button
  await expect(panel.locator('input[placeholder="https://..."]')).toBeVisible()
  await expect(panel.locator('.branding-save')).toBeVisible()
})

test('back button returns to gallery', async ({
  authedPage: page,
  createDeck,
  addSlide,
  gotoEditor,
}) => {
  const deck = await createDeck('Back Button Test')
  await addSlide(deck.id, 'layout-content')
  await gotoEditor(deck.id)

  await page.locator('.back-btn').click()
  await expect(page.locator('.gallery-page')).toBeVisible({ timeout: 10000 })
})
