<script lang="ts">
  import { onMount } from 'svelte';
  import { api } from '$lib/api';

  let { deckId, onclose }: { deckId: string; onclose: () => void } = $props();

  let searchQuery = $state('');
  let searchResults = $state<{ id: string; name: string; email: string }[]>([]);
  let showDropdown = $state(false);
  let selectedUser = $state<{ id: string; name: string; email: string } | null>(null);
  let role: 'editor' | 'viewer' = $state('editor');
  let collaborators = $state<any[]>([]);
  let loading = $state(true);
  let shareError = $state('');
  let shareSuccess = $state('');
  let searchTimer: ReturnType<typeof setTimeout> | undefined;

  onMount(async () => {
    await fetchCollaborators();
  });

  async function fetchCollaborators() {
    loading = true;
    try {
      const res = await api.getCollaborators(deckId);
      collaborators = res.collaborators;
    } catch (err: any) {
      shareError = err.message || 'Failed to load collaborators';
    } finally {
      loading = false;
    }
  }

  function handleInput() {
    selectedUser = null;
    clearTimeout(searchTimer);
    if (searchQuery.trim().length < 2) {
      searchResults = [];
      showDropdown = false;
      return;
    }
    searchTimer = setTimeout(async () => {
      try {
        const res = await api.searchUsers(searchQuery.trim());
        searchResults = res.users ?? [];
        showDropdown = searchResults.length > 0;
      } catch {
        searchResults = [];
        showDropdown = false;
      }
    }, 250);
  }

  function selectUser(user: { id: string; name: string; email: string }) {
    selectedUser = user;
    searchQuery = `${user.name} (${user.email})`;
    showDropdown = false;
    searchResults = [];
  }

  async function handleShare() {
    shareError = '';
    shareSuccess = '';

    const email = selectedUser?.email ?? searchQuery.trim();
    if (!email || !email.includes('@')) {
      shareError = 'Select a user or enter a valid email';
      return;
    }

    try {
      await api.shareDeck(deckId, { email, role });
      shareSuccess = `Shared with ${selectedUser?.name ?? email} as ${role}`;
      searchQuery = '';
      selectedUser = null;
      await fetchCollaborators();
    } catch (err: any) {
      shareError = err.message || 'Failed to share deck';
    }
  }

  async function handleRemove(userId: string) {
    shareError = '';
    shareSuccess = '';
    try {
      await api.removeDeckShare(deckId, userId);
      await fetchCollaborators();
    } catch (err: any) {
      shareError = err.message || 'Failed to remove access';
    }
  }

  function handleBackdropClick(e: MouseEvent) {
    if (e.target === e.currentTarget) onclose();
  }
</script>

