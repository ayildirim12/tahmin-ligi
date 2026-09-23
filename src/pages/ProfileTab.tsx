import { LogOut, Moon, Sun, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useTheme } from '@/contexts/ThemeContext'
import { BlockedByOwnedCommunitiesError, deleteAccount } from '@/firebase/accountActions'
import { useCommunities } from '@/hooks/useCommunities'
import { getLastCommunityId } from '@/lib/lastCommunity'
import { AppShell } from '@/components/layout/AppShell'
import { MemberAvatar } from '@/components/community/MemberAvatar'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Dialog } from '@/components/ui/Dialog'
import { Switch } from '@/components/ui/Switch'

export function ProfileTab() {
  const { user, signOutUser } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const { communities } = useCommunities()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [blocked, setBlocked] = useState<string[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  if (!user) return null

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
        <Card className="flex items-center gap-3 px-4 py-4">
          <MemberAvatar photoURL={user.photoURL} displayName={user.displayName} size={48} />
          <div className="min-w-0">
            <p className="truncate font-semibold">{user.displayName}</p>
            <p className="truncate text-xs text-muted-foreground">{user.email}</p>
          </div>
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
