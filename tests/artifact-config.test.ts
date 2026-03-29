import { describe, it, expect } from 'vitest'
import { getResolvedConfig, buildAtRef, type ArtifactRef } from '../apps/web/src/lib/utils/artifact-config'

// ── Fixtures ────────────────────────────────────────────

const flatArtifact: ArtifactRef = {
  id: 'artifact-boids',
  name: 'Boids Visualization',
  description: 'Interactive boids visualization',
  type: 'visualization',
  source: 'https://creative-clawing.com/gallery/boids.html',
  config: { width: '100%', height: '400px', sandbox: 'allow-scripts' },
}

const schemaArtifact: ArtifactRef = {
  id: 'artifact-bar',
  name: 'Bar Chart',
  description: 'Configurable bar chart',
  type: 'chart',
  source: '<html><body></body></html>',
  config: {
    title: { type: 'string', label: 'Title', default: 'My Chart' },
    values: { type: 'array', label: 'Values', default: [10, 20, 30] },
    color: { type: 'string', label: 'Bar Color', default: '#3b82f6' },
  },
}

const nullConfigArtifact: ArtifactRef = {
  id: 'artifact-empty',
  name: 'Empty Visualization',
  description: 'No config',
  type: 'visualization',
  source: 'https://example.com/visualization.html',
  config: null,
}

const emptyConfigArtifact: ArtifactRef = {
  id: 'artifact-empty2',
  name: 'Empty Config',
  description: 'Empty object config',
  type: 'visualization',
  source: 'https://example.com/visualization.html',
  config: {},
}

// ── getResolvedConfig ───────────────────────────────────

describe('getResolvedConfig', () => {
  it('returns flat config values as-is', () => {
    const result = getResolvedConfig(flatArtifact)
    expect(result).toEqual({
      width: '100%',
      height: '400px',
      sandbox: 'allow-scripts',
    })
  })

  it('extracts .default from schema config fields', () => {
    const result = getResolvedConfig(schemaArtifact)
    expect(result).toEqual({
      title: 'My Chart',
      values: [10, 20, 30],
      color: '#3b82f6',
    })
  })

  it('returns {} for null config', () => {
    expect(getResolvedConfig(nullConfigArtifact)).toEqual({})
  })

  it('returns {} for empty object config', () => {
    expect(getResolvedConfig(emptyConfigArtifact)).toEqual({})
  })

  it('handles mixed schema — fields with .default are extracted, others skipped', () => {
    const mixed: ArtifactRef = {
      ...flatArtifact,
      config: {
        title: { type: 'string', label: 'Title', default: 'Hello' },
        stray: 'not-a-schema-field',
      },
    }
    const result = getResolvedConfig(mixed)
    // hasSchema is true because at least one value has .default
    expect(result).toEqual({ title: 'Hello' })
  })
})

// ── buildAtRef ──────────────────────────────────────────

describe('buildAtRef', () => {
  it('starts with @artifact:<name>', () => {
    const ref = buildAtRef(flatArtifact)
    expect(ref.startsWith('@artifact:Boids Visualization')).toBe(true)
  })

  it('contains a json fenced code block', () => {
    const ref = buildAtRef(flatArtifact)
    expect(ref).toContain('```json')
    expect(ref).toContain('```')
  })

  it('includes name, type, source, and resolved config in payload', () => {
    const ref = buildAtRef(flatArtifact)
    const jsonBlock = ref.split('```json\n')[1].split('\n```')[0]
    const payload = JSON.parse(jsonBlock)
    expect(payload.name).toBe('Boids Visualization')
    expect(payload.type).toBe('visualization')
    expect(payload.source).toBe('https://creative-clawing.com/gallery/boids.html')
    expect(payload.config).toEqual({
      width: '100%',
      height: '400px',
      sandbox: 'allow-scripts',
    })
  })

  it('resolves schema config defaults in the payload', () => {
    const ref = buildAtRef(schemaArtifact)
    const jsonBlock = ref.split('```json\n')[1].split('\n```')[0]
    const payload = JSON.parse(jsonBlock)
    expect(payload.config).toEqual({
      title: 'My Chart',
      values: [10, 20, 30],
      color: '#3b82f6',
    })
  })

  it('produces empty config object for null config artifacts', () => {
    const ref = buildAtRef(nullConfigArtifact)
    const jsonBlock = ref.split('```json\n')[1].split('\n```')[0]
    const payload = JSON.parse(jsonBlock)
    expect(payload.config).toEqual({})
  })
})
