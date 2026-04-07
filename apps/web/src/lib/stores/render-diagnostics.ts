import {
  type ArtifactRenderStatus,
  type ArtifactRenderSurface,
  type RenderDiagnostic,
} from '@slide-maker/shared'
import { derived, get, writable } from 'svelte/store'

const MAX_DIAGNOSTIC_AGE_MS = 15 * 60 * 1000

export const renderDiagnostics = writable<Record<string, RenderDiagnostic>>({})

interface MarkRenderStatusInput {
  moduleId: string
  slideId: string
  moduleType?: string
  surface: ArtifactRenderSurface
  status: ArtifactRenderStatus
  message?: string
  updatedAt?: number
}

export function markModuleRenderStatus({
  moduleId,
  slideId,
  moduleType = 'artifact',
  surface,
  status,
  message,
  updatedAt = Date.now(),
}: MarkRenderStatusInput): void {
  renderDiagnostics.update((current) => ({
    ...current,
    [moduleId]: {
      moduleId,
      slideId,
      moduleType,
      surface,
      status,
      message,
      updatedAt,
    },
  }))
}

export function clearModuleRenderStatus(moduleId: string): void {
  renderDiagnostics.update((current) => {
    if (!(moduleId in current)) return current
    const next = { ...current }
    delete next[moduleId]
    return next
  })
}

export function clearSlideRenderDiagnostics(slideId: string): void {
  renderDiagnostics.update((current) =>
    Object.fromEntries(
      Object.entries(current).filter(([, diagnostic]) => diagnostic.slideId !== slideId),
    ),
  )
}

export function getRecentRenderDiagnostics(limit: number = 5): RenderDiagnostic[] {
  const now = Date.now()
  return Object.values(get(renderDiagnostics))
    .filter(
      (diagnostic) =>
        diagnostic.status === 'error' &&
        now - diagnostic.updatedAt <= MAX_DIAGNOSTIC_AGE_MS,
    )
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, limit)
}

export const activeRenderErrors = derived(renderDiagnostics, ($renderDiagnostics) =>
  Object.values($renderDiagnostics)
    .filter((diagnostic) => diagnostic.status === 'error')
    .sort((a, b) => b.updatedAt - a.updatedAt),
)
