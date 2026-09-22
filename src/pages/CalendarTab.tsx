import { useState } from 'react'
import { GameweekSwitcher } from '@/components/leaderboard/GameweekSwitcher'
import { Card } from '@/components/ui/Card'
import { Spinner } from '@/components/ui/Spinner'
import { TeamCrest } from '@/components/standings/TeamCrest'
import { useActiveCommunity } from '@/contexts/ActiveCommunityContext'
import { useAuth } from '@/contexts/AuthContext'
import { useConfig } from '@/hooks/useConfig'
import { useGameweekMatches } from '@/hooks/useGameweekMatches'
import { useGameweekPredictions, predictionKey } from '@/hooks/useGameweekPredictions'
import { useTeams } from '@/hooks/useTeams'
import { computeCellState } from '@/lib/liveScoring'
import { formatKickoff } from '@/lib/time'
import { cn } from '@/lib/cn'
import type { Match } from '@/shared/types'

function ResultBadge({ match }: { match: Match }) {
  if (match.status === 'SCHEDULED') {
    return <span className="text-muted-foreground">{formatKickoff(match.kickoffAt)}</span>
  }
  if (match.status === 'POSTPONED') {
    return <span className="font-medium text-warning">Ertelendi</span>
  }
  if (match.status === 'CANCELLED') {
    return <span className="font-medium text-destructive">İptal edildi</span>
  }

  const isLive = match.status === 'LIVE' || match.status === 'HT'
  const score = isLive
    ? `${match.liveHomeGoals ?? 0}-${match.liveAwayGoals ?? 0}`
    : `${match.finalHomeGoals ?? 0}-${match.finalAwayGoals ?? 0}`

  return (
    <span className={cn('flex items-center gap-1.5 font-semibold', isLive ? 'text-primary' : 'text-foreground')}>
      {isLive ? (match.status === 'HT' ? 'Devre arası' : `Canlı · ${match.elapsedMinutes ?? 0}'`) : 'Bitti'}
      <span className="tabular-nums">{score}</span>
      {isLive && <span className="size-1.5 animate-pulse rounded-full bg-primary" />}
    </span>
  )
}

export function CalendarTab() {
  const { communityId } = useActiveCommunity()
  const { user } = useAuth()
  const { config } = useConfig()
  const { teams } = useTeams()
  const [gameweek, setGameweek] = useState<number | null>(null)

  const activeGameweek = gameweek ?? config?.currentGameweek ?? null
  const { matches, loading: matchesLoading } = useGameweekMatches(activeGameweek)
  const { predictionsByKey, loading: predictionsLoading } = useGameweekPredictions(communityId)

  const loading = matchesLoading || predictionsLoading

  return (
    <div className="flex flex-col gap-4 pt-2">
      <h1 className="text-lg font-bold">Takvim</h1>

      {activeGameweek && (
        <div className="flex justify-center">
          <GameweekSwitcher
            gameweek={activeGameweek}
            onChange={setGameweek}
            maxGameweek={config?.currentGameweek ?? activeGameweek}
          />
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-10">
          <Spinner />
        </div>
      ) : matches.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">
          Bu hafta için henüz fikstür senkronize edilmedi.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {matches.map((match) => {
            const own = user ? predictionsByKey[predictionKey(user.uid, match.id)] : null
            const cellState = own ? computeCellState(match, own, true) : null

            return (
              <Card key={match.id} className="flex flex-col gap-2 p-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex flex-1 items-center gap-2">
                    <TeamCrest team={teams[match.homeTeamId]} size={24} />
                    <span className="truncate text-sm font-medium">
                      {teams[match.homeTeamId]?.shortName ?? '—'}
                    </span>
                  </div>
                  <ResultBadge match={match} />
                  <div className="flex flex-1 items-center justify-end gap-2">
                    <span className="truncate text-sm font-medium">
                      {teams[match.awayTeamId]?.shortName ?? '—'}
                    </span>
                    <TeamCrest team={teams[match.awayTeamId]} size={24} />
                  </div>
                </div>

                {cellState?.kind === 'scored' && (
                  <p className="text-right text-xs text-muted-foreground">
                    Tahminin: {cellState.homeGoals}-{cellState.awayGoals} ·{' '}
                    <span className={cellState.points > 0 ? 'text-success' : 'text-destructive'}>
                      {cellState.points} puan
                    </span>
                  </p>
                )}
                {cellState?.kind === 'pending' && (
                  <p className="text-right text-xs text-muted-foreground">
                    Tahminin: {cellState.homeGoals}-{cellState.awayGoals}
                  </p>
                )}
                {cellState?.kind === 'no-prediction' && (
                  <p className="text-right text-xs text-muted-foreground">Bu maça tahmin yapmadın.</p>
                )}
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
