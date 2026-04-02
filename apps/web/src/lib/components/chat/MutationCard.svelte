<script lang="ts">
  import type { PendingMutation } from '$lib/stores/pending-mutations'

  interface Props {
    mutation: PendingMutation
    onaccept: (id: string) => void
    onreject: (id: string) => void
  }

  let { mutation, onaccept, onreject }: Props = $props()
</script>

<div
  class="mutation-card"
  class:accepted={mutation.status === 'accepted'}
  class:rejected={mutation.status === 'rejected'}
>
  <span class="mutation-summary">{mutation.summary}</span>
  <div class="mutation-actions">
    {#if mutation.status === 'pending'}
      <button class="ghost-btn accept" onclick={() => onaccept(mutation.id)} title="Accept">&#10003;</button>
      <button class="ghost-btn reject" onclick={() => onreject(mutation.id)} title="Reject">&#10005;</button>
    {:else}
      <span class="mutation-status-badge">{mutation.status}</span>
    {/if}
  </div>
</div>

<style>
  .mutation-card {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 5px 10px;
    margin: 3px 0;
    border: 1px solid var(--color-border, #e5e7eb);
    border-left: 3px solid var(--color-primary, #3B73E6);
    border-radius: var(--radius-sm, 6px);
    font-size: 12px;
    gap: 8px;
  }

  .mutation-card.accepted {
    border-left-color: #10b981;
    opacity: 0.7;
  }

  .mutation-card.rejected {
    border-left-color: #ef4444;
    opacity: 0.45;
  }

  .mutation-summary {
    flex: 1;
    color: var(--color-text);
  }

  .mutation-actions {
    display: flex;
    gap: 4px;
    align-items: center;
  }

  .ghost-btn {
    width: 22px;
    height: 22px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 1px solid var(--color-border, #e5e7eb);
    border-radius: var(--radius-sm, 6px);
    background: transparent;
    font-size: 12px;
    cursor: pointer;
    transition: background 0.15s, border-color 0.15s;
  }

  .ghost-btn.accept {
    color: #10b981;
  }

  .ghost-btn.accept:hover {
    background: rgba(16, 185, 129, 0.1);
    border-color: #10b981;
  }

  .ghost-btn.reject {
    color: #ef4444;
  }

  .ghost-btn.reject:hover {
    background: rgba(239, 68, 68, 0.1);
    border-color: #ef4444;
  }

  .mutation-status-badge {
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: var(--color-text-muted);
  }
</style>
