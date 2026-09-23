import { Radar, Users } from 'lucide-react'
import type { ReactNode } from 'react'
import { BrandLink } from './BrandLink'

// A single gold spotlight anchored to one corner, plus a tight fine-mesh
// texture — reads as a broadcast graphic, not a soft SaaS gradient blob.
const BACKDROP_STYLE = {
  backgroundImage: [
    'radial-gradient(ellipse 70% 55% at 100% -10%, color-mix(in oklch, var(--primary) 16%, transparent), transparent 60%)',
    'repeating-linear-gradient(90deg, color-mix(in oklch, var(--foreground) 3%, transparent) 0px, transparent 1px, transparent 8px)',
  ].join(', '),
}

/** Shared shell for the pre-auth screens (Landing/Login/NotFound) — a single
 *  bordered panel over an ambient backdrop, so the three pages stay visually
 *  identical without literally duplicating the markup. */
export function AuthHeroShell({
  title,
  description,
  icon,
  showBrandLink = false,
  featureChips = false,
  children,
}: {
  title: string
  description: string
  /** Custom icon element (e.g. NotFoundPage's compass); omit to show the app's own mark. */
  icon?: ReactNode
  showBrandLink?: boolean
  featureChips?: boolean
  children: ReactNode
}) {
  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-background">
      <div className="pointer-events-none absolute inset-0" style={BACKDROP_STYLE} />

      {showBrandLink && (
        <div className="relative px-4 pt-4">
          <BrandLink />
        </div>
      )}

      <div className="relative flex flex-1 items-center justify-center px-4 py-10">
        <div className="flex w-full max-w-sm flex-col items-center gap-7 rounded-2xl border border-t-4 border-border border-t-primary bg-surface px-8 py-10 text-center shadow-xl">
          <div className="flex flex-col items-center gap-4">
            {icon ?? (
              <img
                src="/brand/logo-full-512.png"
                alt=""
                width={512}
                height={541}
                className="h-auto w-36 object-contain drop-shadow-lg"
              />
            )}
            <div className="flex flex-col items-center gap-1.5">
              <h1 className="font-display text-2xl tracking-wide">{title}</h1>
              <p className="max-w-[22rem] text-sm text-balance text-muted-foreground">{description}</p>
            </div>
          </div>

          {featureChips && (
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <Radar className="size-3.5 text-primary" /> Canlı skorlar
              </span>
              <span className="h-3 w-px bg-border" aria-hidden="true" />
              <span className="inline-flex items-center gap-1.5">
                <Users className="size-3.5 text-primary" /> Arkadaş toplulukları
              </span>
            </div>
          )}

          {children}
        </div>
      </div>
    </div>
  )
}
