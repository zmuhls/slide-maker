import { writable, derived } from 'svelte/store'
import { currentDeck } from './deck'

export interface ThemeData {
  id: string
  name: string
  css: string
  fonts: { heading?: string; body?: string }
  colors: { primary?: string; secondary?: string; accent?: string; bg?: string }
  builtIn: boolean
}

export const themesStore = writable<ThemeData[]>([])
export const themesLoaded = writable(false)

/** The active theme for the current deck, derived from deck.themeId + loaded themes */
export const activeTheme = derived(
  [currentDeck, themesStore],
  ([$deck, $themes]) => {
    if (!$deck?.themeId || $themes.length === 0) return null
    return $themes.find((t) => t.id === $deck.themeId) ?? null
  }
)

let fetched = false

export async function ensureThemesLoaded() {
  if (fetched) return
  fetched = true
  const API_URL = (import.meta as any).env?.PUBLIC_API_URL ?? 'http://localhost:3001'
  try {
    const res = await fetch(`${API_URL}/api/themes`, { credentials: 'include' })
    const data = await res.json()
    themesStore.set(data.themes ?? [])
  } catch (err) {
    console.error('Failed to fetch themes for store:', err)
  } finally {
    themesLoaded.set(true)
  }
}

/** Darken a hex color by a factor (0 = black, 1 = unchanged) */
export function darkenHex(hex: string, factor: number): string {
  if (!hex || hex.length < 7) return hex
  const r = Math.round(parseInt(hex.slice(1, 3), 16) * factor)
  const g = Math.round(parseInt(hex.slice(3, 5), 16) * factor)
  const b = Math.round(parseInt(hex.slice(5, 7), 16) * factor)
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
}

/** Detect whether a hex color is dark (luminance < 128) */
export function isDark(hex: string): boolean {
  if (!hex || hex.length < 7) return true
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return (r * 0.299 + g * 0.587 + b * 0.114) < 128
}
