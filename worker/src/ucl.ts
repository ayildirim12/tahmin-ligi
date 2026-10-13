import type { HlMatch } from './highlightlyApi.ts'

// Highlightly lists the whole Champions League season in one call: summer qualifying rounds
// ("1st Qualifying Round", ..., "Play-offs" in August) plus "League Stage - 1..8" and, once
// drawn, the knockout rounds. Only the league stage onward is part of the game.
const LEAGUE_STAGE = /^league stage\s*-\s*(\d+)$/i
const LEG_GAP_MS = 3 * 24 * 60 * 60_000

export interface UclStage {
  gameweek: number
  label: string
}

export interface PlannedFixture {
  fixture: HlMatch
  gameweek: number
}

function knockoutLabel(round: string): string {
  const r = round.toLowerCase()
  if (/play-?off/.test(r)) return 'Play-off'
  if (/16/.test(r)) return 'Son 16'
  if (/quarter/.test(r)) return 'Çeyrek final'
  if (/semi/.test(r)) return 'Yarı final'
  if (/final/.test(r)) return 'Final'
  return round
}

/**
 * Maps the raw season fixture list onto our single `gameweek` number:
 *  - League Stage - N        → gameweek N (1..8)
 *  - knockout rounds         → 9, 10, ... in chronological order; a two-legged round (the
 *    play-offs, round of 16, quarter- and semi-finals) is split into one stage per leg by
 *    clustering its kickoffs (legs are weeks apart), the final stays a single stage.
 * Qualifying rounds — including the August "Play-offs", which shares its name with the
 * February knockout play-offs — are told apart by date: knockouts must kick off after the
 * last league-stage match.
 */
export function planUclFixtures(fixtures: HlMatch[]): { planned: PlannedFixture[]; stages: UclStage[] } {
  const planned: PlannedFixture[] = []
  const stages: UclStage[] = []

  let lastLeagueStageMs = 0
  for (const fixture of fixtures) {
    const m = fixture.round.match(LEAGUE_STAGE)
    if (!m) continue
    planned.push({ fixture, gameweek: Number(m[1]) })
    lastLeagueStageMs = Math.max(lastLeagueStageMs, Date.parse(fixture.date))
  }
  if (planned.length === 0) return { planned, stages }

  const leagueWeeks = [...new Set(planned.map((p) => p.gameweek))].sort((a, b) => a - b)
  for (const gw of leagueWeeks) stages.push({ gameweek: gw, label: `Lig aşaması · ${gw}. hafta` })

  const byRound = new Map<string, HlMatch[]>()
  for (const fixture of fixtures) {
    if (LEAGUE_STAGE.test(fixture.round) || Date.parse(fixture.date) <= lastLeagueStageMs) continue
    const list = byRound.get(fixture.round) ?? []
    list.push(fixture)
    byRound.set(fixture.round, list)
  }

  const rounds = [...byRound.entries()]
    .map(([round, list]) => ({ round, list: list.sort((a, b) => Date.parse(a.date) - Date.parse(b.date)) }))
    .sort((a, b) => Date.parse(a.list[0].date) - Date.parse(b.list[0].date))

  let gameweek = Math.max(8, ...leagueWeeks)
  for (const { round, list } of rounds) {
    const legs: HlMatch[][] = []
    for (const fixture of list) {
      const lastLeg = legs.at(-1)
      const prev = lastLeg?.at(-1)
      if (lastLeg && prev && Date.parse(fixture.date) - Date.parse(prev.date) <= LEG_GAP_MS) lastLeg.push(fixture)
      else legs.push([fixture])
    }
    legs.forEach((leg, i) => {
      gameweek++
      const label = knockoutLabel(round)
      stages.push({ gameweek, label: legs.length > 1 ? `${label} · ${i + 1}. maç` : label })
      for (const fixture of leg) planned.push({ fixture, gameweek })
    })
  }

  return { planned, stages }
}
