import { beforeAll, describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { initI18n } from '../../i18n'
import { WelcomePage } from './WelcomePage'
import { REGIONS } from './regions'
import { useSessionStore } from '../authentication/useSession'

describe('WelcomePage', () => {
  beforeAll(async () => {
    await initI18n()
  })

  it('offers the four entry actions', () => {
    render(
      <MemoryRouter>
        <WelcomePage />
      </MemoryRouter>,
    )
    // Starting creates a guest account first, so it is a button; the rest navigate, so they are links.
    expect(screen.getByRole('button', { name: /Start Your Adventure/ })).toBeEnabled()
    for (const name of ['Login', 'Create Account', 'Explore the World']) {
      expect(screen.getByRole('link', { name: new RegExp(name) })).toBeInTheDocument()
    }
  })

  it('shows the offline notice when boot could not reach the server', () => {
    useSessionStore.setState({ offline: true })
    render(
      <MemoryRouter>
        <WelcomePage />
      </MemoryRouter>,
    )
    expect(screen.getByRole('alert')).toHaveTextContent("Can't reach the server")
    useSessionStore.setState({ offline: false })
  })
})

describe('REGIONS', () => {
  it('lists the 12 regions from the brief with unique ids', () => {
    expect(REGIONS).toHaveLength(12)
    expect(new Set(REGIONS.map((r) => r.id)).size).toBe(12)
    expect(REGIONS[0]).toMatchObject({ id: 'greenhaven', phase: 2 })
  })
})
