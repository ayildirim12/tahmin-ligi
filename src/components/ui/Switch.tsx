import { cn } from '@/lib/cn'

/**
 * Deliberately positions the thumb via an inline `transform` (not a
 * Tailwind `translate-x-*` utility toggled by string interpolation) — a
 * dynamic class built as `` `...${on ? 'translate-x-5' : 'translate-x-0.5'}` ``
 * silently failed to generate the off-state utility (Tailwind's class
 * scanner didn't pick up the decimal-valued class nested in that ternary),
 * leaving the thumb visually stuck at the "on" position even when `on` was
 * false. Inline style sidesteps the scanner entirely for this dynamic value.
 */
export function Switch({
  checked,
  onCheckedChange,
  className,
}: {
  checked: boolean
  onCheckedChange: () => void
  className?: string
}) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={onCheckedChange}
      className={cn(
        'relative h-6 w-11 shrink-0 rounded-full transition-colors',
        checked ? 'bg-primary' : 'bg-border',
        className,
      )}
    >
      <span
        className="absolute top-0.5 left-0.5 size-5 rounded-full bg-surface shadow transition-transform"
        style={{ transform: checked ? 'translateX(20px)' : 'translateX(0)' }}
      />
    </button>
  )
}
