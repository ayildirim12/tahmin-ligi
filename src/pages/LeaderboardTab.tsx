import { useState } from 'react'
import { GameweekSwitcher } from '@/components/leaderboard/GameweekSwitcher'
import { LeaderboardMatrix } from '@/components/leaderboard/LeaderboardMatrix'
import { Spinner } from '@/components/ui/Spinner'
import { useActiveCommunity } from '@/contexts/ActiveCommunityContext'
import { useConfig } from '@/hooks/useConfig'
import { useGameweekMatches } from '@/hooks/useGameweekMatches'
import { useGameweekPredictions } from '@/hooks/useGameweekPredictions'
import { useMembers } from '@/hooks/useMembers'
import { useTeams } from '@/hooks/useTeams'

export function LeaderboardTab() {
  const { communityId } = useActiveCommunity()
  const { config } = useConfig()
  const { members, loading: membersLoading } = useMembers(communityId)
  const { teams } = useTeams()
  const [gameweek, setGameweek] = useState<number | null>(null)

  const activeGameweek = gameweek ?? config?.currentGameweek ?? null
  const { matches, loading: matchesLoading } = useGameweekMatches(activeGameweek)
  const { predictionsByKey, loading: predictionsLoading } = useGameweekPredictions(communityId)

  const loading = membersLoading || matchesLoading || predictionsLoading

  return (
    <div className="flex flex-col gap-4 pt-2">
      <h1 className="text-lg font-bold">Sıralama</h1>

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
      ) : members.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">Henüz üye yok.</p>
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
