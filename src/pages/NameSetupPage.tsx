import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useUserProfile } from '@/hooks/useUserProfile'
import { MAX_DISPLAY_NAME_LENGTH, saveDisplayName, validateDisplayName } from '@/firebase/profileActions'
import { AuthHeroShell } from '@/components/layout/AuthHeroShell'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

/** Shown once, right after the first Google sign-in: the user picks the name
 *  their friends will see in the leaderboard, instead of inheriting whatever
 *  their Google account happens to be called. */
export function NameSetupPage() {
  const { user, signOutUser } = useAuth()
  const { profile } = useUserProfile()
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!user) return

    const validationError = validateDisplayName(name)
    if (validationError) {
      setError(validationError)
      return
    }

    setError(null)
    setSaving(true)
    try {
      await saveDisplayName(user.uid, name, profile?.communityIds ?? [])
    } catch {
      setError('İsim kaydedilemedi. Lütfen tekrar dene.')
      setSaving(false)
    }
  }

  return (
    <AuthHeroShell
      title="Adın ne olsun?"
      description="Topluluklarında ve sıralama tablosunda bu isimle görüneceksin. Sonradan profilinden değiştirebilirsin."
    >
      <form onSubmit={handleSubmit} className="flex w-full flex-col gap-3">
        <Input
          id="display-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Örn. Abdü"
          maxLength={MAX_DISPLAY_NAME_LENGTH}
          autoFocus
          className="text-center"
        />
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button type="submit" size="lg" disabled={saving}>
          {saving ? 'Kaydediliyor…' : 'Devam et'}
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => signOutUser()}>
          Çıkış yap
        </Button>
      </form>
    </AuthHeroShell>
  )
}
