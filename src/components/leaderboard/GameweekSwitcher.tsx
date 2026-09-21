import { ChevronLeft, ChevronRight } from 'lucide-react'
import { IconButton } from '@/components/ui/IconButton'

export function GameweekSwitcher({
  gameweek,
  onChange,
  maxGameweek,
}: {
  gameweek: number
  onChange: (next: number) => void
  maxGameweek: number
}) {
  return (
    <div className="flex items-center gap-1">
      <IconButton
        aria-label="Önceki hafta"
        disabled={gameweek <= 1}
        onClick={() => onChange(gameweek - 1)}
      >
        <ChevronLeft className="size-4" />
      </IconButton>
      <span className="min-w-[72px] text-center text-sm font-medium">{gameweek}. hafta</span>
      <IconButton
        aria-label="Sonraki hafta"
        disabled={gameweek >= maxGameweek}
        onClick={() => onChange(gameweek + 1)}
      >
        <ChevronRight className="size-4" />
      </IconButton>
    </div>
  )
}
