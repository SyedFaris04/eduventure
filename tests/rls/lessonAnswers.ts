// The tests play a learner who knows the answers: they read them from the course files.
import { readdirSync, readFileSync } from 'node:fs'

type Step = { id: string; kind: string; answer?: string; answer_text?: string; accept?: string[]; solution?: string }
type Course = { units: { lessons: { id: string; steps: Step[] }[] }[] }

const dir = new URL('../../content/courses/', import.meta.url)
const courses = readdirSync(dir)
  .filter((f) => f.endsWith('.json'))
  .map((f) => JSON.parse(readFileSync(new URL(f, dir), 'utf8')) as Course)
export const lessonSteps = new Map(courses.flatMap((c) => c.units.flatMap((u) => u.lessons.map((l) => [l.id, l.steps] as const))))

/** The right answer for a server-marked step. */
export function rightStep(s: Step) {
  if (s.kind === 'fix') return { line: s.accept![0] }
  return s.answer !== undefined ? { choice: s.answer } : { text: s.answer_text! }
}
export const marked = (lesson: string) => lessonSteps.get(lesson)!.filter((s) => s.kind === 'predict' || s.kind === 'fix')
