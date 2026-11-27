// @vitest-environment node
import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { runInNewContext } from 'node:vm'
import { beforeAll, describe, expect, it } from 'vitest'
import { loadPyodide, type PyodideInterface } from 'pyodide'
import { contentRules, courseSource, type Course, type Step } from './lessonSchema'
import { normAnswer, normCode, normOutput, replaceLine } from './codeText'
import { formatArgs } from './runner/jsCore'

const dir = new URL('../../../content/courses/', import.meta.url)
const files = readdirSync(dir).filter((f) => f.endsWith('.json'))
const courses = files.map((f) => JSON.parse(readFileSync(new URL(f, dir), 'utf8')) as Course)

/** Runs JavaScript like the browser runner does: console.log lines joined with newlines; errors come back as text. */
function runJs(code: string): { out: string; error: string | null } {
  const lines: string[] = []
  const log = (...a: unknown[]) => {
    // A broken Fix sample may loop forever printing; stop it like the app's runner would.
    if (lines.length >= 1000) throw new Error('too much output')
    lines.push(formatArgs(a)) // exactly how the browser runner prints
  }
  try {
    runInNewContext(code, { console: { log, error: log } }, { timeout: 2000 })
    return { out: lines.join('\n'), error: null }
  } catch (e) {
    return { out: lines.join('\n'), error: String(e) }
  }
}

let py: PyodideInterface
async function runPy(code: string): Promise<{ out: string; error: string | null }> {
  const lines: string[] = []
  // Throw away anything a stopped run left in Python's output buffer.
  py.setStdout({ batched: () => undefined })
  await py.runPythonAsync('import sys; sys.stdout.flush()')
  py.setStdout({
    batched: (s) => {
      if (lines.length >= 1000) throw new Error('too much output') // ends an endless printing loop
      lines.push(s)
    },
  })
  try {
    await py.runPythonAsync(code, { globals: py.toPy({}) })
    return { out: lines.join('\n'), error: null }
  } catch (e) {
    return { out: lines.join('\n'), error: String(e) }
  }
}

