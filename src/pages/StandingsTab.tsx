import { StandingsTable } from '@/components/standings/StandingsTable'
import { ZoneLegend } from '@/components/standings/ZoneLegend'
import { Spinner } from '@/components/ui/Spinner'
import { useStandings } from '@/hooks/useStandings'
import { useTeams } from '@/hooks/useTeams'
import { formatRelativeToNow } from '@/lib/time'

export function StandingsTab() {
  const { rows, updatedAt, loading } = useStandings()
  const { teams } = useTeams()

  return (
    <div className="flex flex-col gap-4 pt-2">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold">Süper Lig Puan Durumu</h1>
        {updatedAt && (
          <span className="text-xs text-muted-foreground">{formatRelativeToNow(updatedAt)} güncellendi</span>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-10">
          <Spinner />
        </div>
      ) : rows.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">
          Puan durumu henüz senkronize edilmedi.
        </p>
      ) : (
        <>
          <StandingsTable rows={rows} teams={teams} />
          <ZoneLegend />
        </>
      )}
    </div>
  )
}
