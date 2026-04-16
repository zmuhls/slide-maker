<script lang="ts">
  import { API_URL } from '$lib/api'
  import { currentDeck } from '$lib/stores/deck'
  import ImagePickerOverlay from './ImagePickerOverlay.svelte'

  let { data = {}, editable = false, onchange }: {
    data: Record<string, unknown>
    editable: boolean
    onchange?: (newData: Record<string, unknown>) => void
  } = $props()

  let rawSrc = $derived(typeof data.src === 'string' ? data.src : typeof data.url === 'string' ? data.url : '')
  // Prepend API URL for relative paths (uploaded files served from API server)
  let src = $derived(rawSrc.startsWith('/api/') ? `${API_URL}${rawSrc}` : rawSrc)
  let alt = $derived(typeof data.alt === 'string' ? data.alt : '')
  let caption = $derived(typeof data.caption === 'string' ? data.caption : '')
  let imgWidth = $derived(typeof data.width === 'string' ? data.width : undefined)
  let imgHeight = $derived(typeof data.height === 'string' ? data.height : undefined)
  let fontSize = $derived(typeof data.fontSize === 'string' ? data.fontSize : undefined)

  let deckId = $derived($currentDeck?.id ?? '')
  let showPicker = $state(false)

  function storeSrc(apiSrc: string): string {
    // Strip API_URL so the persisted src stays portable (ImageModule re-prefixes on render)
    return apiSrc.startsWith(API_URL) ? apiSrc.slice(API_URL.length) : apiSrc
  }

  function handleSelect(nextSrc: string, nextAlt: string) {
    showPicker = false
    onchange?.({
      ...data,
      src: storeSrc(nextSrc),
      alt: alt || nextAlt,
    })
  }

  function openPicker() {
    if (!deckId) return
    showPicker = true
  }
</script>

<figure class="image-block">
  {#if src}
    <div class="image-wrapper">
      <img {src} {alt} draggable="false" style:width={imgWidth} style:max-height={imgHeight ?? '60vh'} />
      {#if editable}
        <button type="button" class="replace-btn" onclick={openPicker} disabled={!deckId} title="Replace image">
          Replace
        </button>
      {/if}
    </div>
  {:else if editable && deckId}
    <button type="button" class="empty-picker" onclick={openPicker}>
      <span class="empty-icon" aria-hidden="true">🖼</span>
      <span class="empty-label">Add an image</span>
      <span class="empty-hint">Upload new or pick from this deck</span>
    </button>
  {:else}
    <div class="placeholder">No image source</div>
  {/if}
  {#if caption}
    <figcaption style:font-size={fontSize}>{caption}</figcaption>
  {/if}
</figure>

{#if showPicker && deckId}
  <ImagePickerOverlay {deckId} onselect={handleSelect} onclose={() => (showPicker = false)} />
{/if}

<style>
  .image-block {
    margin: 0;
    text-align: center;
    width: 100%;
  }
  .image-wrapper {
    position: relative;
    display: inline-block;
    max-width: 100%;
  }
  img {
    max-width: 100%;
    max-height: 60vh;
    object-fit: contain;
    border-radius: 6px;
    display: block;
    margin: 0 auto;
  }
  .replace-btn {
    position: absolute;
    top: 8px;
    right: 8px;
    padding: 4px 10px;
    background: rgba(0, 0, 0, 0.55);
    color: #fff;
    border: none;
    border-radius: 4px;
    font-size: 0.72rem;
    cursor: pointer;
    opacity: 0;
    transition: opacity 0.15s, background 0.15s;
  }
  .image-wrapper:hover .replace-btn { opacity: 1; }
  .replace-btn:hover { background: rgba(0, 0, 0, 0.75); }
  .replace-btn:disabled { opacity: 0.4; cursor: not-allowed; }
  figcaption {
    margin-top: 8px;
    font-size: 0.85rem;
    color: var(--text-muted, rgba(240, 240, 240, 0.65));
    font-family: var(--font-body);
  }
  .placeholder {
    background: var(--color-bg-tertiary);
    border: 1px dashed var(--color-border);
    border-radius: var(--radius-md, 8px);
    padding: 2rem;
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
