import { toast } from "sonner"

export function toastFailure(summary: string, detail?: string) {
  const description = detail?.trim()
  toast.error(summary, description ? { description } : undefined)
}

/**
 * Partial imports toast here and still count as a success for the table.
 * A total failure throws so the table shows one error instead of a second warning.
 */
export function reportImportFailure(
  added: number,
  failed: number,
  summary: string,
  detail?: string
) {
  if (failed <= 0) return
  if (added <= 0) {
    throw new Error(detail ? `${summary} ${detail}` : summary)
  }
  toastFailure(summary, detail)
}