<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
<div class="backdrop" onclick={handleBackdropClick}>
  <div class="dialog">
    <div class="dialog-header">
      <h2>Share Deck</h2>
      <button class="close-btn" onclick={onclose} type="button">&times;</button>
    </div>

    <div class="share-form">
      <div class="search-wrapper">
        <input
          type="text"
          placeholder="Search by name or email..."
          bind:value={searchQuery}
          oninput={handleInput}
          onfocus={() => { if (searchResults.length > 0) showDropdown = true }}
          onkeydown={(e) => e.key === 'Enter' && handleShare()}
        />
        {#if showDropdown}
          <div class="autocomplete-dropdown">
            {#each searchResults as user}
              <button class="autocomplete-item" onclick={() => selectUser(user)} type="button">
                <span class="ac-avatar">{user.name.charAt(0)}</span>
                <span class="ac-info">
                  <span class="ac-name">{user.name}</span>
                  <span class="ac-email">{user.email}</span>
                </span>
              </button>
            {/each}
          </div>
        {/if}
      </div>
      <select bind:value={role}>
        <option value="editor">Editor</option>
        <option value="viewer">Viewer</option>
      </select>
      <button class="share-btn" onclick={handleShare} type="button">Share</button>
    </div>

    {#if shareError}
      <p class="msg error">{shareError}</p>
    {/if}
    {#if shareSuccess}
      <p class="msg success">{shareSuccess}</p>
    {/if}

    <div class="collaborators">
      <h3>Collaborators</h3>
      {#if loading}
        <p class="loading-text">Loading...</p>
      {:else if collaborators.length === 0}
        <p class="empty-text">No collaborators yet</p>
      {:else}
        <ul>
          {#each collaborators as collab}
            <li>
              <span class="collab-avatar">{(collab.userName ?? collab.name ?? '?').charAt(0)}</span>
              <div class="collab-info">
                <span class="collab-name">{collab.userName ?? collab.name}</span>
                <span class="collab-email">{collab.userEmail ?? collab.email}</span>
              </div>
              <span class="collab-role">{collab.role}</span>
              {#if collab.role !== 'owner'}
                <button class="remove-btn" onclick={() => handleRemove(collab.userId)} type="button" title="Remove access">&times;</button>
              {/if}
            </li>
          {/each}
        </ul>
      {/if}
    </div>
  </div>
</div>

<style>
  .backdrop {
    position: fixed;
    inset: 0;
    z-index: 200;
    background: rgba(0, 0, 0, 0.4);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .dialog {
    background: var(--color-bg);
    border-radius: var(--radius-lg, 12px);
    width: 90%;
    max-width: 480px;
    max-height: 80vh;
    overflow-y: auto;
    box-shadow: 0 16px 48px rgba(0, 0, 0, 0.2);
    font-family: var(--font-body);
  }

  .dialog-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1.25rem 1.5rem 0.75rem;
    border-bottom: 1px solid var(--color-border);
  }

  .dialog-header h2 {
    font-family: var(--font-display);
    font-size: 1.125rem;
    font-weight: 600;
    margin: 0;
  }

  .close-btn {
    background: none;
    border: none;
    font-size: 1.5rem;
    cursor: pointer;
    color: var(--color-text-secondary);
    padding: 0;
    line-height: 1;
  }

  .share-form {
    display: flex;
    gap: 0.5rem;
    padding: 1rem 1.5rem;
    align-items: flex-start;
  }

  .search-wrapper {
    flex: 1;
    position: relative;
  }

  .search-wrapper input {
    width: 100%;
    padding: 0.5rem 0.75rem;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm, 6px);
    font-size: 0.875rem;
    font-family: var(--font-body);
    outline: none;
  }

  .search-wrapper input:focus {
    border-color: var(--color-primary);
  }

  .autocomplete-dropdown {
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    margin-top: 4px;
    background: var(--color-bg);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm, 6px);
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
    z-index: 10;
    max-height: 200px;
    overflow-y: auto;
  }

  .autocomplete-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    width: 100%;
    padding: 0.5rem 0.75rem;
    border: none;
    background: none;
    cursor: pointer;
    text-align: left;
    transition: background 0.1s;
    font-family: var(--font-body);
  }

  .autocomplete-item:hover {
    background: var(--color-bg-secondary, #f3f4f6);
  }

  .ac-avatar {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    background: var(--color-primary);
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.75rem;
    font-weight: 600;
    flex-shrink: 0;
  }

  .ac-info {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }

  .ac-name {
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--color-text);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .ac-email {
    font-size: 0.75rem;
    color: var(--color-text-secondary);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .share-form select {
    padding: 0.5rem 0.5rem;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm, 6px);
    font-size: 0.875rem;
    font-family: var(--font-body);
    background: var(--color-bg);
  }

  .share-btn {
    padding: 0.5rem 1rem;
    background: var(--color-primary);
    color: white;
    border: none;
    border-radius: var(--radius-sm, 6px);
    font-size: 0.875rem;
    font-family: var(--font-body);
    cursor: pointer;
    white-space: nowrap;
  }

  .share-btn:hover {
    opacity: 0.9;
  }

  .msg {
    margin: 0 1.5rem 0.5rem;
    font-size: 0.8125rem;
    padding: 0.375rem 0.75rem;
    border-radius: var(--radius-sm, 6px);
  }

  .msg.error {
    color: var(--color-error);
    background: #fef2f2;
  }

  .msg.success {
    color: #166534;
    background: #f0fdf4;
  }

  .collaborators {
    padding: 0 1.5rem 1.25rem;
  }

  .collaborators h3 {
    font-size: 0.8125rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--color-text-secondary);
    margin-bottom: 0.5rem;
  }

  .loading-text,
  .empty-text {
    font-size: 0.8125rem;
    color: var(--color-text-muted);
    font-style: italic;
  }

  .collaborators ul {
    list-style: none;
    padding: 0;
    margin: 0;
  }

  .collaborators li {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 0;
    border-bottom: 1px solid var(--color-border);
  }

  .collaborators li:last-child {
    border-bottom: none;
  }

  .collab-avatar {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: var(--color-primary);
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.8rem;
    font-weight: 600;
    flex-shrink: 0;
  }

  .collab-info {
    flex: 1;
    min-width: 0;
  }

  .collab-name {
    display: block;
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--color-text);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .collab-email {
    display: block;
    font-size: 0.75rem;
    color: var(--color-text-secondary);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .collab-role {
    font-size: 0.75rem;
    color: var(--color-text-muted);
    text-transform: capitalize;
    flex-shrink: 0;
    background: var(--color-bg-secondary, #f3f4f6);
    padding: 2px 8px;
    border-radius: 999px;
  }

  .remove-btn {
    background: none;
    border: none;
    font-size: 1.125rem;
    color: var(--color-text-muted);
    cursor: pointer;
    padding: 0.125rem 0.25rem;
    line-height: 1;
    flex-shrink: 0;
  }

  .remove-btn:hover {
    color: var(--color-error);
  }
</style>
