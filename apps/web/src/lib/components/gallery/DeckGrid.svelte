<script lang="ts">
  import DeckCard from './DeckCard.svelte';

  let { decks, ondelete, onshare }: { decks: any[]; ondelete: (id: string) => void; onshare?: (id: string) => void } = $props();
</script>

{#if decks.length === 0}
  <div class="empty-state">
    <p class="empty-icon" aria-hidden="true">&#128196;</p>
    <p class="empty-text">No decks yet. Create your first deck!</p>
  </div>
{:else}
  <div class="deck-grid">
    {#each decks as deck (deck.id)}
      <DeckCard {deck} {ondelete} {onshare} />
    {/each}
  </div>
{/if}

<style>
  .deck-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
    gap: 1.5rem;
  }

  .empty-state {
    text-align: center;
    padding: 4rem 2rem;
    color: var(--color-text-muted);
  }

  .empty-icon {
    font-size: 3rem;
    margin-bottom: 1rem;
  }

  .empty-text {
    font-size: 1.0625rem;
  }
</style>
