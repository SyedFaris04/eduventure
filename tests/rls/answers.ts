// The tests play a student who knows the answers: they read the keys from every content file.
import { readdirSync, readFileSync } from 'node:fs'

export type Q = { id: string; type: string; subject: string; topic: string; explanation: string; answer: unknown; options?: { id: string }[] }

const dir = new URL('../../content/questions/', import.meta.url)
export const byId = new Map<string, Q>(
  readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .flatMap((f) => JSON.parse(readFileSync(new URL(f, dir), 'utf8')).questions as Q[])
    .map((q) => [q.id, q]),
)

const get = (id: string) => {
  const q = byId.get(id)
  if (!q) throw new Error(`question ${id} is not in content/questions`)
  return q
}

export function rightAnswer(id: string) {
  const q = get(id)
  switch (q.type) {
    case 'mcq':
    case 'true_false':
      return { choice: q.answer }
    case 'numeric':
      return { value: String((q.answer as { value: number }).value) }
    case 'multi_select':
      return { choices: q.answer }
    case 'ordering':
      return { order: q.answer }
    case 'matching':
      return { pairs: q.answer }
    default:
      return { text: (q.answer as { accept: string[] }).accept[0] }
  }
}

export function wrongAnswer(id: string) {
  const q = get(id)
  switch (q.type) {
    case 'mcq':
      return { choice: q.options!.find((o) => o.id !== q.answer)!.id }
    case 'true_false':
      return { choice: q.answer === 'true' ? 'false' : 'true' }
    case 'numeric':
      return { value: String((q.answer as { value: number }).value + 1000) }
    case 'multi_select':
      return { choices: [] }
    case 'ordering':
      return { order: [...(q.answer as string[])].reverse() }
    case 'matching':
      return { pairs: {} }
    default:
      return { text: 'definitely not this' }
  }
}
