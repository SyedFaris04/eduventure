import { describe, expect, it } from 'vitest'
import en from '../../i18n/locales/en.json'
import { bodyProblem, dailyQuestion, MAX_BODY, PHRASES, QUESTION_COUNT, STICKER_ICON, STICKERS } from './boardRules'

describe('board rules', () => {
  it('the daily question changes at midnight in Kuala Lumpur, not UTC', () => {
    const morning = dailyQuestion(new Date('2026-11-21T00:30:00+08:00'))
    expect(dailyQuestion(new Date('2026-11-21T23:59:00+08:00'))).toBe(morning)
    expect(dailyQuestion(new Date('2026-11-21T16:00:00Z'))).toBe((morning + 1) % QUESTION_COUNT)
    expect(morning).toBeGreaterThanOrEqual(0)
    expect(morning).toBeLessThan(QUESTION_COUNT)
  })

  it('the keys match the server: 12 stickers and phrases p01 to p20', () => {
    expect(STICKERS).toEqual(['star', 'heart', 'thumbs_up', 'clap', 'idea', 'book', 'rocket', 'trophy', 'smile', 'party', 'plant', 'question'])
    expect(PHRASES).toHaveLength(20)
    expect(PHRASES[0]).toBe('p01')
    expect(PHRASES[19]).toBe('p20')
    for (const s of STICKERS) expect(STICKER_ICON[s]).toBeTruthy()
  })

  it('every sticker, phrase and question has English text', () => {
    const board = (en as unknown as { board: { sticker: Record<string, string>; phrase: Record<string, string>; q: Record<string, string> } }).board
    for (const s of STICKERS) expect(board.sticker[s]).toBeTruthy()
    for (const p of PHRASES) expect(board.phrase[p]).toBeTruthy()
    expect(Object.keys(board.q)).toHaveLength(QUESTION_COUNT)
  })

  it('hints at text the server would refuse for its script or length', () => {
    expect(bodyProblem('你好')).toBe('script')
    expect(bodyProblem('hi 😀')).toBe('script')
    expect(bodyProblem('you are shıt')).toBe('script') // letters the server can't fold
    expect(bodyProblem('Hmm… ok — École')).toBeNull() // phone keyboards type … and —
    expect(bodyProblem('x'.repeat(MAX_BODY + 1))).toBe('long')
    expect(bodyProblem('Café! (12 + 30 = 42)')).toBeNull()
    expect(bodyProblem('')).toBeNull()
  })
})
