import { z } from "zod"

import { ApiClientError } from "@/lib/api/client"
import type { ApiExpenseType, ApiExpenseTypeWrite } from "@/lib/api/business"

export const EXPENSE_TYPE_STATUS_OPTIONS = ["active", "inactive"] as const

export const expenseTypeSchema = z.object({
  id: z.number(),
  apiId: z.string().optional().default(""),
  name: z.string(),
  description: z.string(),
  status: z.enum(EXPENSE_TYPE_STATUS_OPTIONS),
  expensesCount: z.number().optional().default(0),
})

export type ExpenseTypeRow = z.infer<typeof expenseTypeSchema>
export type ExpenseTypeStatus = ExpenseTypeRow["status"]
export type ExpenseTypeWrite = ApiExpenseTypeWrite

export const EXPENSE_TYPE_IMPORT_COLUMNS = ["name", "description", "status"] as const

export const EXPENSE_TYPE_IMPORT_SAMPLE_ROW: Record<
  (typeof EXPENSE_TYPE_IMPORT_COLUMNS)[number],
  string
> = {
  name: "Office supplies",
  description: "Stationery and consumables",
  status: "active",
}

export const EMPTY_EXPENSE_TYPE: ExpenseTypeRow = {
  id: 0,
  apiId: "",
  name: "",
  description: "",
  status: "active",
  expensesCount: 0,
}

export const EXPENSE_TYPES_STORAGE_KEY = "custoray-expense-types-v1"
export const EXPENSE_TYPES_CHANGED_EVENT = "custoray-expense-types-changed"

export function emitExpenseTypesChanged() {
  if (typeof window === "undefined") return
  window.dispatchEvent(new Event(EXPENSE_TYPES_CHANGED_EVENT))
}

export function expenseTypesStorageKey(tenantId?: string | null) {
  if (!tenantId) return null
  return `${EXPENSE_TYPES_STORAGE_KEY}:${tenantId}`
}

function parsePersistedExpenseTypes(raw: string | null): ExpenseTypeRow[] | null {
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as unknown
    const result = z.array(expenseTypeSchema).safeParse(parsed)
    return result.success ? result.data : null
  } catch {
    return null
  }
}

export function loadCachedExpenseTypes(tenantId?: string | null): ExpenseTypeRow[] {
  if (typeof window === "undefined") return []
  const key = expenseTypesStorageKey(tenantId)
  if (!key) return []
  try {
    return parsePersistedExpenseTypes(window.localStorage.getItem(key)) ?? []
  } catch {
    return []
  }
}

export function cacheExpenseTypes(rows: ExpenseTypeRow[], tenantId?: string | null) {
  if (typeof window === "undefined") return
  const key = expenseTypesStorageKey(tenantId)
  if (!key) return
  try {
    window.localStorage.setItem(key, JSON.stringify(rows))
  } catch {
    /* ignore */
  }
}

function parseExpenseTypeStatus(raw: string): ExpenseTypeStatus {
  const normalized = raw.trim().toLowerCase()
  if (normalized === "inactive" || normalized === "disabled") return "inactive"
  return "active"
}

export function mapApiExpenseTypeToRow(item: ApiExpenseType, index = 0): ExpenseTypeRow {
  return {
    id: index + 1,
    apiId: item.id,
    name: item.name ?? "",
    description: item.description ?? "",
    status: parseExpenseTypeStatus(item.status ?? "active"),
    expensesCount: item.expensesCount ?? 0,
  }
}

export function toApiExpenseTypeWrite(row: ExpenseTypeRow): ExpenseTypeWrite {
  return {
    name: row.name.trim(),
    description: row.description.trim(),
    status: row.status,
  }
}

export function mapImportedExpenseTypeWrite(
  row: Record<string, string>
): ExpenseTypeWrite | null {
  const name = (row.name ?? "").trim()
  if (!name) return null
  return {
    name,
    description: (row.description ?? row.desc ?? "").trim(),
    status: parseExpenseTypeStatus(row.status ?? "active"),
  }
}

export function expenseTypeFromFormData(
  fd: FormData,
  base: ExpenseTypeRow = EMPTY_EXPENSE_TYPE
): ExpenseTypeRow {
  return {
    ...base,
    name: String(fd.get("name") ?? "").trim(),
    description: String(fd.get("description") ?? "").trim(),
    status: parseExpenseTypeStatus(String(fd.get("status") ?? base.status)),
  }
}

export function expenseTypeErrorMessage(error: unknown, fallback: string) {
  if (error instanceof ApiClientError) return error.message
  if (error instanceof Error) return error.message
  return fallback
}

export function expenseTypeTabFilter(row: ExpenseTypeRow, tab: string) {
  if (tab === "all") return true
  return row.status === tab
}

export function expenseTypeSelectValue(row: Pick<ExpenseTypeRow, "id" | "apiId">) {
  return row.apiId?.trim() || String(row.id)
}

export function findExpenseTypeBySelectValue(
  rows: ExpenseTypeRow[],
  value: string
) {
  const trimmed = value.trim()
  if (!trimmed) return undefined
  return rows.find(
    (row) =>
      expenseTypeSelectValue(row) === trimmed ||
      row.apiId === trimmed ||
      String(row.id) === trimmed
  )
}
