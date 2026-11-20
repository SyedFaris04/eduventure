import { describe, expect, it } from 'vitest'
import { appUrl, routerBasename, withBase } from './base'
import { parentLink } from '../features/parents/links'

const PAGES = '/eduventure/play/'

describe('base path', () => {
  it('joins asset paths to the base without doubling slashes', () => {
    expect(withBase('/assets/models/rig.glb', '/')).toBe('/assets/models/rig.glb')
    expect(withBase('/assets/models/rig.glb', PAGES)).toBe('/eduventure/play/assets/models/rig.glb')
    expect(withBase('assets/x.png', PAGES)).toBe('/eduventure/play/assets/x.png')
  })

  it('builds absolute links for emails and parents under the base', () => {
    expect(appUrl('/login?verified=1', 'https://syedfaris04.github.io', PAGES)).toBe('https://syedfaris04.github.io/eduventure/play/login?verified=1')
    expect(appUrl('/login', 'http://localhost:5173', '/')).toBe('http://localhost:5173/login')
    expect(parentLink('AB12-CD34', 'https://syedfaris04.github.io', PAGES)).toBe('https://syedfaris04.github.io/eduventure/play/parent?code=AB12-CD34')
  })

  it('gives the router its basename', () => {
    expect(routerBasename(PAGES)).toBe('/eduventure/play')
    expect(routerBasename('/')).toBe('/')
  })
})
