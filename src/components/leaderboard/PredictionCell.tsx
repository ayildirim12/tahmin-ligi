import { Check, Circle, Lock, Minus, X } from 'lucide-react'
import { cn } from '@/lib/cn'
import type { CellState } from '@/lib/liveScoring'

const tierStyles: Record<string, { className: string; Icon: typeof Check }> = {
  exact: { className: 'bg-success/15 text-success', Icon: Check },
  goalDiff: { className: 'bg-warning/15 text-warning', Icon: Minus },
  tendency: { className: 'bg-tendency/15 text-tendency-foreground', Icon: Circle },
  wrong: { className: 'bg-destructive/10 text-destructive', Icon: X },
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
    return (
      <span className="text-sm font-medium text-muted-foreground">
        {state.homeGoals}-{state.awayGoals}
      </span>
    )
  }

  const style = tierStyles[state.tier]
  const Icon = style.Icon

  return (
    <div className={cn('flex flex-col items-center gap-0.5 rounded-lg px-1.5 py-1', style.className)}>
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
