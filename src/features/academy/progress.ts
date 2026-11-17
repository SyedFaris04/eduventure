/** Units open in order: the first is always open, and each later one once every lesson before it is done. */
export function unitUnlocked(units: { lessonIds: string[] }[], unitIndex: number, completed: Set<string>): boolean {
  return units.slice(0, unitIndex).every((u) => u.lessonIds.every((id) => completed.has(id)))
}
