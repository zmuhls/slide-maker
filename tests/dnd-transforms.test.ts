import { describe, it, expect } from 'vitest'
import {
  reorderBlocksInZone,
  moveBlockBetweenZones,
  reorderSlides,
  type Block,
  type Slide,
} from '../packages/shared/src/dnd-transforms'

function block(id: string, zone: string, order: number): Block {
  return { id, zone, order, type: 'text', data: {} }
}

function slide(id: string, blocks: Block[]): Slide {
  return { id, blocks, layout: 'layout-split' }
}

describe('reorderBlocksInZone', () => {
  it('reorders blocks within a zone', () => {
    const s = slide('s1', [
      block('a', 'content', 0),
      block('b', 'content', 1),
      block('c', 'content', 2),
    ])
    const result = reorderBlocksInZone(s, 'content', ['c', 'a', 'b'])
    const content = result.blocks
      .filter((b) => b.zone === 'content')
      .sort((a, b) => a.order - b.order)
    expect(content.map((b) => b.id)).toEqual(['c', 'a', 'b'])
    expect(content.map((b) => b.order)).toEqual([0, 1, 2])
  })

  it('leaves other zones untouched', () => {
    const s = slide('s1', [
      block('a', 'content', 0),
      block('b', 'stage', 0),
      block('c', 'content', 1),
    ])
    const result = reorderBlocksInZone(s, 'content', ['c', 'a'])
    const stage = result.blocks.filter((b) => b.zone === 'stage')
    expect(stage).toHaveLength(1)
    expect(stage[0].id).toBe('b')
    expect(stage[0].order).toBe(0)
  })

  it('handles single-block zone', () => {
    const s = slide('s1', [block('a', 'main', 0)])
    const result = reorderBlocksInZone(s, 'main', ['a'])
    expect(result.blocks).toHaveLength(1)
    expect(result.blocks[0].order).toBe(0)
  })

  it('handles empty order array', () => {
    const s = slide('s1', [block('a', 'content', 0)])
    const result = reorderBlocksInZone(s, 'content', [])
    const content = result.blocks.filter((b) => b.zone === 'content')
    expect(content).toHaveLength(0)
  })

  it('ignores unknown IDs in order array', () => {
    const s = slide('s1', [
      block('a', 'content', 0),
      block('b', 'content', 1),
    ])
    const result = reorderBlocksInZone(s, 'content', ['b', 'nonexistent', 'a'])
    const content = result.blocks
      .filter((b) => b.zone === 'content')
      .sort((a, b) => a.order - b.order)
    expect(content.map((b) => b.id)).toEqual(['b', 'a'])
    expect(content.map((b) => b.order)).toEqual([0, 1])
  })
})

describe('moveBlockBetweenZones', () => {
  it('moves a block from content to stage', () => {
    const s = slide('s1', [
      block('a', 'content', 0),
      block('b', 'content', 1),
      block('c', 'stage', 0),
    ])
    const result = moveBlockBetweenZones(s, 'b', 'content', 'stage', ['b', 'c'])
    const stage = result.blocks
      .filter((b) => b.zone === 'stage')
      .sort((a, b) => a.order - b.order)
    expect(stage.map((b) => b.id)).toEqual(['b', 'c'])
    expect(stage.map((b) => b.order)).toEqual([0, 1])
  })

  it('reindexes source zone after removal', () => {
    const s = slide('s1', [
      block('a', 'content', 0),
      block('b', 'content', 1),
      block('c', 'content', 2),
      block('d', 'stage', 0),
    ])
    const result = moveBlockBetweenZones(s, 'b', 'content', 'stage', ['b', 'd'])
    const content = result.blocks
      .filter((b) => b.zone === 'content')
      .sort((a, b) => a.order - b.order)
    expect(content.map((b) => b.id)).toEqual(['a', 'c'])
    expect(content.map((b) => b.order)).toEqual([0, 1])
  })

  it('handles move into empty zone', () => {
    const s = slide('s1', [
      block('a', 'content', 0),
      block('b', 'content', 1),
    ])
    const result = moveBlockBetweenZones(s, 'a', 'content', 'stage', ['a'])
    const stage = result.blocks.filter((b) => b.zone === 'stage')
    expect(stage).toHaveLength(1)
    expect(stage[0].id).toBe('a')
    expect(stage[0].order).toBe(0)

    const content = result.blocks.filter((b) => b.zone === 'content')
    expect(content).toHaveLength(1)
    expect(content[0].id).toBe('b')
    expect(content[0].order).toBe(0)
  })

  it('handles move that empties source zone', () => {
    const s = slide('s1', [
      block('a', 'content', 0),
      block('b', 'stage', 0),
    ])
    const result = moveBlockBetweenZones(s, 'a', 'content', 'stage', ['a', 'b'])
    const content = result.blocks.filter((b) => b.zone === 'content')
    expect(content).toHaveLength(0)
    const stage = result.blocks
      .filter((b) => b.zone === 'stage')
      .sort((a, b) => a.order - b.order)
    expect(stage.map((b) => b.id)).toEqual(['a', 'b'])
  })

  it('preserves other zone data', () => {
    const s = slide('s1', [
      block('a', 'content', 0),
      block('b', 'stage', 0),
      block('c', 'hero', 0),
    ])
    const result = moveBlockBetweenZones(s, 'a', 'content', 'stage', ['a', 'b'])
    const hero = result.blocks.filter((b) => b.zone === 'hero')
    expect(hero).toHaveLength(1)
    expect(hero[0].id).toBe('c')
  })

  it('places moved block at specified position in dest order', () => {
    const s = slide('s1', [
      block('a', 'content', 0),
      block('b', 'stage', 0),
      block('c', 'stage', 1),
    ])
    // Insert 'a' between 'b' and 'c'
    const result = moveBlockBetweenZones(s, 'a', 'content', 'stage', ['b', 'a', 'c'])
    const stage = result.blocks
      .filter((b) => b.zone === 'stage')
      .sort((a, b) => a.order - b.order)
    expect(stage.map((b) => b.id)).toEqual(['b', 'a', 'c'])
    expect(stage.map((b) => b.order)).toEqual([0, 1, 2])
  })
})

describe('reorderSlides', () => {
  it('reorders slides by ID', () => {
    const slides = [
      { id: 's1', order: 0 },
      { id: 's2', order: 1 },
      { id: 's3', order: 2 },
    ]
    const result = reorderSlides(slides, ['s3', 's1', 's2'])
    expect(result.map((s) => s.id)).toEqual(['s3', 's1', 's2'])
    expect(result.map((s) => s.order)).toEqual([0, 1, 2])
  })

  it('drops unknown IDs', () => {
    const slides = [
      { id: 's1', order: 0 },
      { id: 's2', order: 1 },
    ]
    const result = reorderSlides(slides, ['s2', 'missing', 's1'])
    expect(result.map((s) => s.id)).toEqual(['s2', 's1'])
    // unknown IDs filtered, then contiguous reindex
    expect(result.map((s) => s.order)).toEqual([0, 1])
  })

  it('handles single slide', () => {
    const slides = [{ id: 's1', order: 0 }]
    const result = reorderSlides(slides, ['s1'])
    expect(result).toHaveLength(1)
    expect(result[0].order).toBe(0)
  })

  it('preserves extra properties on slides', () => {
    const slides = [
      { id: 's1', order: 0, layout: 'title-slide' },
      { id: 's2', order: 1, layout: 'layout-split' },
    ]
    const result = reorderSlides(slides, ['s2', 's1'])
    expect(result[0].layout).toBe('layout-split')
    expect(result[1].layout).toBe('title-slide')
  })
})
