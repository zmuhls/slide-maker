<script lang="ts">
  import { base } from '$app/paths';
  import { onMount, onDestroy } from 'svelte';
  import { page } from '$app/stores';
  import { api, API_URL } from '$lib/api';
  import { currentDeck } from '$lib/stores/deck';
  import { activeSlideId } from '$lib/stores/ui';
  import { chatMessages } from '$lib/stores/chat';
  import { undo, redo } from '$lib/utils/mutations';
  import EditorShell from '$lib/components/editor/EditorShell.svelte';

  let loading = $state(true);
  let error = $state('');
  let lockedByName = $state('');
  let heartbeatInterval: ReturnType<typeof setInterval> | undefined;
  let deckId = '';

  async function releaseLockQuietly() {
    try {
      await api.releaseLock(deckId);
    } catch {
      // best effort
    }
  }

  function handleKeyboard(e: KeyboardEvent) {
    const isMac = navigator.platform.includes('Mac')
    const mod = isMac ? e.metaKey : e.ctrlKey
    if (mod && e.key === 'z' && !e.shiftKey) {
      e.preventDefault()
      undo()
    } else if (mod && e.key === 'z' && e.shiftKey) {
      e.preventDefault()
      redo()
    } else if (mod && e.key === 'y') {
      e.preventDefault()
      redo()
    }
  }

  function handleBeforeUnload() {
    if (deckId) {
      // Use sendBeacon for reliable unload
      const url = `${API_URL}/api/decks/${deckId}/lock`;
      navigator.sendBeacon?.(url); // sendBeacon only does POST, so we also try fetch
      fetch(url, { method: 'DELETE', credentials: 'include', keepalive: true }).catch(() => {});
    }
  }

  onMount(async () => {
    deckId = $page.params.id ?? '';
    try {
      const res = await api.getDeck(deckId);
      currentDeck.set(res.deck ?? res);
      const deck = res.deck ?? res;
      if (deck.slides?.length > 0) {
        // Restore last active slide from sessionStorage on refresh
        const savedSlideId = sessionStorage.getItem(`deck-active-slide-${deckId}`);
        const validSaved = savedSlideId && deck.slides.some((s: any) => s.id === savedSlideId);
        activeSlideId.set(validSaved ? savedSlideId : deck.slides[0].id);
      }

      // Load chat history
      try {
        const historyRes = await api.getChatHistory(deckId);
        if (historyRes?.messages?.length) {
          chatMessages.set(historyRes.messages.map((m: any, i: number) => ({
            id: `hist-${i}`,
            role: m.role,
            content: m.content,
            streaming: false,
          })));
        }
      } catch {
        // Non-critical — chat works without history
      }

      // Try to acquire lock — show warning instead of blocking
      try {
        const lockRes = await api.acquireLock(deckId);
        if (!lockRes.locked) {
          // Someone else is editing — show a warning but allow editing
          lockedByName = lockRes.lockedBy?.name ?? 'another user';
        }
        // Start heartbeat every 2 minutes regardless
        heartbeatInterval = setInterval(() => {
          api.refreshLock(deckId).catch(() => {});
        }, 2 * 60 * 1000);
      } catch {
        // If lock endpoint fails entirely, allow editing (graceful degradation)
      }

      window.addEventListener('beforeunload', handleBeforeUnload);
      window.addEventListener('keydown', handleKeyboard);

      // Persist active slide to sessionStorage so refresh restores it
      activeSlideId.subscribe((id) => {
        if (id && deckId) sessionStorage.setItem(`deck-active-slide-${deckId}`, id);
      });
    } catch (err: any) {
      error = err.message || 'Failed to load deck';
    } finally {
      loading = false;
    }
  });

  onDestroy(() => {
    if (heartbeatInterval) {
      clearInterval(heartbeatInterval);
    }
    chatMessages.set([]);
    window.removeEventListener('beforeunload', handleBeforeUnload);
    window.removeEventListener('keydown', handleKeyboard);
    if (deckId) {
      releaseLockQuietly();
    }
  });
</script>

<svelte:head>
  <title>Editor - CUNY AI Lab Slide Wiz</title>
</svelte:head>

{#if loading}
  <div class="loading">
    <p>Loading deck...</p>
  </div>
{:else if error}
  <div class="error">
    <p>{error}</p>
    <a href="{base}/">Back to decks</a>
  </div>
{:else}
  {#if lockedByName}
    <div class="lock-banner">
      {lockedByName} is also editing this deck
    </div>
  {/if}
  <EditorShell editable={true} />
{/if}

<style>
  .loading {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--color-text-muted);
    font-size: 0.9375rem;
  }

  .error {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 1rem;
    color: var(--color-error);
    font-size: 0.9375rem;
  }

  .error a {
    color: var(--color-primary);
    text-decoration: none;
    font-size: 0.875rem;
  }

  .error a:hover {
    text-decoration: underline;
  }

  .lock-banner {
    position: sticky;
    top: 0;
    z-index: 100;
    background: #fef3cd;
    color: #856404;
    text-align: center;
    padding: 0.5rem 1rem;
    font-size: 0.875rem;
    font-family: var(--font-body);
    border-bottom: 1px solid #ffc107;
  }
</style>
