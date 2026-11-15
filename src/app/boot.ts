export type BootTask = { id: string; weight: number; run: () => Promise<unknown> }

/**
 * Runs startup tasks in parallel and reports real progress (settled weight / total weight).
 * A failing task counts as settled so boot never hangs on it; its id is returned in `failed`.
 */
export async function runBootTasks(tasks: BootTask[], onProgress: (fraction: number) => void): Promise<{ failed: string[] }> {
  const total = tasks.reduce((sum, t) => sum + t.weight, 0) || 1
  let settled = 0
  const failed: string[] = []

  await Promise.all(
    tasks.map(async (task) => {
      try {
        await task.run()
      } catch {
        failed.push(task.id)
      }
      settled += task.weight
      onProgress(settled / total)
    }),
  )
  return { failed }
}
