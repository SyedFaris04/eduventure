// Adds a structured Malaysian curriculum tag to every question whose alignment text names KSSR or KSSM:
//   "curriculum": { "system": "KSSR", "subject": "Matematik", "years": [3, 4] }
// Years come from "Tahun N(–M)" / "Tingkatan N(–M)"; when the text names none, from the question's level.
// The tag is inserted right after "alignment" so the files keep their layout. Re-running is safe.
import { readdirSync, readFileSync, writeFileSync } from 'node:fs'

const dir = new URL('../content/questions/', import.meta.url)
const LEVEL_YEARS = { primary: [1, 2, 3, 4, 5, 6], lower_secondary: [1, 2, 3], upper_secondary: [4, 5] }
const pattern = /\b(KSSR|KSSM)\s+([A-Za-z][A-Za-z ]*?)(?=\s+(?:Tahun|Tingkatan|Form|Year)\b|\s*[/,.)]|\s+[A-Z]{2,}|$)(?:\s+(?:Tahun|Tingkatan|Form|Year)\s+(\d)(?:\s*[-–]\s*(\d))?)?/

export function parseCurriculum(alignment, levels) {
  const m = alignment.match(pattern)
  if (!m) return null
  const [, system, subject, from, to] = m
  let years
  if (from) years = Array.from({ length: Number(to ?? from) - Number(from) + 1 }, (_, i) => Number(from) + i)
  else years = [...new Set(levels.flatMap((l) => LEVEL_YEARS[l] ?? []))].sort((a, b) => a - b)
  if (!years.length) years = system === 'KSSR' ? LEVEL_YEARS.primary : [1, 2, 3, 4, 5]
  return { system, subject: subject.trim(), years }
}

if (process.argv[1]?.endsWith('tag-curriculum.mjs')) {
  let tagged = 0
  for (const file of readdirSync(dir).filter((f) => f.endsWith('.json'))) {
    const url = new URL(file, dir)
    let raw = readFileSync(url, 'utf8')
    const { questions } = JSON.parse(raw)
    let cursor = 0 // questions appear in file order; several can share an alignment text
    for (const q of questions) {
      cursor = raw.indexOf(`"id": ${JSON.stringify(q.id)}`, cursor)
      if (cursor < 0) throw new Error(`${q.id}: not found in ${file}`)
      if (q.curriculum) continue
      const tag = parseCurriculum(q.alignment, q.level_ids)
      if (!tag) continue
      const field = `"alignment": ${JSON.stringify(q.alignment)}`
      const at = raw.indexOf(field, cursor)
      if (at < 0) throw new Error(`${q.id}: alignment not found verbatim in ${file}`)
      raw = raw.slice(0, at + field.length) + `, "curriculum": ${JSON.stringify(tag).replaceAll(',"', ', "').replaceAll('":', '": ')}` + raw.slice(at + field.length)
      tagged++
    }
    JSON.parse(raw) // still valid JSON
    writeFileSync(url, raw)
  }
  console.log(`tagged ${tagged} questions`)
}
