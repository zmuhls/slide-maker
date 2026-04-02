<script lang="ts">
  import DOMPurify from 'dompurify'
  import type { ChatMsg } from '$lib/stores/chat'
  import type { PendingMutation } from '$lib/stores/pending-mutations'
  import MutationCard from './MutationCard.svelte'

  interface Props {
    message: ChatMsg
    onsuggest?: (text: string) => void
    mutations?: PendingMutation[]
    onaccept?: (id: string) => void
    onreject?: (id: string) => void
    isLatestAssistant?: boolean
  }

  let { message, onsuggest, mutations = [], onaccept, onreject, isLatestAssistant = false }: Props = $props()

  const isUser = $derived(message.role === 'user')

  // Extract suggestions from assistant messages (only after streaming completes)
  const suggestions = $derived.by(() => {
    if (isUser || message.streaming) return []
    const matches = [...(message.content || '').matchAll(/\[suggest:\s*([^\]]+)\]/g)]
    return matches.map((m) => m[1].trim())
  })

  /** Markdown-like rendering for chat messages */
  function renderContent(text: string): string {
    // Strip mutation blocks — applied to canvas, not shown in chat
    let cleaned = text.replace(/```mutation\s*\n[\s\S]*?```/g, '')
    // Strip suggestion tags — rendered as interactive chips below
    cleaned = cleaned.replace(/\[suggest:\s*[^\]]+\]/g, '').trim()

    // Strip large HTML/artifact source blocks (>500 chars) — replace with compact indicator
    cleaned = cleaned.replace(/```(?:html?|xml)?\s*\n([\s\S]{500,}?)```/g, (_m, code) => {
      const lines = code.trim().split('\n').length
      return `\`[embedded HTML — ${lines} lines]\``
    })

    // Collapse multiple blank lines
    cleaned = cleaned.replace(/\n{3,}/g, '\n\n')

    // Escape HTML
    let html = cleaned
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')

    // Fenced code blocks (``` ... ```)
    html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_match, lang, code) => {
      const langLabel = lang ? `<span class="code-lang">${lang}</span>` : ''
      return `<div class="code-block">${langLabel}<pre><code>${code.trim()}</code></pre></div>`
    })

    // Inline code
    html = html.replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>')

    // Headings (## text) — only at line start
    html = html.replace(/^(#{1,4})\s+(.+)$/gm, (_m, hashes, text) => {
      const level = hashes.length
      return `<strong class="md-h${level}">${text}</strong>`
    })

    // Bold + italic
    html = html.replace(/\*\*\*([^*]+)\*\*\*/g, '<strong><em>$1</em></strong>')
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    html = html.replace(/(?<!\w)\*([^*]+)\*(?!\w)/g, '<em>$1</em>')
    html = html.replace(/__([^_]+)__/g, '<strong>$1</strong>')
    html = html.replace(/(?<!\w)_([^_]+)_(?!\w)/g, '<em>$1</em>')

    // Links [text](url)
    html = html.replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g,
      '<a href="$2" target="_blank" rel="noopener" class="md-link">$1</a>')

    // Unordered lists (- item)
    html = html.replace(/^- (.+)$/gm, '<span class="md-li">• $1</span>')

    // Ordered lists (1. item)
    html = html.replace(/^\d+\.\s+(.+)$/gm, '<span class="md-li md-ol">$1</span>')

    // Horizontal rule
    html = html.replace(/^---+$/gm, '<hr class="md-hr">')

    // Newlines
    html = html.replace(/\n/g, '<br>')

    return html
  }
</script>

