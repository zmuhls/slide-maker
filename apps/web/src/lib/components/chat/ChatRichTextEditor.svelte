<script lang="ts">
  import { onMount, onDestroy } from 'svelte'
  import { Editor, Extension } from '@tiptap/core'
  import StarterKit from '@tiptap/starter-kit'
  import Link from '@tiptap/extension-link'
  import Placeholder from '@tiptap/extension-placeholder'
  import { tiptapJsonToMarkdown } from '$lib/utils/tiptap-to-markdown'

  interface Props {
    placeholder?: string
    disabled?: boolean
    isMentionOpen?: () => boolean
    onsubmit?: () => void
    oninput?: () => void
    onfocuschange?: (focused: boolean) => void
  }

  let {
    placeholder = 'Type a message...',
    disabled = false,
    isMentionOpen = () => false,
    onsubmit,
    oninput,
    onfocuschange,
  }: Props = $props()

  let editorEl: HTMLDivElement | undefined = $state(undefined)
  let editor: Editor | null = $state(null)

  // Custom extension: Enter to submit, Shift+Enter for newline
  function createChatSubmitExtension() {
    return Extension.create({
      name: 'chatSubmit',
      addKeyboardShortcuts() {
        return {
          Enter: () => {
            if (isMentionOpen()) return false // let ChatInput handle mention selection
            onsubmit?.()
            return true
          },
        }
      },
    })
  }

  onMount(() => {
    if (!editorEl) return

    editor = new Editor({
      element: editorEl,
      editorProps: {
        attributes: {
          'aria-label': 'Chat message',
          role: 'textbox',
          'aria-multiline': 'true',
        },
      },
      extensions: [
        StarterKit.configure({
          heading: { levels: [1, 2, 3] },
          link: false,
          dropcursor: false,
          gapcursor: false,
          horizontalRule: false,
          blockquote: false,
        }),
        Link.configure({
          openOnClick: false,
          protocols: ['http', 'https'],
          validate: (href: string) => /^https?:\/\//i.test(href),
        }),
        Placeholder.configure({ placeholder }),
        createChatSubmitExtension(),
      ],
      content: '',
      editable: !disabled,
      onUpdate: () => {
        oninput?.()
      },
      onFocus: () => {
        onfocuschange?.(true)
      },
      onBlur: () => {
        onfocuschange?.(false)
      },
    })
  })

  onDestroy(() => {
    if (editor) {
      editor.destroy()
      editor = null
    }
  })

  // Sync disabled state
  $effect(() => {
    if (editor && editor.isEditable === disabled) {
      editor.setEditable(!disabled)
    }
  })

  // Public API exposed via bind:this
  export function getMarkdown(): string {
    if (!editor) return ''
    return tiptapJsonToMarkdown(editor.getJSON())
  }

  export function getText(): string {
    return editor?.getText() ?? ''
  }

  export function clear(): void {
    editor?.commands.clearContent()
  }

  export function focus(): void {
    editor?.commands.focus()
  }

  export function getEditor(): Editor | null {
    return editor
  }

  export function insertContent(content: string): void {
    editor?.commands.insertContent(content)
  }

  export function getSelectionText(): { textBefore: string; pos: number } {
    if (!editor) return { textBefore: '', pos: 0 }
    const { from } = editor.state.selection
    const textBefore = editor.state.doc.textBetween(0, from, '\n', '\0')
    return { textBefore, pos: from }
  }

  export function deleteRangeAndInsert(from: number, to: number, text: string): void {
    editor?.chain().focus().deleteRange({ from, to }).insertContent(text).run()
  }
</script>

<div class="chat-editor">
  <div bind:this={editorEl} class="tiptap-mount"></div>
</div>

<style>
  .chat-editor {
    flex: 1;
    min-width: 0;
  }

  .tiptap-mount {
    width: 100%;
    outline: none;
  }

  .tiptap-mount :global(.tiptap) {
    outline: none;
    padding: 10px 12px;
    font-size: 12px;
    font-family: inherit;
    line-height: 1.4;
    min-height: 44px;
    max-height: 200px;
    overflow-y: auto;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
    background: var(--color-bg);
    color: var(--color-text);
    transition: border-color 200ms;
  }

  .tiptap-mount :global(.tiptap:focus) {
    border-color: var(--teal);
  }

  .tiptap-mount :global(.tiptap[contenteditable="false"]) {
    opacity: 0.5;
  }

  /* Typography inside editor */
  .tiptap-mount :global(.tiptap p) {
    margin: 0;
  }

  .tiptap-mount :global(.tiptap p + p) {
    margin-top: 0.4em;
  }

  .tiptap-mount :global(.tiptap h1),
  .tiptap-mount :global(.tiptap h2),
  .tiptap-mount :global(.tiptap h3) {
    font-family: var(--font-display);
    margin: 0;
    line-height: 1.3;
  }

  .tiptap-mount :global(.tiptap h1) { font-size: 1.25em; }
  .tiptap-mount :global(.tiptap h2) { font-size: 1.1em; }
  .tiptap-mount :global(.tiptap h3) { font-size: 1em; font-weight: 600; }

  .tiptap-mount :global(.tiptap ul),
  .tiptap-mount :global(.tiptap ol) {
    padding-left: 1.4em;
    margin: 0.2em 0;
  }

  .tiptap-mount :global(.tiptap li) {
    margin-bottom: 0.15em;
  }

  .tiptap-mount :global(.tiptap code) {
    background: rgba(0, 0, 0, 0.06);
    padding: 1px 4px;
    border-radius: 3px;
    font-size: 0.9em;
    font-family: 'JetBrains Mono', 'SF Mono', monospace;
  }

  .tiptap-mount :global(.tiptap pre) {
    background: rgba(0, 0, 0, 0.06);
    padding: 8px 10px;
    border-radius: 4px;
    font-size: 0.9em;
    font-family: 'JetBrains Mono', 'SF Mono', monospace;
    overflow-x: auto;
    margin: 0.3em 0;
  }

  .tiptap-mount :global(.tiptap pre code) {
    background: none;
    padding: 0;
    border-radius: 0;
  }

  .tiptap-mount :global(.tiptap strong) {
    font-weight: 600;
  }

  .tiptap-mount :global(.tiptap a) {
    color: var(--color-primary);
    text-decoration: underline;
    text-underline-offset: 2px;
  }

  .tiptap-mount :global(.tiptap s) {
    text-decoration: line-through;
    opacity: 0.7;
  }

  /* Placeholder */
  .tiptap-mount :global(.tiptap p.is-editor-empty:first-child::before) {
    content: attr(data-placeholder);
    float: left;
    color: var(--color-text-muted, #aaa);
    pointer-events: none;
    height: 0;
  }
</style>
