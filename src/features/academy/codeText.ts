/** Program output as compared everywhere: trailing spaces on each line and trailing blank lines don't count. */
export const normOutput = (s: string) =>
  s
    .split('\n')
    .map((l) => l.replace(/\s+$/, ''))
    .join('\n')
    .replace(/\n+$/, '')

/**
 * A line of code as compared for Fix steps: spacing is ignored around punctuation and operators, but not
 * inside the words or strings themselves. The server's public.norm_code() applies the same rule.
 */
export const normCode = (s: string) =>
  s
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/\s*([()[\]{},:;=+\-*/<>!])\s*/g, '$1')

/** The program with line `n` (1-based) replaced. */
export function replaceLine(code: string, n: number, line: string): string {
  const lines = code.split('\n')
  lines[n - 1] = line
  return lines.join('\n')
}

/**
 * A typed language answer as compared everywhere: case, extra spaces, a final . ! or ? and quote marks don't count.
 * The server's public.norm_answer() applies the same rule.
 */
export const normAnswer = (s: string) =>
  s
    .toLowerCase()
    .replace(/['"‘’“”]/g, '')
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[.!?]+$/, '')
    .trim()
