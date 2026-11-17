// The tests play a learner who knows the answers: they read them from the course files.
import { readdirSync, readFileSync } from 'node:fs'

export type Step = {
  id: string
  kind: string
  answer?: string | string[]
  answer_text?: string
  accept?: string[]
  solution?: string
  pairs?: [string, string][]
  options?: { id: string; text: string }[]
}
type Course = { units: { lessons: { id: string; steps: Step[] }[] }[] }

const dir = new URL('../../content/courses/', import.meta.url)
const courses = readdirSync(dir)
  .filter((f) => f.endsWith('.json'))
  .map((f) => JSON.parse(readFileSync(new URL(f, dir), 'utf8')) as Course)
export const lessonSteps = new Map(courses.flatMap((c) => c.units.flatMap((u) => u.lessons.map((l) => [l.id, l.steps] as const))))

/** The right answer for a server-marked step. */
export function rightStep(s: Step) {
  switch (s.kind) {
    case 'fix':
      return { line: s.accept![0] }
    case 'type':
      return { text: s.accept![0] }
    case 'match':
      return { pairs: s.pairs }
    case 'build':
      return { order: s.answer }
    case 'predict':
      return s.answer !== undefined ? { choice: s.answer } : { text: s.answer_text! }
    default: // pick, gap, listen
      return { choice: s.answer }
  }
}

/** Steps the server must see answered correctly before a lesson pays (listen is a bonus). */
export const REQUIRED = ['predict', 'fix', 'pick', 'match', 'build', 'gap', 'type']
export const marked = (lesson: string) => lessonSteps.get(lesson)!.filter((s) => REQUIRED.includes(s.kind))
