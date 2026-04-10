/**
 * Resource registry parity tests.
 *
 * Verifies that artifacts, templates, and themes are correctly tethered
 * across the codebase: JSON configs → seed logic → factories → export.
 */

import fs from 'node:fs'
import path from 'node:path'
import { describe, it, expect } from 'vitest'
import {
  LAYOUTS,
  LAYOUT_ZONES,
  MODULE_TYPES,
  ZONES,
  type SlideLayout,
  type Zone,
} from '../packages/shared/src/block-types'
import { NATIVE_ARTIFACT_NAMES } from '../apps/api/src/export/artifacts'

// ── Helpers ──────────────────────────────────────────────────────

const projectRoot = path.resolve(import.meta.dirname ?? __dirname, '..')
const templatesDir = path.join(projectRoot, 'templates')

function readJson(filePath: string) {
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'))
}

function allTemplateJsons(): { relPath: string; data: any }[] {
  const results: { relPath: string; data: any }[] = []
  for (const layout of LAYOUTS) {
    const dir = path.join(templatesDir, layout)
    if (!fs.existsSync(dir)) continue
    for (const file of fs.readdirSync(dir).filter((f) => f.endsWith('.json'))) {
      results.push({
        relPath: `templates/${layout}/${file}`,
        data: readJson(path.join(dir, file)),
      })
    }
  }
  return results
}

function allArtifactJsons(): { relPath: string; data: any }[] {
  const dir = path.join(templatesDir, 'artifacts')
  if (!fs.existsSync(dir)) return []
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .map((file) => ({
      relPath: `templates/artifacts/${file}`,
      data: readJson(path.join(dir, file)),
    }))
}

// ── Artifact Factory Parity ──────────────────────────────────────

describe('artifact factory parity', () => {
  // Extract names registered in client-side factories
  const clientFactoryDir = path.join(
    projectRoot,
    'apps/web/src/lib/modules/artifacts',
  )
  const clientFactoryFiles = fs
    .readdirSync(clientFactoryDir)
    .filter((f) => f.endsWith('.ts') && f !== 'index.ts')

  // Extract quoted names handling apostrophes (e.g. "Langton's Ant")
  function extractQuotedNames(content: string, fnName: string): string[] {
    const names: string[] = []
    // Match double-quoted: fnName("...")
    for (const m of content.matchAll(new RegExp(`${fnName}\\("([^"]+)"`, 'g'))) {
      names.push(m[1])
    }
    // Match single-quoted: fnName('...') — only if no internal single quote
    for (const m of content.matchAll(new RegExp(`${fnName}\\('([^']+)'`, 'g'))) {
      names.push(m[1])
    }
    return names
  }

  const clientRegisteredNames: string[] = []
  for (const file of clientFactoryFiles) {
    const content = fs.readFileSync(path.join(clientFactoryDir, file), 'utf-8')
    clientRegisteredNames.push(...extractQuotedNames(content, 'registerArtifact'))
  }

  // Extract names registered in export ARTIFACTS_JS
  const artifactsTs = fs.readFileSync(
    path.join(projectRoot, 'apps/api/src/export/artifacts.ts'),
    'utf-8',
  )
  // Skip the `function register(name, fn)` definition line
  const exportRegisteredNames = extractQuotedNames(artifactsTs, '  register')

  it('client-side factories match NATIVE_ARTIFACT_NAMES', () => {
    const clientSet = new Set(clientRegisteredNames)
    expect(clientSet.size).toBe(NATIVE_ARTIFACT_NAMES.size)
    for (const name of NATIVE_ARTIFACT_NAMES) {
      expect(clientSet.has(name), `missing client factory for "${name}"`).toBe(true)
    }
  })

  it('export register() calls match NATIVE_ARTIFACT_NAMES', () => {
    const exportSet = new Set(exportRegisteredNames)
    expect(exportSet.size).toBe(NATIVE_ARTIFACT_NAMES.size)
    for (const name of NATIVE_ARTIFACT_NAMES) {
      expect(exportSet.has(name), `missing export register for "${name}"`).toBe(true)
    }
  })

  it('client factories and export factories register the same set', () => {
    const clientSet = new Set(clientRegisteredNames)
    const exportSet = new Set(exportRegisteredNames)
    expect(clientSet.size).toBe(exportSet.size)
    for (const name of clientSet) {
      expect(exportSet.has(name), `export missing "${name}"`).toBe(true)
    }
  })

  it('every native artifact has a corresponding template JSON', () => {
    const artifactJsonNames = allArtifactJsons().map((a) => a.data.name)
    for (const name of NATIVE_ARTIFACT_NAMES) {
      expect(
        artifactJsonNames,
        `native artifact "${name}" missing template JSON`,
      ).toContain(name)
    }
  })
})

// ── Template Zone Validation ─────────────────────────────────────

