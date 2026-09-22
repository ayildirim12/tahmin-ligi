import { CalendarDays, ListOrdered, Table2, Target, User } from 'lucide-react'

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
    path: (id) => `/${id}/puan-durumu`,
  },
  {
    key: 'leaderboard',
    label: 'Sıralama',
    icon: ListOrdered,
    path: (id) => `/${id}/siralama`,
  },
  {
    key: 'predictions',
    label: 'Tahmin Merkezi',
    icon: Target,
    path: (id) => `/${id}/tahmin`,
  },
  {
    key: 'calendar',
    label: 'Takvim',
    icon: CalendarDays,
    path: (id) => `/${id}/takvim`,
  },
]

export const profileTab: Omit<NavTab, 'path'> & { path: string } = {
  key: 'profile',
  label: 'Profil',
  icon: User,
  path: '/profil',
}
