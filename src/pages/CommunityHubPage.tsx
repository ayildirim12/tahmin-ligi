import { Plus, Users } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { CreateCommunityDialog } from '@/components/community/CreateCommunityDialog'
import { AppShell } from '@/components/layout/AppShell'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Spinner } from '@/components/ui/Spinner'
import { useCommunities } from '@/hooks/useCommunities'

export function CommunityHubPage() {
  const { communities, loading } = useCommunities()
  const [createOpen, setCreateOpen] = useState(false)

  return (
    <AppShell communityId={null}>
      <div className="mx-auto flex max-w-lg flex-col gap-6 pt-6">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">Topluluklarım</h1>
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="size-4" />
            Yeni topluluk
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-10">
            <Spinner />
          </div>
        ) : communities.length === 0 ? (
          <Card className="flex flex-col items-center gap-3 px-6 py-10 text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-surface-muted">
              <Users className="size-6 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">
              Henüz bir topluluğun yok. Yeni bir topluluk oluştur ya da bir arkadaşının davet
              linkiyle katıl.
            </p>
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="size-4" />
              İlk topluluğunu oluştur
            </Button>
          </Card>
        ) : (
          <div className="flex flex-col gap-3">
            {communities.map((c) => (
              <Link key={c.id} to={`/${c.id}/puan-durumu`}>
                <Card className="flex items-center justify-between gap-3 px-4 py-3.5 transition-colors hover:border-primary/40">
                  <div>
                    <p className="font-semibold">{c.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {c.memberCount} üye {c.role === 'owner' && '· kurucu'}
                    </p>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>

      <CreateCommunityDialog open={createOpen} onOpenChange={setCreateOpen} />
    </AppShell>
  )
}
