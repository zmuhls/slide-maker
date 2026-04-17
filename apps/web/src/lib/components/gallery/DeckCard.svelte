<script lang="ts">
  import { goto } from '$app/navigation';
  import { base } from '$app/paths';

  let { deck, ondelete, onshare }: { deck: any; ondelete: (id: string) => void; onshare?: (id: string) => void } = $props();

  let confirming = $state(false);

  function formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 30) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  }

  function handleClick() {
    goto(`${base}/deck/${deck.id}`);
  }

  function handleDelete(e: MouseEvent) {
    e.stopPropagation();
    if (confirming) {
      ondelete(deck.id);
      confirming = false;
    } else {
      confirming = true;
      setTimeout(() => { confirming = false; }, 3000);
    }
  }
</script>

<div class="deck-card" role="link" tabindex="0" onclick={handleClick} onkeydown={(e) => (e.key === 'Enter' || e.key === ' ') && handleClick()}>
  <div class="card-preview">
    <iframe
      src="{base}/thumbnail/{deck.id}"
      title="Preview of {deck.name}"
      class="thumbnail-iframe"
      sandbox=""
      loading="lazy"
      tabindex="-1"
    ></iframe>
    <div class="preview-overlay">
      <span class="open-label">Open →</span>
    </div>
  </div>
  <div class="card-body">
    <div class="card-info">
      <h3 class="card-title">{deck.name}</h3>
      <p class="card-meta">
        {#if deck.updatedAt}
          Edited {formatDate(deck.updatedAt)}
        {:else}
          New deck
        {/if}
      </p>
    </div>
    <div class="card-actions">
      {#if onshare}
        <button
          class="action-btn"
          onclick={(e) => { e.stopPropagation(); onshare!(deck.id); }}
          type="button"
          title="Share deck"
          aria-label="Share deck"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
        </button>
      {/if}
      {#if confirming}
        <button
          class="action-btn action-btn--confirm"
          onclick={handleDelete}
          type="button"
          aria-label="Confirm delete"
        >
          Confirm?
        </button>
      {:else}
        <button
          class="action-btn action-btn--delete"
          onclick={handleDelete}
          type="button"
          title="Delete deck"
          aria-label="Delete deck"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
        </button>
      {/if}
    </div>
  </div>
</div>

<style>
  .deck-card {
    display: flex;
    flex-direction: column;
    background: var(--color-bg);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    overflow: hidden;
    cursor: pointer;
    transition: box-shadow 0.2s, border-color 0.2s, transform 0.15s;
    text-align: left;
    font-family: var(--font-body);
  }

  .deck-card:hover {
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
    border-color: var(--color-accent);
    transform: translateY(-2px);
  }

  .deck-card:focus-visible {
    outline: 2px solid var(--color-primary);
    outline-offset: 2px;
  }

  /* Preview area — scaled to exactly 160px tall (540 * 0.296 = 159.8) */
  .card-preview {
    height: 160px;
    background: var(--color-bg-tertiary);
    overflow: hidden;
    position: relative;
  }

  .thumbnail-iframe {
    width: 960px;
    height: 540px;
    border: none;
    transform: scale(0.296);
    transform-origin: top left;
    pointer-events: none;
    position: absolute;
    top: 0;
    left: 50%;
    margin-left: -142px;
  }

  .preview-overlay {
    position: absolute;
    inset: 0;
    background: rgba(29, 58, 131, 0);
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background 0.2s;
  }

  .open-label {
    color: white;
    font-size: 0.875rem;
    font-weight: 600;
    font-family: var(--font-display);
    letter-spacing: 0.02em;
    opacity: 0;
    transform: translateY(6px);
    transition: opacity 0.2s, transform 0.2s;
  }

  .deck-card:hover .preview-overlay {
    background: rgba(29, 58, 131, 0.4);
  }

  .deck-card:hover .open-label {
    opacity: 1;
    transform: translateY(0);
  }

  .card-body {
    padding: 0.875rem 1rem;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    border-top: 1px solid var(--color-border);
  }

  .card-info {
    flex: 1;
    min-width: 0;
  }

  .card-title {
    font-family: var(--font-display);
    font-size: 0.9375rem;
    font-weight: 600;
    color: var(--color-text);
    margin-bottom: 0.2rem;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .card-meta {
    font-size: 0.75rem;
    color: var(--color-text-muted);
  }

  .card-actions {
    display: flex;
    gap: 0.25rem;
    flex-shrink: 0;
  }

  .action-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    background: transparent;
    border: 1px solid transparent;
    border-radius: var(--radius-sm);
    color: var(--color-text-secondary);
    cursor: pointer;
    opacity: 0;
    transition: opacity 0.15s, background 0.15s, border-color 0.15s, color 0.15s;
  }

  .deck-card:hover .action-btn,
  .action-btn:focus-visible,
  .action-btn--confirm {
    opacity: 1;
  }

  .action-btn:hover {
    background: var(--color-bg-secondary);
    border-color: var(--color-border);
  }

  .action-btn--delete:hover {
    background: rgba(239, 68, 68, 0.08);
    border-color: rgba(239, 68, 68, 0.3);
    color: #ef4444;
  }

  .action-btn--confirm {
    width: auto;
    padding: 0 0.5rem;
    font-size: 0.6875rem;
    font-weight: 600;
    background: #ef4444;
    border-color: #ef4444;
    color: white;
    font-family: var(--font-body);
  }

  .action-btn--confirm:hover {
    background: #dc2626;
    border-color: #dc2626;
    color: white;
  }
</style>
