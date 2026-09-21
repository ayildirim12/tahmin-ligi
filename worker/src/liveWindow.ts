const LIVE_WINDOW_MINUTES = 130 // kickoff → full-time + stoppage/ET buffer
const LOOKAHEAD_BUFFER_MINUTES = 2 // catch an imminent kickoff slightly early

export interface LiveCandidate {
  kickoffAtMs: number
  status: string
}

/** Is there any match currently inside (or about to enter) its live window? */
export function hasImminentOrLiveMatch(candidates: LiveCandidate[], nowMs = Date.now()): boolean {
  const bufferedNow = nowMs + LOOKAHEAD_BUFFER_MINUTES * 60_000
  return candidates.some((c) => {
    if (c.status === 'FINISHED' || c.status === 'POSTPONED' || c.status === 'CANCELLED') return false
    const windowEnd = c.kickoffAtMs + LIVE_WINDOW_MINUTES * 60_000
    return c.kickoffAtMs <= bufferedNow && nowMs < windowEnd
  })
}

/**
 * Merges every still-relevant match's [now-or-kickoff, kickoff+130min] window
 * into a non-overlapping union and sums the remaining minutes for TODAY —
 * concurrent/staggered matches must not multiply the count, since one
 * `/fixtures?live=all` poll covers all of them simultaneously.
 */
export function remainingLiveMinutesToday(candidates: LiveCandidate[], nowMs = Date.now()): number {
  const endOfDayMs = new Date(nowMs).setHours(23, 59, 59, 999)

  const intervals = candidates
    .filter((c) => c.status !== 'FINISHED' && c.status !== 'POSTPONED' && c.status !== 'CANCELLED')
    .map((c) => {
      const start = Math.max(c.kickoffAtMs, nowMs)
      const end = c.kickoffAtMs + LIVE_WINDOW_MINUTES * 60_000
      return { start, end: Math.min(end, endOfDayMs) }
    })
    .filter((iv) => iv.start < iv.end)
    .sort((a, b) => a.start - b.start)

  let totalMs = 0
  let mergedEnd = -Infinity
  for (const iv of intervals) {
    const start = Math.max(iv.start, mergedEnd)
    if (start < iv.end) totalMs += iv.end - start
    mergedEnd = Math.max(mergedEnd, iv.end)
  }
  return totalMs / 60_000
}
