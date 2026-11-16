import { describe, expect, it } from 'vitest'
import { guardRedirect, nextRequiredRoute } from './progress'

const none = { session: false, hasAcademicProfile: false, hasCharacter: false }
const signedIn = { ...none, session: true }
const onboarded = { ...signedIn, hasAcademicProfile: true }
const complete = { ...onboarded, hasCharacter: true }

describe('nextRequiredRoute', () => {
  it('walks welcome → onboarding → character → done', () => {
    expect(nextRequiredRoute(none)).toBe('/welcome')
    expect(nextRequiredRoute(signedIn)).toBe('/onboarding')
    expect(nextRequiredRoute(onboarded)).toBe('/character')
    expect(nextRequiredRoute(complete)).toBeNull()
  })
})

describe('guardRedirect', () => {
  it('keeps signed-out players out of every guarded page', () => {
    for (const path of ['/onboarding', '/character', '/home', '/settings/academic']) {
      expect(guardRedirect(path, none)).toBe('/welcome')
    }
  })
  it('sends a player who skipped onboarding back to it', () => {
    expect(guardRedirect('/character', signedIn)).toBe('/onboarding')
    expect(guardRedirect('/home', signedIn)).toBe('/onboarding')
  })
  it('does not let a finished player restart onboarding from scratch', () => {
    expect(guardRedirect('/onboarding', complete)).toBe('/home')
    expect(guardRedirect('/onboarding', onboarded)).toBe('/character')
  })
  it('lets a finished player edit their hero and learning profile', () => {
    expect(guardRedirect('/character', complete)).toBeNull()
    expect(guardRedirect('/settings/academic', complete)).toBeNull()
    expect(guardRedirect('/home', complete)).toBeNull()
  })
})
