<script lang="ts">
  import { MODULE_REGISTRY_LIST, createModuleData } from '@slide-maker/shared'

  let {
    deckId,
    slideId,
    zone,
    onAdd,
  }: {
    deckId: string
    slideId: string
    zone: string
    onAdd: () => void
  } = $props()

  let adding = $state(false)

  const moduleTypes = MODULE_REGISTRY_LIST

  import { updateSlideInDeck } from '$lib/stores/deck'
  import { api, API_URL } from '$lib/api'

  async function addModule(type: string) {
    if (adding) return
    adding = true

    try {
      const res = await fetch(`${API_URL}/api/decks/${deckId}/slides/${slideId}/blocks`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, zone, data: createModuleData(type) }),
      })

      if (res.ok) {
        const result = await res.json()
        const block = result.block ?? result
        if (block?.id) {
          updateSlideInDeck(slideId, (s) => ({
            ...s,
            blocks: [...s.blocks, block],
          }))
        }
        onAdd()
      }
    } catch (err) {
      console.error('Failed to add module:', err)
    } finally {
      adding = false
    }
  }
</script>

<div class="module-picker">
  <div class="picker-grid">
    {#each moduleTypes as mod}
      <button
        class="picker-item"
        onclick={() => addModule(mod.type)}
        disabled={adding}
        title={mod.label}
      >
        <span class="picker-icon">{mod.icon}</span>
        <span class="picker-label">{mod.label}</span>
      </button>
    {/each}
  </div>
</div>

<style>
  .module-picker {
    background: var(--color-bg, white);
    color: var(--color-text, #1f2937);
    border: 1px solid var(--color-border, #e5e7eb);
    border-radius: 8px;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
    padding: 8px;
    z-index: 50;
    min-width: 220px;
  }

  .picker-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 4px;
  }

  .picker-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
    padding: 8px 4px;
    border: 1px solid transparent;
    border-radius: 6px;
    background: none;
    cursor: pointer;
    transition: background 0.1s, border-color 0.1s;
    color: var(--color-text, #1f2937);
  }

  .picker-item:hover {
    background: var(--color-ghost-bg, #f3f4f6);
    border-color: var(--color-border, #e5e7eb);
  }

  .picker-item:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .picker-icon {
    font-size: 16px;
    line-height: 1.2;
  }

  .picker-label {
    font-size: 10px;
    font-weight: 500;
    line-height: 1.2;
    text-align: center;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 100%;
  }
</style>
