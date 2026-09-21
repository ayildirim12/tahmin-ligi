export function formatRelativeToNow(timestampMs: number, nowMs = Date.now()): string {
  const diffSeconds = Math.max(0, Math.round((nowMs - timestampMs) / 1000))

  if (diffSeconds < 5) return 'az önce'
  if (diffSeconds < 60) return `${diffSeconds} sn önce`

  const diffMinutes = Math.round(diffSeconds / 60)
  if (diffMinutes < 60) return `${diffMinutes} dk önce`

  const diffHours = Math.round(diffMinutes / 60)
  if (diffHours < 24) return `${diffHours} sa önce`

  const diffDays = Math.round(diffHours / 24)
  return `${diffDays} gün önce`
}

export function formatKickoff(timestampMs: number): string {
  return new Intl.DateTimeFormat('tr-TR', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(timestampMs))
}

export function isLocked(kickoffAtMs: number, nowMs = Date.now()): boolean {
  return nowMs >= kickoffAtMs
}
