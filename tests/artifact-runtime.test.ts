import { describe, expect, it } from 'vitest'
import {
  ARTIFACT_RENDER_EVENT,
  buildInlineArtifactSrcdoc,
} from '../packages/shared/src/index'

describe('buildInlineArtifactSrcdoc', () => {
  it('injects the render reporter and absolutizes /api URLs', () => {
    const html = `<!DOCTYPE html><html><head><link rel="stylesheet" href="/api/static/leaflet.css"></head><body><div id="app"></div></body></html>`
    const result = buildInlineArtifactSrcdoc(html, {
      apiUrl: 'http://localhost:3001',
      moduleId: 'block-1',
      slideId: 'slide-1',
      surface: 'preview',
    })

    expect(result).toContain(ARTIFACT_RENDER_EVENT)
    expect(result).toContain("moduleId:'block-1'")
    expect(result).toContain("slideId:'slide-1'")
    expect(result).toContain('http://localhost:3001/api/static/leaflet.css')
  })

  it('creates a full HTML document when the source has no html/body shell', () => {
    const result = buildInlineArtifactSrcdoc('<div>hello</div>', {
      moduleId: 'block-2',
      slideId: 'slide-2',
      surface: 'edit',
    })

    expect(result.startsWith('<!DOCTYPE html>')).toBe(true)
    expect(result).toContain('<body><div>hello</div></body>')
  })
})
