<script lang="ts">
  import { chatStreaming } from '$lib/stores/chat'
  import { currentDeck } from '$lib/stores/deck'
  import { api } from '$lib/api'
  import { get } from 'svelte/store'

  interface Props {
    onsend: (text: string) => void
  }

  let { onsend }: Props = $props()
  let text = $state('')
  let dragOver = $state(false)
  let uploading = $state(false)

  let showAddMenu = $derived(text.trim() === '/add')

  const moduleShortcuts = [
    { type: 'heading', label: 'Heading' },
    { type: 'text', label: 'Text Block' },
    { type: 'card', label: 'Info Card' },
    { type: 'label', label: 'Section Label' },
    { type: 'tip-box', label: 'Callout Box' },
    { type: 'prompt-block', label: 'Code Block' },
    { type: 'image', label: 'Image' },
    { type: 'carousel', label: 'Image Carousel' },
    { type: 'comparison', label: 'Comparison' },
    { type: 'card-grid', label: 'Card Grid' },
    { type: 'flow', label: 'Process Flow' },
    { type: 'stream-list', label: 'Bullet List' },
  ]

  function selectModule(label: string) {
    text = `Add a ${label} to the active slide`
    handleSubmit()
  }

  function handleSubmit() {
    const trimmed = text.trim()
    if (!trimmed || $chatStreaming) return
    onsend(trimmed)
    text = ''
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  function handleDragOver(e: DragEvent) {
    e.preventDefault()
    dragOver = true
  }

  function handleDragLeave() {
    dragOver = false
  }

  async function handleDrop(e: DragEvent) {
    e.preventDefault()
    dragOver = false

    const files = e.dataTransfer?.files
    if (!files?.length) return

    const deck = get(currentDeck)
    if (!deck) return

    uploading = true
    try {
      for (const file of Array.from(files)) {
        const result = await api.uploadFile(deck.id, file)
        if (result?.file) {
          // Just mention in chat — let the user tell the AI what to do with it
          const label = file.type.startsWith('image/') ? 'image' : 'file'
          text += (text ? '\n' : '') + `[Uploaded ${label}: ${file.name}]`
        }
      }
    } catch (err: any) {
      text += `\n[Upload failed: ${err.message}]`
    } finally {
      uploading = false
    }
  }
</script>

<div
  class="chat-input"
  class:drag-over={dragOver}
  ondragover={handleDragOver}
  ondragleave={handleDragLeave}
  ondrop={handleDrop}
>
  {#if showAddMenu}
    <div class="add-menu">
      {#each moduleShortcuts as mod}
        <button class="add-menu-item" onmousedown={() => selectModule(mod.label)}>
          {mod.label}
        </button>
      {/each}
    </div>
  {/if}
  {#if dragOver}
    <div class="drop-overlay">Drop file to upload</div>
  {/if}
  <textarea
    bind:value={text}
    placeholder="Ask AI, /add module, /search images..."
    onkeydown={handleKeydown}
    disabled={$chatStreaming || uploading}
    rows={2}
  ></textarea>
  <button onclick={handleSubmit} disabled={$chatStreaming || uploading || !text.trim()}>
    {#if $chatStreaming || uploading}
      <span class="spinner"></span>
    {:else}
      Send
    {/if}
  </button>
</div>

<style>
  .chat-input {
    display: flex;
    gap: 6px;
    padding: 8px;
    border-top: 1px solid var(--color-border);
    background: var(--color-bg);
    position: relative;
  }

  .chat-input.drag-over {
    border-color: var(--color-primary);
    background: rgba(59, 115, 230, 0.05);
  }

  .drop-overlay {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(59, 115, 230, 0.1);
    border: 2px dashed var(--color-primary);
    border-radius: 4px;
    font-size: 12px;
    font-weight: 600;
    color: var(--color-primary);
    z-index: 5;
    pointer-events: none;
  }

  textarea {
    flex: 1;
    resize: none;
    padding: 6px 8px;
    font-size: 13px;
    font-family: inherit;
    border: 1px solid var(--color-border);
    border-radius: 4px;
    background: var(--color-bg);
    color: var(--color-text);
    outline: none;
    line-height: 1.4;
  }

  textarea:focus {
    border-color: var(--color-primary);
  }

  textarea:disabled {
    opacity: 0.5;
  }

  button {
    padding: 6px 14px;
    font-size: 13px;
    font-weight: 500;
    border: none;
    border-radius: 4px;
    background: var(--color-primary, #2563eb);
    color: white;
    cursor: pointer;
    align-self: flex-end;
    min-width: 56px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  button:hover:not(:disabled) {
    opacity: 0.9;
  }

  button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .spinner {
    display: inline-block;
    width: 14px;
    height: 14px;
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-top-color: white;
    border-radius: 50%;
    animation: spin 0.6s linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  .add-menu {
    position: absolute;
    bottom: 100%;
    left: 8px;
    right: 8px;
    margin-bottom: 4px;
    background: var(--color-bg, #1e1e2e);
    border: 1px solid var(--color-border);
    border-radius: 6px;
    padding: 4px;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 2px;
    z-index: 10;
    box-shadow: 0 -4px 12px rgba(0, 0, 0, 0.2);
  }

  .add-menu-item {
    padding: 6px 8px;
    font-size: 12px;
    text-align: left;
    background: transparent;
    border: none;
    border-radius: 4px;
    color: var(--color-text);
    cursor: pointer;
    white-space: nowrap;
  }

  .add-menu-item:hover {
    background: rgba(59, 115, 230, 0.15);
    color: var(--color-primary, #3b73e6);
  }
</style>
