import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { initI18n } from '../../i18n'
import { useCamera } from '../../world3d/cameraStore'
import { useQuality } from '../../world3d/qualityStore'
import { WorldSettings } from './WorldSettings'

describe('WorldSettings', () => {
  beforeAll(async () => {
    await initI18n()
  })
  beforeEach(() => {
    localStorage.clear()
    useCamera.getState().reset()
  })

  it('presets change the camera and show which one is on', () => {
    render(<WorldSettings onClose={() => undefined} />)
    expect(screen.getByRole('button', { name: 'Balanced' }).getAttribute('aria-pressed')).toBe('true')
    fireEvent.click(screen.getByRole('button', { name: 'Close-up' }))
    expect(useCamera.getState()).toMatchObject({ tilt: 28, distance: 10 })
    expect(screen.getByRole('button', { name: 'Close-up' }).getAttribute('aria-pressed')).toBe('true')
  })

  it('sliders, rotation and reset', () => {
    render(<WorldSettings onClose={() => undefined} />)
    fireEvent.change(screen.getByRole('slider', { name: 'Camera height' }), { target: { value: '60' } })
    expect(useCamera.getState().tilt).toBe(60)
    fireEvent.change(screen.getByRole('slider', { name: 'Zoom' }), { target: { value: '25' } })
    fireEvent.change(screen.getByRole('slider', { name: 'Field of view' }), { target: { value: '45' } })
    expect(useCamera.getState()).toMatchObject({ distance: 25, fov: 45 })
    fireEvent.click(screen.getByRole('button', { name: 'Turn camera right' }))
    expect(useCamera.getState().turn).toBe(1)
    fireEvent.click(screen.getByRole('button', { name: 'Reset camera' }))
    expect(useCamera.getState()).toMatchObject({ tilt: 38, distance: 15, fov: 30, turn: 0 })
  })

  it('graphics quality lives here too', () => {
    render(<WorldSettings onClose={() => undefined} />)
    fireEvent.click(screen.getByRole('button', { name: 'Low' }))
    expect(useQuality.getState().choice).toBe('low')
  })
})
