import type { ArtifactConfigField, ArtifactConfigSchema } from '@slide-maker/shared'

export type { ArtifactConfigField, ArtifactConfigSchema }

export interface ArtifactRef {
  id: string
  name: string
  description: string
  type: string
  source: string
  config: ArtifactConfigSchema | Record<string, unknown>
}

/**
 * Resolve an artifact's config to a flat key-value object.
 * Handles two shapes:
 *   1. Schema config — values are `{ type, label, default }` → extracts `.default`
 *   2. Flat config — values are primitives → returned as-is
 */
export function getResolvedConfig(artifact: ArtifactRef): Record<string, unknown> {
  const cfg = artifact.config as Record<string, unknown> | null
  if (!cfg || typeof cfg !== 'object') return {}

  const hasSchema = Object.values(cfg).some(
    (v) => v && typeof v === 'object' && 'default' in (v as Record<string, unknown>),
  )

  if (hasSchema) {
    const defaults: Record<string, unknown> = {}
    for (const [key, field] of Object.entries(cfg)) {
      if (field && typeof field === 'object' && 'default' in (field as Record<string, unknown>)) {
        defaults[key] = (field as ArtifactConfigField).default
      }
    }
    return defaults
  }

  return cfg
}

/**
 * Build the `@artifact:Name` chat reference string with full JSON payload.
 */
export function buildAtRef(artifact: ArtifactRef): string {
  return `@artifact:${artifact.name}`
}

/**
 * Inject a config object into an artifact's HTML source via data-config attribute on <body>.
 * The artifact JS reads this at boot via document.body.getAttribute('data-config').
 */
export function buildSourceWithConfig(source: string, configData: Record<string, unknown>): string {
  const configStr = JSON.stringify(configData).replace(/"/g, '&quot;')
  // Replace existing data-config if present
  const replaced = source.replace(
    /<body([^>]*?)\sdata-config=\"[^\"]*\"([^>]*)>/i,
    (_m, pre, post) => `<body${pre} data-config=\"${configStr}\"${post}>`,
  )
  if (replaced !== source) return replaced
  // Otherwise, inject
  if (source.includes('<body>')) {
    return source.replace('<body>', `<body data-config=\"${configStr}\">`)
  }
  if (source.includes('<body ')) {
    return source.replace('<body ', `<body data-config=\"${configStr}\" `)
  }
  return source
}
