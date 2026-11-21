import { describe, expect, it } from 'vitest'
import { HITS, slashStep, START } from './slash'

describe('three swings harvest a node', () => {
  it('counts swings on one node and finishes on the third', () => {
    let r = slashStep(START, '17,6', 0)
    expect(r).toMatchObject({ done: false, state: { hits: 1 } })
    r = slashStep(r.state, '17,6', 500)
    expect(r).toMatchObject({ done: false, state: { hits: 2 } })
    r = slashStep(r.state, '17,6', 1000)
    expect(r.done).toBe(true)
    expect(r.state.hits).toBe(0)
    expect(HITS).toBe(3)
  })

  it('starts over on another node, or after a long pause', () => {
    const two = slashStep(slashStep(START, '17,6', 0).state, '17,6', 400).state
    expect(slashStep(two, '18,6', 800)).toMatchObject({ done: false, state: { hits: 1, key: '18,6' } })
    expect(slashStep(two, '17,6', 5000)).toMatchObject({ done: false, state: { hits: 1 } })
  })
})
