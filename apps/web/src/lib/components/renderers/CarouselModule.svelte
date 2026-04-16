<script lang="ts">
  import { API_URL } from '$lib/api'
  import { currentDeck } from '$lib/stores/deck'
  import ImagePickerOverlay from './ImagePickerOverlay.svelte'

  let { data = {}, editable = false, onchange }: {
    data: Record<string, unknown>
    editable: boolean
    onchange?: (newData: Record<string, unknown>) => void
  } = $props()

  let syncSteps = $derived(!!data.syncSteps)

  function toggleSyncSteps() {
    onchange?.({ ...data, syncSteps: !syncSteps })
  }

  let items: Array<{ src: string; caption?: string }> = $derived(
    Array.isArray(data.items)
      ? data.items.map((item: unknown) => {
          const i = item as Record<string, unknown>
          return {
            src: typeof i.src === 'string' ? i.src : '',
            caption: typeof i.caption === 'string' ? i.caption : undefined,
          }
        })
      : []
  )

  function renderedSrc(rawSrc: string): string {
    return rawSrc.startsWith('/api/') ? `${API_URL}${rawSrc}` : rawSrc
  }

  function storeSrc(apiSrc: string): string {
    return apiSrc.startsWith(API_URL) ? apiSrc.slice(API_URL.length) : apiSrc
  }

  let deckId = $derived($currentDeck?.id ?? '')
  let showPicker = $state(false)

  let activeIndex = $state(0)

  // Clamp active index when items change
  $effect(() => {
    if (activeIndex >= items.length && items.length > 0) {
      activeIndex = items.length - 1
    }
  })

  function goTo(index: number) {
    activeIndex = index
  }

  function prev() {
    if (items.length === 0) return
    activeIndex = (activeIndex - 1 + items.length) % items.length
  }

  function next() {
    if (items.length === 0) return
    activeIndex = (activeIndex + 1) % items.length
  }

  function handleSelect(nextSrc: string, nextAlt: string) {
    showPicker = false
    const newItem = { src: storeSrc(nextSrc), caption: nextAlt }
    onchange?.({ ...data, items: [...items, newItem] })
    activeIndex = items.length
  }

  function openPicker() {
    if (!deckId) return
    showPicker = true
  }

  function removeItem(index: number) {
    const newItems = items.filter((_, i) => i !== index)
    onchange?.({ ...data, items: newItems })
    if (activeIndex >= newItems.length) {
      activeIndex = Math.max(0, newItems.length - 1)
    }
  }

  function updateCaption(index: number, captionText: string) {
    const newItems = items.map((it, i) => (i === index ? { ...it, caption: captionText } : it))
    onchange?.({ ...data, items: newItems })
  }
</script>

