import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render, screen } from '@testing-library/react'
import { FitToScreen } from './FitToScreen'

// jsdom has no layout: give the box and its content the sizes a phone would measure, and a ResizeObserver that fires.
let resize: () => void = () => {}
const sizes = { box: 300, content: 300 }
beforeEach(() => {
  vi.stubGlobal(
    'ResizeObserver',
    class {
      constructor(cb: () => void) {
        resize = cb
      }
      observe() {}
      disconnect() {}
    },
  )
  vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockImplementation(function (this: HTMLElement) {
    return this.dataset.fit === 'box' ? sizes.box : 0
  })
  vi.spyOn(HTMLElement.prototype, 'scrollHeight', 'get').mockImplementation(function (this: HTMLElement) {
    return this.dataset.fit === 'content' ? sizes.content : 0
  })
})
afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

const content = () => screen.getByText('Hello').parentElement as HTMLElement

describe('FitToScreen', () => {
  it('leaves content that fits at its normal size', () => {
    sizes.content = 280
    render(<FitToScreen>{<p>Hello</p>}</FitToScreen>)
    expect(content().style.transform).toBe('')
  })

  it('shrinks content that is taller than the box, just enough to fit', () => {
    sizes.content = 400
    render(<FitToScreen>{<p>Hello</p>}</FitToScreen>)
    expect(content().style.transform).toBe('scale(0.75)')
    expect(content().style.marginBottom).toBe('-100px') // 400 px tall drawn at 300: the 100 px it frees is given back
  })

  it('follows the screen: grows back when there is room again', () => {
    sizes.content = 600
    render(<FitToScreen>{<p>Hello</p>}</FitToScreen>)
    expect(content().style.transform).toBe('scale(0.5)')
    sizes.box = 700
    act(() => resize())
    expect(content().style.transform).toBe('')
    sizes.box = 300
  })

  it('still fits in an old browser without ResizeObserver (older Android WebViews), following window resizes', () => {
    vi.stubGlobal('ResizeObserver', undefined)
    sizes.content = 600
    render(<FitToScreen>{<p>Hello</p>}</FitToScreen>)
    expect(content().style.transform).toBe('scale(0.5)')
    sizes.box = 700
    act(() => void window.dispatchEvent(new Event('resize')))
    expect(content().style.transform).toBe('')
    sizes.box = 300
  })
})
