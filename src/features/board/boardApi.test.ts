import { describe, expect, it } from 'vitest'
import en from '../../i18n/locales/en.json'
import { boardErrorKey, boardQuery } from './boardApi'

describe('board helpers', () => {
  it('maps server errors to messages the player understands', () => {
    for (const p of ['script', 'phone', 'email', 'link', 'handle', 'contact', 'word']) {
      expect(boardErrorKey(`Not allowed: ${p}`)).toBe(`board.error.${p}`)
      expect((en.board.error as Record<string, string>)[p]).toBeTruthy()
    }
    expect(boardErrorKey('Too long')).toBe('board.error.long')
    expect(boardErrorKey('Too many notes')).toBe('board.error.limit')
    expect(boardErrorKey('The board is not built yet')).toBe('board.error.closed')
    expect(boardErrorKey('Too many reports today')).toBe('board.error.reportLimit')
    expect(boardErrorKey('You cannot write here: parent_off')).toBe('board.reason.parent_off')
    expect(boardErrorKey('something odd')).toBe('board.error.generic')
    expect(boardErrorKey(undefined)).toBe('board.error.generic')
  })

  it('refreshes an open board every 20 seconds, and never a closed one or a hidden tab', () => {
    expect(boardQuery('greenhaven', true)).toMatchObject({ enabled: true, refetchInterval: 20_000, refetchIntervalInBackground: false })
    expect(boardQuery('greenhaven', false)).toMatchObject({ enabled: false, refetchInterval: false })
  })
})
