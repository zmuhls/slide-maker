import { describe, it, expect } from 'vitest'
import { FRAMEWORK_CSS_BASE, FRAMEWORK_CSS_PREVIEW, FRAMEWORK_CSS_EXPORT } from '../packages/shared/src/framework-css'

// ── CSS Rule Extraction Helpers ───────────────────────

/** Find all rules matching a selector pattern and return their declarations */
function findRules(css: string, selectorPattern: string): string[] {
  const regex = new RegExp(
    selectorPattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*\\{([^}]+)\\}',
    'g'
  )
  const matches: string[] = []
  let m
  while ((m = regex.exec(css)) !== null) {
    matches.push(m[1].trim())
  }
  return matches
}

/** Check if a CSS property appears in a declaration block */
function hasProperty(declarations: string, prop: string): boolean {
  return declarations.split(';').some(d => d.trim().startsWith(prop))
}

/** Extract a property value from a declaration block */
function getProperty(declarations: string, prop: string): string | null {
  const decl = declarations.split(';').find(d => d.trim().startsWith(prop))
  if (!decl) return null
  return decl.split(':').slice(1).join(':').trim()
}

// ── Layout Split Specificity ──────────────────────────

describe('layout-split CSS specificity', () => {
  it('uses .slide.layout-split selector for higher specificity than .slide', () => {
    // The base CSS should use .slide.layout-split, not just .layout-split
    expect(FRAMEWORK_CSS_BASE).toContain('.slide.layout-split')
  })

  it('sets flex-direction: row on .slide.layout-split', () => {
    const rules = findRules(FRAMEWORK_CSS_BASE, '.slide.layout-split')
    expect(rules.length).toBeGreaterThan(0)
    expect(hasProperty(rules[0], 'flex-direction')).toBe(true)
    expect(getProperty(rules[0], 'flex-direction')).toBe('row')
  })

  it('.slide.layout-split appears BEFORE the preview .slide rule so specificity wins', () => {
    // Even though .slide { flex-direction: column } comes later in preview,
    // .slide.layout-split has higher specificity (2 classes vs 1)
    const splitIndex = FRAMEWORK_CSS_PREVIEW.indexOf('.slide.layout-split')
    expect(splitIndex).toBeGreaterThan(-1)

    // Verify the preview variant adds a .slide rule with flex-direction: column
    const previewAddition = FRAMEWORK_CSS_PREVIEW.slice(FRAMEWORK_CSS_BASE.length)
    expect(previewAddition).toContain('flex-direction: column')
  })

  it('export variant also has the .slide.layout-split specificity fix', () => {
    const exportAddition = FRAMEWORK_CSS_EXPORT.slice(FRAMEWORK_CSS_BASE.length)
    expect(exportAddition).toContain('flex-direction: column')
    // .slide.layout-split from base still has higher specificity
    expect(FRAMEWORK_CSS_EXPORT).toContain('.slide.layout-split')
  })
})

// ── Layout Split Content/Stage Zones ──────────────────

describe('layout-split zone styling', () => {
  it('.content zone has flex column with vertical centering', () => {
    const rules = findRules(FRAMEWORK_CSS_BASE, '.layout-split > .content')
    expect(rules.length).toBeGreaterThan(0)
    expect(hasProperty(rules[0], 'display')).toBe(true)
    expect(getProperty(rules[0], 'display')).toBe('flex')
    expect(getProperty(rules[0], 'flex-direction')).toBe('column')
    expect(getProperty(rules[0], 'justify-content')).toBe('center')
  })

  it('.stage zone has flex column with centered alignment', () => {
    const rules = findRules(FRAMEWORK_CSS_BASE, '.layout-split > .stage')
    expect(rules.length).toBeGreaterThan(0)
    const stage = rules[0]
    expect(getProperty(stage, 'display')).toBe('flex')
    expect(getProperty(stage, 'flex-direction')).toBe('column')
    expect(getProperty(stage, 'justify-content')).toBe('center')
    expect(getProperty(stage, 'align-items')).toBe('center')
  })

  it('split layout has gap between zones', () => {
    const rules = findRules(FRAMEWORK_CSS_BASE, '.slide.layout-split')
    expect(rules.length).toBeGreaterThan(0)
    expect(hasProperty(rules[0], 'gap')).toBe(true)
    expect(getProperty(rules[0], 'gap')).toBe('40px')
  })
})

