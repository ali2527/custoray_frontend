/** Backend bulk endpoints accept at most 100 items per request. */
export const IMPORT_BATCH_SIZE = 100
/** Soft cap for a single import file / selection. */
export const IMPORT_MAX_TOTAL = 500

export function chunkArray<T>(items: T[], size: number = IMPORT_BATCH_SIZE): T[][] {
  if (items.length === 0) return []
  const chunkSize = Math.max(1, size)
  const chunks: T[][] = []
  for (let i = 0; i < items.length; i += chunkSize) {
    chunks.push(items.slice(i, i + chunkSize))
  }
  return chunks
}

export function capImportRows<T>(
  rows: T[],
  max: number = IMPORT_MAX_TOTAL
): { rows: T[]; truncated: number } {
  if (rows.length <= max) return { rows, truncated: 0 }
  return { rows: rows.slice(0, max), truncated: rows.length - max }
}

export type BulkCreateBatchResult<TItem = unknown, TError = { message?: string }> = {
  added?: number
  updated?: number
  items?: TItem[]
  errors?: TError[]
}

/**
 * Queue bulk creates in batches of 100 so imports beyond one request
 * still complete without duplicates or silent drops at the batch boundary.
 */
export async function runBatchedBulkCreate<
  TPayload,
  TItem = unknown,
  TError = { message?: string },
>(
  items: TPayload[],
  createBatch: (
    batch: TPayload[]
  ) => Promise<BulkCreateBatchResult<TItem, TError>>,
  options?: { batchSize?: number }
): Promise<{
  added: number
  updated: number
  items: TItem[]
  errors: TError[]
  batches: number
}> {
  const chunks = chunkArray(items, options?.batchSize ?? IMPORT_BATCH_SIZE)
  const allItems: TItem[] = []
  const allErrors: TError[] = []
  let added = 0
  let updated = 0

  for (const chunk of chunks) {
    const res = await createBatch(chunk)
    const batchItems = res.items ?? []
    allItems.push(...batchItems)
    added += res.added ?? 0
    updated += res.updated ?? 0
    // Legacy endpoints that only return items (no added count).
    if (res.added == null && res.updated == null) {
      added += batchItems.length
    }
    if (res.errors?.length) allErrors.push(...res.errors)
  }

  return {
    added,
    updated,
    items: allItems,
    errors: allErrors,
    batches: chunks.length,
  }
}
