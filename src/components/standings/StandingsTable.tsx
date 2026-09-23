import { FormBadge } from './FormBadge'
import { TeamCrest } from './TeamCrest'
import { zoneForPosition } from '@/lib/standingsZones'
import type { StandingsRow, Team } from '@/shared/types'

export function StandingsTable({
  rows,
  teams,
}: {
  rows: StandingsRow[]
  teams: Record<string, Team>
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full min-w-[640px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-border text-xs text-muted-foreground">
            <th className="w-10 py-2.5 pl-3 text-left font-medium">#</th>
            <th className="sticky left-0 min-w-[160px] bg-surface py-2.5 text-left font-medium">
              Takım
            </th>
            <th className="w-9 py-2.5 text-center font-medium">O</th>
            <th className="w-9 py-2.5 text-center font-medium">G</th>
            <th className="w-9 py-2.5 text-center font-medium">B</th>
            <th className="w-9 py-2.5 text-center font-medium">M</th>
            <th className="w-10 py-2.5 text-center font-medium">A</th>
            <th className="w-10 py-2.5 text-center font-medium">Y</th>
            <th className="w-10 py-2.5 text-center font-medium">AV</th>
            <th className="w-12 py-2.5 text-center font-semibold">P</th>
            <th className="py-2.5 pr-3 text-center font-medium">Son 5</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const zone = zoneForPosition(row.position)
            const team = teams[row.teamId]
            return (
              <tr key={row.teamId} className="border-b border-border/60 last:border-0 hover:bg-surface-muted/50">
                <td className="relative py-2.5 pl-3 text-left font-medium">
                  {zone && (
                    <span
                      className="absolute left-0 top-0 h-full w-1"
                      style={{ backgroundColor: zone.color }}
                    />
                  )}
                  {row.position}
                </td>
                <td className="sticky left-0 min-w-[160px] bg-surface py-2.5 font-medium">
                  <div className="flex items-center gap-2">
                    <TeamCrest team={team} size={20} />
                    <span className="truncate">{team?.shortName ?? row.teamId}</span>
                  </div>
                </td>
                <td className="text-center tabular-nums text-muted-foreground">{row.played}</td>
                <td className="text-center tabular-nums text-muted-foreground">{row.won}</td>
                <td className="text-center tabular-nums text-muted-foreground">{row.drawn}</td>
                <td className="text-center tabular-nums text-muted-foreground">{row.lost}</td>
                <td className="text-center tabular-nums text-muted-foreground">{row.goalsFor}</td>
                <td className="text-center tabular-nums text-muted-foreground">{row.goalsAgainst}</td>
                <td className="text-center tabular-nums text-muted-foreground">{row.goalDiff}</td>
                <td className="text-center font-display text-base tabular-nums">{row.points}</td>
                <td className="py-2.5 pr-3">
                  <div className="flex items-center justify-center gap-1">
                    {row.form.map((result, i) => (
                      <FormBadge key={i} result={result} />
                    ))}
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
