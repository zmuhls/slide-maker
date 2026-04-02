import { writable, get } from 'svelte/store'

const MAX_ACTIONS = 15

export const recentActions = writable<string[]>([])
export const lastAgentSlideId = writable<string | null>(null)

export function logAction(description: string) {
  recentActions.update((a) => {
    const next = [...a, description]
    return next.length > MAX_ACTIONS ? next.slice(-MAX_ACTIONS) : next
  })
}

export function consumeActions(): string[] {
  let result: string[] = []
  recentActions.update((a) => {
    result = a
    return []
  })
  return result
}
