import type { MatchStatus } from '../../src/shared/types.ts'

// Highlightly returns a free-text status in `state.description`. This is the COMPLETE set of
// 19 values confirmed verbatim from https://highlightly.net/football-api/documentation/
// (quoted directly, not inferred) — matched case-insensitively. Every one of the 19 documented
// values is classified below; if a real match ever returns something outside this set, it falls
// through to SCHEDULED (the safest default — see the comment on the fallback below).
const SCHEDULED_DESCRIPTIONS = new Set(['not started', 'unknown'])

const HALFTIME = new Set(['half time'])

// "Break time" = the pause between extra-time periods; "suspended"/"interrupted" = temporarily
// stopped but not (yet) abandoned/postponed — all still an ongoing, unfinished match from the
// prediction game's point of view, so LIVE is the closest fit among our 6 statuses.
const LIVE_DESCRIPTIONS = new Set([
  'first half',
  'second half',
  'extra time',
  'break time',
  'penalties',
  'in progress',
  'suspended',
  'interrupted',
])

// "Awarded" = result given administratively (forfeit/walkover) without full play — still a
// final scoreline to score predictions against, so FINISHED.
const FINISHED_DESCRIPTIONS = new Set([
  'finished',
  'finished after penalties',
  'finished after extra time',
  'awarded',
])

const POSTPONED_DESCRIPTIONS = new Set(['postponed', 'to be announced'])

// "Abandoned" has no fair final scoreline to score predictions against — treated as cancelled
// rather than finished (a prediction shouldn't win/lose points off a match that didn't complete).
const CANCELLED_DESCRIPTIONS = new Set(['cancelled', 'abandoned'])

export function mapApiStatus(description: string): MatchStatus {
  const normalized = description.trim().toLowerCase()
  if (SCHEDULED_DESCRIPTIONS.has(normalized)) return 'SCHEDULED'
  if (HALFTIME.has(normalized)) return 'HT'
  if (LIVE_DESCRIPTIONS.has(normalized)) return 'LIVE'
  if (FINISHED_DESCRIPTIONS.has(normalized)) return 'FINISHED'
  if (POSTPONED_DESCRIPTIONS.has(normalized)) return 'POSTPONED'
  if (CANCELLED_DESCRIPTIONS.has(normalized)) return 'CANCELLED'
  // Unrecognized string (shouldn't happen — all 19 documented values are covered above).
  // Defaults to SCHEDULED rather than throwing so one unexpected status doesn't break a
  // whole sync run; logged so it's visible in Actions output instead of failing silently.
  console.warn(`[statusMap] unrecognized match state.description: "${description}" — defaulting to SCHEDULED`)
  return 'SCHEDULED'
}

/** Splits Highlightly's "H - A" score string into numbers. Returns nulls if not started/unavailable. */
export function parseScore(current: string | null | undefined): { home: number | null; away: number | null } {
  if (!current) return { home: null, away: null }
  const match = current.match(/(\d+)\s*-\s*(\d+)/)
  if (!match) return { home: null, away: null }
  return { home: Number(match[1]), away: Number(match[2]) }
}
