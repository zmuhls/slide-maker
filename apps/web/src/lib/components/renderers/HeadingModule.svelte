<script lang="ts">
  let { data = {}, editable = false, onchange }: { data: Record<string, unknown>; editable: boolean; onchange?: (newData: Record<string, unknown>) => void } = $props()

  let level = $derived(typeof data.level === 'number' ? Math.min(Math.max(data.level, 1), 4) : 1)
  let text = $derived(typeof data.text === 'string' ? data.text : '')

  let containerEl: HTMLElement | undefined = $state(undefined)
  let focused = $state(false)

  // Set text content via DOM ref — Svelte must NOT manage contenteditable text
  $effect(() => {
    if (containerEl && !focused) {
      containerEl.textContent = text
    }
  })

  let saveTimer: ReturnType<typeof setTimeout> | undefined

  function handleInput(e: Event) {
    const target = e.target as HTMLElement
    const newText = target.textContent ?? ''
    clearTimeout(saveTimer)
    saveTimer = setTimeout(() => {
      onchange?.({ ...data, text: newText })
    }, 500)
  }
</script>

{#if level === 1}
  <!-- svelte-ignore a11y_missing_content -->
  <h1
    bind:this={containerEl}
    class="heading heading-1"
    contenteditable={editable}
    spellcheck={false}
    onfocus={() => focused = true}
    oninput={handleInput}
    onblur={() => focused = false}
    role={editable ? 'textbox' : undefined}
    aria-label={editable ? 'Heading 1' : undefined}
  ></h1>
{:else if level === 2}
  <!-- svelte-ignore a11y_missing_content -->
  <h2
    bind:this={containerEl}
    class="heading heading-2"
    contenteditable={editable}
    spellcheck={false}
    onfocus={() => focused = true}
    oninput={handleInput}
    onblur={() => focused = false}
    role={editable ? 'textbox' : undefined}
    aria-label={editable ? 'Heading 2' : undefined}
  ></h2>
{:else if level === 3}
  <!-- svelte-ignore a11y_missing_content -->
  <h3
    bind:this={containerEl}
    class="heading heading-3"
    contenteditable={editable}
    spellcheck={false}
    onfocus={() => focused = true}
    oninput={handleInput}
    onblur={() => focused = false}
    role={editable ? 'textbox' : undefined}
    aria-label={editable ? 'Heading 3' : undefined}
  ></h3>
{:else}
  <!-- svelte-ignore a11y_missing_content -->
  <h4
    bind:this={containerEl}
    class="heading heading-4"
    contenteditable={editable}
    spellcheck={false}
    onfocus={() => focused = true}
    oninput={handleInput}
    onblur={() => focused = false}
    role={editable ? 'textbox' : undefined}
    aria-label={editable ? 'Heading 4' : undefined}
  ></h4>
{/if}

<style>
  .heading {
    font-family: var(--font-display);
    line-height: 1.2;
    margin: 0;
    outline: none;
  }
  .heading[contenteditable="true"] {
    padding-inline: 12px;
  }
  .heading-1 {
    font-size: clamp(2rem, 5cqi, 3.5rem);
    font-weight: 800;
    letter-spacing: -0.02em;
  }
  .heading-2 {
    font-size: clamp(1.5rem, 3.5cqi, 2.5rem);
    font-weight: 700;
  }
  .heading-3 {
    font-size: clamp(1.1rem, 2.5cqi, 1.75rem);
    font-weight: 600;
  }
  .heading-4 {
    font-size: clamp(0.95rem, 2cqi, 1.25rem);
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--color-primary);
  }
  .heading[contenteditable="true"]:focus {
    outline: 1px dashed var(--color-primary);
    outline-offset: 2px;
    border-radius: var(--radius-sm);
  }
</style>
