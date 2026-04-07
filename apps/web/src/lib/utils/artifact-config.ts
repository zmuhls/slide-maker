import {
  buildArtifactBlockData as buildSharedArtifactBlockData,
  buildAtRef as buildSharedAtRef,
  getResolvedConfig as getSharedResolvedConfig,
  resolveArtifactFactory,
  type ArtifactBlockBuildOptions,
  type ArtifactConfigField as SharedArtifactConfigField,
  type ArtifactRegistryEntry as SharedArtifactRef,
  type JsonValue,
} from '@slide-maker/shared'

export interface ArtifactConfigField extends SharedArtifactConfigField {}

export interface ArtifactRef extends SharedArtifactRef {}

export function getResolvedConfig(artifact: ArtifactRef): Record<string, JsonValue> {
  return getSharedResolvedConfig(artifact)
}

export function buildAtRef(
  artifact: ArtifactRef,
  config: Record<string, JsonValue> = getResolvedConfig(artifact),
): string {
  return buildSharedAtRef(artifact, config)
}

export function buildArtifactBlockData(
  artifact: ArtifactRef,
  config: Record<string, JsonValue> = getResolvedConfig(artifact),
  options: ArtifactBlockBuildOptions = {},
): Record<string, unknown> {
  return buildSharedArtifactBlockData(artifact, config, options)
}

export function buildSourceWithConfig(
  source: string,
  configData: Record<string, unknown>,
  attrName: string = 'data-config',
): string {
  const configStr = JSON.stringify(configData).replace(/"/g, '&quot;')
  const replaced = source.replace(
    new RegExp(`<body([^>]*?)\\s${attrName}="[^"]*"([^>]*)>`, 'i'),
    (_match, pre, post) => `<body${pre} ${attrName}="${configStr}"${post}>`,
  )
  if (replaced !== source) return replaced
  if (source.includes('<body>')) {
    return source.replace('<body>', `<body ${attrName}="${configStr}">`)
  }
  if (source.includes('<body ')) {
    return source.replace('<body ', `<body ${attrName}="${configStr}" `)
  }
  return source
}

export function buildSourceWithFactory(
  artifact: ArtifactRef,
  config: Record<string, JsonValue> = getResolvedConfig(artifact),
): string {
  const factory = resolveArtifactFactory(artifact)
  if (factory.kind === 'url-json-param') {
    try {
      const url = new URL(artifact.source)
      url.searchParams.set(factory.key || 'config', JSON.stringify(config))
      return url.toString()
    } catch {
      return artifact.source
    }
  }
  return buildSourceWithConfig(artifact.source, config, factory.key || 'data-config')
}
