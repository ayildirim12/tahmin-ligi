import { cert, getApps, initializeApp } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

function init() {
  if (getApps().length > 0) return

  // Against the LOCAL EMULATOR: firebase-admin auto-connects when
  // FIRESTORE_EMULATOR_HOST is set — no credentials needed, just a project id.
  if (process.env.FIRESTORE_EMULATOR_HOST) {
    initializeApp({ projectId: process.env.GOOGLE_CLOUD_PROJECT ?? 'demo-tahmin-ligi' })
    return
  }

  // Against PRODUCTION: a service-account key JSON, written to a temp file by
  // the GitHub Actions workflow and referenced via GOOGLE_APPLICATION_CREDENTIALS.
  initializeApp({ credential: cert(process.env.GOOGLE_APPLICATION_CREDENTIALS ?? '') })
}

init()

export const db = getFirestore()
