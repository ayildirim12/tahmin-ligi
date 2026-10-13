// One-off discovery: finds the Champions League league id in Highlightly and prints the round
// names / standings shape so the UCL sync can be written against real data. ~5 requests.
import { config, requireHighlightlyKey } from './config.ts'

const BASE_URL = 'https://soccer.highlightly.net'

async function get(path: string, params: Record<string, string | number>) {
  const url = new URL(`${BASE_URL}${path}`)
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, String(v))
  const res = await fetch(url, { headers: { 'x-rapidapi-key': requireHighlightlyKey() } })
  const text = await res.text()
  if (!res.ok) throw new Error(`${path} ${res.status} ${text.slice(0, 300)}`)
  return JSON.parse(text)
}

const attempts: Array<Record<string, string | number>> = [
  { leagueName: 'UEFA Champions League' },
  { leagueName: 'Champions League' },
  { leagueName: 'UEFA Champions League', season: 2026 },
  { leagueName: 'Champions League', countryName: 'Europe' },
  { leagueName: 'Champions League', countryName: 'World' },
  { leagueName: 'Champions League', countryName: 'International' },
]
let leagues: any = { data: [] }
for (const params of attempts) {
  const res = await get('/leagues', params)
  const list = res.data ?? res
  console.log('TRY', JSON.stringify(params), '->', Array.isArray(list) ? list.length : JSON.stringify(res).slice(0, 200))
  if (Array.isArray(list) && list.length) {
    leagues = { data: list }
    console.log('LEAGUES', JSON.stringify(list.map((l: any) => ({ id: l.id, name: l.name, country: l.country?.name, seasons: l.seasons?.map((x: any) => x.season) }))))
    break
  }
}

const ucl = leagues.data?.find((l: any) => /^uefa champions league$/i.test(l.name)) ?? leagues.data?.[0]
if (!ucl) throw new Error('no league found')
console.log('PICKED', ucl.id, ucl.name)

const season = process.env.UCL_SEASON ?? config.season
const matches: any[] = []
for (let offset = 0; offset < 300; offset += 100) {
  const page = await get('/matches', { leagueId: ucl.id, season, limit: 100, offset })
  matches.push(...(page.data ?? []))
  console.log('PAGE', offset, 'count', page.data?.length, 'pagination', JSON.stringify(page.pagination))
  if ((page.data?.length ?? 0) < 100) break
}
const rounds = new Map<string, { n: number; first: string; last: string }>()
for (const m of matches) {
  const r = rounds.get(m.round) ?? { n: 0, first: m.date, last: m.date }
  r.n++
  if (m.date < r.first) r.first = m.date
  if (m.date > r.last) r.last = m.date
  rounds.set(m.round, r)
}
console.log('ROUNDS', JSON.stringify([...rounds.entries()], null, 1))
console.log('SAMPLE', JSON.stringify(matches[0], null, 1))
console.log('TEAMS', JSON.stringify([...new Map(matches.flatMap((m) => [m.homeTeam, m.awayTeam]).map((t) => [t.id, t.name])).entries()]))

const standings = await get('/standings', { leagueId: ucl.id, season })
console.log('STANDINGS groups', standings.groups?.length, 'first group name', standings.groups?.[0]?.name, 'rows', standings.groups?.[0]?.standings?.length)
console.log('STANDINGS SAMPLE', JSON.stringify(standings.groups?.[0]?.standings?.[0], null, 1), JSON.stringify(Object.keys(standings)))
