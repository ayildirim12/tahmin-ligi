import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { createCommunity } from '@/firebase/communityActions'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { Input } from '@/components/ui/Input'

export function CreateCommunityDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!user || name.trim().length === 0) return

    setSubmitting(true)
    setError(null)
    try {
      const communityId = await createCommunity(user, name.trim())
      onOpenChange(false)
      setName('')
      navigate(`/c/${communityId}/puan-durumu`)
    } catch {
      setError('Topluluk oluşturulamadı. Lütfen tekrar deneyin.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Yeni topluluk oluştur"
      description="Arkadaşlarınla tahmin yarışması yapacağın topluluğa bir isim ver."
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input
          autoFocus
          placeholder="Örn. İş Arkadaşları Ligi"
          value={name}
          maxLength={60}
          onChange={(e) => setName(e.target.value)}
        />
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button type="submit" disabled={submitting || name.trim().length === 0}>
          {submitting ? 'Oluşturuluyor…' : 'Oluştur'}
        </Button>
      </form>
    </Dialog>
  )
}
