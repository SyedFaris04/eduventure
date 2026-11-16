import { z } from 'zod'

const STATUSES = ['draft', 'in_review', 'approved', 'published', 'rejected'] as const
const option = z.object({ id: z.string().regex(/^[a-z]$/), text: z.string() })
const stepBase = { id: z.string().regex(/^(py|js)-u\d-l\d-s\d+$/), text: z.string().min(5) }

const learn = z.object({ ...stepBase, kind: z.literal('learn'), code: z.string().min(1), expected_output: z.string() })
const predict = z.object({
  ...stepBase,
  kind: z.literal('predict'),
  code: z.string().min(1),
  options: z.array(option).min(2).max(4).optional(),
  answer: z.string().optional(),
  answer_text: z.string().optional(),
  explanation: z.string().min(10),
})
const fix = z.object({
  ...stepBase,
  kind: z.literal('fix'),
  code: z.string().min(1),
  broken_line: z.number().int().min(1),
  accept: z.array(z.string().min(1)).min(1),
  expected_output: z.string(),
  hint: z.string().min(5),
  explanation: z.string().min(10),
})
const write = z.object({
  ...stepBase,
  kind: z.literal('write'),
  starter: z.string(),
  expected_output: z.string(),
  must_use: z.array(z.string().min(1)).optional(),
  solution: z.string().min(1),
  hint: z.string().min(5),
})
const step = z.discriminatedUnion('kind', [learn, predict, fix, write])

const lesson = z.object({
  id: z.string().regex(/^(py|js)-u\d-l\d$/),
  version: z.number().int().min(1),
  status: z.enum(STATUSES),
  title: z.string().min(3),
  objective: z.string().min(5),
  steps: z.array(step).min(5).max(8),
})
const unit = z.object({ id: z.string().regex(/^(py|js)-u\d$/), title: z.string().min(3), lessons: z.array(lesson).min(1) })

/** A course file in content/courses/. The database splits it into public steps and server-only keys. */
export const courseSource = z.object({
  _meta: z.object({ author: z.string().min(3), license: z.string().min(3) }),
  id: z.enum(['python-basics', 'javascript-basics']),
  language: z.enum(['python', 'javascript']),
  title: z.string().min(3),
  units: z.array(unit).min(1),
})

export type Course = z.infer<typeof courseSource>
export type Lesson = z.infer<typeof lesson>
export type Step = z.infer<typeof step>

/** Rules the schema can't express. Returns every problem found (empty when the course is fine). */
export function contentRules(c: Course): string[] {
  const problems: string[] = []
  const ids = new Set<string>()
  const seen = (id: string) => (ids.has(id) ? problems.push(`duplicate id ${id}`) : ids.add(id))
  const prefix = c.language === 'python' ? 'py' : 'js'
  c.units.forEach((u, ui) => {
    seen(u.id)
    if (u.id !== `${prefix}-u${ui + 1}`) problems.push(`${u.id}: units must be numbered ${prefix}-u1, ${prefix}-u2, …`)
    u.lessons.forEach((l, li) => {
      seen(l.id)
      if (l.id !== `${u.id}-l${li + 1}`) problems.push(`${l.id}: lessons must be numbered ${u.id}-l1, -l2, …`)
      if (!l.steps.some((s) => s.kind === 'predict' || s.kind === 'fix')) problems.push(`${l.id}: needs a predict or fix step for the server to mark`)
      l.steps.forEach((s, si) => {
        seen(s.id)
        if (s.id !== `${l.id}-s${si + 1}`) problems.push(`${s.id}: steps must be numbered ${l.id}-s1, -s2, …`)
        if (s.kind === 'predict') {
          if ((s.answer === undefined) === (s.answer_text === undefined)) problems.push(`${s.id}: needs exactly one of answer / answer_text`)
          if (s.answer !== undefined && !s.options?.some((o) => o.id === s.answer)) problems.push(`${s.id}: answer is not one of the options`)
          if (s.answer_text !== undefined && s.options) problems.push(`${s.id}: typed answers have no options`)
        }
        if (s.kind === 'fix') {
          const lines = s.code.split('\n')
          if (s.broken_line > lines.length) problems.push(`${s.id}: broken_line is past the end of the code`)
          else if (s.accept.some((a) => a.trim() === lines[s.broken_line - 1].trim())) problems.push(`${s.id}: the broken line itself is accepted`)
        }
        if (s.kind === 'write' && s.must_use?.some((t) => !s.solution.includes(t))) problems.push(`${s.id}: the solution doesn't use every must_use token`)
      })
    })
  })
  return problems
}
