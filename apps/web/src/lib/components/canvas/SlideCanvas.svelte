<script lang="ts">
  import '$lib/framework-preview.css'
  import { currentDeck } from '$lib/stores/deck'
  import { activeSlideId } from '$lib/stores/ui'
  import { activeTheme, ensureThemesLoaded, isDark } from '$lib/stores/themes'
  import { renderSlideHtml } from '$lib/utils/slide-html'
  import CanvasToolbar from './CanvasToolbar.svelte'
  import FormatToolbar from './FormatToolbar.svelte'
  import SlideRenderer from './SlideRenderer.svelte'
  import type { Editor } from '@tiptap/core'

  let { editable = true }: { editable?: boolean } = $props()

  let activeSlide = $derived(
    $currentDeck?.slides.find((s) => s.id === $activeSlideId) ?? null
  )

  // Toggle between iframe preview mode and Svelte edit mode
  let editMode = $state(false)

  // Track the active TipTap editor for the format toolbar
  let activeEditor: Editor | null = $state(null)

  function handleEditorReady(editor: unknown) {
    activeEditor = editor as Editor
  }

  function handleEditorBlur() {
    // Small delay so toolbar clicks still work
    setTimeout(() => { activeEditor = null }, 300)
  }

  // Load themes on mount so activeTheme can resolve
  $effect(() => {
    ensureThemesLoaded()
  })

  // Derive theme
  let theme = $derived($activeTheme)

  // Build iframe srcdoc from slide + theme
  let slideHtml = $derived.by(() => {
    if (!activeSlide) return ''
    return renderSlideHtml(activeSlide, theme)
  })

  // Switch back to preview when changing slides
  $effect(() => {
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    $activeSlideId
    editMode = false
    activeEditor = null
  })

  function enterEditMode() {
    if (!editable) return
    editMode = true
  }

  function exitEditMode() {
    editMode = false
    activeEditor = null
  }

  function handleCanvasKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape' && editMode) {
      exitEditMode()
    }
  }

  // Derive theme-driven CSS variables for the SlideRenderer (edit mode)
  let themeStyle = $derived.by(() => {
    const bg = theme?.colors?.bg ?? '#111827'
    const dark = isDark(bg)
    const text = dark ? '#f0f0f0' : '#1a1a2e'
    const textMuted = dark ? 'rgba(240,240,240,0.65)' : 'rgba(26,26,46,0.65)'
    const primary = theme?.colors?.primary ?? '#1e3a5f'
    const primaryDark = isDark(primary)
    const primaryText = primaryDark ? '#ffffff' : '#1a1a2e'
    const primaryTextMuted = primaryDark ? 'rgba(255,255,255,0.7)' : 'rgba(26,26,46,0.7)'
    const secondary = theme?.colors?.secondary ?? '#3b82f6'
    const accent = theme?.colors?.accent ?? '#64b5f6'
    const headingFont = theme?.fonts?.heading ?? 'Outfit'
    const bodyFont = theme?.fonts?.body ?? 'Inter'
    const cardBg = dark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)'
    const border = dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)'

    return [
      `--theme-bg: ${bg}`,
      `--theme-text: ${text}`,
      `--theme-text-muted: ${textMuted}`,
      `--theme-primary: ${primary}`,
      `--theme-primary-text: ${primaryText}`,
      `--theme-primary-text-muted: ${primaryTextMuted}`,
      `--theme-secondary: ${secondary}`,
      `--theme-accent: ${accent}`,
      `--theme-heading-font: ${headingFont}`,
      `--theme-body-font: ${bodyFont}`,
      `--theme-card-bg: ${cardBg}`,
      `--theme-border: ${border}`,
    ].join('; ')
  })
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="slide-canvas" onkeydown={handleCanvasKeydown}>
  <CanvasToolbar {editMode} onToggleEdit={() => { editMode ? exitEditMode() : enterEditMode() }} />
  {#if editable && editMode}
    <FormatToolbar editor={activeEditor} />
  {/if}
  <div class="canvas-area">
    {#if activeSlide}
      {#if editMode}
        <div class="slide-frame" style={themeStyle}>
          <SlideRenderer slide={activeSlide} {editable} onEditorReady={handleEditorReady} />
        </div>
      {:else}
        <div class="preview-container">
          {#key slideHtml}
          <iframe
            class="slide-preview-frame"
            srcdoc={slideHtml}
            sandbox="allow-same-origin"
            title="Slide preview"
          ></iframe>
          {/key}
          {#if editable}
            <!-- svelte-ignore a11y_no_static_element_interactions -->
            <div class="click-overlay" ondblclick={enterEditMode}></div>
            <div class="edit-hint">Double-click to edit</div>
          {/if}
        </div>
      {/if}
    {:else}
      <div class="no-slide">No slide selected</div>
    {/if}
  </div>
</div>

<style>
  .slide-canvas {
    display: flex;
    flex-direction: column;
    height: 100%;
    background: var(--color-bg-secondary);
  }
  .canvas-area {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1rem;
    overflow: auto;
  }
  .preview-container {
    width: 100%;
    height: 100%;
    max-height: 100%;
    aspect-ratio: 16 / 9;
    position: relative;
    border-radius: var(--radius-md);
    overflow: hidden;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
    cursor: pointer;
  }
  .slide-preview-frame {
    width: 100%;
    height: 100%;
    border: none;
    border-radius: var(--radius-md);
    background: white;
  }
  .click-overlay {
    position: absolute;
    inset: 0;
    z-index: 1;
    cursor: pointer;
  }
  .edit-hint {
    position: absolute;
    bottom: 12px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 2;
    background: rgba(0, 0, 0, 0.6);
    color: rgba(255, 255, 255, 0.85);
    font-size: 0.7rem;
    padding: 4px 12px;
    border-radius: 999px;
    pointer-events: none;
    opacity: 0;
    transition: opacity 0.2s;
  }
  .preview-container:hover .edit-hint {
    opacity: 1;
  }
  .slide-frame {
    width: 100%;
    height: 100%;
    max-height: 100%;
    aspect-ratio: 16 / 9;
    background: white;
    border-radius: var(--radius-md);
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
    overflow: hidden;
  }
  .no-slide {
    color: var(--color-text-muted);
    font-size: 0.9rem;
    font-style: italic;
  }
</style>
