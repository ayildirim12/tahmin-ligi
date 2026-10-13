import { config } from './config.ts'

export type CompetitionId = 'superlig' | 'ucl'

export interface Competition {
  id: CompetitionId
  leagueId: number
  /** Document under `standings/`. */
  standingsDocId: string
  /** Document under `meta/` holding season, currentGameweek and the housekeeping timestamps. */
  metaDocId: string
  fixtureSyncIntervalMs: number
  standingsSyncIntervalMs: number
  /** Member-doc fields the finalizer increments. Süper Lig keeps the original unprefixed names. */
  memberFields: { points: string; predictions: string; wins: string }
}

const HOUR = 60 * 60_000

export const COMPETITIONS: Record<CompetitionId, Competition> = {
  superlig: {
    id: 'superlig',
    leagueId: config.leagueId,
    standingsDocId: 'superlig',
    metaDocId: 'config',
    fixtureSyncIntervalMs: 24 * HOUR,
    standingsSyncIntervalMs: 8 * HOUR,
    memberFields: { points: 'totalPoints', predictions: 'totalPredictions', wins: 'winsCount' },
  },
  ucl: {
    id: 'ucl',
    leagueId: config.uclLeagueId,
    standingsDocId: 'ucl',
    metaDocId: 'ucl',
    fixtureSyncIntervalMs: 24 * HOUR,
    standingsSyncIntervalMs: 12 * HOUR,
    memberFields: { points: 'uclTotalPoints', predictions: 'uclTotalPredictions', wins: 'uclWinsCount' },
  },
}

export const ALL_COMPETITIONS = Object.values(COMPETITIONS)

/** Match docs written before competitions existed carry no field — they are all Süper Lig. */
export function competitionOf(matchData: { competition?: unknown } | undefined): CompetitionId {
  return matchData?.competition === 'ucl' ? 'ucl' : 'superlig'
}
