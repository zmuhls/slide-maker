<script lang="ts">
  import FilesTab from './FilesTab.svelte'
  import TemplatesTab from './TemplatesTab.svelte'
  import ArtifactsTab from './ArtifactsTab.svelte'
  import ThemesTab from './ThemesTab.svelte'
  import { activeResourceTab } from '$lib/stores/ui'

  let activeTab = $state<'files' | 'templates' | 'artifacts' | 'themes'>('templates')
  import { currentDeck } from '$lib/stores/deck'
  let deckId = $derived($currentDeck?.id ?? '')

  // Enable horizontal scrolling only when the tab bar actually overflows
  let tabBarEl: HTMLDivElement | null = null
  let overflowing = $state(false)

  function checkOverflow() {
    if (!tabBarEl) return
    overflowing = tabBarEl.scrollWidth > tabBarEl.clientWidth + 1
  }

  $effect(() => {
    const unsub = activeResourceTab.subscribe((v) => { activeTab = v })
    return unsub
  })

  const tabs: { key: 'files' | 'templates' | 'artifacts' | 'themes'; label: string }[] = [
    { key: 'files', label: 'Files' },
    { key: 'templates', label: 'Templates' },
    { key: 'artifacts', label: 'Artifacts' },
    { key: 'themes', label: 'Themes' },
  ]

  function setTab(key: typeof activeTab) {
    activeResourceTab.set(key)
  }

  // Re-check overflow on layout/size changes
  $effect(() => {
    checkOverflow()
    const ro = new ResizeObserver(() => checkOverflow())
    if (tabBarEl) ro.observe(tabBarEl)
    // Also listen for window resize to catch sidebar width changes
    const onResize = () => checkOverflow()
    window.addEventListener('resize', onResize)
    return () => { ro.disconnect(); window.removeEventListener('resize', onResize) }
  })
</script>

<div class="resource-panel">
  <div class="tab-bar" bind:this={tabBarEl} class:overflowing={overflowing} role="tablist" aria-label="Resources">
    {#each tabs as tab}
      <button
        class="tab-btn"
        class:active={activeTab === tab.key}
        role="tab"
        aria-selected={activeTab === tab.key}
        onclick={() => setTab(tab.key)}
      >
        {tab.label}
      </button>
    {/each}
  </div>

  <div class="tab-content">
    {#if activeTab === 'files'}
      <FilesTab {deckId} />
    {:else if activeTab === 'templates'}
      <TemplatesTab />
    {:else if activeTab === 'artifacts'}
      <ArtifactsTab />
    {:else if activeTab === 'themes'}
      <ThemesTab />
    {/if}
  </div>
</div>

<style>
  .resource-panel {
    display: flex;
    flex-direction: column;
    height: 100%;
    overflow: hidden;
  }

  .tab-bar {
    display: flex;
    align-items: flex-end;
    gap: 12px;
    padding: 0 8px;
    border-bottom: 1px solid var(--color-bg-tertiary, #f1f5f9);
    flex-shrink: 0;
    /* Default: no horizontal scrolling shown */
    overflow: visible;
  }
  /* Only enable horizontal scrolling when content overflows */
  .tab-bar.overflowing {
    overflow-x: auto;
    overflow-y: hidden;
    overscroll-behavior-x: contain;
    -webkit-overflow-scrolling: touch;
    scroll-snap-type: x proximity;
    padding-bottom: 4px; /* prevent scrollbar from overlapping text */
  }

  .tab-btn {
    position: relative;
    padding: 8px 10px;
    font-size: 12px;
    font-weight: 500;
    color: var(--color-text-muted, #6b7280);
    background: none;
    border: none;
    /* use an indicator pseudo-element instead of border to prevent bleed */
    cursor: pointer;
    transition: color 0.15s;
    text-align: center;
    white-space: nowrap;
    /* Default (no overflow): distribute evenly */
    flex: 1 1 0;
    min-width: 0;
    scroll-snap-align: start;
  }
  /* When overflowing, tabs size to content and scroll */
  .tab-bar.overflowing .tab-btn {
    flex: 0 0 auto;
    min-width: max-content;
  }

  .tab-btn:hover {
    color: var(--color-text, #1f2937);
  }

  .tab-btn.active { color: var(--color-primary); }
  .tab-btn.active::after {
    content: '';
    position: absolute;
    left: 10px;  /* match horizontal padding so underline fits label width */
    right: 10px;
    bottom: -1px; /* align over bar border */
    height: 2px;
    background: var(--color-primary);
    border-radius: 1px;
    pointer-events: none;
  }

  .tab-content {
    flex: 1;
    overflow-y: auto;
    overflow-x: hidden;
    min-height: 0;
  }
</style>
