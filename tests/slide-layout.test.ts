import { describe, it, expect } from 'vitest'
import {
  getOrderedModules,
  getSlideTitle,
  parseSplitRatio,
  getSlideSections,
  type RenderSlide,
  type RenderModule,
} from '../packages/shared/src/slide-layout'

function mod(overrides: Partial<RenderModule> & { type: string; zone: string; order: number }): RenderModule {
  return { data: {}, ...overrides }
}

describe('parseSplitRatio', () => {
  it('parses valid float string', () => {
    expect(parseSplitRatio('0.6')).toBe(0.6)
  })

  it('returns fallback for null', () => {
    expect(parseSplitRatio(null)).toBe(0.45)
  })

  it('returns fallback for undefined', () => {
    expect(parseSplitRatio(undefined)).toBe(0.45)
  })

  it('returns fallback for non-numeric string', () => {
    expect(parseSplitRatio('abc')).toBe(0.45)
  })

  it('clamps below 0.2 to 0.2', () => {
    expect(parseSplitRatio('0.05')).toBe(0.2)
  })

  it('clamps above 0.8 to 0.8', () => {
    expect(parseSplitRatio('0.95')).toBe(0.8)
  })

  it('uses custom fallback', () => {
    expect(parseSplitRatio(null, 0.5)).toBe(0.5)
  })
})

describe('getSlideTitle', () => {
  it('returns heading text when present', () => {
    const modules: RenderModule[] = [
      mod({ type: 'heading', zone: 'hero', order: 0, data: { text: 'My Title' } }),
      mod({ type: 'text', zone: 'hero', order: 1, data: { markdown: 'body' } }),
    ]
    expect(getSlideTitle(modules, 0)).toBe('My Title')
  })

  it('returns fallback when no heading', () => {
    const modules: RenderModule[] = [
      mod({ type: 'text', zone: 'main', order: 0, data: {} }),
    ]
    expect(getSlideTitle(modules, 0)).toBe('Slide 1')
    expect(getSlideTitle(modules, 4)).toBe('Slide 5')
  })

  it('returns empty string for heading with empty text', () => {
    const modules: RenderModule[] = [
      mod({ type: 'heading', zone: 'hero', order: 0, data: { text: '' } }),
    ]
    // String('') is falsy, returns ''
    expect(getSlideTitle(modules, 0)).toBe('')
  })

  it('returns fallback for empty modules array', () => {
    expect(getSlideTitle([], 2)).toBe('Slide 3')
  })
})

describe('getOrderedModules', () => {
  it('sorts by order ascending', () => {
    const slide: RenderSlide = {
      id: 's1',
      layout: 'layout-content',
      order: 0,
      modules: [
        mod({ type: 'text', zone: 'main', order: 2 }),
        mod({ type: 'heading', zone: 'main', order: 0 }),
        mod({ type: 'card', zone: 'main', order: 1 }),
      ],
    }
    const ordered = getOrderedModules(slide)
    expect(ordered.map((m) => m.type)).toEqual(['heading', 'card', 'text'])
  })

  it('reads from blocks field if modules is absent', () => {
    const slide: RenderSlide = {
      id: 's1',
      layout: 'layout-content',
      order: 0,
      blocks: [
        mod({ type: 'text', zone: 'main', order: 1 }),
        mod({ type: 'heading', zone: 'main', order: 0 }),
      ],
    }
    const ordered = getOrderedModules(slide)
    expect(ordered[0].type).toBe('heading')
  })

  it('returns empty array for slide with no modules or blocks', () => {
    const slide: RenderSlide = { id: 's1', layout: 'layout-content', order: 0 }
    expect(getOrderedModules(slide)).toEqual([])
  })
})

describe('getSlideSections', () => {
  const heroSlide = (layout: string): RenderSlide => ({
    id: 's1',
    layout,
    order: 0,
    modules: [
      mod({ type: 'heading', zone: 'hero', order: 0, data: { text: 'Title' } }),
      mod({ type: 'text', zone: 'hero', order: 1 }),
    ],
  })

  const splitSlide: RenderSlide = {
    id: 's2',
    layout: 'layout-split',
    order: 1,
    splitRatio: '0.6',
    modules: [
      mod({ type: 'heading', zone: 'content', order: 0 }),
      mod({ type: 'text', zone: 'content', order: 1 }),
      mod({ type: 'image', zone: 'stage', order: 0 }),
    ],
  }

  describe('hero layouts', () => {
    for (const layout of ['title-slide', 'layout-divider', 'closing-slide']) {
      it(`${layout} uses hero zone as primary`, () => {
        const sections = getSlideSections(heroSlide(layout))
        expect(sections.primaryWrapperClass).toBe('hero')
        expect(sections.primaryModules.length).toBe(2)
        expect(sections.heroModules.length).toBe(2)
      })
    }
  })

  it('layout-content uses main zone as primary with content wrapper', () => {
    const slide: RenderSlide = {
      id: 's1',
      layout: 'layout-content',
      order: 0,
      modules: [
        mod({ type: 'heading', zone: 'main', order: 0 }),
        mod({ type: 'text', zone: 'main', order: 1 }),
      ],
    }
    const sections = getSlideSections(slide)
    expect(sections.primaryWrapperClass).toBe('content')
    expect(sections.primaryModules.length).toBe(2)
    expect(sections.mainModules.length).toBe(2)
  })

  it('layout-split uses main wrapper and parses splitRatio', () => {
    const sections = getSlideSections(splitSlide)
    expect(sections.primaryWrapperClass).toBe('main')
    expect(sections.splitRatio).toBe(0.6)
    expect(sections.contentModules.length).toBe(2)
    expect(sections.stageModules.length).toBe(1)
  })

  it('filters modules into correct zone buckets', () => {
    const sections = getSlideSections(splitSlide)
    expect(sections.contentModules.every((m) => m.zone === 'content')).toBe(true)
    expect(sections.stageModules.every((m) => m.zone === 'stage')).toBe(true)
  })

  it('falls back to all modules when primary zone is empty', () => {
    const slide: RenderSlide = {
      id: 's1',
      layout: 'title-slide',
      order: 0,
      modules: [
        mod({ type: 'text', zone: 'main', order: 0 }),
      ],
    }
    const sections = getSlideSections(slide)
    // hero zone is empty, so primaryModules falls back to all modules
    expect(sections.heroModules.length).toBe(0)
    expect(sections.primaryModules.length).toBe(1)
  })

  it('defaults to layout-content when layout is missing', () => {
    const slide: RenderSlide = {
      id: 's1',
      layout: '',
      order: 0,
      modules: [mod({ type: 'text', zone: 'main', order: 0 })],
    }
    const sections = getSlideSections(slide)
    // empty layout is falsy → defaults to 'layout-content' → content wrapper
    expect(sections.primaryWrapperClass).toBe('content')
  })
})
