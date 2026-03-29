<script lang="ts">
  let { data, editing = false } = $props<{
    data: {
      src?: string
      url?: string
      rawSource?: string
      config?: Record<string, unknown>
      width?: string
      height?: string
      alt?: string
    }
    editing?: boolean
  }>()

  const width = $derived(data.width || '100%')
  const height = $derived(data.height || '400px')
  const alt = $derived(data.alt || 'Interactive visualization')

  // Build iframe src: prefer rawSource with config injected, fallback to src/url
  let iframeSrc = $derived.by(() => {
    if (data.rawSource) {
      // If there's a raw source, build a blob URL from it
      const blob = new Blob([data.rawSource], { type: 'text/html' })
      return URL.createObjectURL(blob)
    }
    return data.src || data.url || ''
  })
</script>

<div class="artifact-module" style="width: {width};">
  {#if iframeSrc}
    <iframe
      src={iframeSrc}
      style="width: 100%; height: {height}; border: none; border-radius: 8px;"
      sandbox="allow-scripts"
      loading="lazy"
      title={alt}
    ></iframe>
  {:else}
    <div class="artifact-placeholder">
      <span class="artifact-icon">?</span>
      <p>No artifact source URL configured</p>
    </div>
  {/if}
</div>

<style>
  .artifact-module {
    border-radius: 8px;
    overflow: hidden;
  }
  .artifact-placeholder {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 200px;
    background: rgba(255, 255, 255, 0.03);
    border: 1px dashed rgba(255, 255, 255, 0.1);
    border-radius: 8px;
    color: rgba(255, 255, 255, 0.4);
    font-size: 0.9rem;
  }
  .artifact-icon {
    font-size: 2rem;
    margin-bottom: 8px;
  }
</style>
