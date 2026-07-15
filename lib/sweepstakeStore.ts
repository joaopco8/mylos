import { Sweepstake } from './sweepstake'

const store = new Map<string, Sweepstake>()

export function saveSweepstakeEntry(entry: Sweepstake): void {
  store.set(entry.id, entry)
  if (store.size > 200) {
    const firstKey = store.keys().next().value
    if (firstKey) store.delete(firstKey)
  }
}

export function getSweepstakeEntry(id: string): Sweepstake | null {
  return store.get(id) || null
}
