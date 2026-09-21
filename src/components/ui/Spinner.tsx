import { cn } from '@/lib/cn'

export function Spinner({ className }: { className?: string }) {
  return (
    <div
      role="status"
      aria-label="Yükleniyor"
      className={cn(
        'size-5 animate-spin rounded-full border-2 border-border border-t-primary',
        className,
      )}
    />
  )
}

export function FullScreenSpinner() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Spinner className="size-8" />
    </div>
  )
}
