import { classifyPrediction, computeMatchPoints, type ScoreTier } from '@/shared/scoring'
import type { Match, Prediction } from '@/shared/types'

export type CellState =
  | { kind: 'hidden' } // not locked yet and not the viewer's own prediction
  | { kind: 'no-prediction' } // locked/finished, but the member never predicted
  | { kind: 'pending'; homeGoals: number; awayGoals: number } // predicted (own tip), no score yet
  | {
      kind: 'scored'
      homeGoals: number
      awayGoals: number
      points: number
      tier: ScoreTier
      isLive: boolean
    }

function actualScore(match: Match): { homeGoals: number; awayGoals: number } | null {
  if (match.status === 'FINISHED') {
    if (match.finalHomeGoals !== null && match.finalAwayGoals !== null) {
      return { homeGoals: match.finalHomeGoals, awayGoals: match.finalAwayGoals }
    }
  }
  if (match.status === 'LIVE' || match.status === 'HT') {
    if (match.liveHomeGoals !== null && match.liveAwayGoals !== null) {
      return { homeGoals: match.liveHomeGoals, awayGoals: match.liveAwayGoals }
    }
  }
  return null
}

/**
 * `prediction` should already be `null` when the security rules would hide
 * it (not locked and not the viewer's own) — see useGameweekPredictions.
 */
export function computeCellState(match: Match, prediction: Prediction | null): CellState {
  if (prediction === null) {
    return match.status === 'SCHEDULED' ? { kind: 'hidden' } : { kind: 'no-prediction' }
  }

  const actual = actualScore(match)
  if (actual === null) {
    return { kind: 'pending', homeGoals: prediction.homeGoals, awayGoals: prediction.awayGoals }
  }

  // Trust the worker's finalized points once a match is done and finalized —
  // avoids ever disagreeing with what actually got added to totalPoints —
  // but still derive the tier locally for cell coloring.
  const points =
    match.status === 'FINISHED' && match.pointsFinalized && prediction.points !== null
      ? prediction.points
      : computeMatchPoints(prediction, actual)

  return {
    kind: 'scored',
    homeGoals: prediction.homeGoals,
    awayGoals: prediction.awayGoals,
    points,
    tier: classifyPrediction(prediction, actual),
    isLive: match.status !== 'FINISHED',
  }
}
