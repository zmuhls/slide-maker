import { currentDeck, addSlideToDeck, removeSlideFromDeck, updateSlideInDeck } from '$lib/stores/deck'
import { get } from 'svelte/store'

export function applyMutation(mutation: Record<string, unknown>): void {
  const deck = get(currentDeck)
  if (!deck) return

  const payload = mutation.payload as Record<string, unknown>

  switch (mutation.action) {
    case 'addSlide': {
      const slideId = crypto.randomUUID()
      const blockDefs = (payload.blocks as { type: string; data: Record<string, unknown> }[]) || []
      const blocks = blockDefs.map((b, i) => ({
        id: crypto.randomUUID(),
        slideId,
        type: b.type,
        data: b.data || {},
        layout: null,
        order: i,
      }))

      const newSlide = {
        id: slideId,
        deckId: deck.id,
        type: (payload.type as string) || 'body',
        order: deck.slides.length,
        notes: null,
        fragments: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        blocks,
      }

      if (payload.insertAfter) {
        const afterIdx = deck.slides.findIndex((s) => s.id === payload.insertAfter)
        if (afterIdx >= 0) {
          newSlide.order = afterIdx + 1
          // Reorder subsequent slides in the store
          currentDeck.update((d) => {
            if (!d) return d
            const updated = [...d.slides]
            // Shift orders of slides after the insertion point
            for (let i = afterIdx + 1; i < updated.length; i++) {
              updated[i] = { ...updated[i], order: updated[i].order + 1 }
            }
            updated.splice(afterIdx + 1, 0, newSlide)
            return { ...d, slides: updated }
          })
          break
        }
      }

      addSlideToDeck(newSlide)
      break
    }

    case 'removeSlide': {
      removeSlideFromDeck(payload.slideId as string)
      break
    }

    case 'updateSlide': {
      const slideId = payload.slideId as string
      updateSlideInDeck(slideId, (s) => ({
        ...s,
        ...(payload.notes !== undefined ? { notes: payload.notes as string | null } : {}),
        ...(payload.fragments !== undefined ? { fragments: payload.fragments as boolean } : {}),
      }))
      break
    }

    case 'addBlock': {
      const slideId = payload.slideId as string
      const blockDef = payload.block as { type: string; data: Record<string, unknown> }
      const newBlock = {
        id: crypto.randomUUID(),
        slideId,
        type: blockDef.type,
        data: blockDef.data || {},
        layout: null,
        order: 0,
      }
      updateSlideInDeck(slideId, (s) => {
        newBlock.order = s.blocks.length
        return { ...s, blocks: [...s.blocks, newBlock] }
      })
      break
    }

    case 'removeBlock': {
      const slideId = payload.slideId as string
      const blockId = payload.blockId as string
      updateSlideInDeck(slideId, (s) => ({
        ...s,
        blocks: s.blocks.filter((b) => b.id !== blockId),
      }))
      break
    }

    case 'updateBlock': {
      const slideId = payload.slideId as string
      const blockId = payload.blockId as string
      const newData = payload.data as Record<string, unknown>
      updateSlideInDeck(slideId, (s) => ({
        ...s,
        blocks: s.blocks.map((b) =>
          b.id === blockId ? { ...b, data: { ...b.data, ...newData } } : b,
        ),
      }))
      break
    }

    case 'setTheme': {
      const themeId = payload.themeId as string
      currentDeck.update((d) => (d ? { ...d, themeId } : d))
      break
    }

    case 'updateDeckMeta': {
      currentDeck.update((d) => {
        if (!d) return d
        return {
          ...d,
          ...(payload.name !== undefined ? { name: payload.name as string } : {}),
        }
      })
      break
    }

    case 'reorderSlides': {
      const order = payload.order as string[]
      currentDeck.update((d) => {
        if (!d) return d
        const slideMap = new Map(d.slides.map((s) => [s.id, s]))
        const reordered = order
          .map((id, idx) => {
            const slide = slideMap.get(id)
            return slide ? { ...slide, order: idx } : null
          })
          .filter(Boolean) as typeof d.slides
        return { ...d, slides: reordered }
      })
      break
    }

    default:
      console.warn('Unhandled mutation action:', mutation.action)
  }
}

/** Extract mutation blocks from assistant text (```mutation fences) */
export function extractMutations(text: string): Record<string, unknown>[] {
  const mutations: Record<string, unknown>[] = []
  const regex = /```mutation\s*\n([\s\S]*?)```/g
  let match
  while ((match = regex.exec(text)) !== null) {
    try {
      mutations.push(JSON.parse(match[1].trim()))
    } catch {
      /* skip malformed mutation JSON */
    }
  }
  return mutations
}
