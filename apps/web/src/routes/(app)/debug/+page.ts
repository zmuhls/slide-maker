export const ssr = false

import type { PageLoad } from './$types'

export const load: PageLoad = async () => {
  const { api } = await import('$lib/api')
  try {
    const { transcripts } = await api.listTranscripts({ limit: 50 })
    return { transcripts }
  } catch {
    return { transcripts: [] }
  }
}

