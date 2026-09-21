import { ChevronDown, ChevronUp } from 'lucide-react'
import { cn } from '@/lib/cn'

export function SortableHeaderCell({
  label,
  active,
  direction,
  onClick,
  className,
}: {
  label: string
  active: boolean
  direction: 'asc' | 'desc'
  onClick: () => void
  className?: string
}) {
  return (
    <th className={cn('py-2.5 text-center font-medium', className)}>
      <button
        type="button"
        onClick={onClick}
        className={cn(
          'inline-flex items-center gap-0.5 rounded px-1 hover:text-foreground',
          active ? 'font-semibold text-foreground' : 'text-muted-foreground',
        )}
      >
        {label}
        {active &&
          (direction === 'desc' ? (
            <ChevronDown className="size-3" />
          ) : (
            <ChevronUp className="size-3" />
          ))}
      </button>
    </th>
  )
}
