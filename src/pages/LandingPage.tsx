import { Plus, User } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { CommunityHubPage } from '@/pages/CommunityHubPage'
import { AuthHeroShell } from '@/components/layout/AuthHeroShell'
import { Button } from '@/components/ui/Button'
import { FullScreenSpinner } from '@/components/ui/Spinner'

export function LandingPage() {
  const { user, loading } = useAuth()

  // Signed in: `/` IS the hub — your communities (or the empty/create state),
  // not a second marketing screen you have to click through.
  if (loading) return <FullScreenSpinner />
  if (user) return <CommunityHubPage />

  return (
    <AuthHeroShell
      title="Tahmin Ligi"
      description="Süper Lig maçlarını arkadaşlarınla tahmin et, topluluk sıralamasında yerini al."
      featureChips
    >
      <div className="flex w-full flex-col gap-2.5">
        <Link to="/hub" className="w-full">
          <Button size="lg" className="w-full">
            <Plus className="size-4" />
            Topluluk oluştur
          </Button>
        </Link>
        <Link to="/profil" className="w-full">
          <Button variant="secondary" size="lg" className="w-full">
            <User className="size-4" />
            Profilim
          </Button>
        </Link>
      </div>
    </AuthHeroShell>
  )
}