<div class="chat-message" class:user={isUser} class:assistant={!isUser}>
  <div class="message-role">{isUser ? 'You' : 'Wiz'}</div>
  <div class="message-content">
    {#if message.content}
      {@html DOMPurify.sanitize(renderContent(message.content))}
    {/if}
    {#if message.streaming}
      <span class="cursor-blink"></span>
    {/if}
  </div>
  {#if mutations.length > 0 && !isUser}
    <div class="mutation-cards">
      {#each mutations as pm (pm.id)}
        <MutationCard mutation={pm} onaccept={(id) => onaccept?.(id)} onreject={(id) => onreject?.(id)} />
      {/each}
    </div>
  {/if}
  {#if suggestions.length > 0 && isLatestAssistant}
    <div class="suggestion-chips">
      {#each suggestions as s}
        <button class="chip" onclick={() => onsuggest?.(s)}>{s}</button>
      {/each}
    </div>
  {/if}
</div>

<style>
  .chat-message {
    padding: 8px 12px;
    margin: 2px 10px;
    border-radius: var(--radius-sm);
    font-size: 13px;
    line-height: 1.55;
    max-width: 90%;
  }

  .chat-message.user {
    align-self: flex-end;
    background: var(--color-ghost-bg, rgba(59, 115, 230, 0.08));
    color: var(--color-text);
    margin-left: auto;
  }

  .chat-message.assistant {
    align-self: flex-start;
    background: transparent;
    color: var(--color-text);
    margin-right: auto;
    border-left: 2px solid var(--color-border);
  }

  .message-role {
    font-size: 10px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 2px;
    color: var(--color-text-muted);
  }

  .message-content {
    word-wrap: break-word;
    overflow-wrap: break-word;
  }

  .message-content :global(.code-block) {
    margin: 6px 0;
    background: var(--color-bg-tertiary, #1e1e1e);
    border-radius: 4px;
    overflow-x: auto;
    position: relative;
    max-height: 200px;
  }

  .message-content :global(.code-block pre) {
    margin: 0;
    padding: 8px 10px;
    font-size: 12px;
    font-family: 'SF Mono', 'Fira Code', monospace;
    line-height: 1.4;
  }

  .message-content :global(.code-block code) {
    color: var(--color-text);
  }

  .message-content :global(.code-lang) {
    position: absolute;
    top: 4px;
    right: 6px;
    font-size: 10px;
    opacity: 0.5;
  }

  .message-content :global(.inline-code) {
    background: var(--color-bg-tertiary, #e8e8e8);
    padding: 1px 4px;
    border-radius: 3px;
    font-size: 12px;
    font-family: 'SF Mono', 'Fira Code', monospace;
  }

  .message-content :global(.md-h1) { font-size: 16px; display: block; margin: 4px 0; }
  .message-content :global(.md-h2) { font-size: 14px; display: block; margin: 4px 0; }
  .message-content :global(.md-h3) { font-size: 13px; display: block; margin: 3px 0; }
  .message-content :global(.md-h4) { font-size: 13px; display: block; margin: 2px 0; }

  .message-content :global(.md-li) {
    display: block;
    padding-left: 12px;
    text-indent: -8px;
    margin: 1px 0;
  }

  .message-content :global(.md-ol) {
    counter-increment: md-ol;
    text-indent: 0;
    padding-left: 16px;
  }
  .message-content :global(.md-ol::before) {
    content: counter(md-ol) ". ";
    color: var(--color-text-muted);
    font-size: 12px;
  }

  .message-content :global(.md-link) {
    color: var(--color-primary, #3B73E6);
    text-decoration: none;
  }
  .message-content :global(.md-link:hover) { text-decoration: underline; }

  .message-content :global(.md-hr) {
    border: none;
    border-top: 1px solid var(--color-border, #e5e7eb);
    margin: 6px 0;
  }

  .mutation-cards {
    margin-top: 6px;
  }

  .suggestion-chips {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-top: 8px;
  }

  .chip {
    padding: 4px 10px;
    font-size: 11px;
    border: 1px solid var(--color-border, #e5e7eb);
    border-radius: var(--radius-sm, 6px);
    background: transparent;
    color: var(--color-primary, #3B73E6);
    cursor: pointer;
    transition: background 0.15s, border-color 0.15s;
  }

  .chip:hover {
    background: var(--color-ghost-bg, rgba(59, 115, 230, 0.08));
    border-color: var(--color-primary, #3B73E6);
  }

  .cursor-blink {
    display: inline-block;
    width: 2px;
    height: 13px;
    background: var(--color-primary, #2563eb);
    margin-left: 2px;
    vertical-align: text-bottom;
    animation: blink 1s step-end infinite;
  }

  @keyframes blink {
    50% {
      opacity: 0;
    }
  }
</style>
