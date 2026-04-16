<script lang="ts">
  import RichTextEditor from './RichTextEditor.svelte'
  import { inlineMarkdown } from '$lib/utils/markdown'
  import DOMPurify from 'dompurify'
  import type { Editor } from '@tiptap/core'

  let { data = {}, editable = false, onchange, oneditorready, oneditorblur }: {
    data: Record<string, unknown>;
    editable: boolean;
    onchange?: (newData: Record<string, unknown>) => void;
    oneditorready?: (editor: Editor) => void;
    oneditorblur?: () => void;
  } = $props()

  let fontSize = $derived(typeof data.fontSize === 'string' ? data.fontSize : '')
  let sizeStyle = $derived(fontSize ? `--list-custom-size: ${fontSize}; font-size: ${fontSize} !important` : '')

  let items: string[] = $derived(
    Array.isArray(data.items)
      ? data.items.map((item: unknown) => {
          if (typeof item === 'string') return item
          if (item && typeof item === 'object') {
            const o = item as Record<string, unknown>
            return String(o.text || o.content || o.label || o.title || JSON.stringify(item))
          }
          return String(item)
        })
      : []
  )

  let activeItemIndex: number | null = $state(null)
  let editContent = $state('')
  let clickCoords: { x: number; y: number } | null = $state(null)

  function handleItemChange(index: number, html: string) {
    editContent = html
    const newItems = [...items]
    newItems[index] = html
    onchange?.({ ...data, items: newItems })
  }

  function addItem() {
    onchange?.({ ...data, items: [...items, ''] })
    activeItemIndex = items.length
    editContent = ''
    clickCoords = null
  }

  function removeItem(index: number) {
    const newItems = items.filter((_, i) => i !== index)
    if (activeItemIndex === index) activeItemIndex = null
    onchange?.({ ...data, items: newItems })
  }
</script>

<div class="stream-list-root" class:editable>
  <ul class="stream-list" class:has-custom-size={!!fontSize} style={sizeStyle}>
    {#each items as item, i}
      <li>
        {#if editable && activeItemIndex === i}
          <RichTextEditor
            content={editContent}
            {editable}
            placeholder="List item..."
            onchange={(html) => handleItemChange(i, html)}
            {oneditorready}
            {oneditorblur}
            initialClickCoords={clickCoords}
          />
        {:else if editable}
          <button
            type="button"
            class="item-preview"
            onclick={(e) => { clickCoords = { x: e.clientX, y: e.clientY }; editContent = item; activeItemIndex = i }}
          >{@html DOMPurify.sanitize(inlineMarkdown(item))}</button>
        {:else}
          {@html DOMPurify.sanitize(inlineMarkdown(item))}
        {/if}
        {#if editable}
          <button
            type="button"
            class="item-remove"
            onclick={() => removeItem(i)}
            aria-label="Remove item"
            title="Remove item"
          >×</button>
        {/if}
      </li>
    {/each}
  </ul>
  {#if editable}
    <button type="button" class="add-item-btn" onclick={addItem} aria-label="Add list item">
      <span class="add-item-icon">+</span>
      <span>Add item</span>
    </button>
  {/if}
</div>

<style>
  .stream-list {
    list-style: none;
    padding: 0;
    margin: 0;
    font-family: var(--font-body);
  }
  .stream-list li {
    padding: clamp(8px, 1.5cqi, 12px) clamp(12px, 2cqi, 16px);
    border-left: 2px solid var(--accent-cyan, #64b5f6);
    margin-bottom: clamp(4px, 0.8cqi, 6px);
    background: var(--theme-card-bg, rgba(255, 255, 255, 0.02));
    border-radius: 0 6px 6px 0;
    font-size: clamp(0.8rem, 1.3cqi, 1rem);
    line-height: 1.5;
    color: var(--text-muted, rgba(240, 240, 240, 0.65));
  }
  .item-preview {
    cursor: text;
    background: transparent;
    border: none;
    color: inherit;
    font: inherit;
    text-align: inherit;
    width: 100%;
    display: block;
    padding: 0;
    outline: none;
    line-height: inherit;
  }
  .stream-list li :global(.tiptap),
  .stream-list li :global(.tiptap p) {
    font-size: inherit;
    line-height: inherit;
    font-family: inherit;
    margin: 0;
  }
  .stream-list.has-custom-size li {
    font-size: var(--list-custom-size) !important;
  }
  .stream-list-root {
    position: relative;
  }
  .stream-list-root.editable li {
    position: relative;
  }
  .item-remove {
    position: absolute;
    top: 50%;
    right: 4px;
    transform: translateY(-50%);
    width: 18px;
    height: 18px;
    border-radius: 50%;
    border: none;
    background: rgba(0, 0, 0, 0.35);
    color: #fff;
    font-size: 12px;
    line-height: 1;
    cursor: pointer;
    padding: 0;
    opacity: 0;
    z-index: 2;
    transition: opacity 0.15s, background 0.15s;
  }
  .stream-list-root.editable li:hover .item-remove {
    opacity: 1;
  }
  .item-remove:hover {
    background: rgba(200, 0, 0, 0.7);
  }
  .add-item-btn {
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    margin-top: 4px;
    padding: 4px 10px;
    background: transparent;
    border: 1px dashed var(--border-subtle, rgba(128, 128, 128, 0.4));
    border-radius: 6px;
    color: var(--text-muted, rgba(128, 128, 128, 0.7));
    font-family: var(--font-body);
    font-size: 0.75rem;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    opacity: 0;
    transition: opacity 0.15s, border-color 0.15s, color 0.15s;
  }
  .stream-list-root.editable:hover .add-item-btn {
    opacity: 1;
  }
  .add-item-btn:hover {
    border-color: var(--accent-cyan, #64b5f6);
    color: var(--accent-cyan, #64b5f6);
  }
  .add-item-icon {
    font-size: 0.95rem;
    font-weight: 600;
    line-height: 1;
  }
</style>