<div class="carousel">
  {#if items.length === 0}
    {#if editable && deckId}
      <button type="button" class="empty-picker" onclick={openPicker}>
        <span class="empty-icon" aria-hidden="true">⟳</span>
        <span class="empty-label">Add images to the carousel</span>
        <span class="empty-hint">Upload new or pick from this deck</span>
      </button>
    {:else}
      <div class="placeholder">No images in carousel</div>
    {/if}
  {:else}
    <div class="carousel-viewport">
      {#if items.length > 1 && !editable}
        <button class="carousel-nav carousel-prev" onclick={prev} aria-label="Previous">&lsaquo;</button>
      {/if}
      <figure class="carousel-slide">
        <img src={renderedSrc(items[activeIndex].src)} alt={items[activeIndex].caption ?? `Slide ${activeIndex + 1}`} />
        {#if editable}
          <button
            type="button"
            class="item-remove"
            onclick={() => removeItem(activeIndex)}
            aria-label="Remove this image"
            title="Remove this image"
          >×</button>
        {/if}
        {#if editable}
          <input
            type="text"
            class="caption-input"
            placeholder="Caption (optional)"
            value={items[activeIndex].caption ?? ''}
            oninput={(e) => updateCaption(activeIndex, (e.target as HTMLInputElement).value)}
          />
        {:else if items[activeIndex].caption}
          <figcaption>{items[activeIndex].caption}</figcaption>
        {/if}
      </figure>
      {#if items.length > 1 && !editable}
        <button class="carousel-nav carousel-next" onclick={next} aria-label="Next">&rsaquo;</button>
      {/if}
    </div>
    <div class="carousel-dots">
      {#each items as _, i}
        <button
          class="dot"
          class:active={i === activeIndex}
          onclick={() => goTo(i)}
          aria-label="Go to slide {i + 1}"
        ></button>
      {/each}
    </div>
  {/if}

  {#if editable}
    <div class="carousel-controls">
      {#if items.length > 0 && deckId}
        <button type="button" class="add-image-btn" onclick={openPicker}>+ Add image</button>
      {/if}
      <label class="sync-steps-toggle">
        <input type="checkbox" checked={syncSteps} onchange={toggleSyncSteps} />
        <span>Sync with steps</span>
      </label>
    </div>
  {/if}
</div>

{#if showPicker && deckId}
  <ImagePickerOverlay {deckId} onselect={handleSelect} onclose={() => (showPicker = false)} />
{/if}

<style>
  .carousel {
    width: 100%;
    position: relative;
  }
  .carousel-viewport {
    position: relative;
    display: flex;
    align-items: center;
    overflow: hidden;
  }
  .carousel-slide {
    margin: 0;
    text-align: center;
    width: 100%;
    flex: 1;
    position: relative;
  }
  .carousel-slide img {
    width: 100%;
    display: block;
    border-radius: 8px;
  }
  .carousel-slide figcaption {
    font-size: clamp(0.7rem, 1cqi, 0.85rem);
    color: var(--color-text-secondary);
    text-align: center;
    margin-top: 0.5rem;
    font-style: italic;
    font-family: var(--font-body);
  }
  .caption-input {
    width: 100%;
    margin-top: 0.5rem;
    padding: 4px 8px;
    background: var(--color-bg-tertiary, rgba(0, 0, 0, 0.04));
    border: 1px solid var(--color-border, rgba(128, 128, 128, 0.3));
    border-radius: 4px;
    font-size: 0.8rem;
    font-style: italic;
    color: inherit;
    font-family: var(--font-body);
  }
  .caption-input:focus {
    outline: none;
    border-color: var(--color-primary, #2563eb);
  }
  .item-remove {
    position: absolute;
    top: 8px;
    right: 8px;
    width: 24px;
    height: 24px;
    border-radius: 50%;
    border: none;
    background: rgba(0, 0, 0, 0.55);
    color: #fff;
    font-size: 15px;
    line-height: 1;
    cursor: pointer;
    padding: 0;
    opacity: 0.85;
    z-index: 2;
    transition: background 0.15s;
  }
  .item-remove:hover { background: rgba(200, 0, 0, 0.85); }
  .carousel-nav {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    background: rgba(0, 0, 0, 0.4);
    backdrop-filter: blur(4px);
    color: rgba(255, 255, 255, 0.8);
    border: none;
    padding: 8px 12px;
    border-radius: 6px;
    font-size: 1.2rem;
    cursor: pointer;
    z-index: 2;
    transition: background 0.2s;
  }
  .carousel-nav:hover { background: rgba(0, 0, 0, 0.6); }
  .carousel-prev { left: 8px; }
  .carousel-next { right: 8px; }
  .carousel-dots {
    display: flex;
    justify-content: center;
    gap: 6px;
    padding: 10px 0;
  }
  .dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    border: none;
    background: rgba(128, 128, 128, 0.35);
    cursor: pointer;
    padding: 0;
    transition: background 0.2s;
  }
  .dot.active {
    background: var(--accent-cyan, #64b5f6);
  }
  .carousel-controls {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-top: 0.5rem;
    flex-wrap: wrap;
  }
  .add-image-btn {
    padding: 4px 10px;
    background: transparent;
    border: 1px dashed var(--color-border, rgba(128, 128, 128, 0.4));
    border-radius: 4px;
    color: var(--color-text-muted, #6b7280);
    font-family: inherit;
    font-size: 0.72rem;
    cursor: pointer;
    transition: border-color 0.15s, color 0.15s;
  }
  .add-image-btn:hover {
    border-color: var(--color-primary, #2563eb);
    color: var(--color-primary, #2563eb);
  }
  .sync-steps-toggle {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    font-size: 0.65rem;
    color: var(--color-text-muted, #6b7280);
    cursor: pointer;
    user-select: none;
  }
  .sync-steps-toggle input {
    width: 12px;
    height: 12px;
    cursor: pointer;
  }
  .placeholder {
    background: var(--color-bg-tertiary);
    border: 1px dashed var(--color-border);
    border-radius: 6px;
    padding: 2rem;
    text-align: center;
    color: var(--color-text-muted);
    font-size: 0.85rem;
  }
  .empty-picker {
    width: 100%;
    min-height: 180px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 1.5rem;
    background: var(--color-bg-tertiary, rgba(0, 0, 0, 0.04));
    border: 1px dashed var(--color-border, rgba(128, 128, 128, 0.35));
    border-radius: 8px;
    color: var(--color-text-muted, #6b7280);
    font-family: var(--font-body);
    font-size: 0.88rem;
    cursor: pointer;
    transition: border-color 0.15s, color 0.15s, background 0.15s;
  }
  .empty-picker:hover {
    border-color: var(--color-primary, #2563eb);
    color: var(--color-primary, #2563eb);
    background: var(--color-ghost-bg, rgba(37, 99, 235, 0.06));
  }
  .empty-icon { font-size: 1.6rem; line-height: 1; }
  .empty-label { font-weight: 600; }
  .empty-hint { font-size: 0.72rem; opacity: 0.8; }
</style>
