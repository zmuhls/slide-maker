<script lang="ts">
  import { onMount, onDestroy } from 'svelte'
  import Moveable from 'moveable'

  let { children, block, onLayoutChange }: {
    children: any
    block: { id: string; layout?: { x: number; y: number; width: number; height: number } | null }
    onLayoutChange: (blockId: string, layout: { x: number; y: number; width: number; height: number }) => void
  } = $props()

  // Derive layout from block prop so Svelte doesn't warn about initial capture
  let layout = $derived(block.layout)
  let x = $state(0)
  let y = $state(0)
  let width = $state(0)
  let height = $state(0)
  let hasLayout = $state(false)
  let initialized = false

  $effect(() => {
    if (!initialized && layout) {
      x = layout.x ?? 0
      y = layout.y ?? 0
      width = layout.width ?? 0
      height = layout.height ?? 0
      hasLayout = true
      initialized = true
    } else if (!initialized) {
      initialized = true
    }
  })

  let targetEl: HTMLDivElement | undefined = $state()
  let wrapperEl: HTMLDivElement | undefined = $state()
  let moveableInstance: Moveable | null = null
  let isDragging = $state(false)
  let editMode = $state(false)

  function handleDoubleClick() {
    editMode = true
    if (moveableInstance) {
      moveableInstance.draggable = false
    }
  }

  function handleClickOutside(e: MouseEvent) {
    if (editMode && targetEl && !targetEl.contains(e.target as Node)) {
      editMode = false
      if (moveableInstance) {
        moveableInstance.draggable = true
      }
    }
  }

  onMount(() => {
    if (!targetEl || !wrapperEl) return

    // Listen for clicks outside to exit edit mode
    document.addEventListener('mousedown', handleClickOutside)

    // If no explicit layout, measure the element's natural size
    if (!hasLayout) {
      const rect = targetEl.getBoundingClientRect()
      width = rect.width
      height = rect.height
    }

    moveableInstance = new Moveable(wrapperEl, {
      target: targetEl,
      draggable: true,
      resizable: true,
      // Use edge handles for a cleaner look
      edge: false,
      // Keep the element within the parent
      snappable: false,
      origin: false,
      // Thinner render directions
      renderDirections: ['nw', 'ne', 'se', 'sw', 'n', 'e', 's', 'w'],
    })

    moveableInstance.on('dragStart', () => {
      isDragging = true
    })

    moveableInstance.on('drag', (e) => {
      x = e.left
      y = e.top
      e.target.style.transform = `translate(${x}px, ${y}px)`
    })

    moveableInstance.on('dragEnd', () => {
      isDragging = false
      hasLayout = true
      onLayoutChange(block.id, { x, y, width, height })
    })

    moveableInstance.on('resizeStart', () => {
      isDragging = true
    })

    moveableInstance.on('resize', (e) => {
      width = e.width
      height = e.height
      x = e.drag.left
      y = e.drag.top
      e.target.style.width = `${width}px`
      e.target.style.height = `${height}px`
      e.target.style.transform = `translate(${x}px, ${y}px)`
    })

    moveableInstance.on('resizeEnd', () => {
      isDragging = false
      hasLayout = true
      onLayoutChange(block.id, { x, y, width, height })
    })
  })

  onDestroy(() => {
    document.removeEventListener('mousedown', handleClickOutside)
    if (moveableInstance) {
      moveableInstance.destroy()
      moveableInstance = null
    }
  })
</script>

<div class="block-moveable-wrapper" bind:this={wrapperEl}>
  <div
    class="block-moveable-target"
    class:is-dragging={isDragging}
    class:has-layout={hasLayout}
    class:edit-mode={editMode}
    bind:this={targetEl}
    ondblclick={handleDoubleClick}
    role="button"
    tabindex="0"
    style:transform={hasLayout ? `translate(${x}px, ${y}px)` : undefined}
    style:width={hasLayout ? `${width}px` : undefined}
    style:height={hasLayout ? `${height}px` : undefined}
  >
    {@render children()}
  </div>
</div>

<style>
  .block-moveable-wrapper {
    position: relative;
    width: 100%;
  }

  .block-moveable-target {
    position: relative;
    cursor: grab;
    transition: box-shadow 0.15s ease;
  }

  .block-moveable-target.has-layout {
    position: absolute;
    top: 0;
    left: 0;
    overflow: hidden;
  }

  .block-moveable-target:hover {
    outline: 1.5px solid rgba(59, 130, 246, 0.5);
    outline-offset: 2px;
    border-radius: 2px;
  }

  .block-moveable-target.is-dragging {
    cursor: grabbing;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
    z-index: 10;
  }

  /* When NOT in edit mode, block inner content so moveable gets all events */
  .block-moveable-target:not(.edit-mode) :global(*) {
    pointer-events: none;
  }

  /* When IN edit mode, allow inner content to receive focus/clicks */
  .block-moveable-target.edit-mode {
    cursor: text;
  }

  .block-moveable-target.edit-mode :global(*) {
    pointer-events: auto;
  }

  .block-moveable-target.edit-mode {
    outline: 2px solid rgba(59, 130, 246, 0.7) !important;
    outline-offset: 2px;
    border-radius: 2px;
  }

  /* Style the moveable control handles */
  :global(.moveable-control-box .moveable-control) {
    width: 8px !important;
    height: 8px !important;
    margin-top: -4px !important;
    margin-left: -4px !important;
    background: #3b82f6 !important;
    border: 1.5px solid white !important;
    border-radius: 50% !important;
  }

  :global(.moveable-control-box .moveable-line) {
    background: rgba(59, 130, 246, 0.4) !important;
    height: 1px !important;
  }

  :global(.moveable-control-box .moveable-direction) {
    background: rgba(59, 130, 246, 0.4) !important;
  }
</style>
