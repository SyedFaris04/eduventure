import { normOutput } from './codeText'

export type WriteCheck = { ok: true } | { ok: false; reason: 'output' | 'must_use'; missing?: string }

/** A Write step passes when the program printed the expected output and uses every required token. */
export function checkWrite(code: string, stdout: string, step: { expected_output: string; must_use?: string[] | null }): WriteCheck {
  if (normOutput(stdout) !== normOutput(step.expected_output)) return { ok: false, reason: 'output' }
  const missing = step.must_use?.find((t) => !code.includes(t))
  return missing ? { ok: false, reason: 'must_use', missing } : { ok: true }
}
