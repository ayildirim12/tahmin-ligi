import { useState } from 'react'
import { GameweekSwitcher } from '@/components/leaderboard/GameweekSwitcher'
import { LeaderboardMatrix } from '@/components/leaderboard/LeaderboardMatrix'
import { LeaderboardSeasonTable } from '@/components/leaderboard/LeaderboardSeasonTable'
import { Spinner } from '@/components/ui/Spinner'
import { useActiveCommunity } from '@/contexts/ActiveCommunityContext'
import { useConfig } from '@/hooks/useConfig'
import { useGameweekMatches } from '@/hooks/useGameweekMatches'
import { useGameweekPredictions } from '@/hooks/useGameweekPredictions'
import { useMembers } from '@/hooks/useMembers'
import { useTeams } from '@/hooks/useTeams'
import { cn } from '@/lib/cn'

type View = 'week' | 'season'

export function LeaderboardTab() {
  const { communityId } = useActiveCommunity()
  const { config } = useConfig()
  const { members, loading: membersLoading } = useMembers(communityId)
  const { teams } = useTeams()
  const [view, setView] = useState<View>('week')
  const [gameweek, setGameweek] = useState<number | null>(null)

  const activeGameweek = gameweek ?? config?.currentGameweek ?? null
  const { matches, loading: matchesLoading } = useGameweekMatches(activeGameweek)
  const { predictionsByKey, loading: predictionsLoading } = useGameweekPredictions(communityId)

  const loading = membersLoading || (view === 'week' && (matchesLoading || predictionsLoading))

  return (
    <div className="flex flex-col gap-4 pt-2">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-lg font-bold">Sıralama</h1>
        <div className="flex items-center gap-1 rounded-lg bg-surface-muted p-1">
          {(['week', 'season'] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={cn(
                'rounded-md px-3 py-1.5 text-xs font-semibold transition-colors',
                view === v ? 'bg-surface shadow-sm' : 'text-muted-foreground',
              )}
            >
              {v === 'week' ? 'Bu Hafta' : 'Sezon Toplamı'}
            </button>
          ))}
        </div>
      </div>

      {view === 'week' && activeGameweek && (
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
      ) : members.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">Henüz üye yok.</p>
      ) : view === 'season' ? (
        <LeaderboardSeasonTable members={members} />
      ) : matches.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">
          Bu hafta için henüz fikstür senkronize edilmedi.
        </p>
      ) : (
        <LeaderboardMatrix
          members={members}
          matches={matches}
          predictionsByKey={predictionsByKey}
          teams={teams}
        />
      )}
    </div>
  )
}