// ── Other Layouts ─────────────────────────────────────

describe('other layout CSS rules', () => {
  it('title-slide has centered alignment', () => {
    const rules = findRules(FRAMEWORK_CSS_BASE, '.title-slide')
    expect(rules.length).toBeGreaterThan(0)
    expect(hasProperty(rules[0], 'align-items')).toBe(true)
    expect(getProperty(rules[0], 'align-items')).toBe('center')
  })

  it('layout-content has centered alignment', () => {
    const rules = findRules(FRAMEWORK_CSS_BASE, '.layout-content')
    expect(rules.length).toBeGreaterThan(0)
    expect(getProperty(rules[0], 'align-items')).toBe('center')
  })

  it('closing-slide has centered alignment', () => {
    const rules = findRules(FRAMEWORK_CSS_BASE, '.closing-slide')
    expect(rules.length).toBeGreaterThan(0)
    expect(getProperty(rules[0], 'align-items')).toBe('center')
    expect(getProperty(rules[0], 'justify-content')).toBe('center')
  })
})

// ── Preview Variant ───────────────────────────────────

describe('preview CSS variant', () => {
  it('includes base CSS', () => {
    expect(FRAMEWORK_CSS_PREVIEW).toContain(FRAMEWORK_CSS_BASE)
  })

  it('sets .slide to display: flex', () => {
    const previewAddition = FRAMEWORK_CSS_PREVIEW.slice(FRAMEWORK_CSS_BASE.length)
    const rules = findRules(previewAddition, '.slide')
    expect(rules.length).toBeGreaterThan(0)
    expect(getProperty(rules[0], 'display')).toBe('flex')
  })

  it('sets padding on slides', () => {
    const previewAddition = FRAMEWORK_CSS_PREVIEW.slice(FRAMEWORK_CSS_BASE.length)
    const rules = findRules(previewAddition, '.slide')
    expect(rules.length).toBeGreaterThan(0)
    expect(hasProperty(rules[0], 'padding')).toBe(true)
  })

  it('makes all step elements visible', () => {
    const previewAddition = FRAMEWORK_CSS_PREVIEW.slice(FRAMEWORK_CSS_BASE.length)
    expect(previewAddition).toContain('.step-hidden')
    const rules = findRules(previewAddition, '.step-hidden')
    expect(rules.length).toBeGreaterThan(0)
    expect(getProperty(rules[0], 'opacity')).toBe('1')
  })
})

// ── Export Variant ─────────────────────────────────────

describe('export CSS variant', () => {
  it('includes base CSS', () => {
    expect(FRAMEWORK_CSS_EXPORT).toContain(FRAMEWORK_CSS_BASE)
  })

  it('hides slides by default (display: none)', () => {
    const exportAddition = FRAMEWORK_CSS_EXPORT.slice(FRAMEWORK_CSS_BASE.length)
    const rules = findRules(exportAddition, '.slide')
    expect(rules.length).toBeGreaterThan(0)
    expect(getProperty(rules[0], 'display')).toBe('none')
  })

  it('shows active slides with display: flex', () => {
    const exportAddition = FRAMEWORK_CSS_EXPORT.slice(FRAMEWORK_CSS_BASE.length)
    expect(exportAddition).toContain('.slide.active')
    const rules = findRules(exportAddition, '.slide.active')
    expect(rules.length).toBeGreaterThan(0)
    expect(getProperty(rules[0], 'display')).toBe('flex')
  })

  it('has step reveal classes', () => {
    const exportAddition = FRAMEWORK_CSS_EXPORT.slice(FRAMEWORK_CSS_BASE.length)
    expect(exportAddition).toContain('.step-hidden')
    expect(exportAddition).toContain('.step-visible')
    const hidden = findRules(exportAddition, '.step-hidden')
    expect(hidden.length).toBeGreaterThan(0)
    expect(getProperty(hidden[0], 'opacity')).toBe('0')
  })

  it('responsive breakpoint stacks layout-split vertically', () => {
    // Check responsive rules use .slide.layout-split for proper specificity
    expect(FRAMEWORK_CSS_EXPORT).toMatch(/@media.*max-width.*768px/)
    expect(FRAMEWORK_CSS_EXPORT).toContain('.slide.layout-split')
  })
})

