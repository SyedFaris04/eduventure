import { z } from 'zod'

const STATUSES = ['draft', 'in_review', 'approved', 'published', 'rejected'] as const
const option = z.object({ id: z.string().regex(/^[a-z]$/), text: z.string() })
const stepBase = { id: z.string().regex(/^(py|js|en|ms)-u\d-l\d-s\d+$/), text: z.string().min(3) }

// ---- Code courses (Code Academy) ----
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

// ---- Language courses (Language Hall) ----
const card = z.object({ ...stepBase, kind: z.literal('card'), word: z.string().min(1), meaning: z.string().min(1), emoji: z.string().min(1), say: z.string().optional(), note: z.string().optional() })
const pick = z.object({ ...stepBase, kind: z.literal('pick'), prompt: z.string().min(1), say: z.string().optional(), options: z.array(option).min(2).max(4), answer: z.string(), explanation: z.string().min(5) })
const match = z.object({ ...stepBase, kind: z.literal('match'), pairs: z.array(z.tuple([z.string().min(1), z.string().min(1)])).min(3).max(5) })
const build = z.object({
  ...stepBase,
  kind: z.literal('build'),
  prompt: z.string().min(1),
  tiles: z.array(z.string().min(1)).min(3),
  answer: z.array(z.string().min(1)).min(2),
  accept_orders: z.array(z.array(z.string().min(1))).optional(),
  explanation: z.string().min(5),
})
const gap = z.object({ ...stepBase, kind: z.literal('gap'), sentence: z.string().min(3), options: z.array(option).min(2).max(4), answer: z.string(), explanation: z.string().min(5) })
const listen = z.object({ ...stepBase, kind: z.literal('listen'), say: z.string().min(1), options: z.array(option).min(2).max(4), answer: z.string() })
const type = z.object({ ...stepBase, kind: z.literal('type'), prompt: z.string().min(1), accept: z.array(z.string().min(1)).min(1), explanation: z.string().min(5) })

const step = z.discriminatedUnion('kind', [learn, predict, fix, write, card, pick, match, build, gap, listen, type])

const lesson = z.object({
  id: z.string().regex(/^(py|js|en|ms)-u\d-l\d$/),
  version: z.number().int().min(1),
  status: z.enum(STATUSES),
  title: z.string().min(3),
  objective: z.string().min(5),
  steps: z.array(step).min(5).max(8),
})
const unit = z.object({ id: z.string().regex(/^(py|js|en|ms)-u\d$/), title: z.string().min(3), lessons: z.array(lesson).min(1) })

/** A course file in content/courses/. The database splits it into public steps and server-only keys. */
export const courseSource = z.object({
  _meta: z.object({ author: z.string().min(3), license: z.string().min(3) }),
  id: z.enum(['python-basics', 'javascript-basics', 'english-basics', 'malay-basics']),
  kind: z.enum(['code', 'language']),
  language: z.enum(['python', 'javascript', 'english', 'malay']),
  title: z.string().min(3),
  units: z.array(unit).min(1),
})

export type Course = z.infer<typeof courseSource>
export type Lesson = z.infer<typeof lesson>
export type Step = z.infer<typeof step>

export const CODE_KINDS = ['learn', 'predict', 'fix', 'write'] as const
export const LANGUAGE_KINDS = ['card', 'pick', 'match', 'build', 'gap', 'listen', 'type'] as const
/** Steps the server marks and that must be right before a lesson pays (listen is a bonus: some phones can't speak). */
export const REQUIRED_KINDS = ['predict', 'fix', 'pick', 'match', 'build', 'gap', 'type'] as const

const PREFIX: Record<Course['language'], string> = { python: 'py', javascript: 'js', english: 'en', malay: 'ms' }

/** Rules the schema can't express. Returns every problem found (empty when the course is fine). */
export function contentRules(c: Course): string[] {
  const problems: string[] = []
  const ids = new Set<string>()
  const seen = (id: string) => (ids.has(id) ? problems.push(`duplicate id ${id}`) : ids.add(id))
  const prefix = PREFIX[c.language]
  const allowed: readonly string[] = c.kind === 'code' ? CODE_KINDS : LANGUAGE_KINDS
  if ((c.kind === 'code') !== (c.language === 'python' || c.language === 'javascript')) problems.push(`${c.id}: kind and language don't match`)
  c.units.forEach((u, ui) => {
    seen(u.id)
    if (u.id !== `${prefix}-u${ui + 1}`) problems.push(`${u.id}: units must be numbered ${prefix}-u1, ${prefix}-u2, …`)
    u.lessons.forEach((l, li) => {
      seen(l.id)
      if (l.id !== `${u.id}-l${li + 1}`) problems.push(`${l.id}: lessons must be numbered ${u.id}-l1, -l2, …`)
      const marked = l.steps.filter((s) => (REQUIRED_KINDS as readonly string[]).includes(s.kind)).length
      if (c.kind === 'code' && marked < 1) problems.push(`${l.id}: needs a predict or fix step for the server to mark`)
      if (c.kind === 'language' && marked < 2) problems.push(`${l.id}: needs at least two marked exercises`)
      l.steps.forEach((s, si) => {
        seen(s.id)
        if (s.id !== `${l.id}-s${si + 1}`) problems.push(`${s.id}: steps must be numbered ${l.id}-s1, -s2, …`)
        if (!allowed.includes(s.kind)) problems.push(`${s.id}: ${s.kind} steps don't belong in a ${c.kind} course`)
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
        if ((s.kind === 'pick' || s.kind === 'gap' || s.kind === 'listen') && !s.options.some((o) => o.id === s.answer)) problems.push(`${s.id}: answer is not one of the options`)
        if (s.kind === 'gap' && !s.sentence.includes('___')) problems.push(`${s.id}: the sentence needs a ___ gap`)
        if (s.kind === 'build') {
          // Every accepted order must be buildable from the tiles, each tile used at most once.
          for (const order of [s.answer, ...(s.accept_orders ?? [])]) {
            const tray = [...s.tiles]
            for (const w of order) {
              const i = tray.indexOf(w)
              if (i < 0) problems.push(`${s.id}: "${w}" is not one of the tiles`)
              else tray.splice(i, 1)
            }
          }
          if (s.tiles.length <= s.answer.length) problems.push(`${s.id}: add at least one extra tile`)
          for (const o of s.accept_orders ?? []) if ([...o].sort().join('|') !== [...s.answer].sort().join('|')) problems.push(`${s.id}: an accepted order uses different words`)
        }
        if (s.kind === 'match') {
          const dup = (xs: string[]) => new Set(xs).size !== xs.length
          if (dup(s.pairs.map((p) => p[0])) || dup(s.pairs.map((p) => p[1]))) problems.push(`${s.id}: match words must be unique`)
        }
      })
    })
  })
  return problems
}
