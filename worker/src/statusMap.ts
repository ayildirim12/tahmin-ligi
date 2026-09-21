import type { MatchStatus } from '../../src/shared/types.ts'

// Highlightly returns a free-text status in `state.description` (not short codes like
// API-Football's "NS"/"1H"/"FT"). Matched case-insensitively; UNVERIFIED against a real
// API key — confirm the exact strings once live data is available (worker/AGENTS.md §4)
// and extend these sets if a status falls through to the SCHEDULED default unexpectedly.
const HALFTIME = new Set(['half time', 'halftime', 'ht'])
const LIVE_DESCRIPTIONS = new Set([
  'first half',
  'second half',
  'live',
  'in play',
  'extra time',
  'penalties',
  'penalty shootout',
])
const FINISHED_DESCRIPTIONS = new Set(['finished', 'full time', 'ft', 'match finished'])
const POSTPONED_DESCRIPTIONS = new Set(['postponed', 'time to be defined', 'tbd'])
const CANCELLED_DESCRIPTIONS = new Set(['cancelled', 'canceled', 'abandoned'])

export function mapApiStatus(description: string): MatchStatus {
  const normalized = description.trim().toLowerCase()
  if (HALFTIME.has(normalized)) return 'HT'
  if (LIVE_DESCRIPTIONS.has(normalized)) return 'LIVE'
  if (FINISHED_DESCRIPTIONS.has(normalized)) return 'FINISHED'
  if (POSTPONED_DESCRIPTIONS.has(normalized)) return 'POSTPONED'
  if (CANCELLED_DESCRIPTIONS.has(normalized)) return 'CANCELLED'
  return 'SCHEDULED'
}

/** Splits Highlightly's "H - A" score string into numbers. Returns nulls if not started/unavailable. */
export function parseScore(current: string | null | undefined): { home: number | null; away: number | null } {
  if (!current) return { home: null, away: null }
  const match = current.match(/(\d+)\s*-\s*(\d+)/)
  if (!match) return { home: null, away: null }
  return { home: Number(match[1]), away: Number(match[2]) }
}
