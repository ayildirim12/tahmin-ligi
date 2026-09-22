import { customAlphabet } from 'nanoid'

// Lowercase/digits only, unambiguous alphabet, appended to the name slug for
// uniqueness (two communities can share a name, but not a Firestore doc id).
const alphabet = '23456789abcdefghjkmnpqrstuvwxyz'
const generateSuffix = customAlphabet(alphabet, 5)

const TURKISH_MAP: Record<string, string> = {
  ç: 'c', ğ: 'g', ı: 'i', ö: 'o', ş: 's', ü: 'u',
  Ç: 'c', Ğ: 'g', İ: 'i', Ö: 'o', Ş: 's', Ü: 'u',
}

function slugify(name: string): string {
  const transliterated = name.replace(/[çğışöüÇĞİŞÖÜ]/g, (ch) => TURKISH_MAP[ch] ?? ch)
  return transliterated
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // strip remaining accents (é, â, …)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 30)
}

/**
 * The community's Firestore doc id IS its `/{id}/...` URL segment — this
 * generates a readable slug from the name (with a short random suffix for
 * uniqueness) instead of Firestore's own 20-char auto-ID, which read like an
 * exposed database implementation detail (user request: "domain'de firebase
 * id gözüksün istemem"). Falls back to a bare random id if the name slugifies
 * to nothing (e.g. an emoji-only name).
 */
export function generateCommunityId(name: string): string {
  const slug = slugify(name)
  const suffix = generateSuffix()
  return slug ? `${slug}-${suffix}` : suffix
}
