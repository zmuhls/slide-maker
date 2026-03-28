<script lang="ts">
  import { chatStreaming } from '$lib/stores/chat'

  interface Props {
    onsend: (text: string) => void
  }

  let { onsend }: Props = $props()
  let text = $state('')

  function handleSubmit() {
    const trimmed = text.trim()
    if (!trimmed || $chatStreaming) return
    onsend(trimmed)
    text = ''
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }
</script>

<div class="chat-input">
  <textarea
    bind:value={text}
    placeholder="Ask the AI to create or edit slides..."
    onkeydown={handleKeydown}
    disabled={$chatStreaming}
    rows={2}
  ></textarea>
  <button onclick={handleSubmit} disabled={$chatStreaming || !text.trim()}>
    {#if $chatStreaming}
      <span class="spinner"></span>
    {:else}
      Send
    {/if}
  </button>
</div>

<style>
  .chat-input {
    display: flex;
    gap: 6px;
    padding: 8px;
    border-top: 1px solid var(--color-border);
    background: var(--color-bg);
  }

  textarea {
    flex: 1;
    resize: none;
    padding: 6px 8px;
    font-size: 13px;
    font-family: inherit;
    border: 1px solid var(--color-border);
    border-radius: 4px;
    background: var(--color-bg);
    color: var(--color-text);
    outline: none;
    line-height: 1.4;
  }

  textarea:focus {
    border-color: var(--color-primary);
  }

  textarea:disabled {
    opacity: 0.5;
  }

  button {
    padding: 6px 14px;
    font-size: 13px;
    font-weight: 500;
    border: none;
    border-radius: 4px;
    background: var(--color-primary, #2563eb);
    color: white;
    cursor: pointer;
    align-self: flex-end;
    min-width: 56px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  button:hover:not(:disabled) {
    opacity: 0.9;
  }

  button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .spinner {
    display: inline-block;
    width: 14px;
    height: 14px;
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-top-color: white;
    border-radius: 50%;
    animation: spin 0.6s linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
</style>
