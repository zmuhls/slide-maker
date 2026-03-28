<script lang="ts">
  import { dndzone } from 'svelte-dnd-action'
  import ModuleRenderer from '$lib/components/renderers/ModuleRenderer.svelte'

  type Module = {
    id: string
    type: string
    data: Record<string, unknown>
    zone: string
    order: number
    stepOrder?: number
  }

  let {
    modules,
    zone,
    editable = false,
    onReorder,
    onModuleDataChange,
    onEditorReady,
  }: {
    modules: Module[]
    zone: string
    editable?: boolean
    onReorder?: (zone: string, items: Module[]) => void
    onModuleDataChange?: (moduleId: string, data: Record<string, unknown>) => void
    onEditorReady?: (editor: unknown) => void
  } = $props()

  let items = $state<Module[]>([])

  $effect(() => {
    items = modules.map((m) => ({ ...m }))
  })

  function handleConsider(e: CustomEvent<{ items: Module[] }>) {
    items = e.detail.items
  }

  function handleFinalize(e: CustomEvent<{ items: Module[] }>) {
    items = e.detail.items
    onReorder?.(zone, items)
  }
</script>

<div
  class="zone-drop"
  class:editable
  use:dndzone={{
    items,
    dropTargetStyle: { outline: '2px dashed rgba(59,130,246,0.4)', borderRadius: '4px' },
    type: 'modules',
  }}
  onconsider={handleConsider}
  onfinalize={handleFinalize}
>
  {#if items.length === 0}
    <div class="empty-hint">+ Add module</div>
  {:else}
    {#each items as mod (mod.id)}
      <div class="module-item">
        <ModuleRenderer
          module={mod}
          {editable}
          onchange={(newData) => onModuleDataChange?.(mod.id, newData)}
          oneditorready={onEditorReady}
        />
      </div>
    {/each}
  {/if}
</div>

<style>
  .zone-drop {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    min-height: 2rem;
    flex: 1;
    padding: 0.25rem;
  }

  .zone-drop.editable {
    border-radius: var(--radius-sm, 4px);
  }

  .empty-hint {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1rem;
    color: rgba(255, 255, 255, 0.4);
    font-size: 0.8rem;
    font-style: italic;
    border: 1px dashed rgba(255, 255, 255, 0.2);
    border-radius: var(--radius-sm, 4px);
    min-height: 2.5rem;
  }

  .module-item {
    padding: 0.5rem 0.75rem;
    background: rgba(255, 255, 255, 0.08);
    border-radius: var(--radius-sm, 4px);
    font-size: 0.75rem;
    color: inherit;
    word-break: break-all;
    cursor: grab;
    transition: background 0.15s ease;
  }

  .module-item:hover {
    background: rgba(255, 255, 255, 0.14);
  }
</style>
