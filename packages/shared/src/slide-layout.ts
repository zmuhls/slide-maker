export interface RenderModule {
  id?: string
  type: string
  zone: string
  data: Record<string, unknown>
  order: number
  stepOrder?: number | null
}

export interface RenderSlide {
  id: string
  layout: string
  order: number
  splitRatio?: string
  modules?: RenderModule[]
  blocks?: RenderModule[]
}

export interface SlideSections {
  layout: string
  modules: RenderModule[]
  heroModules: RenderModule[]
  contentModules: RenderModule[]
  stageModules: RenderModule[]
  mainModules: RenderModule[]
  primaryModules: RenderModule[]
  primaryWrapperClass: 'hero' | 'content' | 'main'
  splitRatio: number
}

export function getOrderedModules(slide: RenderSlide): RenderModule[] {
  const modules = slide.modules || slide.blocks || []
  return [...modules].sort((a, b) => a.order - b.order)
}

export function getSlideTitle(modules: RenderModule[], index: number): string {
  const title = modules.find((module) => module.type === 'heading')
  return title?.data.text ? String(title.data.text) : `Slide ${index + 1}`
}

export function parseSplitRatio(value: string | undefined | null, fallback: number = 0.45): number {
  const parsed = Number.parseFloat(String(value ?? ''))
  if (!Number.isFinite(parsed)) return fallback
  return Math.min(Math.max(parsed, 0.2), 0.8)
}

export function getSlideSections(slide: RenderSlide): SlideSections {
  const modules = getOrderedModules(slide)
  const layout = slide.layout || 'layout-content'

  const heroModules = modules.filter((module) => module.zone === 'hero')
  const contentModules = modules.filter((module) => module.zone === 'content')
  const stageModules = modules.filter((module) => module.zone === 'stage')
  const mainModules = modules.filter((module) => module.zone === 'main')

  if (layout === 'title-slide' || layout === 'layout-divider' || layout === 'closing-slide') {
    // Render ALL modules regardless of zone — matches canvas behavior where
    // single-zone layouts show every module to prevent data loss from
    // mismatched zones (e.g. an image with zone='main' on a divider).
    return {
      layout,
      modules,
      heroModules,
      contentModules,
      stageModules,
      mainModules,
      primaryModules: modules,
      primaryWrapperClass: 'hero',
      splitRatio: parseSplitRatio(slide.splitRatio),
    }
  }

  if (layout === 'layout-content') {
    return {
      layout,
      modules,
      heroModules,
      contentModules,
      stageModules,
      mainModules,
      primaryModules: mainModules.length > 0 ? mainModules : modules,
      primaryWrapperClass: 'content',
      splitRatio: parseSplitRatio(slide.splitRatio),
    }
  }

  return {
    layout,
    modules,
    heroModules,
    contentModules,
    stageModules,
    mainModules,
    primaryModules: mainModules.length > 0 ? mainModules : modules,
    primaryWrapperClass: 'main',
    splitRatio: parseSplitRatio(slide.splitRatio),
  }
}
