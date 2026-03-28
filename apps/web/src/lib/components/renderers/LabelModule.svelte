<script lang="ts">
  let { data = {}, editable = false, onchange }: {
    data: Record<string, unknown>;
    editable: boolean;
    onchange?: (newData: Record<string, unknown>) => void;
  } = $props()

  let text = $derived(typeof data.text === 'string' ? data.text : '')
  let color = $derived(typeof data.color === 'string' ? data.color : 'cyan')

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

<span
  class="label label-{color}"
  contenteditable={editable}
  oninput={handleInput}
  role={editable ? 'textbox' : undefined}
>{text}</span>

<style>
  .label {
    display: inline-block;
    font-size: clamp(0.6rem, 1vw, 0.8rem);
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    padding: 0.15rem 0.6rem;
    border-radius: 3px;
    outline: none;
    font-family: var(--font-body);
  }
  .label-cyan {
    background: rgba(121, 192, 255, 0.15);
    color: #79c0ff;
  }
  .label-blue {
    background: rgba(59, 115, 230, 0.15);
    color: var(--blue, #3B73E6);
  }
  .label-navy {
    background: rgba(29, 58, 131, 0.15);
    color: var(--navy, #1D3A83);
  }
  .label-red {
    background: rgba(255, 107, 107, 0.15);
    color: #ff6b6b;
  }
  .label-amber {
    background: rgba(255, 217, 61, 0.15);
    color: #d4a017;
  }
  .label-green {
    background: rgba(107, 207, 127, 0.15);
    color: #2d8a4e;
  }
  .label[contenteditable="true"]:focus {
    outline: 1px dashed var(--color-primary);
    outline-offset: 2px;
  }
</style>
