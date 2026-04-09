<script lang="ts">
  let {
    ratio = 0.5,
    onRatioChange,
  }: {
    ratio?: number
    onRatioChange?: (ratio: number) => void
  } = $props()

  let dragging = $state(false)

  function handlePointerDown(e: PointerEvent) {
    dragging = true
    const target = e.currentTarget as HTMLElement
    target.setPointerCapture(e.pointerId)
  }

  function handlePointerMove(e: PointerEvent) {
    if (!dragging) return
    const target = e.currentTarget as HTMLElement
    const parent = target.parentElement
    if (!parent) return
    const rect = parent.getBoundingClientRect()
    let newRatio = (e.clientX - rect.left) / rect.width
    newRatio = Math.max(0.25, Math.min(0.75, newRatio))
    onRatioChange?.(newRatio)
  }

  function handlePointerUp() {
    dragging = false
  }
</script>

<div
  class="split-handle"
  class:active={dragging}
  role="separator"
  aria-orientation="vertical"
  onpointerdown={handlePointerDown}
  onpointermove={handlePointerMove}
  onpointerup={handlePointerUp}
  onpointercancel={handlePointerUp}
  style:left="{ratio * 100}%"
>
  <div class="handle-line"></div>
</div>

<style>
  .split-handle {
    position: absolute;
    top: 0;
    bottom: 0;
    width: 6px;
    transform: translateX(-50%);
    cursor: col-resize;
    z-index: 5;
    display: flex;
    align-items: center;
    justify-content: center;
    user-select: none;
    touch-action: none;
  }

  .handle-line {
    width: 2px;
    height: 100%;
    background: transparent;
    border-radius: 1px;
    transition: background 0.15s ease;
  }

  .split-handle:hover .handle-line,
  .split-handle.active .handle-line {
    background: var(--blue, #3B73E6);
  }

  .split-handle:hover,
  .split-handle.active {
    background: rgba(59, 130, 246, 0.08);
  }
</style>
