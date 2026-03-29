<script lang="ts">
  type PresenceUser = {
    userId: string
    userName: string
    activeSlideId: string | null
    slideNumber?: number
  }

  let { otherUsers = [] }: { otherUsers: PresenceUser[] } = $props()
</script>

{#if otherUsers.length > 0}
  <div class="presence-bar">
    <span class="presence-label">Also here:</span>
    {#each otherUsers as user (user.userId)}
      <span
        class="presence-badge"
        title="{user.userName}{user.slideNumber ? ` is on Slide ${user.slideNumber}` : ''}"
      >
        {user.userName.charAt(0).toUpperCase()}
      </span>
    {/each}
  </div>
{/if}

<style>
  .presence-bar {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 4px 12px;
    background: var(--color-bg-tertiary, #f8fafc);
    border-bottom: 1px solid var(--color-border);
    font-family: var(--font-body);
    flex-shrink: 0;
  }
  .presence-label {
    font-size: 0.75rem;
    color: var(--color-text-muted);
    margin-right: 2px;
  }
  .presence-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 26px;
    height: 26px;
    border-radius: 50%;
    background: var(--color-primary, #3b82f6);
    color: white;
    font-size: 0.75rem;
    font-weight: 600;
    cursor: default;
    flex-shrink: 0;
  }
</style>
