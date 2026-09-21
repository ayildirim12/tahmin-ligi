import { customAlphabet } from 'nanoid'

// Unambiguous alphabet (no 0/O, 1/I/l) since codes are shared/typed by hand sometimes.
const alphabet = '23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz'
const generate = customAlphabet(alphabet, 10)

export function generateInviteCode() {
  return generate()
}
