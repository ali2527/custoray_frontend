import { z } from "zod"

export const DOCUMENT_NUMBER_SETTINGS_STORAGE_KEY =
  "custoray-document-number-settings-v1"
export const DOCUMENT_NUMBER_SETTINGS_EVENT =
  "custoray-document-number-settings"

export const DOCUMENT_NUMBER_KEYS = [
  "sales",
  "purchases",
  "salesReturns",
  "purchaseReturns",
  "customerPayments",
  "vendorPayments",
  "expenses",
] as const

export type DocumentNumberKey = (typeof DOCUMENT_NUMBER_KEYS)[number]

export const documentNumberEntrySchema = z.object({
  mode: z.enum(["auto", "custom"]),
  prefix: z.string(),
})

export type DocumentNumberEntry = z.infer<typeof documentNumberEntrySchema>
export type DocumentNumberMode = DocumentNumberEntry["mode"]

export type DocumentNumberSettings = Record<
  DocumentNumberKey,
  DocumentNumberEntry
>

export const DEFAULT_DOCUMENT_NUMBER_SETTINGS: DocumentNumberSettings = {
  sales: { mode: "auto", prefix: "INV" },
  purchases: { mode: "auto", prefix: "PO" },
  salesReturns: { mode: "auto", prefix: "SR" },
  purchaseReturns: { mode: "auto", prefix: "PR" },
  customerPayments: { mode: "auto", prefix: "CP" },
  vendorPayments: { mode: "auto", prefix: "VP" },
  expenses: { mode: "auto", prefix: "EX" },
}

export function sanitizeNumberPrefixInput(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 20)
}

export function normalizeNumberPrefix(
  prefix: string,
  fallback: string
): string {
  const cleaned = sanitizeNumberPrefixInput(prefix).replace(/[-_]+$/g, "")
  return cleaned || fallback
}

export function numberHead(prefix: string, fallback: string): string {
  return `${normalizeNumberPrefix(prefix, fallback)}-`
}

export function formatAutoDocumentNumber(
  prefix: string,
  n: number,
  fallback: string,
  pad = 5
): string {
  return `${numberHead(prefix, fallback)}${String(Math.max(1, n)).padStart(pad, "0")}`
}

export function nextDocumentNumber(
  existing: string[],
  prefix: string,
  fallback: string,
  pad = 5
): string {
  const head = numberHead(prefix, fallback)
  const headUpper = head.toUpperCase()
  let max = 0
  for (const raw of existing) {
    const value = raw.trim()
    if (!value.toUpperCase().startsWith(headUpper)) continue
    const rest = value.slice(head.length)
    if (!/^\d+$/.test(rest)) continue
    max = Math.max(max, Number(rest))
  }
  return formatAutoDocumentNumber(prefix, max + 1, fallback, pad)
}

function parseEntry(
  value: unknown,
  fallback: DocumentNumberEntry
): DocumentNumberEntry {
  const result = documentNumberEntrySchema.safeParse(value)
  if (!result.success) return { ...fallback }
  return {
    mode: result.data.mode === "custom" ? "custom" : "auto",
    prefix:
      sanitizeNumberPrefixInput(result.data.prefix) || fallback.prefix,
  }
}

export function parseDocumentNumberSettings(
  raw: string | null
): DocumentNumberSettings | null {
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as unknown
    if (!parsed || typeof parsed !== "object") return null
    const record = parsed as Record<string, unknown>
    const next = { ...DEFAULT_DOCUMENT_NUMBER_SETTINGS }
    for (const key of DOCUMENT_NUMBER_KEYS) {
      next[key] = parseEntry(record[key], DEFAULT_DOCUMENT_NUMBER_SETTINGS[key])
    }
    return next
  } catch {
    return null
  }
}

export function loadDocumentNumberSettings(): DocumentNumberSettings {
  if (typeof window === "undefined") {
    return {
      sales: { ...DEFAULT_DOCUMENT_NUMBER_SETTINGS.sales },
      purchases: { ...DEFAULT_DOCUMENT_NUMBER_SETTINGS.purchases },
      salesReturns: { ...DEFAULT_DOCUMENT_NUMBER_SETTINGS.salesReturns },
      purchaseReturns: { ...DEFAULT_DOCUMENT_NUMBER_SETTINGS.purchaseReturns },
      customerPayments: { ...DEFAULT_DOCUMENT_NUMBER_SETTINGS.customerPayments },
      vendorPayments: { ...DEFAULT_DOCUMENT_NUMBER_SETTINGS.vendorPayments },
      expenses: { ...DEFAULT_DOCUMENT_NUMBER_SETTINGS.expenses },
    }
  }
  return (
    parseDocumentNumberSettings(
      window.localStorage.getItem(DOCUMENT_NUMBER_SETTINGS_STORAGE_KEY)
    ) ?? {
      sales: { ...DEFAULT_DOCUMENT_NUMBER_SETTINGS.sales },
      purchases: { ...DEFAULT_DOCUMENT_NUMBER_SETTINGS.purchases },
      salesReturns: { ...DEFAULT_DOCUMENT_NUMBER_SETTINGS.salesReturns },
      purchaseReturns: { ...DEFAULT_DOCUMENT_NUMBER_SETTINGS.purchaseReturns },
      customerPayments: { ...DEFAULT_DOCUMENT_NUMBER_SETTINGS.customerPayments },
      vendorPayments: { ...DEFAULT_DOCUMENT_NUMBER_SETTINGS.vendorPayments },
      expenses: { ...DEFAULT_DOCUMENT_NUMBER_SETTINGS.expenses },
    }
  )
}

export function saveDocumentNumberSettings(settings: DocumentNumberSettings) {
  if (typeof window === "undefined") return
  const next = { ...DEFAULT_DOCUMENT_NUMBER_SETTINGS }
  for (const key of DOCUMENT_NUMBER_KEYS) {
    const entry = settings[key] ?? DEFAULT_DOCUMENT_NUMBER_SETTINGS[key]
    next[key] = {
      mode: entry.mode === "custom" ? "custom" : "auto",
      prefix:
        sanitizeNumberPrefixInput(entry.prefix) ||
        DEFAULT_DOCUMENT_NUMBER_SETTINGS[key].prefix,
    }
  }
  window.localStorage.setItem(
    DOCUMENT_NUMBER_SETTINGS_STORAGE_KEY,
    JSON.stringify(next)
  )
  window.dispatchEvent(new Event(DOCUMENT_NUMBER_SETTINGS_EVENT))
}

export function resolveDocumentNumber(options: {
  settings: DocumentNumberEntry
  fallbackPrefix: string
  existing: string[]
  value: string
  isNew: boolean
  pad?: number
}): string {
  const trimmed = options.value.trim()
  if (!options.isNew) return trimmed
  if (options.settings.mode === "custom") return trimmed
  if (trimmed) return trimmed
  return nextDocumentNumber(
    options.existing,
    options.settings.prefix,
    options.fallbackPrefix,
    options.pad
  )
}
