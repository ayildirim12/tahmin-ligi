import { useCompetition } from '@/contexts/CompetitionContext'
import { COMPETITION_IDS, COMPETITION_LABEL } from '@/lib/competitions'
import { cn } from '@/lib/cn'

export function CompetitionSwitcher() {
  const { competition, setCompetition } = useCompetition()

  return (
    <div role="tablist" aria-label="Lig seçimi" className="mb-3 flex gap-1 rounded-lg bg-surface-muted p-1">
      {COMPETITION_IDS.map((id) => (
        <button
          key={id}
          role="tab"
          aria-selected={competition === id}
          onClick={() => setCompetition(id)}
          className={cn(
            'flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
            competition === id
              ? 'bg-surface text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {COMPETITION_LABEL[id]}
        </button>
      ))}
    </div>
  )
}
