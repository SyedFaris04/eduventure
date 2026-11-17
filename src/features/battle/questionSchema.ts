import { z } from 'zod'

export const QUESTION_TYPES = ['mcq', 'true_false', 'numeric', 'fill_blank', 'multi_select', 'ordering', 'matching', 'short_answer'] as const
export const BLOOM = ['remember', 'understand', 'apply', 'analyze', 'evaluate', 'create'] as const
export const STATUSES = ['draft', 'in_review', 'approved', 'published', 'rejected'] as const
const LEVELS = ['early_childhood', 'primary', 'lower_secondary', 'upper_secondary', 'pre_university', 'diploma', 'undergraduate', 'postgraduate', 'doctoral', 'vocational', 'lifelong'] as const

const option = z.object({ id: z.string().regex(/^[a-z]$/), text: z.string().min(1) })
const base = z.object({
  id: z.string().regex(/^[a-z]+(-[a-z]+)*-\d{3}$/),
  version: z.number().int().min(1),
  status: z.enum(STATUSES),
  level_ids: z.array(z.enum(LEVELS)).min(1),
  subject: z.string().min(1),
  topic: z.string().min(1),
  subtopic: z.string().min(1),
  difficulty: z.number().int().min(1).max(5),
  bloom: z.enum(BLOOM),
  prompt: z.string().min(5),
  explanation: z.string().min(10),
  objective: z.string().min(5),
  alignment: z.string().min(5),
  // Code-reading questions keep their program here too, so the tests can run it and check the stated answer.
  language: z.enum(['python', 'javascript']).optional(),
  code: z.string().optional(),
})

/** Source-file shape (with answers). The database splits it into `questions` and `question_keys`. */
export const questionSource = z.discriminatedUnion('type', [
  base.extend({
    type: z.literal('mcq'),
    options: z.array(option).min(3).max(5),
    answer: z.string(),
    wrong: z.record(z.string(), z.string().min(5)),
  }),
  base.extend({
    type: z.literal('true_false'),
    answer: z.enum(['true', 'false']),
    wrong: z.record(z.string(), z.string().min(5)),
  }),
  base.extend({
    type: z.literal('numeric'),
    answer: z.object({ value: z.number(), tolerance: z.number().min(0), unit: z.string().optional() }),
    mistakes: z.array(z.object({ value: z.number(), why: z.string().min(5) })).optional(),
  }),
  base.extend({
    type: z.literal('fill_blank'),
    answer: z.object({ accept: z.array(z.string().min(1)).min(1) }),
  }),
  base.extend({
    type: z.literal('multi_select'),
    options: z.array(option).min(3).max(6),
    answer: z.array(z.string()),
    wrong: z.record(z.string(), z.string().min(5)),
  }),
  base.extend({
    type: z.literal('ordering'),
    options: z.array(option).min(3).max(6), // shown in this (shuffled) order
    answer: z.array(z.string()), // correct order of option ids
  }),
  base.extend({
    type: z.literal('matching'),
    options: z.object({ left: z.array(option).min(2).max(6), right: z.array(z.object({ id: z.string().regex(/^[a-z]$/), text: z.string().min(1) })).min(2).max(6) }),
    answer: z.record(z.string(), z.string()), // left id -> right id
  }),
  base.extend({
    type: z.literal('short_answer'),
    answer: z.object({ accept: z.array(z.string().min(1)).min(1) }),
  }),
])
export type QuestionSource = z.infer<typeof questionSource>

/** What a client is allowed to see before answering. */
export type PublicQuestion = {
  id: string
  type: (typeof QUESTION_TYPES)[number]
  prompt: string
  options: { id: string; text: string }[] | { left: { id: string; text: string }[]; right: { id: string; text: string }[] } | null
  unit: string | null
  difficulty: number
  subject: string
  status: (typeof STATUSES)[number]
}

/** Rules the schema cannot express. Returns human-readable problems; empty means valid. */
export function questionProblems(q: QuestionSource): string[] {
  const p: string[] = []
  if (q.type === 'mcq') {
    const ids = q.options.map((o) => o.id)
    if (new Set(ids).size !== ids.length) p.push('duplicate option ids')
    if (!ids.includes(q.answer)) p.push('answer is not one of the options')
    for (const id of ids) if (id !== q.answer && !q.wrong[id]) p.push(`no explanation for wrong option ${id}`)
    if (q.wrong[q.answer]) p.push('the correct option has a "wrong" explanation')
    const texts = q.options.map((o) => o.text.toLowerCase())
    if (new Set(texts).size !== texts.length) p.push('two options have the same text')
  }
  if (q.type === 'true_false') {
    const other = q.answer === 'true' ? 'false' : 'true'
    if (!q.wrong[other]) p.push(`no explanation for choosing ${other}`)
  }
  if (q.type === 'numeric' && q.mistakes?.some((m) => Math.abs(m.value - q.answer.value) <= q.answer.tolerance)) p.push('a listed mistake equals the answer')
  if (q.type === 'multi_select') {
    const ids = q.options.map((o) => o.id)
    if (q.answer.length < 2) p.push('multiple-select needs at least two right options')
    if (q.answer.some((a) => !ids.includes(a))) p.push('answer is not one of the options')
    if (q.answer.length >= ids.length) p.push('multiple-select needs at least one wrong option')
    for (const id of ids) if (!q.answer.includes(id) && !q.wrong[id]) p.push(`no explanation for wrong option ${id}`)
  }
  if (q.type === 'ordering') {
    const ids = q.options.map((o) => o.id)
    if (q.answer.length !== ids.length || new Set(q.answer).size !== ids.length || q.answer.some((a) => !ids.includes(a))) p.push('ordering answer must list every item once')
    if (q.answer.every((a, i) => a === ids[i])) p.push('ordering items are already shown in the right order')
  }
  if (q.type === 'matching') {
    const left = q.options.left.map((o) => o.id)
    const right = q.options.right.map((o) => o.id)
    if (left.some((l) => !q.answer[l])) p.push('matching must pair every left item')
    if (Object.values(q.answer).some((r) => !right.includes(r))) p.push('matching uses an unknown right item')
    if (new Set(Object.values(q.answer)).size !== Object.values(q.answer).length) p.push('matching uses a right item twice')
  }
  if (q.type === 'fill_blank' && !q.prompt.includes('___')) p.push('fill-in-the-blank prompt has no ___')
  if (q.type === 'fill_blank' && q.answer.accept.some((a) => q.prompt.toLowerCase().includes(a.toLowerCase()))) p.push('the answer appears in the prompt')
  return p
}
