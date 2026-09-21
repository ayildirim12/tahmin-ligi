import { ListOrdered, Table2, Target, User } from 'lucide-react'

export interface NavTab {
  key: string
  label: string
  icon: typeof Table2
  path: (communityId: string) => string
}

export const communityTabs: NavTab[] = [
  {
    key: 'standings',
    label: 'Puan Durumu',
    icon: Table2,
    path: (id) => `/c/${id}/puan-durumu`,
  },
  {
    key: 'leaderboard',
    label: 'Sıralama',
    icon: ListOrdered,
    path: (id) => `/c/${id}/siralama`,
  },
  {
    key: 'predictions',
    label: 'Tahmin Merkezi',
    icon: Target,
    path: (id) => `/c/${id}/tahmin`,
  },
]

export const profileTab: Omit<NavTab, 'path'> & { path: string } = {
  key: 'profile',
  label: 'Profil',
  icon: User,
  path: '/profil',
}
