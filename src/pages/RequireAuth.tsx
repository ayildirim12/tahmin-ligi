import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useUserProfile } from '@/hooks/useUserProfile'
import { NameSetupPage } from '@/pages/NameSetupPage'
import { FullScreenSpinner } from '@/components/ui/Spinner'

export function RequireAuth() {
  const { user, loading } = useAuth()
  const { profile, loading: profileLoading } = useUserProfile()
  const location = useLocation()

  if (loading) return <FullScreenSpinner />

  if (!user) {
    const redirect = encodeURIComponent(location.pathname + location.search)
    return <Navigate to={`/login?redirect=${redirect}`} replace />
  }

  if (profileLoading) return <FullScreenSpinner />

  // Signed in but hasn't picked a name yet (first sign-in) — nothing else in
  // the app is reachable until they do, since every member doc they create
  // would otherwise be nameless.
  if (!profile?.displayName) return <NameSetupPage />

  return <Outlet />
}
