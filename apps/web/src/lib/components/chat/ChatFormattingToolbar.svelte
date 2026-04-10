<script lang="ts">
  import type { Editor } from '@tiptap/core'

  let { editor, visible }: { editor: Editor | null; visible: boolean } = $props()

  let isBold = $state(false)
  let isItalic = $state(false)
  let isStrike = $state(false)
  let isBulletList = $state(false)
  let isOrderedList = $state(false)
  let isCodeBlock = $state(false)
  let headingLevel = $state(0) // 0 = paragraph

  function update() {
    if (!editor) return
    isBold = editor.isActive('bold')
    isItalic = editor.isActive('italic')
    isStrike = editor.isActive('strike')
    isBulletList = editor.isActive('bulletList')
    isOrderedList = editor.isActive('orderedList')
    isCodeBlock = editor.isActive('codeBlock')
    headingLevel = [1, 2, 3].find((l) => editor!.isActive('heading', { level: l })) ?? 0
  }

  $effect(() => {
    if (!editor) return
    editor.on('selectionUpdate', update)
    editor.on('transaction', update)
    update()
    return () => {
      editor?.off('selectionUpdate', update)
      editor?.off('transaction', update)
    }
  })

  const headingLabels = ['P', 'H1', 'H2', 'H3'] as const

  function cycleHeading() {
    if (!editor) return
    const next = (headingLevel + 1) % 4
    if (next === 0) {
      editor.chain().focus().setParagraph().run()
    } else {
      editor.chain().focus().toggleHeading({ level: next as 1 | 2 | 3 }).run()
    }
  }

  function cmd(fn: () => void) {
    return (e: MouseEvent) => { e.preventDefault(); fn() }
  }
</script>

<div class="chat-toolbar" class:visible>
  <!-- Heading cycle -->
  <button
    class="chat-fmt-btn heading-btn"
    class:active={headingLevel > 0}
    onmousedown={cmd(cycleHeading)}
    title="Cycle heading level (current: {headingLabels[headingLevel]})"
  >
    {headingLabels[headingLevel]}
  </button>

  <div class="gap"></div>

  <!-- Inline formatting -->
  <button class="chat-fmt-btn" class:active={isBold} onmousedown={cmd(() => editor?.chain().focus().toggleBold().run())} title="Bold (Ctrl+B)">
    <strong>B</strong>
  </button>
  <button class="chat-fmt-btn" class:active={isItalic} onmousedown={cmd(() => editor?.chain().focus().toggleItalic().run())} title="Italic (Ctrl+I)">
    <em>I</em>
  </button>
  <button class="chat-fmt-btn" class:active={isStrike} onmousedown={cmd(() => editor?.chain().focus().toggleStrike().run())} title="Strikethrough (Ctrl+Shift+X)">
    <s>S</s>
  </button>

  <div class="gap"></div>

  <!-- Lists -->
  <button class="chat-fmt-btn" class:active={isBulletList} onmousedown={cmd(() => editor?.chain().focus().toggleBulletList().run())} title="Bullet list">
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><circle cx="4" cy="6" r="2"/><circle cx="4" cy="12" r="2"/><circle cx="4" cy="18" r="2"/><rect x="9" y="5" width="12" height="2" rx="1"/><rect x="9" y="11" width="12" height="2" rx="1"/><rect x="9" y="17" width="12" height="2" rx="1"/></svg>
  </button>
  <button class="chat-fmt-btn" class:active={isOrderedList} onmousedown={cmd(() => editor?.chain().focus().toggleOrderedList().run())} title="Numbered list">
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><text x="1" y="8" font-size="7" font-weight="bold" font-family="sans-serif">1</text><text x="1" y="15" font-size="7" font-weight="bold" font-family="sans-serif">2</text><text x="1" y="21" font-size="7" font-weight="bold" font-family="sans-serif">3</text><rect x="9" y="5" width="12" height="2" rx="1"/><rect x="9" y="11" width="12" height="2" rx="1"/><rect x="9" y="17" width="12" height="2" rx="1"/></svg>
  </button>

  <div class="gap"></div>

  <!-- Code block -->
  <button class="chat-fmt-btn code-btn" class:active={isCodeBlock} onmousedown={cmd(() => editor?.chain().focus().toggleCodeBlock().run())} title="Code block">
    &lt;/&gt;
  </button>
</div>

<style>
  .chat-toolbar {
    display: flex;
    align-items: center;
    gap: 2px;
    padding: 3px 8px;
    border-top: 1px solid var(--color-border);
    width: 100%;
    /* slide-up entrance */
    transform: translateY(4px);
    opacity: 0;
    max-height: 0;
    overflow: hidden;
    transition:
      transform 200ms ease-out,
      opacity 150ms ease-out,
      max-height 200ms ease-out;
    pointer-events: none;
  }

  .chat-toolbar.visible {
    transform: translateY(0);
    opacity: 1;
    max-height: 30px;
    pointer-events: auto;
  }

  .chat-fmt-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 22px;
    height: 22px;
    border: none;
    border-radius: 4px;
    background: transparent;
    color: var(--color-text-secondary);
    font-size: 11px;
    cursor: pointer;
    padding: 0;
    transition: background 120ms, color 120ms;
  }

  .chat-fmt-btn:hover {
    background: var(--color-ghost-bg);
    color: var(--color-text);
  }

  .chat-fmt-btn.active {
    background: rgba(47, 184, 214, 0.12);
    color: var(--teal);
  }

  .heading-btn {
    font-family: var(--font-display);
    font-weight: 700;
    font-size: 10px;
    width: auto;
    padding: 0 5px;
    letter-spacing: -0.02em;
  }

  .code-btn {
    font-family: 'JetBrains Mono', 'SF Mono', monospace;
    font-size: 9px;
    width: auto;
    padding: 0 4px;
  }

  .gap {
    width: 8px;
    flex-shrink: 0;
  }
</style>
