import { writable, derived } from 'svelte/store'

// Use inline types to avoid import issues with @slide-maker/shared in Svelte
interface ContentBlock {
  id: string
  slideId: string
  type: string
  zone: string
  data: Record<string, unknown>
  order: number
  stepOrder: number | null
}

interface SlideWithBlocks {
  id: string
  deckId: string
  layout: string
  splitRatio: string
  order: number
  notes: string | null
  createdAt: number
  updatedAt: number
  blocks: ContentBlock[]
}

interface DeckWithSlides {
  id: string
  name: string
  slug: string
  themeId: string | null
  metadata: Record<string, unknown>
  createdBy: string
  createdAt: number
  updatedAt: number
  slides: SlideWithBlocks[]
}

export const currentDeck = writable<DeckWithSlides | null>(null)
export const slideCount = derived(currentDeck, ($deck) => $deck?.slides.length ?? 0)

export function updateSlideInDeck(slideId: string, updater: (slide: SlideWithBlocks) => SlideWithBlocks) {
  currentDeck.update((deck) => {
    if (!deck) return deck
    return { ...deck, slides: deck.slides.map((s) => (s.id === slideId ? updater(s) : s)) }
  })
}

export function addSlideToDeck(slide: SlideWithBlocks) {
  currentDeck.update((deck) => {
    if (!deck) return deck
    return { ...deck, slides: [...deck.slides, slide] }
  })
}

export function removeSlideFromDeck(slideId: string) {
  currentDeck.update((deck) => {
    if (!deck) return deck
    return { ...deck, slides: deck.slides.filter((s) => s.id !== slideId) }
  })
}
