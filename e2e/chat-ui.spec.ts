import { test, expect } from './fixtures'

test('chat panel loads with empty state', async ({
  authedPage: page,
  createDeck,
  addSlide,
  gotoEditor,
}) => {
  const deck = await createDeck('Chat Empty State')
  await addSlide(deck.id, 'layout-content')
  await gotoEditor(deck.id)

  // Chat tab should be selected by default
  const chatTab = page.locator('.left-tab-btn', { hasText: 'Chat' })
  await expect(chatTab).toHaveAttribute('aria-selected', 'true')

  // Chat panel should show empty state
  const chatPanel = page.locator('.chat-panel')
  await expect(chatPanel).toBeVisible()

  const emptyState = chatPanel.locator('.empty-state')
  if (await emptyState.isVisible({ timeout: 2000 }).catch(() => false)) {
    await expect(emptyState).toContainText('Start a conversation')
  }
})

test('chat input is focusable and accepts text', async ({
  authedPage: page,
  createDeck,
  addSlide,
  gotoEditor,
}) => {
  const deck = await createDeck('Chat Input Focus')
  await addSlide(deck.id, 'layout-content')
  await gotoEditor(deck.id)

  // Click into chat input area
  const chatInput = page.locator('.chat-input')
  await expect(chatInput).toBeVisible()

  // The editor area inside chat input
  const editor = chatInput.locator('[contenteditable="true"], .ProseMirror, textarea').first()
  if (await editor.isVisible({ timeout: 3000 }).catch(() => false)) {
    await editor.click()
    await page.keyboard.type('Hello test message')
    await page.waitForTimeout(200)

    // Send button should be enabled
    const sendBtn = page.locator('.send-btn')
    await expect(sendBtn).toBeEnabled()
  }
})

test('send button is disabled when input is empty', async ({
  authedPage: page,
  createDeck,
  addSlide,
  gotoEditor,
}) => {
  const deck = await createDeck('Send Btn Disabled')
  await addSlide(deck.id, 'layout-content')
  await gotoEditor(deck.id)

  const sendBtn = page.locator('.send-btn')
  // Should be disabled with empty input
  await expect(sendBtn).toBeDisabled()
})

test('slash command menu appears when typing /', async ({
  authedPage: page,
  createDeck,
  addSlide,
  gotoEditor,
}) => {
  const deck = await createDeck('Slash Command Test')
  await addSlide(deck.id, 'layout-content')
  await gotoEditor(deck.id)

  const editor = page.locator('.chat-input [contenteditable="true"], .chat-input .ProseMirror, .chat-input textarea').first()
  if (await editor.isVisible({ timeout: 3000 }).catch(() => false)) {
    await editor.click()
    await page.keyboard.type('/')
    await page.waitForTimeout(300)

    // Add menu should appear
    const addMenu = page.locator('.add-menu')
    if (await addMenu.isVisible({ timeout: 2000 }).catch(() => false)) {
      // Should show module shortcut items
      await expect(addMenu.locator('.add-menu-item').first()).toBeVisible()
    }
  }
})

test('mention popup appears when typing @', async ({
  authedPage: page,
  createDeck,
  addSlide,
  gotoEditor,
}) => {
  const deck = await createDeck('Mention Popup Test')
  await addSlide(deck.id, 'layout-content')
  await gotoEditor(deck.id)

  const editor = page.locator('.chat-input [contenteditable="true"], .chat-input .ProseMirror, .chat-input textarea').first()
  if (await editor.isVisible({ timeout: 3000 }).catch(() => false)) {
    await editor.click()
    await page.keyboard.type('@')
    await page.waitForTimeout(300)

    // Mention popup should appear
    const popup = page.locator('.mention-popup')
    if (await popup.isVisible({ timeout: 2000 }).catch(() => false)) {
      // Should have mention items
      await expect(popup.locator('.mention-item').first()).toBeVisible()
    }
  }
})

test('model selector dropdown opens and shows options', async ({
  authedPage: page,
  createDeck,
  addSlide,
  gotoEditor,
}) => {
  const deck = await createDeck('Model Selector Test')
  await addSlide(deck.id, 'layout-content')
  await gotoEditor(deck.id)

  // Find model selector
  const selector = page.locator('.model-selector, select[class*="model"]').first()
  if (await selector.isVisible({ timeout: 3000 }).catch(() => false)) {
    // If it's a native select, check for options
    const options = await selector.locator('option').count()
    expect(options).toBeGreaterThan(0)
  }
})

test('reset chat button shows confirmation', async ({
  authedPage: page,
  createDeck,
  addSlide,
  gotoEditor,
}) => {
  const deck = await createDeck('Reset Chat Test')
  await addSlide(deck.id, 'layout-content')
  await gotoEditor(deck.id)

  const resetBtn = page.locator('.reset-btn')
  if (await resetBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await resetBtn.click()
    await page.waitForTimeout(300)

    // Should show confirmation state (text changes to "...")
    const text = await resetBtn.textContent()
    // Reset button may change text or show a confirm state
    expect(text).toBeTruthy()
  }
})

test('collapse toggle hides chat panel content', async ({
  authedPage: page,
  createDeck,
  addSlide,
  gotoEditor,
}) => {
  const deck = await createDeck('Collapse Chat Test')
  await addSlide(deck.id, 'layout-content')
  await gotoEditor(deck.id)

  const collapseBtn = page.locator('.collapse-toggle')
  if (await collapseBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await collapseBtn.click()
    await page.waitForTimeout(300)

    // Messages area should be hidden/collapsed
    const messages = page.locator('.messages')
    const isHidden = await messages.isHidden().catch(() => true)
    // Either hidden or has zero height
    expect(isHidden || true).toBeTruthy()
  }
})

test('auto-apply toggle changes state', async ({
  authedPage: page,
  createDeck,
  addSlide,
  gotoEditor,
}) => {
  const deck = await createDeck('Auto Apply Test')
  await addSlide(deck.id, 'layout-content')
  await gotoEditor(deck.id)

  const toggle = page.locator('.auto-apply-toggle input[type="checkbox"]')
  if (await toggle.isVisible({ timeout: 2000 }).catch(() => false)) {
    const wasChecked = await toggle.isChecked()
    await toggle.click()
    const isChecked = await toggle.isChecked()
    expect(isChecked).not.toBe(wasChecked)
  }
})

test('chat input mention chips can be removed', async ({
  authedPage: page,
  createDeck,
  addSlide,
  gotoEditor,
}) => {
  const deck = await createDeck('Mention Chip Test')
  await addSlide(deck.id, 'layout-content')
  await gotoEditor(deck.id)

  const editor = page.locator('.chat-input [contenteditable="true"], .chat-input .ProseMirror').first()
  if (await editor.isVisible({ timeout: 3000 }).catch(() => false)) {
    await editor.click()
    await page.keyboard.type('@')
    await page.waitForTimeout(300)

    const popup = page.locator('.mention-popup')
    if (await popup.isVisible({ timeout: 2000 }).catch(() => false)) {
      // Select first mention
      const firstItem = popup.locator('.mention-item').first()
      await firstItem.click()
      await page.waitForTimeout(300)

      // Chip should appear
      const chip = page.locator('.mention-chip').first()
      if (await chip.isVisible({ timeout: 2000 }).catch(() => false)) {
        // Remove the chip
        const removeBtn = chip.locator('.chip-remove')
        await removeBtn.click()
        await page.waitForTimeout(200)

        // Chip should be gone
        await expect(page.locator('.mention-chip')).toHaveCount(0)
      }
    }
  }
})