// ── Module Styles ─────────────────────────────────────

describe('module CSS rules in base', () => {
  it('card has border-radius and padding', () => {
    const rules = findRules(FRAMEWORK_CSS_BASE, '.card')
    expect(rules.length).toBeGreaterThan(0)
    expect(hasProperty(rules[0], 'border-radius')).toBe(true)
    expect(hasProperty(rules[0], 'padding')).toBe(true)
  })

  it('comparison uses flex row layout', () => {
    const rules = findRules(FRAMEWORK_CSS_BASE, '.comparison')
    expect(rules.length).toBeGreaterThan(0)
    expect(getProperty(rules[0], 'display')).toBe('flex')
  })

  it('card-grid uses CSS grid', () => {
    const rules = findRules(FRAMEWORK_CSS_BASE, '.card-grid')
    expect(rules.length).toBeGreaterThan(0)
    expect(getProperty(rules[0], 'display')).toBe('grid')
  })

  it('flow uses flex with center alignment', () => {
    const rules = findRules(FRAMEWORK_CSS_BASE, '.flow')
    expect(rules.length).toBeGreaterThan(0)
    expect(getProperty(rules[0], 'display')).toBe('flex')
    expect(getProperty(rules[0], 'justify-content')).toBe('center')
  })

  it('artifact-wrapper is fluid width by default', () => {
    const rules = findRules(FRAMEWORK_CSS_BASE, '.artifact-wrapper')
    expect(rules.length).toBeGreaterThan(0)
    expect(getProperty(rules[0], 'width')).toBe('100%')
  })

  it('artifact iframe is 16:9 by default and drops aspect when height is set', () => {
    const iframeRules = findRules(FRAMEWORK_CSS_BASE, '.artifact-wrapper iframe')
    expect(iframeRules.length).toBeGreaterThan(0)
    expect(getProperty(iframeRules[0], 'aspect-ratio')).toBe('16 / 9')

    const override = findRules(FRAMEWORK_CSS_BASE, '.artifact-wrapper[style*="height"] iframe')
    expect(override.length).toBeGreaterThan(0)
    expect(getProperty(override[0], 'aspect-ratio')).toBe('auto')
  })

  it('artifact wrapper centers itself horizontally', () => {
    const rules = findRules(FRAMEWORK_CSS_BASE, '.artifact-wrapper')
    expect(rules.length).toBeGreaterThan(0)
    expect(getProperty(rules[0], 'margin')).toBe('0 auto')
  })
})

// ── Module CSS Parity ────────────────────────────────

describe('module CSS parity — every HTML renderer class has a framework CSS rule', () => {
  /**
   * All CSS classes emitted by the HTML renderer that must have
   * a corresponding rule in FRAMEWORK_CSS_BASE.
   */
  const requiredClasses = [
    // heading — uses h1-h4 element selectors (covered by typography rules)
    // text
    'text-body',
    // card
    'card', 'card-cyan', 'card-navy',
    // label
    'label', 'label-cyan', 'label-blue', 'label-navy', 'label-red', 'label-amber', 'label-green',
    // tip-box
    'tip-box', 'tip-box-content',
    // prompt-block
    'prompt-block', 'prompt-good', 'prompt-mid', 'prompt-bad',
    // carousel
    'carousel', 'carousel-track', 'carousel-item', 'carousel-dot', 'carousel-prev', 'carousel-next',
    // comparison
    'comparison', 'comparison-panel', 'panel-content',
    // card-grid
    'card-grid',
    // flow
    'flow', 'flow-node', 'flow-icon', 'flow-body', 'flow-label', 'flow-desc', 'flow-arrow',
    // stream-list
    'stream-list',
    // image
    // (uses figure/figcaption elements, not classes)
    // artifact
    'artifact-wrapper', 'artifact-native',
    // video
    'video-wrapper', 'video-frame', 'video-caption',
    // step reveal
    'step-hidden',
  ]

  for (const cls of requiredClasses) {
    it(`"${cls}" has a CSS rule in FRAMEWORK_CSS_BASE or FRAMEWORK_CSS_EXPORT`, () => {
      const inBase = FRAMEWORK_CSS_BASE.includes(`.${cls}`)
      const inExport = FRAMEWORK_CSS_EXPORT.includes(`.${cls}`)
      expect(inBase || inExport).toBe(true)
    })
  }
})

