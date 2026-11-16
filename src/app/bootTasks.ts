import type { BootTask } from './boot'
import { checkServer, supabase } from '../services/supabase'
import { ART } from '../features/loading/hotspots'
import { academicQuery } from '../features/onboarding/useReferenceData'
import { characterQuery } from '../features/character/useCharacter'
import { queryClient } from './providers'

function loadImage(src: string): Promise<void> {
  const img = new Image()
  img.src = src
  return img.decode()
}

/** A returning player's setup progress, cached so the first page after loading is the right one. */
async function prefetchProgress() {
  if (!supabase) throw new Error('not configured')
  const uid = (await supabase.auth.getSession()).data.session?.user.id
  if (!uid) return
  await Promise.all([queryClient.fetchQuery(academicQuery(uid)), queryClient.fetchQuery(characterQuery(uid))])
}

/** Real startup work the loading bar reports on. Weights roughly match how long each takes. */
export const BOOT_TASKS: BootTask[] = [
  { id: 'fonts', weight: 1, run: () => Promise.all([document.fonts.load('600 1em Fredoka'), document.fonts.load('400 1em Nunito')]) },
  { id: 'art', weight: 2, run: () => loadImage(ART.webp) },
  { id: 'session', weight: 2, run: checkServer },
  { id: 'progress', weight: 1, run: prefetchProgress },
  { id: 'welcome-chunk', weight: 1, run: () => import('../features/landing/WelcomePage') },
]
