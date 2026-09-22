import { z } from "zod"

import { ApiClientError } from "@/lib/api/client"
import type { ApiExpense, ApiExpenseWrite } from "@/lib/api/business"
import { formatMoney, parseMoney } from "@/lib/customers"
import type { ExpenseTypeRow } from "@/lib/expense-types"

export { formatMoney, parseMoney }

export const EXPENSE_METHODS = ["Cash", "Bank transfer", "Card", "Credit"] as const
export const EXPENSE_STATUSES = ["pending", "paid", "voided"] as const

export const EXPENSE_IMPORT_COLUMNS = [
  "expenseNumber",
  "typeName",
  "expenseDate",
  "amount",
  "paymentMethod",
  "status",
  "notes",
] as const

export const EXPENSE_IMPORT_SAMPLE_ROW: Record<
  (typeof EXPENSE_IMPORT_COLUMNS)[number],
  string
> = {
  expenseNumber: "EX-9001",
  typeName: "Office supplies",
  expenseDate: "2026-09-21",
  amount: "2500.00",
  paymentMethod: "Cash",
  status: "paid",
  notes: "Imported expense",
}

export const expenseSchema = z.object({
  id: z.number(),
  apiId: z.string().optional().default(""),
  typeId: z.string().optional().default(""),
  expenseNumber: z.string(),
  typeName: z.string(),
  payeeName: z.string(),
  expenseDate: z.string(),
  amount: z.string(),
  paymentMethod: z.enum(EXPENSE_METHODS),
  status: z.enum(EXPENSE_STATUSES),
  notes: z.string(),
})

export type ExpenseRow = z.infer<typeof expenseSchema>
export type ExpenseWrite = ApiExpenseWrite
export type ExpenseTypeRef = { name: string; apiId: string }

export const EXPENSES_STORAGE_KEY = "custoray-expenses-v1"
export const EXPENSES_CHANGED_EVENT = "custoray-expenses-changed"

export const EMPTY_EXPENSE: ExpenseRow = {
  id: 0,
  apiId: "",
  typeId: "",
  expenseNumber: "",
  typeName: "",
  payeeName: "",
  expenseDate: new Date().toISOString().slice(0, 10),
  amount: "0.00",
  paymentMethod: "Cash",
  status: "pending",
  notes: "—",
}

export function emitExpensesChanged() {
  if (typeof window === "undefined") return
  window.dispatchEvent(new Event(EXPENSES_CHANGED_EVENT))
}

export function expensesStorageKey(tenantId?: string | null) {
  if (!tenantId) return null
  return `${EXPENSES_STORAGE_KEY}:${tenantId}`
}

function parsePersistedExpenses(raw: string | null): ExpenseRow[] | null {
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as unknown
    const result = z.array(expenseSchema).safeParse(parsed)
    return result.success ? result.data : null
  } catch {
    return null
  }
}

export function loadCachedExpenses(tenantId?: string | null): ExpenseRow[] {
  if (typeof window === "undefined") return []
  const key = expensesStorageKey(tenantId)
  if (!key) return []
  try {
    return parsePersistedExpenses(window.localStorage.getItem(key)) ?? []
  } catch {
    return []
  }
}

export function cacheExpenses(rows: ExpenseRow[], tenantId?: string | null) {
  if (typeof window === "undefined") return
  const key = expensesStorageKey(tenantId)
  if (!key) return
  try {
    window.localStorage.setItem(key, JSON.stringify(rows))
  } catch {
    /* ignore */
  }
}

function toUiDate(value: string) {
  const trimmed = value.trim()
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) return trimmed.slice(0, 10)
  const date = new Date(trimmed)
  if (Number.isNaN(date.getTime())) {
    return new Date().toISOString().slice(0, 10)
  }
  return date.toISOString().slice(0, 10)
}

export function parseExpenseStatus(raw: string): ExpenseRow["status"] {
  const normalized = raw.toLowerCase().replace(/\s+/g, "_")
  if (normalized === "paid" || normalized === "completed") return "paid"
  if (normalized === "voided" || normalized === "void") return "voided"
  return "pending"
}

export function parseExpenseMethod(raw: string): ExpenseRow["paymentMethod"] {
  const normalized = raw.trim()
  if (EXPENSE_METHODS.includes(normalized as ExpenseRow["paymentMethod"])) {
    return normalized as ExpenseRow["paymentMethod"]
  }
  return "Cash"
}

