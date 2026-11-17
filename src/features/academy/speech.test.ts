import { describe, expect, it } from 'vitest'
import { pickVoice } from './speech'

const v = (lang: string, name = lang) => ({ lang, name })

describe('pickVoice', () => {
  it('prefers British English, then any English', () => {
    expect(pickVoice([v('en-US'), v('en-GB'), v('ms-MY')], 'english')?.lang).toBe('en-GB')
    expect(pickVoice([v('fr-FR'), v('en_US')], 'english')?.lang).toBe('en_US')
  })
  it('falls back from Malay to Indonesian, then to nothing', () => {
    expect(pickVoice([v('id-ID'), v('ms-MY')], 'malay')?.lang).toBe('ms-MY')
    expect(pickVoice([v('ms-BN'), v('id-ID')], 'malay')?.lang).toBe('ms-BN')
    expect(pickVoice([v('en-US'), v('id-ID')], 'malay')?.lang).toBe('id-ID')
    expect(pickVoice([v('en-US'), v('ja-JP')], 'malay')).toBeNull()
  })
})
