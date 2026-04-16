<script lang="ts">
  import RichTextEditor from './RichTextEditor.svelte'
  import { renderContent } from '$lib/utils/markdown'
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
  let sizeStyle = $derived(fontSize ? `--mod-custom-size: ${fontSize}; font-size: ${fontSize} !important` : '')

  let columns = $derived(
    typeof data.columns === 'number' && data.columns >= 2 && data.columns <= 4
      ? data.columns
      : 3
  )

  let cards: Array<{ title: string; content: string; variant?: string; color?: string }> = $derived(
    Array.isArray(data.cards)
      ? data.cards.map((c: unknown) => {
          const card = c as Record<string, unknown>
          const body = typeof card.body === 'string' ? card.body : typeof card.content === 'string' ? card.content : ''
          return {
            title: typeof card.title === 'string' ? card.title : '',
            content: body,
            variant: typeof card.variant === 'string' ? card.variant : undefined,
            color: typeof card.color === 'string' ? card.color : undefined
          }
        })
      : []
  )

  let activeField: { cardIndex: number; field: 'title' | 'content' } | null = $state(null)
  let editContent = $state('')
  let clickCoords: { x: number; y: number } | null = $state(null)

  function activateField(cardIndex: number, field: 'title' | 'content', value: string, e: MouseEvent) {
    clickCoords = { x: e.clientX, y: e.clientY }
    editContent = field === 'content' ? renderContent(value) : DOMPurify.sanitize(value)
    activeField = { cardIndex, field }
  }

  function handleFieldChange(cardIndex: number, field: 'title' | 'content', html: string) {
    editContent = html
    const newCards = cards.map((c, i) => i === cardIndex ? { ...c, [field]: html } : { ...c })
    onchange?.({ ...data, cards: newCards })
  }

  function addCard() {
    onchange?.({ ...data, cards: [...cards, { title: '', content: '' }] })
  }

  function removeCard(index: number) {
    const newCards = cards.filter((_, i) => i !== index)
    if (activeField?.cardIndex === index) activeField = null
    onchange?.({ ...data, cards: newCards })
  }
</script>

<div class="card-grid-root" class:editable>
<div class="card-grid" class:has-custom-size={!!fontSize} style="grid-template-columns: repeat({columns}, 1fr);{sizeStyle ? ` ${sizeStyle}` : ''}">
  {#each cards as card, i}
    <div class="card" class:editable-card={editable} class:card-cyan={card.variant === 'cyan'} class:card-navy={card.variant === 'navy'} style={card.color && !card.variant ? `border-top: 3px solid ${card.color};` : ''}>
      {#if editable}
        <button
          type="button"
          class="card-remove"
          onclick={() => removeCard(i)}
          aria-label="Remove card"
          title="Remove card"
        >×</button>
      {/if}
      {#if editable && activeField?.cardIndex === i && activeField.field === 'title'}
        <h3 class="card-title">
          <RichTextEditor
            content={editContent}
            {editable}
            placeholder="Card title..."
            onchange={(html) => handleFieldChange(i, 'title', html)}
            {oneditorready}
            {oneditorblur}
            initialClickCoords={clickCoords}
          />
        </h3>
      {:else if editable || card.title}
        <h3 class="card-title">
          <button
            type="button"
            class="field-preview"
            class:placeholder-text={editable && !card.title}
            onclick={(e) => activateField(i, 'title', card.title, e)}
            disabled={!editable}
          >{#if card.title}{@html DOMPurify.sanitize(card.title)}{:else}Card title...{/if}</button>
        </h3>
      {/if}

      {#if editable && activeField?.cardIndex === i && activeField.field === 'content'}
        <div class="card-content">
          <RichTextEditor
            content={editContent}
            {editable}
            placeholder="Card content..."
            onchange={(html) => handleFieldChange(i, 'content', html)}
            {oneditorready}
            {oneditorblur}
            initialClickCoords={clickCoords}
          />
        </div>
      {:else if editable || card.content}
        <div class="card-content">
          <button
            type="button"
            class="field-preview"
            class:placeholder-text={editable && !card.content}
            onclick={(e) => activateField(i, 'content', card.content, e)}
            disabled={!editable}
          >{#if card.content}{@html renderContent(card.content)}{:else}Card content...{/if}</button>
        </div>
      {/if}
    </div>
  {/each}
</div>
{#if editable}
  <button type="button" class="card-add" onclick={addCard} aria-label="Add card">
    <span class="card-add-icon">+</span>
    <span>Add card</span>
  </button>
{/if}
</div>

<style>
  .card-grid {
    display: grid;
    gap: clamp(12px, 2.5cqi, 20px);
    width: 100%;
  }
  .card {
    background: var(--theme-card-bg, rgba(255, 255, 255, 0.03));
    border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.06));
    border-radius: 10px;
    padding: clamp(16px, 3cqi, 24px);
  }
  .editable-card {
    position: relative;
  }
  .card-remove {
    position: absolute;
    top: 6px;
    right: 6px;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    border: none;
    background: rgba(0, 0, 0, 0.25);
    color: rgba(255, 255, 255, 0.85);
    font-size: 13px;
    line-height: 1;
    cursor: pointer;
    padding: 0;
    opacity: 0;
    transition: opacity 0.15s;
    z-index: 1;
  }
  .editable-card:hover .card-remove {
    opacity: 1;
  }
  .card-grid-root {
    position: relative;
  }
  .card-add {
    position: absolute;
    top: 100%;
    left: 50%;
    transform: translateX(-50%);
    margin-top: 6px;
    padding: 4px 14px;
    background: transparent;
    border: 1px dashed var(--border-subtle, rgba(128, 128, 128, 0.4));
    border-radius: 6px;
    color: var(--text-muted, rgba(128, 128, 128, 0.7));
    font-family: var(--font-body);
    font-size: 0.75rem;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 6px;
    white-space: nowrap;
    opacity: 0;
    transition: opacity 0.15s, border-color 0.15s, color 0.15s;
  }
  .card-grid-root.editable:hover .card-add {
    opacity: 1;
  }
  .card-add:hover {
    border-color: var(--accent-cyan, #64b5f6);
    color: var(--accent-cyan, #64b5f6);
  }
  .card-add-icon {
    font-size: 0.95rem;
    font-weight: 600;
    line-height: 1;
  }
  .card-title {
    font-family: var(--font-display);
    font-size: clamp(0.95rem, 1.6cqi, 1.3rem);
    font-weight: 650;
    line-height: 1.2;
    display: block;
    margin: 0 0 8px 0;
  }
  .card-content {
    margin: 0;
    font-size: clamp(0.85rem, 1.3cqi, 1rem);
    line-height: 1.45;
    color: var(--text-muted, rgba(240, 240, 240, 0.65));
    font-family: var(--font-body);
  }
  .field-preview {
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
  .field-preview:disabled {
    cursor: default;
  }
  .field-preview.placeholder-text {
    opacity: 0.4;
    font-style: italic;
  }
  .card-grid.has-custom-size .card-title { font-size: var(--mod-custom-size) !important; }
  .card-grid.has-custom-size .card-content { font-size: var(--mod-custom-size) !important; }
  .card-title :global(.tiptap),
  .card-title :global(.tiptap p) {
    font-family: inherit;
    font-size: inherit;
    font-weight: inherit;
    line-height: inherit;
    margin: 0;
  }
  .card-content :global(.tiptap),
  .card-content :global(.tiptap p) {
    font-size: inherit;
    line-height: inherit;
    color: inherit;
    font-family: inherit;
    margin: 0;
  }
</style>
