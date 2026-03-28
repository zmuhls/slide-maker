<script lang="ts">
  import { onMount, onDestroy } from 'svelte'
  import { Editor } from '@tiptap/core'
  import StarterKit from '@tiptap/starter-kit'
  import Link from '@tiptap/extension-link'
  import Placeholder from '@tiptap/extension-placeholder'

  let {
    content = '',
    editable = false,
    placeholder = 'Type here...',
    onchange,
    class: className = '',
  }: {
    content: string
    editable: boolean
    placeholder?: string
    onchange?: (html: string) => void
    class?: string
  } = $props()

  let editorEl: HTMLDivElement | undefined = $state(undefined)
  let toolbarEl: HTMLDivElement | undefined = $state(undefined)
  let editor: Editor | null = $state(null)
  let saveTimer: ReturnType<typeof setTimeout> | undefined
  let showToolbar = $state(false)
  let toolbarX = $state(0)
  let toolbarY = $state(0)

  // Toolbar active states
  let isBold = $state(false)
  let isItalic = $state(false)
  let isLink = $state(false)
  let isBulletList = $state(false)
  let isOrderedList = $state(false)

  function updateToolbarState() {
    if (!editor) return
    isBold = editor.isActive('bold')
    isItalic = editor.isActive('italic')
    isLink = editor.isActive('link')
    isBulletList = editor.isActive('bulletList')
    isOrderedList = editor.isActive('orderedList')
  }

  function positionToolbar() {
    if (!editor || !editorEl) {
      showToolbar = false
      return
    }
    const { from, to } = editor.state.selection
    if (from === to) {
      showToolbar = false
      return
    }
    // Get the selection coordinates
    const coords = editor.view.coordsAtPos(from)
    const editorRect = editorEl.getBoundingClientRect()
    toolbarX = coords.left - editorRect.left
    toolbarY = coords.top - editorRect.top - 44
    showToolbar = true
    updateToolbarState()
  }

  onMount(() => {
    if (!editorEl) return

    editor = new Editor({
      element: editorEl,
      extensions: [
        StarterKit,
        Link.configure({ openOnClick: false }),
        Placeholder.configure({ placeholder }),
      ],
      content,
      editable,
      onUpdate: ({ editor: ed }) => {
        clearTimeout(saveTimer)
        saveTimer = setTimeout(() => {
          onchange?.(ed.getHTML())
        }, 500)
      },
      onSelectionUpdate: () => {
        positionToolbar()
      },
      onBlur: () => {
        // Delay hide so toolbar button clicks register
        setTimeout(() => {
          showToolbar = false
        }, 200)
      },
    })
  })

  onDestroy(() => {
    clearTimeout(saveTimer)
    if (editor) {
      editor.destroy()
      editor = null
    }
  })

  // Update editable state when prop changes
  $effect(() => {
    if (editor && editor.isEditable !== editable) {
      editor.setEditable(editable)
    }
  })

  function withPreventDefault(fn: () => void) {
    return (e: MouseEvent) => {
      e.preventDefault()
      fn()
    }
  }

  function toggleBold() {
    editor?.chain().focus().toggleBold().run()
    updateToolbarState()
  }

  function toggleItalic() {
    editor?.chain().focus().toggleItalic().run()
    updateToolbarState()
  }

  function toggleLink() {
    if (!editor) return
    if (editor.isActive('link')) {
      editor.chain().focus().unsetLink().run()
    } else {
      const url = prompt('Enter URL:')
      if (url) {
        editor.chain().focus().setLink({ href: url }).run()
      }
    }
    updateToolbarState()
  }

  function toggleBulletList() {
    editor?.chain().focus().toggleBulletList().run()
    updateToolbarState()
  }

  function toggleOrderedList() {
    editor?.chain().focus().toggleOrderedList().run()
    updateToolbarState()
  }
</script>

<div class="rich-text-editor {className}" style="position: relative;">
  {#if showToolbar && editable}
    <div
      bind:this={toolbarEl}
      class="floating-toolbar"
      style="left: {toolbarX}px; top: {toolbarY}px;"
    >
      <button
        class="toolbar-btn"
        class:active={isBold}
        onmousedown={withPreventDefault(toggleBold)}
        title="Bold"
      ><strong>B</strong></button>
      <button
        class="toolbar-btn"
        class:active={isItalic}
        onmousedown={withPreventDefault(toggleItalic)}
        title="Italic"
      ><em>I</em></button>
      <button
        class="toolbar-btn"
        class:active={isLink}
        onmousedown={withPreventDefault(toggleLink)}
        title="Link"
      >&#x1F517;</button>
      <button
        class="toolbar-btn"
        class:active={isBulletList}
        onmousedown={withPreventDefault(toggleBulletList)}
        title="Bullet List"
      >&bull;</button>
      <button
        class="toolbar-btn"
        class:active={isOrderedList}
        onmousedown={withPreventDefault(toggleOrderedList)}
        title="Ordered List"
      >1.</button>
    </div>
  {/if}
  <div bind:this={editorEl} class="tiptap-mount"></div>
</div>

<style>
  .rich-text-editor {
    width: 100%;
    min-height: 1em;
  }

  .tiptap-mount {
    width: 100%;
    outline: none;
  }

  /* TipTap editor element styles */
  .tiptap-mount :global(.tiptap) {
    outline: none;
    min-height: 1em;
  }

  .tiptap-mount :global(.tiptap p) {
    margin: 0.5em 0;
  }

  .tiptap-mount :global(.tiptap p:first-child) {
    margin-top: 0;
  }

  .tiptap-mount :global(.tiptap p:last-child) {
    margin-bottom: 0;
  }

  .tiptap-mount :global(.tiptap ul),
  .tiptap-mount :global(.tiptap ol) {
    padding-left: 1.5em;
    margin: 0.4em 0;
  }

  .tiptap-mount :global(.tiptap li) {
    margin-bottom: 0.5em;
  }

  .tiptap-mount :global(.tiptap a) {
    color: var(--color-primary);
    text-decoration: underline;
    text-underline-offset: 2px;
  }

  .tiptap-mount :global(.tiptap strong) {
    font-weight: 600;
  }

  .tiptap-mount :global(.tiptap code) {
    background: rgba(0, 0, 0, 0.06);
    padding: 2px 6px;
    border-radius: 3px;
    font-size: 0.88em;
    font-family: 'JetBrains Mono', 'SF Mono', 'Fira Code', monospace;
  }

  .tiptap-mount :global(.tiptap blockquote) {
    border-left: 3px solid var(--color-primary, #3b82f6);
    padding-left: 1em;
    margin: 0.5em 0;
    color: var(--color-text-muted, #666);
  }

  /* Placeholder style */
  .tiptap-mount :global(.tiptap p.is-editor-empty:first-child::before) {
    content: attr(data-placeholder);
    float: left;
    color: var(--color-text-muted, #aaa);
    pointer-events: none;
    height: 0;
  }

  /* Floating toolbar */
  .floating-toolbar {
    position: absolute;
    z-index: 50;
    display: flex;
    align-items: center;
    gap: 2px;
    padding: 4px;
    background: #1e293b;
    border-radius: 6px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
    white-space: nowrap;
  }

  .toolbar-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    border: none;
    border-radius: 4px;
    background: transparent;
    color: white;
    font-size: 13px;
    cursor: pointer;
    transition: background 0.1s ease;
    padding: 0;
  }

  .toolbar-btn:hover {
    background: rgba(255, 255, 255, 0.15);
  }

  .toolbar-btn.active {
    background: #3b82f6;
  }
</style>
