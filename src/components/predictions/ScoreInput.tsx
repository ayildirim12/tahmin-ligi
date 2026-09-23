import { useEffect, useState } from 'react'
import { cn } from '@/lib/cn'

function clamp(n: number) {
  return Math.min(20, Math.max(0, n))
}

function ScoreField({
  value,
  onCommit,
  disabled,
  label,
}: {
  value: number | null
  onCommit: (next: number) => void
  disabled: boolean
  label: string
}) {
  const [text, setText] = useState(value === null ? '' : String(value))

  useEffect(() => {
    setText(value === null ? '' : String(value))
  }, [value])

  function commit(raw: string) {
    // Leaving an untouched (empty) field without typing anything shouldn't
    // turn it into a "0" — only actually clearing a field that had a value
    // resets it to 0.
    if (raw === '' && value === null) {
      setText('')
      return
    }
    const parsed = Number.parseInt(raw, 10)
    const next = Number.isNaN(parsed) ? 0 : clamp(parsed)
    setText(String(next))
    if (next !== value) onCommit(next)
  }

  return (
    <input
      aria-label={label}
      disabled={disabled}
      inputMode="numeric"
      pattern="[0-9]*"
      maxLength={2}
      value={text}
      onChange={(e) => {
        const digitsOnly = e.target.value.replace(/[^0-9]/g, '')
        setText(digitsOnly)
      }}
      onBlur={(e) => commit(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') e.currentTarget.blur()
      }}
      className={cn(
        'h-10 w-11 rounded-lg border border-border bg-background text-center text-lg font-bold tabular-nums text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:bg-surface-muted disabled:text-muted-foreground',
      )}
    />
  )
}

export function ScoreInput({
  homeGoals,
  awayGoals,
  onChange,
  disabled,
  className,
}: {
  homeGoals: number | null
  awayGoals: number | null
  onChange: (homeGoals: number | null, awayGoals: number | null) => void
  disabled?: boolean
  className?: string
}) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <ScoreField
        label="Ev sahibi golü"
        value={homeGoals}
        disabled={!!disabled}
        onCommit={(v) => onChange(v, awayGoals)}
      />
      <span className="text-muted-foreground">-</span>
      <ScoreField
        label="Deplasman golü"
        value={awayGoals}
        disabled={!!disabled}
        onCommit={(v) => onChange(homeGoals, v)}
      />
    </div>
  )
}
