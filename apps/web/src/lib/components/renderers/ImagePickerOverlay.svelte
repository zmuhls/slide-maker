<script lang="ts">
  import { api, API_URL } from '$lib/api'

  let { deckId, onselect, onclose }: {
    deckId: string
    onselect: (src: string, alt: string) => void
    onclose?: () => void
  } = $props()

  type FileItem = {
    id?: string
    _id?: string
    filename?: string
    originalName?: string
    mimeType?: string
  }

  const imageExts = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp', 'ico'])

  function isImage(file: FileItem): boolean {
    const name = file.originalName ?? file.filename ?? ''
    const ext = name.split('.').pop()?.toLowerCase() ?? ''
    if (imageExts.has(ext)) return true
    return typeof file.mimeType === 'string' && file.mimeType.startsWith('image/')
  }

  function getId(file: FileItem): string {
    return file.id ?? file._id ?? ''
  }

  function getName(file: FileItem): string {
    return file.originalName ?? file.filename ?? 'image'
  }

  function fileUrl(fileId: string): string {
    return `${API_URL}/api/decks/${deckId}/files/${fileId}`
  }

  let mode = $state<'upload' | 'library'>('upload')
  let files = $state<FileItem[]>([])
  let loading = $state(false)
  let uploading = $state(false)
  let error = $state<string | null>(null)
  let fileInput: HTMLInputElement | undefined = $state()

  async function loadFiles() {
    if (!deckId) return
    loading = true
    error = null
    try {
      const res = await api.listFiles(deckId)
      files = (res.files ?? []).filter(isImage)
    } catch (e) {
      error = e instanceof Error ? e.message : 'Failed to load files'
    } finally {
      loading = false
    }
  }

  async function handleUpload(file: File) {
    if (!deckId) return
    uploading = true
    error = null
    try {
      const res = await api.uploadFile(deckId, file)
      const uploaded = res.file
      if (!uploaded?.url) throw new Error('Upload response missing url')
      const src = `${API_URL}${uploaded.url}`
      onselect(src, uploaded.filename ?? file.name)
    } catch (e) {
      error = e instanceof Error ? e.message : 'Upload failed'
    } finally {
      uploading = false
    }
  }

  function onFileSelected(e: Event) {
    const input = e.target as HTMLInputElement
    const file = input.files?.[0]
    if (file) handleUpload(file)
    input.value = ''
  }

  function pickFromLibrary(file: FileItem) {
    const id = getId(file)
    if (!id) return
    onselect(fileUrl(id), getName(file))
  }

  function switchTo(next: 'upload' | 'library') {
    mode = next
    if (next === 'library' && files.length === 0 && !loading) loadFiles()
  }

  function handleBackdrop(e: MouseEvent) {
    if (e.target === e.currentTarget) onclose?.()
  }

  function handleKey(e: KeyboardEvent) {
    if (e.key === 'Escape') onclose?.()
  }
</script>

<svelte:window onkeydown={handleKey} />

