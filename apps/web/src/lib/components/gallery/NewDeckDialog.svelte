<script lang="ts">
  import { api } from '$lib/api';
  import { goto } from '$app/navigation';
  import { base } from '$app/paths';

  let { open = $bindable(false) }: { open: boolean } = $props();

  let name = $state('');
  let error = $state('');
  let loading = $state(false);

  let dialogEl = $state(null) as HTMLDivElement | null;
  let nameInput = $state(null) as HTMLInputElement | null;

  async function handleSubmit(e: SubmitEvent) {
    e.preventDefault();
    error = '';

    if (!name.trim()) {
      error = 'Please enter a deck name';
      return;
    }

    loading = true;

    try {
      const result = await api.createDeck({ name: name.trim() });
      const deck = result.deck ?? result;
      open = false;
      name = '';
      goto(`${base}/deck/${deck.id}`);
    } catch (err: any) {
      error = err.message || 'Failed to create deck';
    } finally {
      loading = false;
    }
  }

  function handleBackdrop(e: MouseEvent) {
    if (e.target === e.currentTarget) {
      open = false;
    }
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      open = false;
    }
  }

  $effect(() => {
    if (open) {
      // Focus dialog for accessibility and then the name input for usability
      queueMicrotask(() => {
        dialogEl?.focus?.();
        nameInput?.focus?.();
      });
    }
  });
</script>

{#if open}
  <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
  <div class="overlay" role="presentation" onclick={handleBackdrop} onkeydown={handleKeydown}>
    <div class="dialog" role="dialog" aria-modal="true" aria-labelledby="new-deck-title" tabindex="-1" bind:this={dialogEl}>
      <h2 id="new-deck-title">New Deck</h2>

      <form onsubmit={handleSubmit}>
        {#if error}
          <div class="error-message" role="alert">{error}</div>
        {/if}

        <label class="field">
          <span>Deck Name</span>
          <input
            type="text"
            bind:value={name}
            placeholder="My Presentation"
            required
            bind:this={nameInput}
          />
        </label>

        <div class="actions">
          <button type="button" class="btn-secondary" onclick={() => (open = false)}>
            Cancel
          </button>
          <button type="submit" class="btn-primary" disabled={loading}>
            {loading ? 'Creating...' : 'Create'}
          </button>
        </div>
      </form>
    </div>
  </div>
{/if}

<style>
  .overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.4);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 100;
    padding: 1rem;
  }

  .dialog {
    background: var(--color-bg);
    border-radius: var(--radius-lg);
    padding: 2rem;
    width: 100%;
    max-width: 400px;
    box-shadow: 0 16px 48px rgba(0, 0, 0, 0.2);
  }

  .dialog h2 {
    font-family: var(--font-display);
    font-size: 1.25rem;
    font-weight: 700;
    margin-bottom: 1.5rem;
    color: var(--color-text);
  }

  .error-message {
    background: #fef2f2;
    color: var(--color-error);
    padding: 0.75rem 1rem;
    border-radius: var(--radius-md);
    font-size: 0.875rem;
    border: 1px solid #fecaca;
    margin-bottom: 1rem;
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: 0.375rem;
    margin-bottom: 1.5rem;
  }

  .field span {
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--color-text);
  }

  .field input {
    padding: 0.625rem 0.875rem;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    font-size: 0.9375rem;
    font-family: var(--font-body);
    transition: border-color 0.15s, box-shadow 0.15s;
  }

  .field input:focus {
    outline: none;
    border-color: var(--color-border-focus);
    box-shadow: 0 0 0 3px rgba(59, 115, 230, 0.15);
  }

  .actions {
    display: flex;
    gap: 0.75rem;
    justify-content: flex-end;
  }

  .btn-primary {
    padding: 0.625rem 1.5rem;
    background: var(--color-primary);
    color: white;
    border: none;
    border-radius: var(--radius-full);
    font-size: 0.875rem;
    font-weight: 600;
    font-family: var(--font-body);
    cursor: pointer;
    transition: background 0.15s;
  }

  .btn-primary:hover:not(:disabled) {
    background: var(--color-primary-hover);
  }

  .btn-primary:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .btn-secondary {
    padding: 0.625rem 1.5rem;
    background: var(--color-bg);
    color: var(--color-text-secondary);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-full);
    font-size: 0.875rem;
    font-weight: 500;
    font-family: var(--font-body);
    cursor: pointer;
    transition: background 0.15s;
  }

  .btn-secondary:hover {
    background: var(--color-bg-secondary);
  }
</style>
