<script lang="ts">
  import HeadingModule from './HeadingModule.svelte'
  import TextModule from './TextModule.svelte'
  import CardModule from './CardModule.svelte'
  import LabelModule from './LabelModule.svelte'
  import TipBoxModule from './TipBoxModule.svelte'
  import PromptBlockModule from './PromptBlockModule.svelte'
  import ImageModule from './ImageModule.svelte'
  import CarouselModule from './CarouselModule.svelte'
  import ComparisonModule from './ComparisonModule.svelte'
  import CardGridModule from './CardGridModule.svelte'
  import FlowModule from './FlowModule.svelte'
  import StreamListModule from './StreamListModule.svelte'

  import type { Editor } from '@tiptap/core'

  let { module, editable = false, onchange, oneditorready, ondelete }: {
    module: { id: string; type: string; data: Record<string, unknown>; stepOrder?: number | null };
    editable: boolean;
    onchange?: (newData: Record<string, unknown>) => void;
    oneditorready?: (editor: Editor) => void;
    ondelete?: () => void;
  } = $props()

  const rendererMap: Record<string, any> = {
    heading: HeadingModule,
    text: TextModule,
    card: CardModule,
    label: LabelModule,
    'tip-box': TipBoxModule,
    'prompt-block': PromptBlockModule,
    image: ImageModule,
    carousel: CarouselModule,
    comparison: ComparisonModule,
    'card-grid': CardGridModule,
    flow: FlowModule,
    'stream-list': StreamListModule,
  }

  let Renderer = $derived(rendererMap[module.type] ?? null)

  // Delete confirmation
  let confirmDelete = $state(false)

  function handleDelete() {
    if (confirmDelete) {
      ondelete?.()
      confirmDelete = false
    } else {
      confirmDelete = true
      setTimeout(() => { confirmDelete = false }, 3000)
    }
  }
</script>

<div
  class="module-wrapper"
  class:editable
  class:is-step={module.stepOrder != null}
>
  {#if module.stepOrder != null}
    <span class="step-badge">Step {module.stepOrder + 1}</span>
  {/if}

  {#if editable}
    <button
      class="delete-btn"
      class:confirming={confirmDelete}
      onclick={handleDelete}
      title={confirmDelete ? 'Click again to confirm' : 'Delete module'}
    >
      {confirmDelete ? 'Delete?' : '✕'}
    </button>
  {/if}

  {#if Renderer}
    <Renderer data={module.data} {editable} {onchange} oneditorready={module.type === 'text' ? oneditorready : undefined} />
  {:else}
    <div class="unknown-module">Unknown module type: {module.type}</div>
  {/if}


</div>

<style>
  .module-wrapper {
    position: relative;
    width: 100%;
  }
  .module-wrapper.editable:hover {
    outline: 1px dashed rgba(59, 115, 230, 0.4);
    outline-offset: 2px;
    border-radius: var(--radius-sm);
  }
  .is-step {
    opacity: 0.7;
    border-left: 3px solid var(--teal, #2FB8D6);
    padding-left: 8px;
  }
  .step-badge {
    position: absolute;
    top: -10px;
    right: 24px;
    background: var(--teal, #2FB8D6);
    color: white;
    font-size: 10px;
    padding: 1px 8px;
    border-radius: 10px;
    font-weight: 600;
    font-family: var(--font-body);
    z-index: 5;
  }

  /* Delete button */
  .delete-btn {
    position: absolute;
    top: -6px;
    right: 2px;
    width: auto;
    min-width: 18px;
    height: 18px;
    display: none;
    align-items: center;
    justify-content: center;
    font-size: 10px;
    background: rgba(255, 255, 255, 0.9);
    border: 1px solid var(--color-border);
    border-radius: 9px;
    cursor: pointer;
    color: var(--color-text-muted);
    z-index: 10;
    padding: 0 4px;
    font-family: var(--font-body);
    line-height: 1;
  }
  .module-wrapper.editable:hover .delete-btn {
    display: flex;
  }
  .delete-btn:hover {
    color: #dc2626;
    border-color: #dc2626;
    background: #fef2f2;
  }
  .delete-btn.confirming {
    display: flex;
    color: white;
    background: #dc2626;
    border-color: #dc2626;
    padding: 0 6px;
    font-weight: 600;
  }

  .unknown-module {
    padding: 0.5rem;
    background: var(--color-bg-tertiary);
    border: 1px dashed var(--color-border);
    border-radius: var(--radius-sm);
    color: var(--color-text-muted);
    font-size: 0.8rem;
    text-align: center;
  }
</style>