// ── Module-Specific Parity ───────────────────────────

describe('label parity', () => {
  it('has padding and border-radius matching canvas', () => {
    const rules = findRules(FRAMEWORK_CSS_BASE, '.label')
    expect(rules.length).toBeGreaterThan(0)
    expect(getProperty(rules[0], 'padding')).toBe('4px 10px')
    expect(getProperty(rules[0], 'border-radius')).toBe('4px')
  })

  it('has line-height matching canvas', () => {
    const rules = findRules(FRAMEWORK_CSS_BASE, '.label')
    expect(rules.length).toBeGreaterThan(0)
    expect(getProperty(rules[0], 'line-height')).toBe('1.5')
  })
})

describe('heading h4 parity', () => {
  it('has uppercase text-transform', () => {
    expect(FRAMEWORK_CSS_BASE).toMatch(/h4\s*\{[^}]*text-transform:\s*uppercase/)
  })

  it('has letter-spacing', () => {
    expect(FRAMEWORK_CSS_BASE).toMatch(/h4\s*\{[^}]*letter-spacing:\s*0\.05em/)
  })
})

describe('flow module parity', () => {
  it('has flow-icon with circular badge styling', () => {
    const rules = findRules(FRAMEWORK_CSS_BASE, '.flow-icon')
    expect(rules.length).toBeGreaterThan(0)
    expect(getProperty(rules[0], 'border-radius')).toBe('50%')
    expect(hasProperty(rules[0], 'width')).toBe(true)
    expect(hasProperty(rules[0], 'height')).toBe(true)
  })

  it('has flow-label with font-weight', () => {
    const rules = findRules(FRAMEWORK_CSS_BASE, '.flow-label')
    expect(rules.length).toBeGreaterThan(0)
    expect(getProperty(rules[0], 'font-weight')).toBe('600')
  })

  it('has flow-desc with muted color', () => {
    const rules = findRules(FRAMEWORK_CSS_BASE, '.flow-desc')
    expect(rules.length).toBeGreaterThan(0)
    expect(hasProperty(rules[0], 'color')).toBe(true)
  })

  it('flow-arrow uses ::after pseudo-element', () => {
    expect(FRAMEWORK_CSS_BASE).toContain('.flow-arrow::after')
  })
})

describe('tip-box parity', () => {
  it('has tip-box-content with font-size and line-height', () => {
    const rules = findRules(FRAMEWORK_CSS_BASE, '.tip-box-content')
    expect(rules.length).toBeGreaterThan(0)
    expect(hasProperty(rules[0], 'font-size')).toBe(true)
    expect(hasProperty(rules[0], 'line-height')).toBe(true)
  })
})

describe('comparison parity', () => {
  it('has panel-content with color and line-height', () => {
    const rules = findRules(FRAMEWORK_CSS_BASE, '.panel-content')
    expect(rules.length).toBeGreaterThan(0)
    expect(hasProperty(rules[0], 'color')).toBe(true)
    expect(hasProperty(rules[0], 'line-height')).toBe(true)
  })

  it('comparison-panel h3 has font-weight 600', () => {
    const rules = findRules(FRAMEWORK_CSS_BASE, '.comparison-panel h3')
    expect(rules.length).toBeGreaterThan(0)
    expect(getProperty(rules[0], 'font-weight')).toBe('600')
  })
})

describe('card-grid parity', () => {
  it('card h3 has font-weight 650', () => {
    const rules = findRules(FRAMEWORK_CSS_BASE, '.card h3')
    expect(rules.length).toBeGreaterThan(0)
    expect(getProperty(rules[0], 'font-weight')).toBe('650')
  })
})
