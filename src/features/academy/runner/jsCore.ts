export const OUTPUT_LINE_CAP = 200

/** Prints a value the way Node's console.log does for the simple values beginners use. */
export function formatValue(v: unknown, nested = false): string {
  if (typeof v === 'string') return nested ? `'${v}'` : v
  if (Array.isArray(v)) return v.length ? `[ ${v.map((x) => formatValue(x, true)).join(', ')} ]` : '[]'
  if (v && typeof v === 'object') {
    const entries = Object.entries(v)
    return entries.length ? `{ ${entries.map(([k, x]) => `${k}: ${formatValue(x, true)}`).join(', ')} }` : '{}'
  }
  return String(v)
}
export const formatArgs = (args: unknown[]) => args.map((a) => formatValue(a)).join(' ')

/** Runs a beginner's JavaScript, capturing console output (at most 200 lines). Used inside the JS worker. */
export function runJsSource(code: string): { stdout: string; error: string | null; truncated: boolean } {
  const lines: string[] = []
  let truncated = false
  const log = (...args: unknown[]) => {
    if (lines.length >= OUTPUT_LINE_CAP) {
      truncated = true
      return
    }
    lines.push(...formatArgs(args).split('\n'))
    if (lines.length > OUTPUT_LINE_CAP) {
      lines.length = OUTPUT_LINE_CAP
      truncated = true
    }
  }
  let error: string | null = null
  try {
    new Function('console', code)({ log, error: log, info: log, warn: log })
  } catch (e) {
    error = e instanceof Error ? `${e.name}: ${e.message}` : String(e)
  }
  return { stdout: lines.join('\n'), error, truncated }
}

/** Python tracebacks are long; beginners see the last line plus the line number of their code. */
export function tidyPythonError(message: string): string {
  const lines = message.trim().split('\n')
  const last = lines.at(-1) ?? message
  const at = [...message.matchAll(/File "<exec>", line (\d+)/g)].at(-1)?.[1]
  return at ? `${last} (line ${at})` : last
}