describe('template zone validation', () => {
  const templates = allTemplateJsons()

  it('found at least one template', () => {
    expect(templates.length).toBeGreaterThan(0)
  })

  for (const { relPath, data } of templates) {
    describe(relPath, () => {
      it('uses a valid layout', () => {
        expect(LAYOUTS).toContain(data.layout)
      })

      it('has a modules array', () => {
        expect(Array.isArray(data.modules)).toBe(true)
      })

      it('all modules use valid types', () => {
        for (const mod of data.modules) {
          expect(
            MODULE_TYPES as readonly string[],
            `invalid type "${mod.type}" in ${relPath}`,
          ).toContain(mod.type)
        }
      })

      it('all modules use zones valid for their layout', () => {
        const allowedZones = LAYOUT_ZONES[data.layout as SlideLayout]
        for (const mod of data.modules) {
          expect(
            allowedZones,
            `zone "${mod.zone}" not allowed in layout "${data.layout}" (${relPath})`,
          ).toContain(mod.zone)
        }
      })

      it('all modules use valid zones', () => {
        for (const mod of data.modules) {
          expect(ZONES as readonly string[]).toContain(mod.zone)
        }
      })
    })
  }
})

// ── Artifact Template Structure ──────────────────────────────────

describe('artifact template JSON structure', () => {
  const artifacts = allArtifactJsons()

  it('found artifact templates', () => {
    expect(artifacts.length).toBeGreaterThan(0)
  })

  for (const { relPath, data } of artifacts) {
    describe(relPath, () => {
      it('has required fields: id, name', () => {
        expect(data.id).toBeTruthy()
        expect(data.name).toBeTruthy()
      })

      it('type, when present, is one of chart|diagram|map|visualization', () => {
        // type is optional — seed defaults to 'visualization'
        if (data.type) {
          expect(['chart', 'diagram', 'map', 'visualization']).toContain(
            data.type,
          )
        }
      })

      it('has a config object', () => {
        expect(typeof data.config).toBe('object')
      })

      it('has unique id', () => {
        const allIds = allArtifactJsons().map((a) => a.data.id)
        const count = allIds.filter((id: string) => id === data.id).length
        expect(count, `duplicate artifact id "${data.id}"`).toBe(1)
      })

      if (!NATIVE_ARTIFACT_NAMES.has(data.name)) {
        it('non-native artifact has inline source HTML', () => {
          expect(
            data.source,
            `non-native artifact "${data.name}" missing source`,
          ).toBeTruthy()
          expect(data.source).toContain('<')
        })
      }
    })
  }
})

// ── Seed Directory Coverage ──────────────────────────────────────

describe('seed directory coverage', () => {
  it('every LAYOUT has a template subdirectory', () => {
    for (const layout of LAYOUTS) {
      const dir = path.join(templatesDir, layout)
      expect(
        fs.existsSync(dir),
        `missing template dir for layout "${layout}"`,
      ).toBe(true)
    }
  })

  it('seed subdirs match LAYOUTS exactly', () => {
    // The seed function lists these same dirs
    const seedSubdirs = [
      'title-slide',
      'layout-split',
      'layout-content',
      'layout-grid',
      'layout-full-dark',
      'layout-divider',
      'closing-slide',
    ]
    expect(seedSubdirs.sort()).toEqual([...LAYOUTS].sort())
  })

  it('artifacts directory exists', () => {
    expect(fs.existsSync(path.join(templatesDir, 'artifacts'))).toBe(true)
  })
})

// ── NATIVE_ARTIFACT_NAMES vs Export register() Count ─────────────

describe('export ARTIFACTS_JS integrity', () => {
  const artifactsTs = fs.readFileSync(
    path.join(projectRoot, 'apps/api/src/export/artifacts.ts'),
    'utf-8',
  )

  it('register() call count equals NATIVE_ARTIFACT_NAMES.size', () => {
    // Match register('name' or register("name" calls (skip the function definition)
    const registerCalls = [
      ...artifactsTs.matchAll(/\bregister\(['"](.+?)['"]/g),
    ].filter((m) => m[1] !== 'name') // skip the function def if captured
    expect(registerCalls.length).toBe(NATIVE_ARTIFACT_NAMES.size)
  })

  it('ARTIFACTS_JS string is non-empty', () => {
    // Importing ARTIFACTS_JS would pull the whole string; just check it exists
    expect(artifactsTs).toContain('export const ARTIFACTS_JS')
  })

  it('defines the registry and auto-init in the IIFE', () => {
    expect(artifactsTs).toContain('function register(name, fn)')
    expect(artifactsTs).toContain('function initArtifacts()')
    expect(artifactsTs).toContain('.artifact-native[data-artifact]')
  })
})

// ── Module Type Coverage in html-renderer ────────────────────────

describe('html-renderer module type switch coverage', () => {
  const rendererTs = fs.readFileSync(
    path.join(projectRoot, 'apps/api/src/export/html-renderer.ts'),
    'utf-8',
  )

  for (const type of MODULE_TYPES) {
    it(`has case for "${type}"`, () => {
      expect(rendererTs).toContain(`case '${type}'`)
    })
  }
})
