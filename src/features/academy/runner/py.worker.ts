import { OUTPUT_LINE_CAP, tidyPythonError } from './jsCore'
import { PYODIDE_CDN } from './pyodideVersion'

type Py = {
  runPythonAsync(code: string, o?: { globals: unknown }): Promise<unknown>
  toPy(v: unknown): unknown
  setStdout(o: { batched: (s: string) => void }): void
  setStderr(o: { batched: (s: string) => void }): void
}

let lines: string[] = []
let truncated = false
const push = (s: string) => {
  if (lines.length < OUTPUT_LINE_CAP) lines.push(s)
  else truncated = true
}

// Python downloads from the CDN only when this worker starts (the first Python lesson).
const boot: Promise<Py | null> = (async () => {
  try {
    const mod = (await import(/* @vite-ignore */ `${PYODIDE_CDN}pyodide.mjs`)) as { loadPyodide(o: { indexURL: string }): Promise<Py> }
    const py = await mod.loadPyodide({ indexURL: PYODIDE_CDN })
    py.setStdout({ batched: push })
    py.setStderr({ batched: push })
    self.postMessage({ type: 'ready' })
    return py
  } catch (e) {
    self.postMessage({ type: 'load-error', message: String(e) })
    return null
  }
})()

self.onmessage = async (e: MessageEvent<{ type: 'run'; id: number; code: string }>) => {
  if (e.data.type !== 'run') return
  const py = await boot
  if (!py) return
  lines = []
  truncated = false
  let error: string | null = null
  try {
    // A fresh namespace each run, so one program's variables never leak into the next.
    await py.runPythonAsync(e.data.code, { globals: py.toPy({}) })
  } catch (err) {
    error = tidyPythonError(String(err))
  }
  self.postMessage({ type: 'result', id: e.data.id, stdout: lines.join('\n'), error, truncated })
}
