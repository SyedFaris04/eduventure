export { OUTPUT_LINE_CAP } from './jsCore'

export type Lang = 'python' | 'javascript'
export type RunResult = { stdout: string; error: string | null; timedOut: boolean; truncated: boolean }
export type WorkerLike = { postMessage(m: unknown): void; terminate(): void; onmessage: ((e: MessageEvent) => void) | null }

type Pending = { resolve: (r: RunResult) => void; timer: ReturnType<typeof setTimeout> }

/**
 * Runs code in a worker with a time limit. A run longer than `timeoutMs` kills the worker (the only way to stop
 * an endless loop) and a fresh one starts, so the next run works.
 */
export function createRunner(lang: Lang, makeWorker: () => WorkerLike, opts: { timeoutMs?: number } = {}) {
  const timeoutMs = opts.timeoutMs ?? 3000
  let worker!: WorkerLike
  let ready!: Promise<void>
  let nextId = 1
  const pending = new Map<number, Pending>()

  const start = () => {
    worker = makeWorker()
    ready = new Promise<void>((resolve, reject) => {
      worker.onmessage = (e: MessageEvent) => {
        const m = e.data as { type: string; id?: number; stdout?: string; error?: string | null; truncated?: boolean }
        if (m.type === 'ready') resolve()
        else if (m.type === 'load-error') reject(new Error(`${lang}-unavailable`))
        else if (m.type === 'result' && m.id !== undefined) {
          const p = pending.get(m.id)
          if (!p) return
          clearTimeout(p.timer)
          pending.delete(m.id)
          p.resolve({ stdout: m.stdout ?? '', error: m.error ?? null, truncated: Boolean(m.truncated), timedOut: false })
        }
      }
    })
    ready.catch(() => undefined) // reported to whoever awaits ready() or run()
  }
  start()

  return {
    ready: () => ready,
    async run(code: string): Promise<RunResult> {
      await ready
      const id = nextId++
      return new Promise<RunResult>((resolve) => {
        const timer = setTimeout(() => {
          pending.delete(id)
          worker.terminate()
          start()
          resolve({ stdout: '', error: null, timedOut: true, truncated: false })
        }, timeoutMs)
        pending.set(id, { resolve, timer })
        worker.postMessage({ type: 'run', id, code })
      })
    },
    dispose() {
      for (const p of pending.values()) clearTimeout(p.timer)
      pending.clear()
      worker.terminate()
    },
  }
}

const runners: Partial<Record<Lang, ReturnType<typeof createRunner>>> = {}
const makeReal = (lang: Lang): WorkerLike =>
  lang === 'python'
    ? new Worker(new URL('./py.worker.ts', import.meta.url), { type: 'module' })
    : new Worker(new URL('./js.worker.ts', import.meta.url), { type: 'module' })

/** The app's warm runner for a language, created on first use so Python downloads only when needed. */
export const runnerFor = (lang: Lang) => (runners[lang] ??= createRunner(lang, () => makeReal(lang)))
export const runCode = (lang: Lang, code: string) => runnerFor(lang).run(code)
/** After a failed Python download: forget the runner so the next use tries again. */
export function resetRunner(lang: Lang) {
  runners[lang]?.dispose()
  delete runners[lang]
}
