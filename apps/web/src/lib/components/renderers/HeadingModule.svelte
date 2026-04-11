<script lang="ts">
  import RichTextEditor from './RichTextEditor.svelte'
  import DOMPurify from 'dompurify'
  import type { Editor } from '@tiptap/core'

  let { data = {}, editable = false, onchange, oneditorready, oneditorblur }: {
    data: Record<string, unknown>;
    editable: boolean;
    onchange?: (newData: Record<string, unknown>) => void;
    oneditorready?: (editor: Editor) => void;
    oneditorblur?: () => void;
  } = $props()

  let level = $derived(typeof data.level === 'number' ? Math.min(Math.max(data.level, 1), 4) : 1)
  let text = $derived(typeof data.text === 'string' ? data.text : '')
  let headingTag = $derived(`h${level}` as 'h1' | 'h2' | 'h3' | 'h4')
  let fontSize = $derived(typeof data.fontSize === 'string' ? data.fontSize : '')
  let sizeStyle = $derived(fontSize ? `--heading-custom-size: ${fontSize}; font-size: ${fontSize} !important` : '')

  let editorActive = $state(false)
  let editContent = $state('')
  let clickCoords: { x: number; y: number } | null = $state(null)

  // Sanitize for view mode — strip <p> wrappers since content renders inside <h1>-<h4>
  // (block elements inside headings cause browsers to break the DOM structure)
  function stripParagraphs(html: string): string {
    return html.replace(/<p>/g, '').replace(/<\/p>/g, '').replace(/<p\s*\/>/g, '').trim()
  }
  let sanitizedText = $derived(stripParagraphs(DOMPurify.sanitize(text, { ADD_ATTR: ['style'] })))

  function handleRichTextChange(html: string) {
    editContent = html
    // Strip outer tags to store plain-ish text
    onchange?.({ ...data, text: html })
  }
</script>

<div class="heading-wrapper heading-{level}" class:has-custom-size={!!fontSize} style={sizeStyle}>
  {#if editable && editorActive}
    <RichTextEditor
      content={editContent}
      {editable}
      placeholder="Heading..."
      onchange={handleRichTextChange}
      {oneditorready}
      {oneditorblur}
      initialClickCoords={clickCoords}
    />
  {:else}
    {#if editable}
      <button
        type="button"
        class="heading-preview editable heading heading-{level}"
        style={sizeStyle}
        onclick={(e) => { clickCoords = { x: e.clientX, y: e.clientY }; editContent = sanitizedText || text; editorActive = true }}
      >
        {@html sanitizedText || text}
      </button>
    {:else}
      <svelte:element this={headingTag} class="heading heading-{level}" style={sizeStyle}>{@html sanitizedText}</svelte:element>
    {/if}
  {/if}
</div>

<style>
  .heading-wrapper {
    width: 100%;
  }
  .heading, .heading-preview {
    font-family: var(--font-display);
    line-height: 1.2;
    margin: 0;
    outline: none;
  }
  .heading-preview.editable {
    cursor: text;
    background: transparent;
    border: none;
    padding: 0;
    margin: 0;
    color: inherit;
    font: inherit;
    text-align: inherit;
    width: 100%;
    display: block;
  }
  /* Pass heading typography into TipTap editor content */
  .heading-wrapper :global(.tiptap-mount) {
    padding-inline: 12px;
  }
  .heading-wrapper :global(.tiptap),
  .heading-wrapper :global(.tiptap p) {
    font-family: var(--font-display);
    line-height: 1.2;
    margin: 0;
  }
  .heading-wrapper.has-custom-size :global(.tiptap),
  .heading-wrapper.has-custom-size :global(.tiptap p) {
    font-size: var(--heading-custom-size) !important;
  }

  /* ── Level-specific weights only (sizes from framework) ── */
  .heading-wrapper.heading-1, .heading-wrapper.heading-1 .heading, .heading-wrapper.heading-1 :global(.tiptap), .heading-wrapper.heading-1 :global(.tiptap p) {
    font-weight: 600;
  }
  .heading-wrapper.heading-2, .heading-wrapper.heading-2 .heading, .heading-wrapper.heading-2 :global(.tiptap), .heading-wrapper.heading-2 :global(.tiptap p) {
    font-weight: 500;
  }
  .heading-wrapper.heading-3, .heading-wrapper.heading-3 .heading, .heading-wrapper.heading-3 :global(.tiptap), .heading-wrapper.heading-3 :global(.tiptap p) {
    font-weight: 500;
  }
  .heading-wrapper.heading-4, .heading-wrapper.heading-4 .heading, .heading-wrapper.heading-4 :global(.tiptap), .heading-wrapper.heading-4 :global(.tiptap p) {
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
</style>
