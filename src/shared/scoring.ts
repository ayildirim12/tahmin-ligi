import type { ScoreLine } from './types'

/**
 * Fixed, site-wide "Points rule: 2-5 points" scoring — no home/away
 * distinction, just win vs draw:
 *   Win:  tendency 2, goal-difference 3, exact result 5
 *   Draw: tendency 2, exact result 5 (goal-difference is always 0 in a draw,
 *         so tendency-correct-but-not-exact IS the 2-point case)
 *
 * Branches on the *actual* outcome type first — a naive "check exact, then
 * check goal-difference, then check tendency" cascade would misclassify a
 * tendency-only draw guess (predicted 1-1, actual 2-2) as goal-difference-correct,
 * since a draw's goal difference is always 0.
 */
export function computeMatchPoints(prediction: ScoreLine, actual: ScoreLine): number {
  const predOutcome = Math.sign(prediction.homeGoals - prediction.awayGoals)
  const actOutcome = Math.sign(actual.homeGoals - actual.awayGoals)

  if (predOutcome !== actOutcome) return 0

  const exact =
    prediction.homeGoals === actual.homeGoals && prediction.awayGoals === actual.awayGoals

  if (actOutcome === 0) {
    // Draw
    return exact ? 5 : 2
  }

  // Win (home or away — same point value either way)
  if (exact) return 5
  const goalDiffCorrect =
    prediction.homeGoals - prediction.awayGoals === actual.homeGoals - actual.awayGoals
  return goalDiffCorrect ? 3 : 2
}

/** Backs the "Wins" tie-break metric: number of tendency-or-better predictions. */
export function isTendencyOrBetter(points: number): boolean {
  return points > 0
}

export type ScoreTier = 'exact' | 'goalDiff' | 'tendency' | 'wrong'

/** Same outcome-first logic as computeMatchPoints, but returns the tier label a UI needs to color a cell. */
export function classifyPrediction(prediction: ScoreLine, actual: ScoreLine): ScoreTier {
  const predOutcome = Math.sign(prediction.homeGoals - prediction.awayGoals)
  const actOutcome = Math.sign(actual.homeGoals - actual.awayGoals)

  if (predOutcome !== actOutcome) return 'wrong'

  const exact =
    prediction.homeGoals === actual.homeGoals && prediction.awayGoals === actual.awayGoals
  if (exact) return 'exact'

  if (actOutcome === 0) return 'tendency'

  const goalDiffCorrect =
    prediction.homeGoals - prediction.awayGoals === actual.homeGoals - actual.awayGoals
  return goalDiffCorrect ? 'goalDiff' : 'tendency'
}