export function mapApiExpenseToRow(item: ApiExpense, index = 0): ExpenseRow {
  return {
    id: index + 1,
    apiId: item.id,
    typeId: item.typeId ?? "",
    expenseNumber: item.expenseNumber,
    typeName: item.typeName || "—",
    payeeName: "",
    expenseDate: toUiDate(item.expenseDate),
    amount: parseMoney(String(item.amount ?? "0")),
    paymentMethod: parseExpenseMethod(item.paymentMethod ?? "Cash"),
    status: parseExpenseStatus(item.status ?? "pending"),
    notes: item.notes || "—",
  }
}

export function toApiExpenseWrite(row: ExpenseRow): ExpenseWrite {
  const expenseNumber = row.expenseNumber.trim()
  return {
    typeId: row.typeId.trim(),
    typeName: row.typeName.trim() === "—" ? "" : row.typeName.trim(),
    expenseNumber: expenseNumber || undefined,
    payeeName: "",
    expenseDate: toUiDate(row.expenseDate),
    amount: Number(parseMoney(row.amount)),
    paymentMethod: row.paymentMethod,
    notes: row.notes.trim() === "—" ? "" : row.notes.trim(),
    status: row.status,
  }
}

function findTypeApiId(name: string, types: ExpenseTypeRef[]) {
  const normalized = name.trim().toLowerCase()
  if (!normalized) return ""
  const match = types.find((type) => type.name.trim().toLowerCase() === normalized)
  return match?.apiId ?? ""
}

export function mapImportedExpenseWrite(
  row: Record<string, string>,
  types: ExpenseTypeRef[]
): ExpenseWrite | null {
  const typeName = (row.typeName ?? row.type ?? row.expenseType ?? "").trim()
  const typeId = (row.typeId ?? row.type_id ?? "").trim() || findTypeApiId(typeName, types)
  if (!typeName || !typeId) return null

  const amount = Number(parseMoney(String(row.amount ?? "0")))
  if (!Number.isFinite(amount) || amount <= 0) return null

  const expenseNumber = (row.expenseNumber ?? row.expense_number ?? "").trim()

  return {
    typeId,
    typeName,
    expenseNumber: expenseNumber || undefined,
    payeeName: "",
    expenseDate: toUiDate(
      row.expenseDate ?? row.expense_date ?? row.date ?? new Date().toISOString()
    ),
    amount,
    paymentMethod: parseExpenseMethod(
      String(row.paymentMethod ?? row.payment_method ?? "Cash")
    ),
    status: parseExpenseStatus(row.status ?? "paid"),
    notes: (row.notes ?? row.description ?? "").trim(),
  }
}

export function flattenExpenseForExport(expense: ExpenseRow): Record<string, unknown> {
  return {
    expenseNumber: expense.expenseNumber,
    typeName: expense.typeName === "—" ? "" : expense.typeName,
    expenseDate: expense.expenseDate,
    amount: expense.amount,
    paymentMethod: expense.paymentMethod,
    status: expense.status,
    notes: expense.notes === "—" ? "" : expense.notes,
  }
}

export function expenseErrorMessage(error: unknown, fallback: string) {
  if (error instanceof ApiClientError) return error.message
  if (error instanceof Error) return error.message
  return fallback
}

export function formatDate(value: string): string {
  const date = new Date(`${value}T00:00:00`)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(date)
}

export function statusBadgeClass(status: ExpenseRow["status"]) {
  if (status === "paid")
    return "border-emerald-500/30 px-1.5 text-emerald-700 dark:text-emerald-400"
  if (status === "pending")
    return "border-amber-500/30 px-1.5 text-amber-700 dark:text-amber-400"
  return "border-border px-1.5 text-muted-foreground"
}

export function expenseStatusTabFilter(row: ExpenseRow, tab: string) {
  if (tab === "all") return true
  return row.status === tab
}

export function expenseFromFormData(
  fd: FormData,
  base: ExpenseRow = EMPTY_EXPENSE
): ExpenseRow {
  return {
    ...base,
    expenseNumber: String(fd.get("expenseNumber") ?? base.expenseNumber).trim(),
    typeId: String(fd.get("typeId") ?? base.typeId).trim(),
    typeName: String(fd.get("typeName") ?? "").trim(),
    payeeName: "",
    expenseDate:
      String(fd.get("expenseDate") ?? "").trim() ||
      new Date().toISOString().slice(0, 10),
    amount: parseMoney(String(fd.get("amount") ?? "0")),
    paymentMethod: parseExpenseMethod(String(fd.get("paymentMethod") ?? "Cash")),
    status: parseExpenseStatus(String(fd.get("status") ?? "pending")),
    notes: String(fd.get("notes") ?? "").trim() || "—",
  }
}

export function toExpenseTypeRefs(types: ExpenseTypeRow[]): ExpenseTypeRef[] {
  return types
    .map((type) => ({ name: type.name, apiId: type.apiId }))
    .filter((type) => type.apiId)
}
