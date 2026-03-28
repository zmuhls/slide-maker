<script lang="ts">
  let { data = {}, editable = false, onchange }: {
    data: Record<string, unknown>;
    editable: boolean;
    onchange?: (newData: Record<string, unknown>) => void;
  } = $props()

  let nodes: Array<{ icon?: string; label: string; description?: string }> = $derived(
    Array.isArray(data.nodes)
      ? data.nodes.map((n: unknown) => {
          const node = n as Record<string, unknown>
          return {
            icon: typeof node.icon === 'string' ? node.icon : undefined,
            label: typeof node.label === 'string' ? node.label : '',
            description: typeof node.description === 'string' ? node.description : undefined,
          }
        })
      : []
  )
</script>

<div class="flow">
  {#each nodes as node, i}
    <div class="flow-node">
      <div class="flow-icon">
        {#if node.icon}
          {node.icon}
        {:else}
          {i + 1}
        {/if}
      </div>
      <div class="flow-body">
        <div class="flow-label">{node.label}</div>
        {#if node.description}
          <div class="flow-desc">{node.description}</div>
        {/if}
      </div>
    </div>
    {#if i < nodes.length - 1}
      <div class="flow-arrow"></div>
    {/if}
  {/each}
</div>

<style>
  .flow {
    display: flex;
    flex-direction: column;
  }
  .flow-node {
    display: flex;
    align-items: flex-start;
    gap: clamp(0.5rem, 1vw, 1rem);
  }
  .flow-icon {
    width: clamp(2rem, 3vw, 3rem);
    height: clamp(2rem, 3vw, 3rem);
    border-radius: 50%;
    background: var(--teal, #2FB8D6);
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    font-weight: 700;
    font-size: clamp(0.7rem, 1vw, 0.9rem);
    font-family: var(--font-display);
  }
  .flow-arrow {
    width: 2px;
    height: clamp(0.75rem, 1.5vw, 1.5rem);
    background: var(--teal, #2FB8D6);
    margin-left: clamp(1rem, 1.5vw, 1.5rem);
    opacity: 0.4;
  }
  .flow-body {
    padding-top: 0.15rem;
  }
  .flow-label {
    font-weight: 600;
    font-size: clamp(0.8rem, 1.3vw, 1rem);
    font-family: var(--font-display);
  }
  .flow-desc {
    font-size: clamp(0.7rem, 1.1vw, 0.85rem);
    color: var(--color-text-secondary);
    margin-top: 0.15rem;
    font-family: var(--font-body);
    line-height: 1.5;
  }
</style>
