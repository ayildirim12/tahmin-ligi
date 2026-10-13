import { useMemo } from 'react'
import { StandingsTable } from '@/components/standings/StandingsTable'
import { ZoneLegend } from '@/components/standings/ZoneLegend'
import { StandingsTableSkeleton } from '@/components/ui/skeletons/StandingsTableSkeleton'
import { useCompetition } from '@/contexts/CompetitionContext'
import { useLiveMatches } from '@/hooks/useLiveMatches'
import { applyLiveMatches } from '@/lib/liveStandings'
import { useStandings } from '@/hooks/useStandings'
import { useTeams } from '@/hooks/useTeams'
import { COMPETITION_LABEL } from '@/lib/competitions'
import { formatRelativeToNow } from '@/lib/time'

export function StandingsTab() {
  const { competition } = useCompetition()
  const { rows, updatedAt, loading } = useStandings()
  const { teams } = useTeams()
  const allLiveMatches = useLiveMatches()
  // Only this competition's table is projected. Champions League knockout ties (gameweek > 8)
  // never count towards the league-stage table.
  const liveMatches = useMemo(
    () => allLiveMatches.filter((m) => m.competition === competition && (competition !== 'ucl' || m.gameweek <= 8)),
    [allLiveMatches, competition],
  )
  const { rows: liveRows, liveTeamIds } = useMemo(() => applyLiveMatches(rows, liveMatches), [rows, liveMatches])

  return (
    <div className="flex flex-col gap-4 pt-2">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold">{COMPETITION_LABEL[competition]} Puan Durumu</h1>
        {updatedAt && (
          <span className="text-xs text-muted-foreground">{formatRelativeToNow(updatedAt)} güncellendi</span>
        )}
      </div>

      {loading ? (
        <StandingsTableSkeleton />
      ) : rows.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">
          Puan durumu henüz senkronize edilmedi.
        </p>
      ) : (
        <>
          {liveTeamIds.size > 0 && (
            <p className="text-xs text-muted-foreground">
              <span className="mr-1 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" />
              Canlı maçlar şu anki skorlarıyla tabloya yansıtıldı.
            </p>
          )}
          <StandingsTable rows={liveRows} teams={teams} liveTeamIds={liveTeamIds} competition={competition} />
          <ZoneLegend competition={competition} />
        </>
      )}
    </div>
  )
}
