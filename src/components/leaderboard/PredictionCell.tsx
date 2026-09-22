import { Check, Circle, Lock, Minus, X } from 'lucide-react'
import { cn } from '@/lib/cn'
import type { CellState } from '@/lib/liveScoring'

const tierStyles: Record<string, { className: string; Icon: typeof Check; label: string }> = {
  exact: { className: 'bg-success/15 text-success', Icon: Check, label: 'Tam isabet' },
  goalDiff: { className: 'bg-warning/15 text-warning', Icon: Minus, label: 'Doğru gol farkı' },
  tendency: { className: 'bg-tendency/15 text-tendency-foreground', Icon: Circle, label: 'Doğru eğilim' },
  wrong: { className: 'bg-destructive/10 text-destructive', Icon: X, label: 'Yanlış tahmin' },
}

export function PredictionCell({ state, isLive }: { state: CellState; isLive?: boolean }) {
  if (state.kind === 'hidden') {
    return (
      <div className="flex flex-col items-center justify-center gap-0.5 text-muted-foreground/60">
        <Lock className="size-3.5" />
      </div>
    )
  }

  if (state.kind === 'no-prediction') {
    return <span className="text-muted-foreground/50">—</span>
  }

  if (state.kind === 'pending') {
    // Bare "1-0" read as if the match had already finished that way — label
    // it explicitly as a prediction, not a result.
    return (
      <div
        className="flex flex-col items-center gap-0"
        title={`Tahmin: ${state.homeGoals}-${state.awayGoals}`}
      >
        <span className="text-[9px] font-medium leading-none text-muted-foreground/70">Tahmin</span>
        <span className="text-sm font-medium text-muted-foreground">
          {state.homeGoals}-{state.awayGoals}
        </span>
      </div>
    )
  }

  const style = tierStyles[state.tier]
  const Icon = style.Icon

  return (
    <div
      className={cn('flex flex-col items-center gap-0.5 rounded-lg px-1.5 py-1', style.className)}
      title={`Tahmin: ${state.homeGoals}-${state.awayGoals}\nSonuç: ${style.label}\nKazanılan puan: ${state.points}`}
    >
      <div className="flex items-center gap-1">
        <span className="text-sm font-bold tabular-nums">
          {state.homeGoals}-{state.awayGoals}
        </span>
        <Icon className="size-3" strokeWidth={3} />
      </div>
      <span className={cn('text-[10px] font-semibold leading-none', isLive && 'animate-pulse')}>
        {isLive ? `${state.points}p ●` : `${state.points}p`}
      </span>
    </div>
  )
}
