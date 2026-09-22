import { CompassIcon } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { BrandLink } from '@/components/layout/BrandLink'

export function NotFoundPage() {
  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-background">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: [
            'radial-gradient(ellipse 60% 45% at 50% -5%, color-mix(in oklch, var(--primary) 22%, transparent), transparent)',
            'radial-gradient(ellipse 50% 40% at 100% 100%, color-mix(in oklch, var(--accent) 14%, transparent), transparent)',
            'repeating-linear-gradient(90deg, color-mix(in oklch, var(--foreground) 4%, transparent) 0px, transparent 1px, transparent 96px)',
          ].join(', '),
        }}
      />

      <div className="relative px-4 pt-4">
        <BrandLink />
      </div>

      <div className="relative flex flex-1 items-center justify-center px-4 py-10">
        <div className="flex w-full max-w-sm flex-col items-center gap-6 rounded-3xl border border-border bg-surface/80 px-8 py-10 text-center shadow-xl backdrop-blur-sm">
          <div className="flex size-16 items-center justify-center rounded-2xl bg-surface-muted text-muted-foreground">
            <CompassIcon className="size-8" strokeWidth={2} />
          </div>
          <div className="flex flex-col items-center gap-1.5">
            <h1 className="text-2xl font-bold tracking-tight">Sayfa bulunamadı</h1>
            <p className="max-w-[22rem] text-sm text-balance text-muted-foreground">
              Aradığın sayfa yok ya da taşınmış olabilir.
            </p>
          </div>
          <Link to="/" className="w-full">
            <Button size="lg" className="w-full">
              Ana sayfaya dön
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
