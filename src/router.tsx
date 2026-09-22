import { Navigate, createBrowserRouter } from 'react-router-dom'
import { CalendarTab } from '@/pages/CalendarTab'
import { CommunityHubPage } from '@/pages/CommunityHubPage'
import { CommunityLayout } from '@/pages/CommunityLayout'
import { JoinCommunityPage } from '@/pages/JoinCommunityPage'
import { LandingPage } from '@/pages/LandingPage'
import { LeaderboardTab } from '@/pages/LeaderboardTab'
import { LoginPage } from '@/pages/LoginPage'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { PredictionCenterTab } from '@/pages/PredictionCenterTab'
import { ProfileTab } from '@/pages/ProfileTab'
import { RequireAuth } from '@/pages/RequireAuth'
import { StandingsTab } from '@/pages/StandingsTab'

export const router = createBrowserRouter([
  { path: '/', element: <LandingPage /> },
  { path: '/login', element: <LoginPage /> },
  {
    element: <RequireAuth />,
    children: [
      { path: '/hub', element: <CommunityHubPage /> },
      { path: '/join/:code', element: <JoinCommunityPage /> },
      { path: '/profil', element: <ProfileTab /> },
      {
        path: '/:communityId',
        element: <CommunityLayout />,
        children: [
          { index: true, element: <Navigate to="puan-durumu" replace /> },
          { path: 'puan-durumu', element: <StandingsTab /> },
          { path: 'siralama', element: <LeaderboardTab /> },
          { path: 'tahmin', element: <PredictionCenterTab /> },
          { path: 'takvim', element: <CalendarTab /> },
        ],
      },
    ],
  },
  { path: '*', element: <NotFoundPage /> },
])
