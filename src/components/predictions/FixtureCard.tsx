import { Lock } from 'lucide-react'
import { useEffect, useState } from 'react'
import { ScoreInput } from './ScoreInput'
import { useAuth } from '@/contexts/AuthContext'
import { saveMyPrediction } from '@/firebase/predictionActions'
import { useMyPrediction } from '@/hooks/useMyPrediction'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { TeamCrest } from '@/components/standings/TeamCrest'
import { computeCellState } from '@/lib/liveScoring'
import { cn } from '@/lib/cn'
import { formatKickoff, isLocked } from '@/lib/time'
import type { Match, Team } from '@/shared/types'

function MatchStatusBadge({ match }: { match: Match }) {
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
    <span className={cn('flex items-center gap-1.5 font-semibold', isLive ? 'text-accent' : 'text-foreground')}>
      {isLive ? (match.status === 'HT' ? 'Devre arası' : `Canlı · ${match.elapsedMinutes ?? 0}'`) : 'Bitti'}
      <span className="tabular-nums">{score}</span>
      {isLive && <span className="size-1.5 animate-pulse rounded-full bg-accent" />}
    </span>
  )
}

export function FixtureCard({
  match,
  communityId,
  allCommunityIds,
  homeTeam,
  awayTeam,
}: {
  match: Match
  communityId: string
  allCommunityIds: string[]
  homeTeam: Team | undefined
  awayTeam: Team | undefined
}) {
  const { user } = useAuth()
  const { prediction, loading } = useMyPrediction(communityId, match.id)
  const locked = isLocked(match.kickoffAt) || match.status !== 'SCHEDULED'

  const [draft, setDraft] = useState({ home: 0, away: 0 })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (prediction) setDraft({ home: prediction.homeGoals, away: prediction.awayGoals })
  }, [prediction])

  const isDirty =
    !prediction || prediction.homeGoals !== draft.home || prediction.awayGoals !== draft.away

  const cellState = prediction ? computeCellState(match, prediction) : null

  async function handleSave() {
    if (!user) return
    setSaving(true)
    setSaved(false)
    try {
      await saveMyPrediction(user.uid, match.id, draft.home, draft.away, allCommunityIds)
      setSaved(true)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card className="flex flex-col gap-3 p-4">
      <div className="flex items-center justify-between text-xs">
        <MatchStatusBadge match={match} />
        {locked && (
          <span className="flex items-center gap-1 font-medium text-muted-foreground">
            <Lock className="size-3" />
            Kilitli
          </span>
        )}
      </div>

      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-1 items-center gap-2">
          <TeamCrest team={homeTeam} size={28} />
          <span className="truncate text-sm font-medium">{homeTeam?.shortName ?? '—'}</span>
        </div>

        {loading ? (
          <div className="h-10 w-24 animate-pulse rounded-md bg-surface-muted" />
        ) : (
          <ScoreInput
            homeGoals={draft.home}
            awayGoals={draft.away}
            disabled={locked}
            onChange={(home, away) => {
              setDraft({ home, away })
              setSaved(false)
            }}
          />
        )}

        <div className="flex flex-1 items-center justify-end gap-2">
          <span className="truncate text-sm font-medium">{awayTeam?.shortName ?? '—'}</span>
          <TeamCrest team={awayTeam} size={28} />
        </div>
      </div>

      {!locked && (
        <Button size="sm" onClick={handleSave} disabled={!isDirty || saving} className="self-end">
          {saving ? 'Kaydediliyor…' : saved ? 'Kaydedildi ✓' : 'Tahmini kaydet'}
        </Button>
      )}

      {locked && cellState?.kind === 'scored' && (
        <p className="text-right text-xs font-medium text-muted-foreground">
          Bu tahminden{' '}
          <span className={cellState.points > 0 ? 'text-success' : 'text-destructive'}>
            {cellState.points} puan
          </span>{' '}
          {cellState.isLive ? 'kazanıyorsun (canlı)' : 'kazandın'}
        </p>
      )}
    </Card>
  )
}
