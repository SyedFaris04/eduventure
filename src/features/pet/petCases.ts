/** Shared with tests/rls/pet.test.ts, which checks the database gives the same answers. */
export const FORM_CASES = [
  [{ science: 10, maths: 3, technology: 0, language: 0 }, 'science'],
  [{ science: 25, maths: 25, technology: 25, language: 25 }, 'seimbang'],
  [{ science: 20, maths: 20, technology: 20, language: 19 }, 'seimbang'],
  [{ science: 30, maths: 20, technology: 20, language: 15 }, 'science'],
  [{ science: 0, maths: 0, technology: 0, language: 0 }, 'seimbang'],
  [{ science: 5, maths: 9, technology: 9, language: 0 }, 'maths'],
] as const
export const NEXT_CASES = [
  ['baby', 100, 5, 50],
  ['baby', 99, 4, 10],
  ['baby', 100, 4, 50],
  ['young', 300, 10, 150],
  ['young', 300, 10, 149],
  ['adult', 999, 99, 9999],
] as const
