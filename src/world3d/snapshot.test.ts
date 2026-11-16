import { describe, expect, it } from 'vitest'
import { DEFAULT_APPEARANCE } from '../features/character/appearance'
import { snapshotKey } from './snapshotKey'

describe('snapshotKey', () => {
  it('ignores key order and changes with any value', () => {
    const reordered = Object.fromEntries(Object.entries(DEFAULT_APPEARANCE).reverse()) as typeof DEFAULT_APPEARANCE
    expect(snapshotKey({ kind: 'hero', appearance: reordered })).toBe(snapshotKey({ kind: 'hero', appearance: DEFAULT_APPEARANCE }))
    expect(snapshotKey({ kind: 'hero', appearance: { ...DEFAULT_APPEARANCE, top: 'vest_blue' } })).not.toBe(snapshotKey({ kind: 'hero', appearance: DEFAULT_APPEARANCE }))
  })

  it('tells monsters, the guardian and heroes apart', () => {
    const keys = [snapshotKey({ kind: 'monster', monster: 'sproutling' }), snapshotKey({ kind: 'monster', monster: 'dinobud' }), snapshotKey({ kind: 'boss', boss: 'guardian' }), snapshotKey({ kind: 'hero', appearance: DEFAULT_APPEARANCE })]
    expect(new Set(keys).size).toBe(4)
  })
})
