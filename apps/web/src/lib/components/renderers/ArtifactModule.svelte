<script lang="ts">
  import { onMount } from 'svelte'
  import { getArtifact, type ArtifactController } from '$lib/modules/artifacts'
  // Ensure built-ins are registered
  import '$lib/modules/artifacts/boids'

  let { data, editable = false } = $props<{
    data: {
      artifactName?: string
      src?: string // legacy
      url?: string // legacy
      rawSource?: string // legacy
      config?: Record<string, unknown>
      width?: string
      height?: string
      alt?: string
      align?: 'left' | 'center' | 'right'
    }
    editable?: boolean
  }>()

  const width = $derived(data.width || '100%')
  const height = $derived(data.height || '')
  const hasCustomSize = $derived(!!data.width || !!data.height)
  const alt = $derived(data.alt || 'Interactive visualization')
  const align = $derived((data.align as string) || 'center')

  let container: HTMLDivElement | null = null
  let controller: ArtifactController | null = null
  let error: string | null = null

  function start() {
    cleanup()
    error = null
    const factory = getArtifact(data.artifactName)
    if (!factory) {
      error = 'Unknown artifact'
      return
    }
    if (!container) return
    try {
      controller = factory(container, data.config ?? {})
    } catch (e) {
      console.error('Artifact init failed:', e)
      error = 'Failed to initialize artifact'
    }
  }

  function cleanup() {
    try { controller?.destroy?.() } catch {}
    controller = null
    if (container) container.replaceChildren() // clear DOM
  }

  onMount(() => {
    start()
    return () => cleanup()
  })

  $effect(() => {
    // Restart if the artifact type changes
    data.artifactName
    start()
  })

  $effect(() => {
    // Propagate config updates
    controller?.update?.(data.config ?? {})
  })
</script>

<div
  class="artifact-wrapper"
  class:custom-sized={hasCustomSize}
  style="width: {width};{hasCustomSize && height ? ` height: ${height};` : ''} {align === 'left' ? 'margin-right: auto;' : align === 'right' ? 'margin-left: auto;' : 'margin: 0 auto;'}"
>
  {#if editable}
    <div class="artifact-header">
      <span class="artifact-label">{alt}</span>
    </div>
  {/if}
  {#if error}
    <div class="artifact-placeholder">
      <span class="artifact-icon">!</span>
      <p>{error}</p>
    </div>
  {:else}
    <div bind:this={container} class="artifact-native" class:no-interact={editable}></div>
  {/if}
</div>

<style>
  /* Align editor styling with export/preview framework CSS */
  .artifact-wrapper {
    display: flex;
    flex-direction: column;
    width: 100%;
    border: 1px solid var(--color-border, rgba(255, 255, 255, 0.08));
    border-radius: 4px;
    overflow: hidden;
    background: rgba(0, 0, 0, 0.02);
  }
  .artifact-header {
    display: flex;
    align-items: center;
    padding: 3px 8px;
    background: rgba(0, 0, 0, 0.04);
    border-bottom: 1px solid var(--color-border, rgba(255, 255, 255, 0.06));
    min-height: 20px;
  }
  .artifact-label {
    font-size: 9px;
    font-weight: 500;
    color: var(--color-text-muted, #6b7280);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .artifact-native {
    display: block;
    border: none;
    width: 100%;
    flex: 1;
    min-height: 0;
    /* Default to a square aspect like exports */
    aspect-ratio: 1;
  }
  /* When an explicit height is provided on the wrapper, drop square aspect */
  .artifact-wrapper.custom-sized .artifact-native { aspect-ratio: auto; }
  .artifact-native.no-interact {
    pointer-events: none;
  }
  .artifact-placeholder {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 200px;
    background: rgba(255, 255, 255, 0.03);
    border: 1px dashed rgba(255, 255, 255, 0.1);
    color: rgba(255, 255, 255, 0.4);
    font-size: 0.9rem;
  }
  .artifact-icon {
    font-size: 2rem;
    margin-bottom: 8px;
  }
</style>
