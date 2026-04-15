import type { ThemeData } from '$lib/stores/themes'

export const StudioDark: ThemeData = {
  id: 'studio-dark',
  name: 'Studio Dark',
  css: '',
  fonts: { heading: 'Outfit', body: 'Inter' },
  colors: { primary: '#22d3ee', secondary: '#06B6D4', accent: '#2DD4BF', bg: '#0c1220' },
  builtIn: true,
}

export const StudioLight: ThemeData = {
  id: 'studio-light',
  name: 'Studio Light',
  css: '',
  fonts: { heading: 'Outfit', body: 'Inter' },
  colors: { primary: '#0E7490', secondary: '#0891B2', accent: '#0D9488', bg: '#f8fafc' },
  builtIn: true,
}

export const STUDIO_THEMES: ThemeData[] = [StudioDark, StudioLight]

