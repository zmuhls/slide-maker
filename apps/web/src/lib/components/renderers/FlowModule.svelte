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

  let fontSize = $derived(typeof data.fontSize === 'string' ? data.fontSize : '')
  let sizeStyle = $derived(fontSize ? `--mod-custom-size: ${fontSize}; font-size: ${fontSize} !important` : '')

  let nodes: Array<{ icon?: string; label: string; description?: string }> = $derived(
    Array.isArray(data.nodes)
      ? data.nodes.map((n: unknown) => {
          const node = n as Record<string, unknown>
          return {
            icon: typeof node.icon === 'string' ? node.icon : undefined,
            label: typeof node.label === 'string' ? node.label : '',
            description: typeof node.description === 'string' ? node.description : undefined,
          }
        })
      : []
  )

  let activeField: { nodeIndex: number; field: 'label' | 'description' } | null = $state(null)
  let editContent = $state('')
  let clickCoords: { x: number; y: number } | null = $state(null)

  function activateField(nodeIndex: number, field: 'label' | 'description', value: string, e: MouseEvent) {
    clickCoords = { x: e.clientX, y: e.clientY }
    editContent = value
    activeField = { nodeIndex, field }
  }

  function handleFieldChange(nodeIndex: number, field: 'label' | 'description', html: string) {
    editContent = html
    const newNodes = nodes.map((n, i) => i === nodeIndex ? { ...n, [field]: html } : { ...n })
    onchange?.({ ...data, nodes: newNodes })
  }

  function addNode() {
    onchange?.({ ...data, nodes: [...nodes, { label: `Step ${nodes.length + 1}` }] })
  }

  function removeNode(index: number) {
    const newNodes = nodes.filter((_, i) => i !== index)
    onchange?.({ ...data, nodes: newNodes })
  }
</script>

