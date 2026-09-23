import { useState } from 'react'
import { Navigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { AuthHeroShell } from '@/components/layout/AuthHeroShell'
import { Button } from '@/components/ui/Button'
import { GoogleIcon } from '@/components/icons/GoogleIcon'
import { FullScreenSpinner } from '@/components/ui/Spinner'

export function LoginPage() {
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
    <AuthHeroShell
      title="Giriş yap"
      description="Süper Lig maçlarını arkadaşlarınla tahmin et, topluluk sıralamasında yerini al."
      showBrandLink
    >
      <div className="flex w-full flex-col items-center gap-3">
        <Button variant="google" size="lg" onClick={handleSignIn} disabled={signingIn} className="w-full">
          <GoogleIcon className="size-5" />
          {signingIn ? 'Giriş yapılıyor…' : 'Google ile giriş yap'}
        </Button>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
    </AuthHeroShell>
  )
}
