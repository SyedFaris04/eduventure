// Generates supabase/seed.sql (reference data). Run: npm run gen:seed
// Idempotent: every insert is an upsert, so the seed can be re-applied safely.
import { readFileSync, writeFileSync } from 'node:fs'

const q = (s) => (s === null ? 'null' : `'${String(s).replaceAll("'", "''")}'`)
const arr = (xs) => `array[${xs.map(q).join(',')}]::text[]`

// UNESCO ISCED 2011 mapping for the 11 onboarding categories.
const LEVELS = [
  ['early_childhood', '0'],
  ['primary', '1'],
  ['lower_secondary', '2'],
  ['upper_secondary', '3'],
  ['pre_university', '3-4'],
  ['diploma', '5'],
  ['undergraduate', '6'],
  ['postgraduate', '7'],
  ['doctoral', '8'],
  ['vocational', '2-5 (vocational)'],
  ['lifelong', 'any'],
]
const ALL = LEVELS.map(([id]) => id)

// ISO 3166-1 alpha-2 codes, names from the runtime's CLDR data (the app shows localized names via Intl.DisplayNames).
const NOT_COUNTRIES = new Set([
  // groupings, reserved and private-use codes
  'EU', 'EZ', 'UN', 'QO', 'ZZ', 'AC', 'CP', 'CQ', 'DG', 'EA', 'IC', 'TA', 'XA', 'XB', 'XK',
  // retired codes CLDR still resolves as aliases of current countries
  'AN', 'BU', 'CS', 'DD', 'DY', 'FX', 'HV', 'NH', 'RH', 'SU', 'TP', 'UK', 'VD', 'YD', 'YU', 'ZR',
])
const names = new Intl.DisplayNames(['en'], { type: 'region', fallback: 'none' })
const COUNTRIES = []
for (let a = 65; a <= 90; a++)
  for (let b = 65; b <= 90; b++) {
    const code = String.fromCharCode(a, b)
    const name = names.of(code)
    if (name && !NOT_COUNTRIES.has(code)) COUNTRIES.push([code, name])
  }
if (COUNTRIES.length < 245 || COUNTRIES.length > 252) throw new Error(`unexpected country count ${COUNTRIES.length}`)

const CURRICULA = [
  ['international', null, 'International (any curriculum)', ALL],
  ['my_kspk', 'MY', 'KSPK – Kurikulum Standard Prasekolah Kebangsaan', ['early_childhood']],
  ['my_kssr', 'MY', 'KSSR – Kurikulum Standard Sekolah Rendah', ['primary']],
  ['my_kssm', 'MY', 'KSSM – Kurikulum Standard Sekolah Menengah (SPM)', ['lower_secondary', 'upper_secondary']],
  ['my_stpm', 'MY', 'STPM – Sijil Tinggi Persekolahan Malaysia', ['pre_university']],
  ['my_matriculation', 'MY', 'Matrikulasi KPM', ['pre_university']],
]

const range = (prefix, from, to) => Array.from({ length: to - from + 1 }, (_, i) => `${prefix} ${from + i}`)
const GRADES = [
  ['international', 'early_childhood', ['Ages 3–4', 'Ages 5–6']],
  ['international', 'primary', range('Grade', 1, 6)],
  ['international', 'lower_secondary', range('Grade', 7, 9)],
  ['international', 'upper_secondary', range('Grade', 10, 12)],
  ['international', 'pre_university', ['Year 1', 'Year 2']],
  ['international', 'diploma', ['Year 1', 'Year 2', 'Year 3']],
  ['international', 'undergraduate', ['Year 1', 'Year 2', 'Year 3', 'Year 4', 'Year 5+']],
  ['international', 'postgraduate', ['Year 1', 'Year 2+']],
  ['international', 'doctoral', ['Year 1', 'Year 2', 'Year 3', 'Year 4+']],
  ['international', 'vocational', ['Beginner', 'Intermediate', 'Advanced']],
  ['my_kspk', 'early_childhood', ['Prasekolah (umur 4)', 'Prasekolah (umur 5)', 'Prasekolah (umur 6)']],
  ['my_kssr', 'primary', range('Tahun', 1, 6)],
  ['my_kssm', 'lower_secondary', range('Tingkatan', 1, 3)],
  ['my_kssm', 'upper_secondary', range('Tingkatan', 4, 5)],
  ['my_stpm', 'pre_university', ['Tingkatan 6 Bawah', 'Tingkatan 6 Atas']],
  ['my_matriculation', 'pre_university', ['Semester 1', 'Semester 2']],
]

