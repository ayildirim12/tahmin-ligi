import { useEffect, useState } from 'react'
import { Navigate, useParams } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { joinCommunityByCode, resolveInviteCode } from '@/firebase/communityActions'
import { AppShell } from '@/components/layout/AppShell'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { FullScreenSpinner } from '@/components/ui/Spinner'

type Status = 'resolving' | 'invalid' | 'ready' | 'joining' | 'error'

export function JoinCommunityPage() {
  const { code } = useParams<{ code: string }>()
  const { user } = useAuth()
  const [status, setStatus] = useState<Status>('resolving')
  const [communityName, setCommunityName] = useState('')
  const [joinedCommunityId, setJoinedCommunityId] = useState<string | null>(null)

  useEffect(() => {
    if (!code) return
    let cancelled = false
    resolveInviteCode(code).then((invite) => {
      if (cancelled) return
      if (!invite) {
        setStatus('invalid')
      } else {
        setCommunityName(invite.communityName)
        setStatus('ready')
      }
    })
    return () => {
      cancelled = true
    }
  }, [code])

  if (!code) return <Navigate to="/hub" replace />

  async function handleJoin() {
    if (!user || !code) return
    setStatus('joining')
    try {
      const communityId = await joinCommunityByCode(user, code)
      setJoinedCommunityId(communityId)
    } catch {
      setStatus('error')
    }
  }

  if (joinedCommunityId) {
    return <Navigate to={`/${joinedCommunityId}/puan-durumu`} replace />
  }

  if (status === 'resolving') return <FullScreenSpinner />

  return (
    <AppShell communityId={null}>
      <div className="mx-auto flex max-w-sm flex-col items-center gap-4 pt-16 text-center">
        {status === 'invalid' ? (
          <Card className="flex flex-col gap-2 px-6 py-8">
            <p className="font-semibold">Bu davet linki geçersiz</p>
            <p className="text-sm text-muted-foreground">
              Link süresi dolmuş ya da topluluk artık mevcut olmayabilir. Davet linkini
              gönderen kişiden yeni bir link isteyebilirsin.
            </p>
          </Card>
        ) : (
          <Card className="flex flex-col items-center gap-4 px-6 py-8">
            <p className="text-sm text-muted-foreground">Davet edildiğin topluluk</p>
            <p className="text-lg font-bold">{communityName}</p>
            <Button onClick={handleJoin} disabled={status === 'joining'} className="w-full">
              {status === 'joining' ? 'Katılınıyor…' : 'Topluluğa katıl'}
            </Button>
            {status === 'error' && (
              <p className="text-sm text-destructive">Katılırken bir sorun oluştu, tekrar dene.</p>
            )}
          </Card>
        )}
      </div>
    </AppShell>
  )
}
