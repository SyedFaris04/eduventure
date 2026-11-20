import { lazy, Suspense } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Fallback } from './ErrorBoundary'

describe('a 3D scene that fails to load', () => {
  it('shows its still picture instead of blanking the page', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const Broken = lazy(() => Promise.reject(new Error('chunk 404 after a new deploy')))
    render(
      <main>
        <p>Download for Android</p>
        <Fallback still={<p>still picture</p>}>
          <Suspense fallback={<p>loading</p>}>
            <Broken />
          </Suspense>
        </Fallback>
      </main>,
    )
    expect(await screen.findByText('still picture')).toBeTruthy()
    expect(screen.getByText('Download for Android')).toBeTruthy()
  })
})
