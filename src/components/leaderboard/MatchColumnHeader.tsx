import { TeamCrest } from '@/components/standings/TeamCrest'
import { formatKickoff } from '@/lib/time'
import type { Match, Team } from '@/shared/types'

export function MatchColumnHeader({
  match,
  homeTeam,
  awayTeam,
}: {
  match: Match
  homeTeam: Team | undefined
  awayTeam: Team | undefined
}) {
  const isLive = match.status === 'LIVE' || match.status === 'HT'
  const score =
    match.status === 'FINISHED'
      ? `${match.finalHomeGoals}-${match.finalAwayGoals}`
      : isLive
        ? `${match.liveHomeGoals}-${match.liveAwayGoals}`
        : null

  return (
    <th className="w-[72px] px-1 py-2.5 text-center font-medium">
      <div className="flex flex-col items-center gap-1">
        <div className="flex items-center gap-1.5">
          <TeamCrest team={homeTeam} size={18} />
          <TeamCrest team={awayTeam} size={18} />
        </div>
        {score ? (
          <span className={isLive ? 'text-[11px] font-bold text-primary' : 'text-[11px] text-muted-foreground'}>
            {score}
            {isLive && ' ●'}
          </span>
        ) : (
          <span className="text-[10px] font-normal text-muted-foreground">
            {formatKickoff(match.kickoffAt).split(' ').slice(0, 2).join(' ')}
          </span>
        )}
      </div>
    </th>
  )
}
