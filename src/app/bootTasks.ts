import type { BootTask } from './boot'
import { checkServer } from '../services/supabase'
import { ART } from '../features/loading/hotspots'

function loadImage(src: string): Promise<void> {
  const img = new Image()
  img.src = src
  return img.decode()
}

/** Real startup work the loading bar reports on. Weights roughly match how long each takes. */
export const BOOT_TASKS: BootTask[] = [
  { id: 'fonts', weight: 1, run: () => Promise.all([document.fonts.load('600 1em Fredoka'), document.fonts.load('400 1em Nunito')]) },
  { id: 'art', weight: 2, run: () => loadImage(ART.webp) },
  { id: 'session', weight: 2, run: checkServer },
]
