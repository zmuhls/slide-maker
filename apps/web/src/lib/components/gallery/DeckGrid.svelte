<script lang="ts">
  import DeckCard from './DeckCard.svelte';

  let { decks, ondelete, onshare, oncreate }: {
    decks: any[];
    ondelete: (id: string) => void;
    onshare?: (id: string) => void;
    oncreate?: () => void;
  } = $props();
</script>

{#if decks.length === 0}
  <div class="empty-state">
    <div class="empty-icon" aria-hidden="true">
      <svg width="52" height="52" viewBox="0 0 52 52" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="4" y="9" width="44" height="30" rx="4" fill="var(--color-bg-tertiary)" stroke="var(--color-border)" stroke-width="2"/>
        <rect x="10" y="15" width="13" height="9" rx="2" fill="var(--color-border)"/>
        <rect x="29" y="15" width="13" height="9" rx="2" fill="var(--color-border)"/>
        <rect x="10" y="29" width="32" height="3" rx="1.5" fill="var(--color-border)"/>
        <circle cx="40" cy="40" r="10" fill="var(--color-primary)"/>
        <path d="M40 35v10M35 40h10" stroke="white" stroke-width="2.5" stroke-linecap="round"/>
      </svg>
    </div>
    <h2 class="empty-heading">No decks yet</h2>
    <p class="empty-text">Build your first AI-powered presentation to get started.</p>
    {#if oncreate}
      <button class="empty-cta" onclick={oncreate} type="button">
        + New Deck
      </button>
    {/if}
  </div>
{:else}
  <div class="deck-grid">
    {#each decks as deck, i (deck.id)}
      <div class="card-wrapper" style="animation-delay: {i * 50}ms">
        <DeckCard {deck} {ondelete} {onshare} />
      </div>
    {/each}
  </div>
{/if}

<style>
  .deck-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 1.25rem;
  }

  .card-wrapper {
    animation: card-in 0.3s ease both;
  }

  @keyframes card-in {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .empty-state {
    text-align: center;
    padding: 5rem 2rem;
    color: var(--color-text-muted);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.75rem;
  }

  .empty-icon {
    margin-bottom: 0.5rem;
    opacity: 0.9;
  }

  .empty-heading {
    font-family: var(--font-display);
    font-size: 1.25rem;
    font-weight: 600;
    color: var(--color-text-secondary);
    margin: 0;
  }

  .empty-text {
    font-size: 0.9375rem;
    color: var(--color-text-muted);
    max-width: 300px;
    line-height: 1.5;
  }

  .empty-cta {
    margin-top: 0.75rem;
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

  .empty-cta:hover {
    background: var(--color-primary-hover);
  }
</style>
