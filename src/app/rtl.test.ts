import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const files = (dir: string): string[] => readdirSync(dir).flatMap((f) => (statSync(join(dir, f)).isDirectory() ? files(join(dir, f)) : f.endsWith('.tsx') && !f.includes('.test.') ? [join(dir, f)] : []))

describe('Arabic (right-to-left) layouts', () => {
  it('round corners by start and end, not left and right, so they mirror in Arabic', () => {
    // rounded-tl/tr/bl/br/l/r stay put when the page flips; rounded-ss/se/es/ee and rounded-s/e follow the reading direction.
    const physical = /\brounded-(?:tl|tr|bl|br|l|r)(?=-|\s|"|'|`|$)/
    const offenders = files('src').filter((f) => physical.test(readFileSync(f, 'utf8')))
    expect(offenders).toEqual([])
  })
})
