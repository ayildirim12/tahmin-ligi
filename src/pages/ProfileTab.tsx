import { LogOut, Moon, Pencil, Sun, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useTheme } from '@/contexts/ThemeContext'
import { BlockedByOwnedCommunitiesError, deleteAccount } from '@/firebase/accountActions'
import {
  MAX_DISPLAY_NAME_LENGTH,
  saveDisplayName,
  validateDisplayName,
} from '@/firebase/profileActions'
import { useCommunities } from '@/hooks/useCommunities'
import { useUserProfile } from '@/hooks/useUserProfile'
import { getLastCommunityId } from '@/lib/lastCommunity'
import { AppShell } from '@/components/layout/AppShell'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Dialog } from '@/components/ui/Dialog'
import { IconButton } from '@/components/ui/IconButton'
import { Input } from '@/components/ui/Input'
import { Switch } from '@/components/ui/Switch'

export function ProfileTab() {
  const { user, signOutUser } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const { communities } = useCommunities()
  const { profile } = useUserProfile()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [blocked, setBlocked] = useState<string[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [nameOpen, setNameOpen] = useState(false)
  const [nameDraft, setNameDraft] = useState('')
  const [savingName, setSavingName] = useState(false)
  const [nameError, setNameError] = useState<string | null>(null)

  if (!user) return null

  function openNameDialog() {
    setNameDraft(profile?.displayName ?? '')
    setNameError(null)
    setNameOpen(true)
  }

  async function handleSaveName(event: React.FormEvent) {
    event.preventDefault()
    const validationError = validateDisplayName(nameDraft)
    if (validationError) {
      setNameError(validationError)
      return
    }

    setNameError(null)
    setSavingName(true)
    try {
      await saveDisplayName(
        user!.uid,
        nameDraft,
        communities.map((c) => c.id),
      )
      setNameOpen(false)
    } catch {
      setNameError('İsim kaydedilemedi. Lütfen tekrar dene.')
    } finally {
      setSavingName(false)
    }
  }

  async function handleDelete() {
    setDeleting(true)
    setError(null)
    setBlocked(null)
    try {
      await deleteAccount(user!, communities)
      // Auth listener will flip `user` to null and RequireAuth will redirect.
    } catch (err) {
      if (err instanceof BlockedByOwnedCommunitiesError) {
        setBlocked(err.communities.map((c) => c.name))
      } else {
        setError('Hesap silinirken bir sorun oluştu. Lütfen tekrar dene.')
      }
    } finally {
      setDeleting(false)
    }
  }

  return (
    <AppShell communityId={getLastCommunityId()}>
      <div className="mx-auto flex max-w-sm flex-col gap-5 pt-6">
        <Card className="flex items-center justify-between gap-3 px-4 py-4">
          <div className="min-w-0">
            <p className="truncate font-semibold">{profile?.displayName ?? '—'}</p>
            <p className="truncate text-xs text-muted-foreground">{user.email}</p>
          </div>
          <IconButton aria-label="İsmi değiştir" onClick={openNameDialog}>
            <Pencil className="size-4" />
          </IconButton>
        </Card>

        <Card className="flex items-center justify-between px-4 py-3.5">
          <div className="flex items-center gap-2.5">
            {theme === 'dark' ? <Moon className="size-4" /> : <Sun className="size-4" />}
            <span className="text-sm font-medium">Karanlık mod</span>
          </div>
          <Switch checked={theme === 'dark'} onCheckedChange={toggleTheme} />
        </Card>

        <Button variant="secondary" onClick={() => signOutUser()}>
          <LogOut className="size-4" />
          Çıkış yap
        </Button>

        <Button variant="destructive" onClick={() => setConfirmOpen(true)}>
          <Trash2 className="size-4" />
          Hesabımı sil
        </Button>
      </div>

      <Dialog
        open={nameOpen}
        onOpenChange={setNameOpen}
        title="İsmini değiştir"
        description="Topluluklarında ve sıralama tablosunda bu isimle görünürsün."
      >
        <form onSubmit={handleSaveName} className="flex flex-col gap-3">
          <Input
            id="profile-display-name"
            value={nameDraft}
            onChange={(e) => setNameDraft(e.target.value)}
            maxLength={MAX_DISPLAY_NAME_LENGTH}
            autoFocus
          />
          {nameError && <p className="text-sm text-destructive">{nameError}</p>}
          <Button type="submit" disabled={savingName}>
            {savingName ? 'Kaydediliyor…' : 'Kaydet'}
          </Button>
        </form>
      </Dialog>

      <Dialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Hesabını silmek istediğine emin misin?"
        description="Tüm tahminlerin, topluluk üyeliklerin ve hesap bilgilerin kalıcı olarak silinir. Bu işlem geri alınamaz."
      >
        {blocked ? (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-destructive">
              Şu toplulukların tek kurucususun ve başka üyeleri var, önce bu topluluklardan birini
              devret ya da sil:
            </p>
            <ul className="list-inside list-disc text-sm text-muted-foreground">
              {blocked.map((name) => (
                <li key={name}>{name}</li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? 'Siliniyor…' : 'Evet, kalıcı olarak sil'}
            </Button>
            <Button variant="ghost" onClick={() => setConfirmOpen(false)}>
              Vazgeç
            </Button>
          </div>
        )}
      </Dialog>
    </AppShell>
  )
}
