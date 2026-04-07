import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

describe('roadmap template', () => {
  it('uses the canonical timeline artifact reference instead of a custom card grid', () => {
    const templatePath = path.resolve('templates/layout-full-dark/roadmap.json')
    const raw = fs.readFileSync(templatePath, 'utf-8')
    const template = JSON.parse(raw) as {
      modules: { type: string; data: Record<string, unknown> }[]
    }

    const artifactModule = template.modules.find((module) => module.type === 'artifact')

    expect(artifactModule).toBeTruthy()
    expect(artifactModule?.data.registryId).toBe('artifact-timeline')
    expect(artifactModule?.data.rawSource).toBeUndefined()
    expect(artifactModule?.data.config).toEqual({
      events: [
        { label: 'Q1: Foundation', desc: 'Core infrastructure and CI/CD.' },
        { label: 'Q2: Features', desc: 'Collaboration and AI integration.' },
        { label: 'Q3: Scale', desc: 'Performance and analytics.' },
      ],
    })
  })
})