/** Compiles and runs a C++ program with g++, as a learner's computer would: its output, or the compiler's or program's error. */
function runCpp(code: string): { out: string; error: string | null } {
  const dir = mkdtempSync(join(tmpdir(), 'lesson-cpp-'))
  try {
    writeFileSync(join(dir, 'main.cpp'), code)
    const exe = join(dir, 'main')
    const built = spawnSync('g++', ['-std=c++17', '-o', exe, join(dir, 'main.cpp')], { encoding: 'utf8' })
    if (built.status !== 0) return { out: '', error: built.stderr || 'compile error' }
    const ran = spawnSync(exe, [], { encoding: 'utf8', timeout: 5000 })
    return { out: ran.stdout ?? '', error: ran.status === 0 ? null : ran.stderr || `exit ${ran.status}` }
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}
const hasGpp = spawnSync('g++', ['--version']).status === 0

const run = (lang: Course['language'], code: string) => (lang === 'javascript' ? Promise.resolve(runJs(code)) : lang === 'cpp' ? Promise.resolve(runCpp(code)) : runPy(code))
const steps = (c: Course) => c.units.flatMap((u) => u.lessons.flatMap((l) => l.steps))

describe('course files', () => {
  it('has the coding and language courses', () => {
    expect(courses.map((c) => c.id).sort()).toEqual(['ai-basics', 'arabic-basics', 'cpp-basics', 'data-structures', 'english-basics', 'japanese-basics', 'javascript-basics', 'korean-basics', 'machine-learning', 'malay-basics', 'mandarin-basics', 'python-basics'])
  })

  it('every course file matches the schema and the content rules', () => {
    for (const c of courses) {
      const parsed = courseSource.safeParse(c)
      expect(parsed.success, `${c.id}: ${parsed.success ? '' : JSON.stringify(parsed.error.issues.slice(0, 3))}`).toBe(true)
      expect(contentRules(c), c.id).toEqual([])
    }
  })

  it('the rules really catch broken lessons', () => {
    const c = structuredClone(courses.find((x) => x.kind === 'code')!)
    const fix = steps(c).find((s) => s.kind === 'fix') as Extract<Step, { kind: 'fix' }>
    fix.broken_line = 99
    expect(contentRules(c).join(' ')).toMatch(/broken_line/)
  })

  it('normCode ignores spacing but not string contents', () => {
    expect(normCode('print( "Hi" )')).toBe(normCode('print("Hi")'))
    expect(normCode('x  =  1 + 2')).toBe(normCode('x=1+2'))
    expect(normCode('x = "a b"')).not.toBe(normCode('x = "ab"'))
  })

  it('normAnswer forgives slips', () => {
    expect(normAnswer('Selamat  pagi.')).toBe(normAnswer('selamat pagi'))
    expect(normAnswer("I'm Aina!")).toBe(normAnswer('im aina'))
    expect(normAnswer('hello')).not.toBe(normAnswer('hallo'))
    // Answers typed in Japanese, Chinese or Arabic end with their own full stops and question marks.
    expect(normAnswer('ありがとう。')).toBe(normAnswer('ありがとう'))
    expect(normAnswer('你好！')).toBe(normAnswer('你好'))
    expect(normAnswer('كيف حالك؟')).toBe(normAnswer('كيف حالك'))
  })

  it("ids carry their own course's prefix, so two courses never share a lesson id", () => {
    const c = structuredClone(courses.find((x) => x.id === 'malay-basics')!)
    expect(courseSource.safeParse(c).success).toBe(true)
    c.units[0].lessons[0].steps[0].id = 'zz-u1-l1-s1' // no course has this prefix
    expect(courseSource.safeParse(c).success).toBe(false)
    const d = structuredClone(courses.find((x) => x.id === 'malay-basics')!)
    d.units[0].id = 'en-u1' // English's prefix inside the Malay course
    expect(contentRules(d).join(' ')).toMatch(/en-u1/)
  })

  it('C++ lessons only read, predict and fix: a phone cannot run C++, so nothing asks it to', () => {
    const lesson = (steps: Step[]) => ({ id: 'cpp-u1-l1', version: 1, status: 'in_review' as const, title: 'Hello', objective: 'Print with cout.', steps })
    const learn = { id: 'cpp-u1-l1-s1', kind: 'learn' as const, text: 'Read it.', code: 'int main() {}', expected_output: '' }
    const predict = { id: 'cpp-u1-l1-s2', kind: 'predict' as const, text: 'What prints?', code: 'int main() {}', answer_text: '', explanation: 'Nothing is printed.' }
    const write = { id: 'cpp-u1-l1-s3', kind: 'write' as const, text: 'Print Hi.', starter: '', expected_output: 'Hi', solution: 'cout', hint: 'Use cout.' }
    const course = (steps: Step[]) => ({ _meta: { author: 'Test', license: 'CC BY 4.0' }, id: 'cpp-basics' as const, kind: 'code' as const, language: 'cpp' as const, title: 'C++', units: [{ id: 'cpp-u1', title: 'Hello', lessons: [lesson(steps)] }] })
    const more = (n: number) => ({ ...learn, id: `cpp-u1-l1-s${n}` })
    expect(courseSource.safeParse(course([learn, predict, more(3), more(4), more(5)])).success).toBe(true)
    expect(contentRules(course([learn, predict, more(3), more(4), more(5)]) as Course)).toEqual([])
    expect(contentRules(course([learn, predict, write, more(4), more(5)]) as Course).join(' ')).toMatch(/cpp-u1-l1-s3.*C\+\+/)
  })

  it('the rules catch broken language steps', () => {
    const c = structuredClone(courses.find((x) => x.id === 'english-basics')!)
    const b = steps(c).find((s) => s.kind === 'build') as Extract<Step, { kind: 'build' }>
    b.answer = [...b.answer, 'zebra']
    expect(contentRules(c).join(' ')).toMatch(/zebra/)
  })

  it('normOutput ignores trailing spaces and blank lines only', () => {
    expect(normOutput('a  \nb\n\n')).toBe('a\nb')
    expect(normOutput(' a')).toBe(' a')
  })
})

describe('C++ lessons are checked by a real compiler', () => {
  it('the Lessons workflow compiles them with g++ on every push that touches a lesson', () => {
    const wf = readFileSync(new URL('../../../.github/workflows/content.yml', import.meta.url), 'utf8')
    expect(wf).toMatch(/content\/courses/)
    expect(wf).toMatch(/vitest run src\/features\/academy\/lessons\.test\.ts/)
    expect(wf).toMatch(/REQUIRE_GPP/)
  })
})

describe('every sample prints what the lesson says', () => {
  beforeAll(async () => {
    py = await loadPyodide()
  }, 120_000)

  for (const c of courses.filter((x) => x.kind === 'code'))
    // C++ needs g++: GitHub's "Lessons" workflow always has it (REQUIRE_GPP); a PC without it skips just these.
    it.skipIf(c.language === 'cpp' && !hasGpp && !process.env.REQUIRE_GPP)(`${c.id}: learn, fix, write and predict outputs are real`, async () => {
      for (const s of steps(c)) {
        const check = async (code: string, expected: string, what: string) => {
          const r = await run(c.language, code)
          expect(r.error, `${s.id} ${what} threw`).toBeNull()
          expect(normOutput(r.out), `${s.id} ${what}`).toBe(normOutput(expected))
        }
        if (s.kind === 'learn') await check(s.code, s.expected_output, 'learn')
        if (s.kind === 'write') await check(s.solution, s.expected_output, 'solution')
        if (s.kind === 'fix') {
          for (const a of s.accept) await check(replaceLine(s.code, s.broken_line, a), s.expected_output, `fix "${a}"`)
          const broken = await run(c.language, s.code)
          expect(broken.error !== null || normOutput(broken.out) !== normOutput(s.expected_output), `${s.id} is not really broken`).toBe(true)
        }
        if (s.kind === 'predict') {
          const want = s.answer_text ?? s.options?.find((o) => o.id === s.answer)?.text
          await check(s.code, want ?? '<missing>', 'predict answer')
        }
      }
    }, 120_000)
})

type CodeQuestion = { id: string; type: string; prompt: string; code?: string; language?: 'python' | 'javascript'; options?: { id: string; text: string }[]; answer: unknown }
const qdir = new URL('../../../content/questions/', import.meta.url)
const codeQuestions = readdirSync(qdir)
  .filter((f) => f.endsWith('.json'))
  .flatMap((f) => (JSON.parse(readFileSync(new URL(f, qdir), 'utf8')) as { questions: CodeQuestion[] }).questions)
  .filter((q) => q.code !== undefined)

describe('code-reading questions print their answers', () => {
  beforeAll(async () => {
    py ??= await loadPyodide()
  }, 120_000)

  it('there are code-reading questions at every school level', () => {
    expect(codeQuestions.length).toBeGreaterThanOrEqual(60)
  })

  it('every program runs, and the stated answer is what it really prints', async () => {
    for (const q of codeQuestions) {
      expect(q.language, q.id).toBeDefined()
      expect(q.prompt.endsWith(q.code!), `${q.id}: the prompt must show the program`).toBe(q.type !== 'ordering')
      const r = await run(q.language!, q.code!)
      expect(r.error, `${q.id} threw`).toBeNull()
      if (q.type === 'mcq') expect(normOutput(r.out), q.id).toBe(q.options!.find((o) => o.id === q.answer)!.text)
      if (q.type === 'fill_blank') expect(normOutput(r.out), q.id).toBe((q.answer as { accept: string[] }).accept[0])
    }
  }, 120_000)
})
