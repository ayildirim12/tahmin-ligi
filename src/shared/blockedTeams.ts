import type { Match } from './types'

/**
 * Teams whose matches are closed to predictions for the rest of the season
 * (league decision). Enforced by firestore.rules' `blockedTeamIds()` — keep
 * the two lists in sync; this copy only drives the UI.
 */
export const BLOCKED_TEAM_IDS: readonly string[] = ['3046513'] // Amed

export function isPredictionBlocked(match: Pick<Match, 'homeTeamId' | 'awayTeamId'>): boolean {
  return BLOCKED_TEAM_IDS.includes(match.homeTeamId) || BLOCKED_TEAM_IDS.includes(match.awayTeamId)
}
