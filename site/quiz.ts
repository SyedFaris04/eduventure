// The website's demo battle: three questions stored here (no server, no account). A right answer hits the monster.
export type Choice = number | 'next'
type Text = { en: string; ms: string }
export type Question = { prompt: Text; options: { en: string[]; ms: string[] }; answer: number; why: Text }

export const QUESTIONS: Question[] = [
  {
    prompt: { en: 'What do plants need to make their own food?', ms: 'Apakah yang diperlukan oleh tumbuhan untuk membuat makanan sendiri?' },
    options: { en: ['Sunlight', 'Sand', 'Plastic', 'Salt'], ms: ['Cahaya matahari', 'Pasir', 'Plastik', 'Garam'] },
    answer: 0,
    why: {
      en: 'Plants use sunlight, water and carbon dioxide to make food. This is called photosynthesis.',
      ms: 'Tumbuhan menggunakan cahaya matahari, air dan karbon dioksida untuk membuat makanan. Ini dipanggil fotosintesis.',
    },
  },
  {
    prompt: { en: 'What is 7 × 8?', ms: 'Berapakah 7 × 8?' },
    options: { en: ['54', '56', '63', '48'], ms: ['54', '56', '63', '48'] },
    answer: 1,
    why: { en: '7 × 8 = 56. A trick: 5, 6, 7, 8 → 56 = 7 × 8.', ms: '7 × 8 = 56. Petua: 5, 6, 7, 8 → 56 = 7 × 8.' },
  },
  {
    prompt: { en: 'Which is the longest river in Malaysia?', ms: 'Sungai manakah yang paling panjang di Malaysia?' },
    options: { en: ['Sungai Pahang', 'Sungai Rajang', 'Sungai Klang', 'Sungai Perak'], ms: ['Sungai Pahang', 'Sungai Rajang', 'Sungai Klang', 'Sungai Perak'] },
    answer: 1,
    why: {
      en: 'Sungai Rajang in Sarawak is about 563 km long, the longest in Malaysia. Sungai Pahang is the longest in Peninsular Malaysia.',
      ms: 'Sungai Rajang di Sarawak kira-kira 563 km panjang, yang terpanjang di Malaysia. Sungai Pahang ialah yang terpanjang di Semenanjung.',
    },
  },
]

export type QuizState = { index: number; hp: number; last: 'right' | 'wrong' | null; done: boolean }
export const START: QuizState = { index: 0, hp: QUESTIONS.length, last: null, done: false }

export function answer(s: QuizState, choice: Choice): QuizState {
  if (s.done) return s
  if (choice === 'next') {
    if (s.last !== 'right') return s
    const index = s.index + 1
    return index >= QUESTIONS.length ? { ...s, last: null, done: true } : { ...s, index, last: null }
  }
  if (s.last === 'right') return s
  return choice === QUESTIONS[s.index].answer ? { ...s, hp: s.hp - 1, last: 'right' } : { ...s, last: 'wrong' }
}
