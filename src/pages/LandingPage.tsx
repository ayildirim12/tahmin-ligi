import { Trophy } from 'lucide-react'
import { useState } from 'react'
import { Navigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/Button'
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
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 bg-background px-4 text-center">
      <div className="flex flex-col items-center gap-3">
        <div className="flex size-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
          <Trophy className="size-7" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight">Tahmin Ligi</h1>
        <p className="max-w-xs text-sm text-muted-foreground">
          Süper Lig maçlarını arkadaşlarınla tahmin et, topluluk sıralamasında yerini al.
        </p>
      </div>

      <Button size="lg" onClick={handleSignIn} disabled={signingIn} className="w-64">
        {signingIn ? 'Giriş yapılıyor…' : 'Google ile giriş yap'}
      </Button>

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  )
}
