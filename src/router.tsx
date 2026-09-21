import { Navigate, createBrowserRouter } from 'react-router-dom'
import { CommunityHubPage } from '@/pages/CommunityHubPage'
import { CommunityLayout } from '@/pages/CommunityLayout'
import { JoinCommunityPage } from '@/pages/JoinCommunityPage'
import { LandingPage } from '@/pages/LandingPage'
import { LeaderboardTab } from '@/pages/LeaderboardTab'
import { PredictionCenterTab } from '@/pages/PredictionCenterTab'
import { ProfileTab } from '@/pages/ProfileTab'
import { RequireAuth } from '@/pages/RequireAuth'
import { StandingsTab } from '@/pages/StandingsTab'

export const router = createBrowserRouter([
  { path: '/', element: <LandingPage /> },
  {
    element: <RequireAuth />,
    children: [
      { path: '/hub', element: <CommunityHubPage /> },
      { path: '/join/:code', element: <JoinCommunityPage /> },
      { path: '/profil', element: <ProfileTab /> },
      {
        path: '/c/:communityId',
        element: <CommunityLayout />,
        children: [
          { index: true, element: <Navigate to="puan-durumu" replace /> },
          { path: 'puan-durumu', element: <StandingsTab /> },
          { path: 'siralama', element: <LeaderboardTab /> },
          { path: 'tahmin', element: <PredictionCenterTab /> },
        ],
      },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
])
