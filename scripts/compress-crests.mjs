// One-off compressor for public/crests/*.png — these are rendered at only
// 18-28px on screen (see TeamCrest.tsx's callers) but ship at their raw
// ~500px source resolution, up to 120KB each. Re-run this whenever new
// crests are added for a promoted/relegated team.
//
// Usage: node scripts/compress-crests.mjs

import { readdir, stat, unlink, rename } from 'node:fs/promises'
import { join } from 'node:path'
import { execFileSync } from 'node:child_process'
import sharp from 'sharp'

const DIR = new URL('../public/crests/', import.meta.url).pathname
const TARGET_SIZE = 64 // 2x the largest real render size (28px), retina headroom

function hasPngquant() {
  try {
    execFileSync('pngquant', ['--version'], { stdio: 'ignore' })
    return true
  } catch {
    return false
  }
}

async function main() {
  const pngquantAvailable = hasPngquant()
  if (!pngquantAvailable) {
    console.warn('pngquant not found on PATH (brew install pngquant) — falling back to sharp-only compression.')
  }

  const files = (await readdir(DIR)).filter((f) => f.endsWith('.png'))
  let totalBefore = 0
  let totalAfter = 0

  for (const file of files) {
    const path = join(DIR, file)
    const before = (await stat(path)).size
    totalBefore += before

    await sharp(path)
      .resize(TARGET_SIZE, TARGET_SIZE, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png({ compressionLevel: 9 })
      .toFile(path + '.tmp')

    if (pngquantAvailable) {
      execFileSync('pngquant', ['--force', '--quality=70-95', '--output', path, path + '.tmp'])
      await unlink(path + '.tmp').catch(() => {}) // pngquant may already remove its input
    } else {
      await rename(path + '.tmp', path)
    }

    const after = (await stat(path)).size
    totalAfter += after
    console.log(`${file}: ${before} -> ${after} bytes`)
  }

  console.log(`\nTotal: ${totalBefore} -> ${totalAfter} bytes (${Math.round((1 - totalAfter / totalBefore) * 100)}% reduction)`)
}

main()
