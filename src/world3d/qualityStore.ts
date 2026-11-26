import { create } from 'zustand'
import { canRise, createQualityMonitor, loadQualityChoice, saveQualityChoice, type QualityChoice, type QualityLevel } from './quality'

/** The player's graphics choice (saved) and what "auto" settled on this visit. */
export const useQuality = create<{ choice: QualityChoice; auto: QualityLevel; setChoice: (c: QualityChoice) => void }>((set) => ({
  choice: loadQualityChoice(),
  auto: 'normal',
  setChoice: (choice) => {
    saveQualityChoice(choice)
    set({ choice })
  },
}))

export const qualityLevel = (s: { choice: QualityChoice; auto: QualityLevel }): QualityLevel => (s.choice === 'auto' ? s.auto : s.choice)

// One Auto watcher for the whole visit (not one per island), so it moves up at most once and never bounces.
let monitor: ReturnType<typeof createQualityMonitor> | null = null

/** Feeds one frame time to Auto; the world calls it every frame while the player has Auto chosen. */
export function sampleAutoQuality(dtMs: number) {
  const q = useQuality.getState()
  if (q.choice !== 'auto') return
  monitor ??= createQualityMonitor(q.auto, { rise: canRise() })
  const next = monitor.sample(dtMs)
  if (next !== q.auto) useQuality.setState({ auto: next })
}
