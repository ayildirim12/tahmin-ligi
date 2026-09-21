const KEY = 'tahmin-ligi:last-community-id'

export function getLastCommunityId(): string | null {
  try {
    return window.localStorage.getItem(KEY)
  } catch {
    return null
  }
}

export function setLastCommunityId(id: string) {
  try {
    window.localStorage.setItem(KEY, id)
  } catch {
    // Private browsing / storage blocked — non-critical, just a UX convenience.
  }
}
