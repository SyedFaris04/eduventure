import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

// No YAML parser is installed, so this reads the workflow by indentation: top-level keys at 0, jobs at 2, job keys at 4.
const lines = readFileSync('.github/workflows/release.yml', 'utf8').split('\n')

function block(start: number, indent: number) {
  const out: string[] = []
  for (let i = start + 1; i < lines.length; i++) {
    const l = lines[i]
    if (l.trim() && !l.trim().startsWith('#') && l.search(/\S/) <= indent) break
    const value = l.replace(/\s+#.*$/, '').trim()
    if (value && !value.startsWith('#')) out.push(value)
  }
  return out
}
const topPermissions = () => {
  const i = lines.findIndex((l) => /^permissions:/.test(l))
  return i < 0 ? [] : block(i, 0)
}
function jobPermissions(job: string) {
  const at = lines.findIndex((l) => l === `  ${job}:`)
  const p = lines.findIndex((l, i) => i > at && l === '    permissions:')
  const next = lines.findIndex((l, i) => i > at && /^ {2}\S/.test(l))
  return p < 0 || (next > 0 && p > next) ? [] : block(p, 4)
}

describe('release workflow', () => {
  it('gives each job only the permissions it needs (npm install scripts never run with write access)', () => {
    expect(topPermissions().every((p) => p.endsWith(': read'))).toBe(true)
    expect(jobPermissions('test')).toEqual(['contents: read'])
    expect(jobPermissions('pages').sort()).toEqual(['contents: read', 'id-token: write', 'pages: write'])
    expect(jobPermissions('android')).toEqual(['contents: write'])
  })
})
