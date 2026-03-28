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

  let { module, editable = false, onchange, oneditorready }: {
    module: { id: string; type: string; data: Record<string, unknown>; stepOrder?: number | null };
    editable: boolean;
    onchange?: (newData: Record<string, unknown>) => void;
    oneditorready?: (editor: Editor) => void;
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
</script>

<div class="module-wrapper" class:editable class:is-step={module.stepOrder != null}>
  {#if module.stepOrder != null}
    <span class="step-badge">Step {module.stepOrder + 1}</span>
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
    outline: 2px dashed var(--color-primary);
    outline-offset: 4px;
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
    right: 4px;
    background: var(--teal, #2FB8D6);
    color: white;
    font-size: 10px;
    padding: 1px 8px;
    border-radius: 10px;
    font-weight: 600;
    font-family: var(--font-body);
    z-index: 5;
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
