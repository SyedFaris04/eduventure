import { describe, expect, it } from 'vitest'
import { questionProblems, questionSource, type QuestionSource } from './questionSchema'

type Of<T extends QuestionSource['type']> = Extract<QuestionSource, { type: T }>

const base = {
  version: 1,
  status: 'in_review',
  level_ids: ['primary'],
  subject: 'mathematics',
  topic: 'Numbers',
  subtopic: 'Even numbers',
  difficulty: 2,
  bloom: 'understand',
  explanation: 'Even numbers can be shared into two equal groups.',
  objective: 'Recognise even numbers.',
  alignment: 'Primary mathematics: number patterns.',
}

describe('new question types', () => {
  it('multiple-select needs at least two right options and a reason for every wrong one', () => {
    const q = questionSource.parse({
      ...base,
      id: 'pri-math-901',
      type: 'multi_select',
      prompt: 'Select all the even numbers.',
      options: [{ id: 'a', text: '4' }, { id: 'b', text: '7' }, { id: 'c', text: '10' }, { id: 'd', text: '13' }],
      answer: ['a', 'c'],
      wrong: { b: '7 leaves 1 over when split into twos.', d: '13 leaves 1 over when split into twos.' },
    }) as Of<'multi_select'>
    expect(questionProblems(q)).toEqual([])
    expect(questionProblems({ ...q, answer: ['a'] })).toContain('multiple-select needs at least two right options')
    expect(questionProblems({ ...q, wrong: { b: 'x is wrong here' } })).toContain('no explanation for wrong option d')
  })

  it('ordering lists every item exactly once', () => {
    const q = questionSource.parse({
      ...base,
      id: 'pri-math-902',
      type: 'ordering',
      prompt: 'Put these numbers in order from smallest to largest.',
      options: [{ id: 'a', text: '45' }, { id: 'b', text: '9' }, { id: 'c', text: '120' }],
      answer: ['b', 'a', 'c'],
    }) as Of<'ordering'>
    expect(questionProblems(q)).toEqual([])
    expect(questionProblems({ ...q, answer: ['b', 'a'] })).toContain('ordering answer must list every item once')
  })

  it('matching pairs every left item with a different right item', () => {
    const q = questionSource.parse({
      ...base,
      id: 'pri-math-903',
      type: 'matching',
      prompt: 'Match each shape to its number of sides.',
      options: { left: [{ id: 'a', text: 'Triangle' }, { id: 'b', text: 'Square' }, { id: 'c', text: 'Hexagon' }], right: [{ id: 'x', text: '3' }, { id: 'y', text: '4' }, { id: 'z', text: '6' }] },
      answer: { a: 'x', b: 'y', c: 'z' },
    }) as Of<'matching'>
    expect(questionProblems(q)).toEqual([])
    expect(questionProblems({ ...q, answer: { a: 'x', b: 'x', c: 'z' } })).toContain('matching uses a right item twice')
    expect(questionProblems({ ...q, answer: { a: 'x', b: 'y' } })).toContain('matching must pair every left item')
  })

  it('short answer accepts a list of spellings', () => {
    const q = questionSource.parse({ ...base, id: 'pri-math-904', type: 'short_answer', prompt: 'What do we call a shape with four equal sides and four right angles?', answer: { accept: ['square'] } })
    expect(questionProblems(q)).toEqual([])
  })
})
