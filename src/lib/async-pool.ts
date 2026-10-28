import { startBulkProgress, type BulkProgressKind } from "@/lib/bulk-progress"

/**
 * Like Promise.allSettled(items.map(worker)), but only `concurrency`
 * workers run at once. Keeps result order aligned with `items`.
 *
 * Bulk deletes/status updates must not stampede the API — parallel 401s
 * can race refresh-token rotation and force a logout.
 */
export async function mapAllSettled<T, R>(
  items: readonly T[],
  worker: (item: T, index: number) => Promise<R>,
  options?: {
    concurrency?: number
    onProgress?: (done: number, total: number) => void
    /** Defaults to "delete". Set false to skip the shared progress toast. */
    progress?: boolean | BulkProgressKind
  }
): Promise<PromiseSettledResult<R>[]> {
  if (items.length === 0) return []
  const concurrency = options?.concurrency ?? 5
  const results: PromiseSettledResult<R>[] = new Array(items.length)
  let next = 0
  let completed = 0
  const total = items.length
  const limit = Math.max(1, Math.min(concurrency, items.length))
  const progressKind =
    options?.progress === false
      ? null
      : options?.progress === true || options?.progress == null
        ? "delete"
        : options.progress
  const progress = progressKind
    ? startBulkProgress(progressKind, total)
    : null

  options?.onProgress?.(0, total)
  progress?.update(0)

  async function runWorker() {
    while (next < items.length) {
      const index = next++
      try {
        const value = await worker(items[index] as T, index)
        results[index] = { status: "fulfilled", value }
      } catch (reason) {
        results[index] = { status: "rejected", reason }
      } finally {
        completed += 1
        options?.onProgress?.(completed, total)
        progress?.update(completed)
      }
    }
  }

  try {
    await Promise.all(Array.from({ length: limit }, () => runWorker()))
  } finally {
    progress?.finish()
  }
  return results
}
