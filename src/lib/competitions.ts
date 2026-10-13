import type { CommunityMember, CompetitionId } from '@/shared/types'

export const COMPETITION_IDS: CompetitionId[] = ['superlig', 'ucl']

export const COMPETITION_LABEL: Record<CompetitionId, string> = {
  superlig: 'Süper Lig',
  ucl: 'Şampiyonlar Ligi',
}

/** Doc ids: `standings/{id}` and `meta/{id}` (Süper Lig's meta doc predates competitions and is `config`). */
export const STANDINGS_DOC_ID: Record<CompetitionId, string> = { superlig: 'superlig', ucl: 'ucl' }
export const META_DOC_ID: Record<CompetitionId, string> = { superlig: 'config', ucl: 'ucl' }

export function memberTotalPoints(member: CommunityMember, competition: CompetitionId): number {
  return competition === 'ucl' ? member.uclTotalPoints : member.totalPoints
}

/** Match docs written before competitions existed carry no field — they are Süper Lig. */
export function parseCompetition(value: unknown): CompetitionId {
  return value === 'ucl' ? 'ucl' : 'superlig'
}
