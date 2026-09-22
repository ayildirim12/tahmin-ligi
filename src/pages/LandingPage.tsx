import { Radar, Trophy, Users } from 'lucide-react'
import { useState } from 'react'
import { Navigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/Button'
import { GoogleIcon } from '@/components/icons/GoogleIcon'
import { FullScreenSpinner } from '@/components/ui/Spinner'

export function LandingPage() {
  const { user, loading, signIn } = useAuth()
  const [searchParams] = useSearchParams()
  const [signingIn, setSigningIn] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (loading) return <FullScreenSpinner />

  if (user) {
    const redirect = searchParams.get('redirect')
    return <Navigate to={redirect ? decodeURIComponent(redirect) : '/hub'} replace />
  }

  async function handleSignIn() {
    setError(null)
    setSigningIn(true)
    try {
      await signIn()
    } catch {
      setError('Giriş yapılamadı. Lütfen tekrar deneyin.')
    } finally {
      setSigningIn(false)
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4 py-12">
      {/* Ambient backdrop: soft brand glow + faint pitch-line texture, not a flat void */}
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

      <div className="relative flex w-full max-w-sm flex-col items-center gap-8 rounded-3xl border border-border bg-surface/80 px-8 py-10 text-center shadow-xl backdrop-blur-sm">
        <div className="flex flex-col items-center gap-4">
          <div className="relative flex size-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-accent text-primary-foreground shadow-lg shadow-primary/25">
            <Trophy className="size-8" strokeWidth={2.25} />
          </div>
          <div className="flex flex-col items-center gap-1.5">
            <h1 className="text-2xl font-bold tracking-tight">Tahmin Ligi</h1>
            <p className="max-w-[22rem] text-sm text-balance text-muted-foreground">
              Süper Lig maçlarını arkadaşlarınla tahmin et, topluluk sıralamasında yerini al.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <Radar className="size-3.5 text-primary" /> Canlı skorlar
          </span>
          <span className="h-3 w-px bg-border" aria-hidden="true" />
          <span className="inline-flex items-center gap-1.5">
            <Users className="size-3.5 text-primary" /> Arkadaş toplulukları
          </span>
        </div>

        <div className="flex w-full flex-col items-center gap-3">
          <Button
            variant="google"
            size="lg"
            onClick={handleSignIn}
            disabled={signingIn}
            className="w-full"
          >
            <GoogleIcon className="size-5" />
            {signingIn ? 'Giriş yapılıyor…' : 'Google ile giriş yap'}
          </Button>
          <p className="text-[11px] text-muted-foreground">Tamamen ücretsiz, kredi kartı gerekmez.</p>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    </div>
  )
}
