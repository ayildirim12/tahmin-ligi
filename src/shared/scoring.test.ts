import { describe, expect, it } from 'vitest'
import { classifyPrediction, computeMatchPoints, isTendencyOrBetter } from './scoring'

describe('computeMatchPoints', () => {
  it('awards 0 for a wrong tendency', () => {
    expect(computeMatchPoints({ homeGoals: 1, awayGoals: 2 }, { homeGoals: 2, awayGoals: 1 })).toBe(0)
  })

  it('awards win goal-difference points', () => {
    expect(computeMatchPoints({ homeGoals: 1, awayGoals: 0 }, { homeGoals: 2, awayGoals: 1 })).toBe(3)
  })

  it('awards draw tendency points when not exact', () => {
    expect(computeMatchPoints({ homeGoals: 0, awayGoals: 0 }, { homeGoals: 1, awayGoals: 1 })).toBe(2)
  })

  it('awards away-win exact result points', () => {
    expect(computeMatchPoints({ homeGoals: 1, awayGoals: 2 }, { homeGoals: 1, awayGoals: 2 })).toBe(5)
  })

  it('awards exact draw result points', () => {
    expect(computeMatchPoints({ homeGoals: 1, awayGoals: 1 }, { homeGoals: 1, awayGoals: 1 })).toBe(5)
  })

  it('awards exact home-win result points', () => {
    expect(computeMatchPoints({ homeGoals: 2, awayGoals: 1 }, { homeGoals: 2, awayGoals: 1 })).toBe(5)
  })

  it('awards home-win tendency-only points', () => {
    expect(computeMatchPoints({ homeGoals: 3, awayGoals: 0 }, { homeGoals: 1, awayGoals: 0 })).toBe(2)
  })

  it('awards away-win goal-difference points', () => {
    expect(computeMatchPoints({ homeGoals: 0, awayGoals: 1 }, { homeGoals: 1, awayGoals: 2 })).toBe(3)
  })

  it('awards away-win tendency-only points', () => {
    expect(computeMatchPoints({ homeGoals: 0, awayGoals: 3 }, { homeGoals: 1, awayGoals: 2 })).toBe(2)
  })

  it('does not misclassify a tendency-only draw guess as goal-difference-correct', () => {
    // predicted 1-1 (GD 0), actual 2-2 (GD 0) — GD "matches" numerically but this
    // must still resolve via the draw's 2-tier scale (tendency=2), not a 3-tier cascade.
    expect(computeMatchPoints({ homeGoals: 1, awayGoals: 1 }, { homeGoals: 2, awayGoals: 2 })).toBe(2)
  })

  it('treats 0 points as not tendency-or-better', () => {
    expect(isTendencyOrBetter(0)).toBe(false)
  })

  it('treats any positive points as tendency-or-better', () => {
    expect(isTendencyOrBetter(2)).toBe(true)
    expect(isTendencyOrBetter(5)).toBe(true)
  })
})

describe('classifyPrediction', () => {
  it('classifies a wrong tendency', () => {
    expect(classifyPrediction({ homeGoals: 1, awayGoals: 2 }, { homeGoals: 2, awayGoals: 1 })).toBe('wrong')
  })

  it('classifies a tendency-only draw guess (not goal-difference)', () => {
    expect(classifyPrediction({ homeGoals: 1, awayGoals: 1 }, { homeGoals: 2, awayGoals: 2 })).toBe('tendency')
  })

  it('classifies a home-win goal-difference guess', () => {
    expect(classifyPrediction({ homeGoals: 1, awayGoals: 0 }, { homeGoals: 2, awayGoals: 1 })).toBe('goalDiff')
  })

  it('classifies an exact result', () => {
    expect(classifyPrediction({ homeGoals: 2, awayGoals: 1 }, { homeGoals: 2, awayGoals: 1 })).toBe('exact')
  })
})
