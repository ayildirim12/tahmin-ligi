import { useState } from 'react'
import { AlertTriangle, Check, Copy } from 'lucide-react'
import { Navigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { AuthHeroShell } from '@/components/layout/AuthHeroShell'
import { Button } from '@/components/ui/Button'
import { GoogleIcon } from '@/components/icons/GoogleIcon'
import { FullScreenSpinner } from '@/components/ui/Spinner'
import { isInAppBrowser, isIosDevice } from '@/utils/inAppBrowser'

export function LoginPage() {
  const { user, loading, signIn } = useAuth()
  const [searchParams] = useSearchParams()
  const [signingIn, setSigningIn] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const inApp = isInAppBrowser()
  const isIos = isIosDevice()

  if (loading) return <FullScreenSpinner />

  if (user) {
    const redirect = searchParams.get('redirect')
    return <Navigate to={redirect ? decodeURIComponent(redirect) : '/hub'} replace />
  }

  async function handleCopyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch {
      // Ignore copy error
    }
  }

  async function handleSignIn() {
    setError(null)
    setSigningIn(true)
    try {
      await signIn()
    } catch (err: unknown) {
      if (inApp) {
        setError(
          'Uygulama içi tarayıcıda (WhatsApp vb.) Google girişi desteklenmez. Lütfen bağlantıyı kopyalayıp harici Safari veya Chrome tarayıcısında açın.'
        )
      } else {
        const authErr = err as { code?: string }
        if (authErr?.code === 'auth/popup-blocked') {
          setError('Açılır pencere tarayıcınız tarafından engellendi. Lütfen izin verip tekrar deneyin.')
        } else if (authErr?.code === 'auth/popup-closed-by-user') {
          setError('Giriş penceresi tamamlanmadan kapatıldı.')
        } else {
          setError('Giriş yapılamadı. Lütfen tekrar deneyin.')
        }
      }
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
        {inApp && (
          <div className="w-full rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-left text-xs">
            <div className="flex items-start gap-3">
              <div className="rounded-full bg-amber-500/20 p-1.5 text-amber-400 shrink-0 mt-0.5">
                <AlertTriangle className="size-4" />
              </div>
              <div className="space-y-1.5 flex-1">
                <p className="font-semibold text-amber-300 text-sm">
                  Uygulama İçi Tarayıcı Tespit Edildi
                </p>
                <p className="text-amber-200/90 leading-relaxed">
                  WhatsApp, Instagram vb. dahili tarayıcılar Google güvenlik politikası nedeniyle
                  giriş yapmayı engeller. Sorunsuz giriş için lütfen harici tarayıcı kullanın.
                </p>
                <p className="text-amber-300/80 font-medium">
                  {isIos
                    ? '👉 Sağ alttaki simgeye tıklayıp "Safari\'de Aç" seçeneğini kullanabilir veya aşağıdaki butonla bağlantıyı kopyalayıp Safari\'ye yapıştırabilirsiniz.'
                    : '👉 Sağ üstteki üç noktaya tıklayıp "Chrome\'da Aç" seçeneğini kullanabilir veya aşağıdaki butonla bağlantıyı kopyalayabilirsiniz.'}
                </p>
                <div className="pt-2">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={handleCopyLink}
                    className="h-8 gap-1.5 border border-amber-500/40 bg-amber-500/10 text-amber-200 hover:bg-amber-500/20 hover:text-amber-100"
                  >
                    {copied ? <Check className="size-3.5 text-emerald-400" /> : <Copy className="size-3.5" />}
                    {copied ? 'Bağlantı kopyalandı!' : 'Bağlantıyı kopyala'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        <Button variant="google" size="lg" onClick={handleSignIn} disabled={signingIn} className="w-full">
          <GoogleIcon className="size-5" />
          {signingIn ? 'Giriş yapılıyor…' : 'Google ile giriş yap'}
        </Button>
      </div>

      {error && <p className="text-sm text-destructive text-center max-w-sm">{error}</p>}
    </AuthHeroShell>
  )
}
