import { FixtureCard } from '@/components/predictions/FixtureCard'
import { MatchRowSkeleton } from '@/components/ui/skeletons/MatchRowSkeleton'
import { useActiveCommunity } from '@/contexts/ActiveCommunityContext'
import { useCommunities } from '@/hooks/useCommunities'
import { useConfig } from '@/hooks/useConfig'
import { useGameweekMatches } from '@/hooks/useGameweekMatches'
import { useTeams } from '@/hooks/useTeams'

export function PredictionCenterTab() {
  const { communityId } = useActiveCommunity()
  const { config, loading: configLoading } = useConfig()
  const { matches, loading: matchesLoading } = useGameweekMatches(config?.currentGameweek ?? null)
  const { teams } = useTeams()
  const { communities } = useCommunities()

  const loading = configLoading || matchesLoading

  return (
    <div className="flex flex-col gap-4 pt-2">
      <div>
        <h1 className="text-lg font-bold">Tahmin Merkezi</h1>
        {config && <p className="text-xs text-muted-foreground">{config.currentGameweek}. hafta</p>}
      </div>

      {loading ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <MatchRowSkeleton key={i} withAction />
          ))}
        </div>
      ) : matches.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">
          Bu hafta için henüz fikstür senkronize edilmedi.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {matches.map((match) => (
            <FixtureCard
              key={match.id}
              match={match}
              communityId={communityId}
              allCommunityIds={communities.map((c) => c.id)}
              homeTeam={teams[match.homeTeamId]}
              awayTeam={teams[match.awayTeamId]}
            />
          ))}
        </div>
      )}
    </div>
  )
}
