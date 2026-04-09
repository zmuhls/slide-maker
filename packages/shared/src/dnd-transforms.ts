/**
 * Pure transform functions for DnD reordering operations.
 * Extracted from the Svelte store update lambdas in mutations.ts
 * so they can be unit-tested without store/API dependencies.
 */

export type Block = {
  id: string
  zone: string
  order: number
  [key: string]: unknown
}

export type Slide = {
  id: string
  blocks: Block[]
  [key: string]: unknown
}

/**
 * Reorder blocks within a single zone of a slide.
 * Blocks in other zones are left untouched.
 */
export function reorderBlocksInZone(slide: Slide, zone: string, order: string[]): Slide {
  const idToBlock = new Map(slide.blocks.map((b) => [b.id, b]))
  const reorderedZone = order
    .map((id) => idToBlock.get(id))
    .filter((b): b is Block => b != null && b.zone === zone)
    .map((b, i) => ({ ...b, order: i, zone }))
  const others = slide.blocks.filter((b) => b.zone !== zone)
  return { ...slide, blocks: [...others, ...reorderedZone] }
}

/**
 * Move a block from one zone to another, reindexing both zones.
 * `destOrder` is the desired ID order in the destination zone (including the moved block).
 */
export function moveBlockBetweenZones(
  slide: Slide,
  blockId: string,
  fromZone: string,
  toZone: string,
  destOrder: string[]
): Slide {
  // Update the moved block's zone
  const updatedBlocks = slide.blocks.map((b) =>
    b.id === blockId ? { ...b, zone: toZone } : b
  )
  // Reorder destination zone per the provided order
  const idToBlock = new Map(updatedBlocks.map((b) => [b.id, b]))
  const reorderedDest = destOrder
    .map((id) => idToBlock.get(id))
    .filter((b): b is Block => b != null)
    .map((b, i) => ({ ...b, order: i, zone: toZone }))
  // Reorder source zone (block removed, reindex)
  const sourceBlocks = updatedBlocks
    .filter((b) => b.zone === fromZone && b.id !== blockId)
    .sort((a, b) => a.order - b.order)
    .map((b, i) => ({ ...b, order: i }))
  // Keep other zones untouched
  const others = updatedBlocks.filter(
    (b) => b.zone !== toZone && b.zone !== fromZone
  )
  return { ...slide, blocks: [...others, ...sourceBlocks, ...reorderedDest] }
}

/**
 * Reorder slides in a deck by ID order.
 */
export function reorderSlides<S extends { id: string; order: number }>(
  slides: S[],
  order: string[]
): S[] {
  const slideMap = new Map(slides.map((s) => [s.id, s]))
  return order
    .map((id) => slideMap.get(id))
    .filter((s): s is S => s != null)
    .map((s, i) => ({ ...s, order: i }))
}
