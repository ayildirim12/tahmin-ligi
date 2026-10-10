import type { Match, StandingsRow } from '@/shared/types'

export interface LiveInfo {
  result: 'W' | 'D' | 'L'
  score: string // match score, home-away
}

/**
 * Projects the official standings forward by treating every in-progress match as if it ended
 * at its current score. Only LIVE/HT matches are applied: once a match is FINISHED the worker
 * refreshes the real standings, which then already include it (applying it again would count
 * it twice). Returns, per team in a live match, whether it is currently winning/drawing/losing so the UI can colour it.
 */
export function applyLiveMatches(
  rows: StandingsRow[],
  liveMatches: Match[],
): { rows: StandingsRow[]; liveTeamIds: Map<string, LiveInfo> } {
  const active = liveMatches.filter(
    (m) =>
      (m.status === 'LIVE' || m.status === 'HT') && m.liveHomeGoals !== null && m.liveAwayGoals !== null,
  )
  if (active.length === 0) return { rows, liveTeamIds: new Map() }

  const byTeam = new Map(rows.map((r) => [r.teamId, { ...r }]))
  const liveTeamIds = new Map<string, LiveInfo>()

  for (const m of active) {
    const home = byTeam.get(m.homeTeamId)
    const away = byTeam.get(m.awayTeamId)
    if (!home || !away) continue
    const hg = m.liveHomeGoals as number
    const ag = m.liveAwayGoals as number
    const score = `${hg}-${ag}`

    home.played++
    away.played++
    home.goalsFor += hg
    home.goalsAgainst += ag
    away.goalsFor += ag
    away.goalsAgainst += hg
    if (hg > ag) {
      home.won++
      home.points += 3
      away.lost++
      liveTeamIds.set(home.teamId, { result: 'W', score }).set(away.teamId, { result: 'L', score })
    } else if (hg < ag) {
      away.won++
      away.points += 3
      home.lost++
      liveTeamIds.set(home.teamId, { result: 'L', score }).set(away.teamId, { result: 'W', score })
    } else {
      home.drawn++
      away.drawn++
      home.points++
      away.points++
      liveTeamIds.set(home.teamId, { result: 'D', score }).set(away.teamId, { result: 'D', score })
    }
  }

  const next = [...byTeam.values()]
  for (const r of next) r.goalDiff = r.goalsFor - r.goalsAgainst
  next.sort((a, b) => b.points - a.points || b.goalDiff - a.goalDiff || b.goalsFor - a.goalsFor)
  next.forEach((r, i) => {
    r.position = i + 1
  })
  return { rows: next, liveTeamIds }
}
