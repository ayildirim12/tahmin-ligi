import { useMemo, useState } from 'react'
import { MatchColumnHeader } from './MatchColumnHeader'
import { PredictionCell } from './PredictionCell'
import { SortableHeaderCell } from './SortableHeaderCell'
import { useAuth } from '@/contexts/AuthContext'
import { computeCellState } from '@/lib/liveScoring'
import { predictionKey } from '@/hooks/useGameweekPredictions'
import type { CommunityMember, Match, Prediction, Team } from '@/shared/types'

export function LeaderboardMatrix({
  members,
  matches,
  predictionsByKey,
  teams,
}: {
  members: CommunityMember[]
  matches: Match[]
  predictionsByKey: Record<string, Prediction>
  teams: Record<string, Team>
}) {
  const { user } = useAuth()
  const [sortKey, setSortKey] = useState<'total' | 'week'>('total')
  const [sortDesc, setSortDesc] = useState(true)

  const rows = useMemo(() => {
    return members
      .map((member) => {
        const isOwn = member.uid === user?.uid
        const cells = matches.map((match) => {
          const prediction = predictionsByKey[predictionKey(member.uid, match.id)] ?? null
          return { match, state: computeCellState(match, prediction, isOwn) }
        })
        const weekPoints = cells.reduce(
          (sum, c) => sum + (c.state.kind === 'scored' ? c.state.points : 0),
          0,
        )
        return { member, cells, weekPoints }
      })
      .sort((a, b) => {
        const diff =
          sortKey === 'total'
            ? a.member.totalPoints - b.member.totalPoints
            : a.weekPoints - b.weekPoints
        return sortDesc ? -diff : diff
      })
  }, [members, matches, predictionsByKey, sortKey, sortDesc, user?.uid])

  const toggleSort = (key: 'total' | 'week') => {
    if (sortKey === key) {
      setSortDesc((d) => !d)
    } else {
      setSortKey(key)
      setSortDesc(true)
    }
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full min-w-[560px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-border text-xs text-muted-foreground">
            <th className="sticky left-0 min-w-[140px] bg-surface py-2.5 pl-3 text-left font-medium">
              Üye
            </th>
            {matches.map((match) => (
              <MatchColumnHeader
                key={match.id}
                match={match}
                homeTeam={teams[match.homeTeamId]}
                awayTeam={teams[match.awayTeamId]}
              />
            ))}
            <SortableHeaderCell
              label="Hafta"
              active={sortKey === 'week'}
              direction={sortDesc ? 'desc' : 'asc'}
              onClick={() => toggleSort('week')}
              className="w-14"
            />
            <SortableHeaderCell
              label="Toplam"
              active={sortKey === 'total'}
              direction={sortDesc ? 'desc' : 'asc'}
              onClick={() => toggleSort('total')}
              className="w-14 pr-3"
            />
          </tr>
        </thead>
        <tbody>
          {rows.map(({ member, cells, weekPoints }, i) => (
            <tr key={member.uid} className="border-b border-border/60 last:border-0">
              <td className="sticky left-0 bg-surface py-2 pl-3">
                <div className="flex items-center gap-2">
                  <span className="w-4 text-xs font-medium text-muted-foreground">{i + 1}</span>
                  {member.photoURL && (
                    <img
                      src={member.photoURL}
                      alt=""
                      referrerPolicy="no-referrer"
                      className="size-6 shrink-0 rounded-full"
                    />
                  )}
                  <span className="max-w-[110px] truncate text-sm font-medium">
                    {member.displayName}
                  </span>
                </div>
              </td>
              {cells.map(({ match, state }) => (
                <td key={match.id} className="py-1.5 text-center">
                  <div className="flex items-center justify-center">
                    <PredictionCell
                      state={state}
                      isLive={match.status === 'LIVE' || match.status === 'HT'}
                    />
                  </div>
                </td>
              ))}
              <td className="py-2 text-center text-base font-bold">{weekPoints}</td>
              <td className="py-2 pr-3 text-center text-base font-bold text-muted-foreground">
                {member.totalPoints}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
