export type ImportRowsResult = {
  added: number
  /** Rows that still need fixing / re-import. */
  failedRows?: Record<string, string>[]
  /** Optional per-row error messages aligned with failedRows. */
  failedMessages?: string[]
  detail?: string
}

export type ImportRowsOutcome = number | ImportRowsResult | null

export function normalizeImportOutcome(
  outcome: ImportRowsOutcome | void
): ImportRowsResult | null {
  if (outcome == null) return null
  if (typeof outcome === "number") return { added: outcome }
  return outcome
}

type NamedError = { name?: string; sku?: string; message?: string }

/**
 * Keep source CSV rows that failed local mapping or came back in API errors.
 * API errors are matched by name/sku in order (first unused match).
 */
export function collectFailedImportRows(
  imported: Record<string, string>[],
  options: {
    /** Indices into `imported` that were accepted for the API call. */
    acceptedIndexes: number[]
    errors?: NamedError[]
    matchKeys?: string[]
    invalidMessage?: string
  }
): { failedRows: Record<string, string>[]; failedMessages: string[] } {
  const matchKeys = options.matchKeys ?? ["name"]
  const invalidMessage = options.invalidMessage ?? "Invalid or incomplete row"
  const failedRows: Record<string, string>[] = []
  const failedMessages: string[] = []

  const acceptedSet = new Set(options.acceptedIndexes)
  for (let i = 0; i < imported.length; i++) {
    if (acceptedSet.has(i)) continue
    failedRows.push(imported[i]!)
    failedMessages.push(invalidMessage)
  }

  const pool = options.acceptedIndexes.map((index) => ({
    index,
    row: imported[index]!,
    used: false,
  }))

  for (const error of options.errors ?? []) {
    const needle = String(error.name ?? error.sku ?? "")
      .trim()
      .toLowerCase()
    if (!needle) continue
    const match = pool.find((entry) => {
      if (entry.used) return false
      return matchKeys.some((key) => {
        const value = String(entry.row[key] ?? "")
          .trim()
          .toLowerCase()
        return value === needle
      })
    })
    if (!match) continue
    match.used = true
    failedRows.push(match.row)
    failedMessages.push(error.message?.trim() || "Could not import row")
  }

  return { failedRows, failedMessages }
}