<div class="overlay" role="dialog" aria-modal="true" aria-label="Add image" onclick={handleBackdrop}>
  <div class="dialog" role="document">
    <header class="dialog-header">
      <div class="tabs" role="tablist">
        <button
          type="button"
          role="tab"
          class:active={mode === 'upload'}
          aria-selected={mode === 'upload'}
          onclick={() => switchTo('upload')}
        >Upload</button>
        <button
          type="button"
          role="tab"
          class:active={mode === 'library'}
          aria-selected={mode === 'library'}
          onclick={() => switchTo('library')}
        >From deck</button>
      </div>
      {#if onclose}
        <button type="button" class="close-btn" aria-label="Close" onclick={() => onclose?.()}>×</button>
      {/if}
    </header>

    {#if error}
      <div class="error" role="alert">{error}</div>
    {/if}

    {#if mode === 'upload'}
      <div class="body upload-body">
        <button
          type="button"
          class="upload-drop"
          onclick={() => fileInput?.click()}
          disabled={uploading}
        >
          {#if uploading}
            <span class="spinner" aria-hidden="true"></span>
            <span>Uploading…</span>
          {:else}
            <span class="upload-icon" aria-hidden="true">⬆</span>
            <span class="upload-label">Click to choose an image</span>
            <span class="upload-hint">PNG, JPG, GIF, WebP, SVG · max 10MB</span>
          {/if}
        </button>
        <input
          bind:this={fileInput}
          type="file"
          accept="image/*"
          class="file-input-hidden"
          onchange={onFileSelected}
        />
      </div>
    {:else}
      <div class="body library-body">
        {#if loading}
          <p class="empty">Loading images…</p>
        {:else if files.length === 0}
          <p class="empty">No images uploaded to this deck yet.<br />Upload one from the other tab.</p>
        {:else}
          <div class="grid">
            {#each files as file (getId(file))}
              <button
                type="button"
                class="thumb"
                onclick={() => pickFromLibrary(file)}
                aria-label={`Use ${getName(file)}`}
              >
                <img src={fileUrl(getId(file))} alt={getName(file)} loading="lazy" />
                <span class="thumb-name">{getName(file)}</span>
              </button>
            {/each}
          </div>
        {/if}
      </div>
    {/if}
  </div>
</div>

<style>
  .overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 9000;
    padding: 16px;
  }
  .dialog {
    background: var(--color-bg, #fff);
    color: var(--color-text, #1f2937);
    border: 1px solid var(--color-border, #e5e7eb);
    border-radius: 10px;
    width: min(520px, 100%);
    max-height: 80vh;
    display: flex;
    flex-direction: column;
    box-shadow: 0 12px 40px rgba(0, 0, 0, 0.25);
    overflow: hidden;
  }
  .dialog-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 12px;
    border-bottom: 1px solid var(--color-border, #e5e7eb);
    gap: 8px;
  }
  .tabs {
    display: flex;
    gap: 4px;
  }
  .tabs button {
    background: transparent;
    border: 1px solid transparent;
    border-radius: 6px;
    padding: 6px 12px;
    font-size: 0.85rem;
    font-family: inherit;
    color: var(--color-text-muted, #6b7280);
    cursor: pointer;
  }
  .tabs button.active {
    background: var(--color-ghost-bg, rgba(37, 99, 235, 0.08));
    border-color: var(--color-primary, #2563eb);
    color: var(--color-primary, #2563eb);
  }
  .close-btn {
    background: transparent;
    border: none;
    font-size: 1.3rem;
    line-height: 1;
    cursor: pointer;
    color: var(--color-text-muted, #6b7280);
    padding: 4px 8px;
  }
  .close-btn:hover { color: var(--color-text, #1f2937); }
  .error {
    padding: 8px 12px;
    background: rgba(220, 38, 38, 0.08);
    color: #b91c1c;
    font-size: 0.82rem;
    border-bottom: 1px solid rgba(220, 38, 38, 0.2);
  }
  .body {
    flex: 1;
    overflow: auto;
    padding: 16px;
  }
  .upload-body {
    display: flex;
    justify-content: center;
  }
  .upload-drop {
    width: 100%;
    min-height: 200px;
    border: 2px dashed var(--color-border, #d1d5db);
    border-radius: 8px;
    background: var(--color-bg-tertiary, #f9fafb);
    cursor: pointer;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 6px;
    color: var(--color-text-muted, #6b7280);
    font-family: inherit;
    font-size: 0.85rem;
    transition: border-color 0.15s, background 0.15s;
  }
  .upload-drop:hover:not(:disabled) {
    border-color: var(--color-primary, #2563eb);
    color: var(--color-primary, #2563eb);
  }
  .upload-drop:disabled { cursor: progress; }
  .upload-icon { font-size: 1.6rem; line-height: 1; }
  .upload-label { font-weight: 600; color: inherit; }
  .upload-hint { font-size: 0.75rem; opacity: 0.75; }
  .file-input-hidden { display: none; }
  .spinner {
    width: 18px;
    height: 18px;
    border: 2px solid rgba(0, 0, 0, 0.2);
    border-top-color: var(--color-primary, #2563eb);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }
  @keyframes spin { to { transform: rotate(360deg); } }
  .empty {
    text-align: center;
    color: var(--color-text-muted, #6b7280);
    font-size: 0.85rem;
    padding: 24px 12px;
    line-height: 1.5;
  }
  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
    gap: 8px;
  }
  .thumb {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 4px;
    background: transparent;
    border: 1px solid var(--color-border, #e5e7eb);
    border-radius: 6px;
    cursor: pointer;
    font-family: inherit;
    color: inherit;
    transition: border-color 0.15s, transform 0.15s;
  }
  .thumb:hover {
    border-color: var(--color-primary, #2563eb);
    transform: translateY(-1px);
  }
  .thumb img {
    width: 100%;
    aspect-ratio: 1 / 1;
    object-fit: cover;
    border-radius: 4px;
    background: #f3f4f6;
  }
  .thumb-name {
    font-size: 0.7rem;
    color: var(--color-text-muted, #6b7280);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
</style>