<div class="flow-root" class:editable>
  <div class="flow" class:has-custom-size={!!fontSize} style={sizeStyle}>
    {#each nodes as node, i}
    <div class="flow-node">
      {#if editable}
        <button
          type="button"
          class="flow-node-remove"
          onclick={() => removeNode(i)}
          aria-label="Remove step"
          title="Remove step"
        >×</button>
      {/if}
      <div class="flow-icon">
        {#if node.icon}
          {node.icon}
        {:else}
          {i + 1}
        {/if}
      </div>
      <div class="flow-body">
        {#if editable && activeField?.nodeIndex === i && activeField.field === 'label'}
          <div class="flow-label">
            <RichTextEditor
              content={editContent}
              {editable}
              placeholder="Label..."
              onchange={(html) => handleFieldChange(i, 'label', html)}
              {oneditorready}
              {oneditorblur}
              initialClickCoords={clickCoords}
            />
          </div>
        {:else if editable}
          <button
            type="button"
            class="field-preview flow-label"
            onclick={(e) => activateField(i, 'label', node.label, e)}
          >{@html DOMPurify.sanitize(node.label)}</button>
        {:else}
          <div class="flow-label">{@html DOMPurify.sanitize(node.label)}</div>
        {/if}

        {#if editable && activeField?.nodeIndex === i && activeField.field === 'description'}
          <div class="flow-desc">
            <RichTextEditor
              content={editContent}
              {editable}
              placeholder="Description..."
              onchange={(html) => handleFieldChange(i, 'description', html)}
              {oneditorready}
              {oneditorblur}
              initialClickCoords={clickCoords}
            />
          </div>
        {:else if editable || node.description}
          <button
            type="button"
            class="field-preview flow-desc"
            class:placeholder-text={editable && !node.description}
            onclick={(e) => activateField(i, 'description', node.description ?? '', e)}
            disabled={!editable}
          >{#if node.description}{@html DOMPurify.sanitize(node.description)}{:else}Description...{/if}</button>
        {/if}
      </div>
    </div>
    {#if i < nodes.length - 1}
      <div class="flow-arrow"></div>
    {/if}
  {/each}
  </div>
  {#if editable}
    <button type="button" class="flow-add" onclick={addNode} aria-label="Add step">
      <span class="flow-add-icon">+</span>
      <span class="flow-add-label">Add step</span>
    </button>
  {/if}
</div>

<style>
  .flow {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
    justify-content: center;
  }
  .flow-node {
    position: relative;
    background: var(--theme-card-bg, rgba(255, 255, 255, 0.03));
    border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.06));
    border-radius: 8px;
    padding: clamp(10px, 1.8cqi, 14px) clamp(14px, 2.8cqi, 22px);
    font-size: clamp(0.8rem, 1.3cqi, 1rem);
    text-align: center;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
  }
  .flow-node-remove {
    position: absolute;
    top: 2px;
    right: 2px;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    border: none;
    background: rgba(0, 0, 0, 0.25);
    color: rgba(255, 255, 255, 0.85);
    font-size: 12px;
    line-height: 1;
    cursor: pointer;
    padding: 0;
    opacity: 0;
    transition: opacity 0.15s;
  }
  .flow-node:hover .flow-node-remove {
    opacity: 1;
  }
  .flow-root {
    position: relative;
  }
  .flow-add {
    position: absolute;
    top: 100%;
    left: 50%;
    transform: translateX(-50%);
    margin-top: 4px;
    background: transparent;
    border: 1px dashed var(--border-subtle, rgba(128, 128, 128, 0.4));
    border-radius: 6px;
    padding: 4px 12px;
    color: var(--text-muted, rgba(128, 128, 128, 0.7));
    font-family: var(--font-body);
    font-size: 0.75rem;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 6px;
    opacity: 0;
    transition: opacity 0.15s, border-color 0.15s, color 0.15s;
    white-space: nowrap;
  }
  .flow-root.editable:hover .flow-add {
    opacity: 1;
  }
  .flow-add:hover {
    border-color: var(--accent-cyan, #64b5f6);
    color: var(--accent-cyan, #64b5f6);
  }
  .flow-add-icon {
    font-size: 0.95rem;
    font-weight: 600;
    line-height: 1;
  }
  .flow-add-label {
    font-size: 0.75rem;
  }
  .flow-icon {
    width: 1.8rem;
    height: 1.8rem;
    border-radius: 50%;
    background: var(--accent-cyan, #64b5f6);
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    font-weight: 700;
    font-size: 0.7rem;
    font-family: var(--font-display);
  }
  .flow-arrow {
    font-size: 1.2rem;
    color: var(--text-muted, rgba(240, 240, 240, 0.65));
  }
  .flow-arrow::after {
    content: '→';
  }
  .flow-body {
    min-width: 0;
  }
  .flow-label {
    font-weight: 600;
    font-size: clamp(0.8rem, 1.3cqi, 1rem);
    font-family: var(--font-display);
    line-height: 1.2;
  }
  .flow-label :global(p) {
    margin: 0;
  }
  .flow-desc {
    font-size: clamp(0.7rem, 1cqi, 0.85rem);
    color: var(--text-muted, rgba(240, 240, 240, 0.65));
    font-family: var(--font-body);
    line-height: 1.4;
  }
  .flow-desc :global(p) {
    margin: 0;
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
  .flow.has-custom-size .flow-node { font-size: var(--mod-custom-size) !important; }
  .flow.has-custom-size .flow-label { font-size: var(--mod-custom-size) !important; }
  .flow.has-custom-size .flow-desc { font-size: var(--mod-custom-size) !important; }
  .flow-label :global(.tiptap),
  .flow-label :global(.tiptap p) {
    font-weight: inherit;
    font-size: inherit;
    font-family: inherit;
    line-height: inherit;
    margin: 0;
  }
  .flow-desc :global(.tiptap),
  .flow-desc :global(.tiptap p) {
    font-size: inherit;
    color: inherit;
    font-family: inherit;
    line-height: inherit;
    margin: 0;
  }
</style>
