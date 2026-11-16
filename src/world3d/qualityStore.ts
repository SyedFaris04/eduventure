import { create } from 'zustand'
import { loadQualityChoice, saveQualityChoice, type QualityChoice, type QualityLevel } from './quality'

/** The player's graphics choice (saved) and what "auto" settled on this visit. */
export const useQuality = create<{ choice: QualityChoice; auto: QualityLevel; setChoice: (c: QualityChoice) => void }>((set) => ({
  choice: loadQualityChoice(),
  auto: 'high',
  setChoice: (choice) => {
    saveQualityChoice(choice)
    set({ choice })
  },
}))

export const qualityLevel = (s: { choice: QualityChoice; auto: QualityLevel }): QualityLevel => (s.choice === 'auto' ? s.auto : s.choice)
export const NEXT_CHOICE: Record<QualityChoice, QualityChoice> = { auto: 'high', high: 'low', low: 'auto' }