// Level letters: E early, P primary, L lower sec, U upper sec, R pre-u, D diploma, G undergrad, M master's, X doctoral, V vocational, A lifelong
const L = { E: 'early_childhood', P: 'primary', L: 'lower_secondary', U: 'upper_secondary', R: 'pre_university', D: 'diploma', G: 'undergraduate', M: 'postgraduate', X: 'doctoral', V: 'vocational', A: 'lifelong' }
const SUBJECTS = [
  ['early_literacy', 'Early Literacy', 'EA'],
  ['early_numeracy', 'Early Numeracy', 'EA'],
  ['world_around_us', 'The World Around Us', 'EA'],
  ['mathematics', 'Mathematics', 'PLURDGMXVA'],
  ['english', 'English', 'PLUVA'],
  ['malay_language', 'Bahasa Melayu', 'PLUA'],
  ['science', 'Science', 'PLA'],
  ['reading', 'Reading Comprehension', 'PA'],
  ['writing', 'Writing', 'PLA'],
  ['geography', 'Geography', 'PLUA'],
  ['history', 'History', 'PLUGA'],
  ['computing_basic', 'Basic Computing', 'PVA'],
  ['general_knowledge', 'General Knowledge', 'PA'],
  ['environmental_studies', 'Environmental Studies', 'PA'],
  ['biology', 'Biology', 'LURGA'],
  ['chemistry', 'Chemistry', 'LURGA'],
  ['physics', 'Physics', 'LURGA'],
  ['computer_science', 'Computer Science', 'LUDGMXVA'],
  ['economics', 'Economics', 'LURDGMA'],
  ['languages', 'Other Languages', 'LUGA'],
  ['advanced_mathematics', 'Advanced Mathematics', 'UA'],
  ['additional_mathematics', 'Additional Mathematics', 'UA'],
  ['business', 'Business', 'UDGVA'],
  ['accounting', 'Accounting', 'UDGVA'],
  ['literature', 'Literature', 'UGA'],
  ['statistics', 'Statistics', 'URDGMXA'],
  ['calculus', 'Calculus', 'RGA'],
  ['programming', 'Programming', 'RDGVA'],
  ['academic_english', 'Academic English', 'RDGMA'],
  ['critical_thinking', 'Critical Thinking', 'RGMXA'],
  ['software_engineering', 'Software Engineering', 'DGMVA'],
  ['artificial_intelligence', 'Artificial Intelligence', 'GMXA'],
  ['cybersecurity', 'Cybersecurity', 'DGMVA'],
  ['electrical_engineering', 'Electrical Engineering', 'DGMXV'],
  ['mechanical_engineering', 'Mechanical Engineering', 'DGMXV'],
  ['civil_engineering', 'Civil Engineering', 'DGMXV'],
  ['chemical_engineering', 'Chemical Engineering', 'DGMX'],
  ['electronics', 'Electronics', 'DGV'],
  ['finance', 'Finance', 'DGMA'],
  ['marketing', 'Marketing', 'DGMVA'],
  ['management', 'Management', 'DGMVA'],
  ['entrepreneurship', 'Entrepreneurship', 'DGVA'],
  ['business_analytics', 'Business Analytics', 'GMA'],
  ['anatomy_physiology', 'Anatomy and Physiology', 'DG'],
  ['biochemistry', 'Biochemistry', 'GMX'],
  ['public_health', 'Public Health', 'GMX'],
  ['nursing', 'Nursing Fundamentals', 'DGV'],
  ['psychology', 'Psychology', 'GMXA'],
  ['sociology', 'Sociology', 'GMXA'],
  ['law', 'Law', 'GMX'],
  ['education', 'Education', 'GMX'],
  ['communication', 'Communication', 'DGMVA'],
  ['environmental_science', 'Environmental Science', 'GMXA'],
  ['research_methods', 'Research Methods', 'MX'],
]

const nameParts = JSON.parse(readFileSync(new URL('../src/features/character/nameParts.json', import.meta.url), 'utf8'))

const out = ['-- GENERATED by scripts/gen-seed.mjs. Do not edit by hand.', 'begin;', '']

out.push('insert into public.education_levels (id, isced, sort) values')
out.push(LEVELS.map(([id, isced], i) => `  (${q(id)}, ${q(isced)}, ${i + 1})`).join(',\n'))
out.push('on conflict (id) do update set isced = excluded.isced, sort = excluded.sort;', '')

out.push('insert into public.countries (code, name) values')
out.push(COUNTRIES.map(([c, n]) => `  (${q(c)}, ${q(n)})`).join(',\n'))
out.push('on conflict (code) do update set name = excluded.name;', '')

out.push('insert into public.curricula (id, country_code, name, level_ids) values')
out.push(CURRICULA.map(([id, cc, name, lv]) => `  (${q(id)}, ${q(cc)}, ${q(name)}, ${arr(lv)})`).join(',\n'))
out.push('on conflict (id) do update set country_code = excluded.country_code, name = excluded.name, level_ids = excluded.level_ids;', '')

const gradeRows = GRADES.flatMap(([cur, level, list]) =>
  list.map((name, i) => `  (${q(`${cur}_${level}_${i + 1}`)}, ${q(cur)}, ${q(level)}, ${q(name)}, ${i + 1})`),
)
out.push('insert into public.grades (id, curriculum_id, level_id, name, sort) values')
out.push(gradeRows.join(',\n'))
out.push('on conflict (id) do update set name = excluded.name, sort = excluded.sort;', '')

out.push('insert into public.subjects (id, name, level_ids) values')
out.push(SUBJECTS.map(([id, name, letters]) => `  (${q(id)}, ${q(name)}, ${arr([...letters].map((c) => L[c]))})`).join(',\n'))
out.push('on conflict (id) do update set name = excluded.name, level_ids = excluded.level_ids;', '')

out.push('insert into public.safe_name_parts (kind, part) values')
out.push(
  [...nameParts.adjectives.map((p) => `  ('adjective', ${q(p)})`), ...nameParts.nouns.map((p) => `  ('noun', ${q(p)})`)].join(',\n'),
)
out.push('on conflict do nothing;', '', 'commit;', '')

writeFileSync(new URL('../supabase/seed.sql', import.meta.url), out.join('\n'))
console.log(`seed.sql: ${LEVELS.length} levels, ${COUNTRIES.length} countries, ${CURRICULA.length} curricula, ${gradeRows.length} grades, ${SUBJECTS.length} subjects, ${nameParts.adjectives.length}+${nameParts.nouns.length} name parts`)
