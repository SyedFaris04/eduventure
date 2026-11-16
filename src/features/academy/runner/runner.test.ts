import { afterEach, describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { runJsSource, tidyPythonError } from './jsCore'
import { createRunner, OUTPUT_LINE_CAP, type WorkerLike } from './runner'
import { PYODIDE_VERSION } from './pyodideVersion'

/** A fake worker the test drives: it records messages and lets the test answer them. */
function fakeWorker(opts: { autoReady?: boolean; answer?: boolean } = {}) {
  const w = {
    sent: [] as unknown[],
    terminated: false,
    onmessage: null as ((e: MessageEvent) => void) | null,
    postMessage(m: { type: string; id: number; code: string }) {
      w.sent.push(m)
      if (m.type === 'run' && opts.answer !== false) queueMicrotask(() => w.emit({ type: 'result', id: m.id, ...runJsSource(m.code) }))
    },
    terminate() {
      w.terminated = true
    },
    emit(data: unknown) {
      w.onmessage?.({ data } as MessageEvent)
    },
  }
  if (opts.autoReady !== false) queueMicrotask(() => w.emit({ type: 'ready' }))
  return w
}

describe('runJsSource', () => {
  it('runs javascript and captures output', () => {
    expect(runJsSource('console.log(1+1); console.log("a","b")')).toMatchObject({ stdout: '2\na b', error: null, truncated: false })
  })
  it('reports errors without throwing', () => {
    expect(runJsSource('nope()').error).toMatch(/nope is not defined/)
  })
  it('caps runaway output', () => {
    const r = runJsSource('for (let i = 0; i < 10000; i++) console.log(i)')
    expect(r.stdout.split('\n')).toHaveLength(OUTPUT_LINE_CAP)
    expect(r.truncated).toBe(true)
  })
})

describe('createRunner', () => {
  afterEach(() => vi.useRealTimers())

  it('runs code through the worker', async () => {
    const r = createRunner('javascript', () => fakeWorker() as unknown as WorkerLike)
    await expect(r.run('console.log("hi")')).resolves.toMatchObject({ stdout: 'hi', timedOut: false })
  })

  it('runaway output is capped and the next run works', async () => {
    vi.useFakeTimers()
    const workers: ReturnType<typeof fakeWorker>[] = []
    let first = true
    const make = () => {
      const w = fakeWorker({ answer: !first })
      first = false
      workers.push(w)
      return w as unknown as WorkerLike
    }
    const r = createRunner('javascript', make, { timeoutMs: 3000 })
    const stuck = r.run('while (true) {}')
    await vi.advanceTimersByTimeAsync(3000)
    await expect(stuck).resolves.toMatchObject({ timedOut: true })
    expect(workers[0].terminated).toBe(true)
    const next = r.run('console.log("again")')
    await vi.advanceTimersByTimeAsync(10)
    await expect(next).resolves.toMatchObject({ stdout: 'again', timedOut: false })
    expect(workers).toHaveLength(2)
  })

  it('python load failure is reported', async () => {
    const w = fakeWorker({ autoReady: false })
    const r = createRunner('python', () => w as unknown as WorkerLike)
    const ready = r.ready()
    w.emit({ type: 'load-error', message: 'network' })
    await expect(ready).rejects.toThrow(/python-unavailable/)
    // A run while Python can't load says so instead of hanging.
    await expect(r.run('print(1)')).rejects.toThrow(/python-unavailable/)
  })

  it('pyodide version is pinned in one place', () => {
    const pkg = JSON.parse(readFileSync('package.json', 'utf8'))
    expect(PYODIDE_VERSION).toBe(pkg.devDependencies.pyodide)
  })
})

describe('tidyPythonError', () => {
  it("keeps the last line and the line number in the learner's code", () => {
    const tb = [
      'Traceback (most recent call last):',
      '  File "/lib/python3.12/site-packages/_pyodide/_base.py", line 597, in eval_code_async',
      '  File "<exec>", line 2, in <module>',
      "NameError: name 'nam' is not defined",
    ].join('\n')
    expect(tidyPythonError(tb)).toBe("NameError: name 'nam' is not defined (line 2)")
  })
})
