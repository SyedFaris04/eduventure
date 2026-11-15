import { describe, expect, it } from 'vitest'
import { runBootTasks, type BootTask } from './boot'

function deferred() {
  let resolve!: () => void
  let reject!: (e: Error) => void
  const promise = new Promise<void>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

const flush = () => new Promise((r) => setTimeout(r, 0))

describe('runBootTasks', () => {
  it('reports progress by weight as tasks settle', async () => {
    const light = deferred()
    const heavy = deferred()
    const calls: number[] = []
    const tasks: BootTask[] = [
      { id: 'light', weight: 1, run: () => light.promise },
      { id: 'heavy', weight: 3, run: () => heavy.promise },
    ]
    const done = runBootTasks(tasks, (f) => calls.push(f))
    heavy.resolve()
    await flush()
    light.resolve()
    await expect(done).resolves.toEqual({ failed: [] })
    expect(calls).toEqual([0.75, 1])
  })

  it('counts a failed task as settled and names it', async () => {
    const calls: number[] = []
    const result = await runBootTasks(
      [
        { id: 'ok', weight: 1, run: async () => {} },
        { id: 'x', weight: 1, run: async () => Promise.reject(new Error('boom')) },
      ],
      (f) => calls.push(f),
    )
    expect(result).toEqual({ failed: ['x'] })
    expect(calls.at(-1)).toBe(1)
  })

  it('never reports 100% while a task is still pending', async () => {
    const calls: number[] = []
    void runBootTasks(
      [
        { id: 'fast', weight: 1, run: async () => {} },
        { id: 'stuck', weight: 1, run: () => new Promise(() => {}) },
      ],
      (f) => calls.push(f),
    )
    await flush()
    await flush()
    expect(calls).toEqual([0.5])
  })

  it('treats a task that throws synchronously as failed', async () => {
    const result = await runBootTasks(
      [{ id: 'sync', weight: 1, run: () => { throw new Error('sync') } }],
      () => {},
    )
    expect(result).toEqual({ failed: ['sync'] })
  })
})
