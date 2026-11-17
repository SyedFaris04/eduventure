const lines = (s: string) => s.replace(/\r/g, '').replace(/\n+$/, '').split('\n')

/** The line a Fix step marks, once the learner has edited the program; refuses edits elsewhere so the mark is fair. */
export function fixLine(original: string, edited: string, brokenLine: number): { line: string } | { error: 'line-count' | 'other-lines' } {
  const a = lines(original)
  const b = lines(edited)
  if (a.length !== b.length) return { error: 'line-count' }
  if (a.some((l, i) => i !== brokenLine - 1 && l.trim() !== b[i].trim())) return { error: 'other-lines' }
  return { line: b[brokenLine - 1] }
}
