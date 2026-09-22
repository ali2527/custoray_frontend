import { z } from "zod"

import { ApiClientError } from "@/lib/api/client"
import type { ApiPayment, ApiPaymentWrite } from "@/lib/api/business"
import { formatMoney, parseMoney } from "@/lib/customers"
import {
  DEFAULT_DOCUMENT_NUMBER_SETTINGS,
  loadDocumentNumberSettings,
  nextDocumentNumber,
} from "@/lib/document-number-settings"

export { formatMoney, parseMoney }

export const PAYMENT_METHODS = ["Cash", "Bank transfer", "Card", "Credit"] as const
export const PAYMENT_STATUSES = ["pending", "completed", "voided"] as const

export const PAYMENT_IMPORT_COLUMNS = [
  "paymentNumber",
  "partyName",
  "paymentDate",
  "amount",
  "paymentMethod",
  "status",
  "referenceNumber",
  "notes",
] as const

export const CUSTOMER_PAYMENT_IMPORT_SAMPLE_ROW: Record<
  (typeof PAYMENT_IMPORT_COLUMNS)[number],
  string
> = {
  paymentNumber: "CP-9001",
  partyName: "Acme Retail Co.",
  paymentDate: "2026-09-21",
  amount: "1500.00",
  paymentMethod: "Cash",
  status: "completed",
  referenceNumber: "INV-1001",
  notes: "Imported customer payment",
}

export const VENDOR_PAYMENT_IMPORT_SAMPLE_ROW: Record<
  (typeof PAYMENT_IMPORT_COLUMNS)[number],
  string
> = {
  paymentNumber: "VP-9001",
  partyName: "Karachi Steel Supplies",
  paymentDate: "2026-09-21",
  amount: "2500.00",
  paymentMethod: "Bank transfer",
  status: "completed",
  referenceNumber: "PO-2001",
  notes: "Imported vendor payment",
}

export const paymentSchema = z.object({
  id: z.number(),
  apiId: z.string().optional().default(""),
  partyId: z.string().optional().default(""),
  paymentNumber: z.string(),
  type: z.enum(["customer", "vendor"]),
  partyName: z.string(),
  referenceNumber: z.string(),
  paymentDate: z.string(),
  amount: z.string(),
  paymentMethod: z.enum(["Cash", "Bank transfer", "Card", "Credit"]),
  status: z.enum(["pending", "completed", "voided"]),
  notes: z.string(),
})

export type PaymentRow = z.infer<typeof paymentSchema>
export type PaymentWrite = ApiPaymentWrite
export type PaymentParty = { name: string; apiId: string }

export const PAYMENTS_STORAGE_KEY = "custoray-payments-v2"
export const PAYMENTS_CHANGED_EVENT = "custoray-payments-changed"

export const initialPayments: PaymentRow[] = [
  {
    id: 1,
    apiId: "",
    partyId: "",
    paymentNumber: "CP-4001",
    type: "customer",
    partyName: "Acme Retail Co.",
    referenceNumber: "INV-1001",
    paymentDate: "2026-06-02",
    amount: "45200.00",
    paymentMethod: "Bank transfer",
    status: "completed",
    notes: "Full settlement — bulk order",
  },
  {
    id: 2,
    apiId: "",
    partyId: "",
    paymentNumber: "CP-4002",
    type: "customer",
    partyName: "Northwind Traders",
    referenceNumber: "INV-1002",
    paymentDate: "2026-06-06",
    amount: "15000.00",
    paymentMethod: "Credit",
    status: "completed",
    notes: "Partial payment on seasonal restock",
  },
  {
    id: 3,
    apiId: "",
    partyId: "",
    paymentNumber: "CP-4003",
    type: "customer",
    partyName: "Contoso Foods",
    referenceNumber: "INV-1003",
    paymentDate: "2026-06-11",
    amount: "12400.00",
    paymentMethod: "Cash",
    status: "completed",
    notes: "Cash on delivery",
  },
  {
    id: 4,
    apiId: "",
    partyId: "",
    paymentNumber: "VP-5001",
    type: "vendor",
    partyName: "Karachi Steel Supplies",
    referenceNumber: "PO-2001",
    paymentDate: "2026-06-04",
    amount: "28500.00",
    paymentMethod: "Bank transfer",
    status: "completed",
    notes: "Monthly stock replenishment",
  },
  {
    id: 5,
    apiId: "",
    partyId: "",
    paymentNumber: "VP-5002",
    type: "vendor",
    partyName: "Lahore Packaging Co.",
    referenceNumber: "PO-2002",
    paymentDate: "2026-06-15",
    amount: "9800.00",
    paymentMethod: "Card",
    status: "pending",
    notes: "Awaiting approval",
  },
  {
    id: 6,
    apiId: "",
    partyId: "",
    paymentNumber: "CP-4004",
    type: "customer",
    partyName: "Litware Inc.",
    referenceNumber: "INV-1005",
    paymentDate: "2026-06-19",
    amount: "2000.00",
    paymentMethod: "Bank transfer",
    status: "pending",
    notes: "Deposit on pending order",
  },
]

export const EMPTY_PAYMENT: PaymentRow = {
  id: 0,
  apiId: "",
  partyId: "",
  paymentNumber: "",
  type: "customer",
  partyName: "",
  referenceNumber: "—",
  paymentDate: new Date().toISOString().slice(0, 10),
  amount: "0.00",
  paymentMethod: "Cash",
  status: "pending",
  notes: "—",
}

export function emitPaymentsChanged() {
  if (typeof window === "undefined") return
  window.dispatchEvent(new Event(PAYMENTS_CHANGED_EVENT))
}

export function paymentsStorageKey(tenantId?: string | null) {
  if (!tenantId) return null
  return `${PAYMENTS_STORAGE_KEY}:${tenantId}`
}

export function loadCachedPayments(tenantId?: string | null): PaymentRow[] {
  if (typeof window === "undefined") return []
  const key = paymentsStorageKey(tenantId)
  if (!key) return []
  try {
    const parsed = parsePersistedPayments(window.localStorage.getItem(key))
    return parsed ?? []
  } catch {
    return []
  }
}

export function cachePayments(rows: PaymentRow[], tenantId?: string | null) {
  if (typeof window === "undefined") return
  const key = paymentsStorageKey(tenantId)
  if (!key) return
  try {
    window.localStorage.removeItem("custoray-payments-v1")
    window.localStorage.setItem(key, JSON.stringify(rows))
  } catch {
    /* ignore quota */
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

export function toApiPaymentType(type: PaymentRow["type"]): PaymentWrite["type"] {
  return type === "vendor" ? "VENDOR" : "CUSTOMER"
}

export function fromApiPaymentType(type: string): PaymentRow["type"] {
  return type === "VENDOR" || type === "vendor" ? "vendor" : "customer"
}

export function mapApiPaymentToRow(item: ApiPayment, index = 0): PaymentRow {
  return {
    id: index + 1,
    apiId: item.id,
    partyId: item.partyId ?? "",
    paymentNumber: item.paymentNumber,
    type: fromApiPaymentType(item.type),
    partyName: item.partyName || "—",
    referenceNumber: item.referenceNumber || "—",
    paymentDate: toUiDate(item.paymentDate),
    amount: parseMoney(String(item.amount ?? "0")),
    paymentMethod: parsePaymentMethod(item.paymentMethod ?? "Cash"),
    status: parsePaymentStatus(item.status ?? "pending"),
    notes: item.notes || "—",
  }
}

export function toApiPaymentWrite(row: PaymentRow): PaymentWrite {
  const paymentNumber = row.paymentNumber.trim()
  return {
    type: toApiPaymentType(row.type),
    partyId: row.partyId.trim(),
    partyName: row.partyName.trim() === "—" ? "" : row.partyName.trim(),
    paymentNumber: paymentNumber || undefined,
    referenceNumber: row.referenceNumber.trim() === "—" ? "" : row.referenceNumber.trim(),
    paymentDate: toUiDate(row.paymentDate),
    amount: Number(parseMoney(row.amount)),
    paymentMethod: row.paymentMethod,
    notes: row.notes.trim() === "—" ? "" : row.notes.trim(),
    status: row.status,
  }
}

export function partySelectValue(party: { id: number; apiId?: string }) {
  return party.apiId?.trim() || String(party.id)
}

export function findPartyBySelectValue<T extends { id: number; apiId?: string }>(
  parties: T[],
  value: string
) {
  const trimmed = value.trim()
  if (!trimmed) return undefined
  return parties.find(
    (party) =>
      partySelectValue(party) === trimmed ||
      party.apiId === trimmed ||
      String(party.id) === trimmed
  )
}

function findPartyApiId(name: string, parties: PaymentParty[]) {
  const normalized = name.trim().toLowerCase()
  if (!normalized) return ""
  const match = parties.find((party) => party.name.trim().toLowerCase() === normalized)
  return match?.apiId ?? ""
}

export function mapImportedPaymentWrite(
  row: Record<string, string>,
  type: PaymentRow["type"],
  parties: PaymentParty[]
): PaymentWrite | null {
  const partyName = (
    row.partyName ??
    row.party_name ??
    row.customer ??
    row.vendor ??
    row.party ??
    ""
  ).trim()
  const partyId = (row.partyId ?? row.party_id ?? "").trim() || findPartyApiId(partyName, parties)
  if (!partyName || !partyId) return null

  const amount = Number(parseMoney(String(row.amount ?? "0")))
  if (!Number.isFinite(amount) || amount <= 0) return null

  const paymentNumber = (row.paymentNumber ?? row.payment_number ?? "").trim()

  return {
    type: toApiPaymentType(parsePaymentType(row.type ?? type)),
    partyId,
    partyName,
    paymentNumber: paymentNumber || undefined,
    referenceNumber: (
      row.referenceNumber ??
      row.reference_number ??
      row.reference ??
      ""
    ).trim(),
    paymentDate: toUiDate(
      row.paymentDate ?? row.payment_date ?? row.date ?? new Date().toISOString()
    ),
    amount,
    paymentMethod: parsePaymentMethod(
      String(row.paymentMethod ?? row.payment_method ?? "Cash")
    ),
    status: parsePaymentStatus(row.status ?? "completed"),
    notes: (row.notes ?? row.description ?? "").trim(),
  }
}

export function flattenPaymentForExport(payment: PaymentRow): Record<string, unknown> {
  return {
    paymentNumber: payment.paymentNumber,
    partyName: payment.partyName === "—" ? "" : payment.partyName,
    paymentDate: payment.paymentDate,
    amount: payment.amount,
    paymentMethod: payment.paymentMethod,
    status: payment.status,
    referenceNumber: payment.referenceNumber === "—" ? "" : payment.referenceNumber,
    notes: payment.notes === "—" ? "" : payment.notes,
  }
}

export function paymentErrorMessage(error: unknown, fallback: string) {
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

export function nextPaymentNumber(
  existing: PaymentRow[],
  type: PaymentRow["type"]
): string {
  const key = type === "customer" ? "customerPayments" : "vendorPayments"
  const settings = loadDocumentNumberSettings()[key]
  return nextDocumentNumber(
    existing.filter((row) => row.type === type).map((row) => row.paymentNumber),
    settings.prefix,
    DEFAULT_DOCUMENT_NUMBER_SETTINGS[key].prefix
  )
}

export function typeLabel(type: PaymentRow["type"]) {
  return type === "customer" ? "Customer payment" : "Vendor payment"
}

export function typeBadgeClass(type: PaymentRow["type"]) {
  if (type === "customer")
    return "border-blue-500/30 px-1.5 text-blue-700 dark:text-blue-400"
  return "border-violet-500/30 px-1.5 text-violet-700 dark:text-violet-400"
}

export function statusBadgeClass(status: PaymentRow["status"]) {
  if (status === "completed")
    return "border-emerald-500/30 px-1.5 text-emerald-700 dark:text-emerald-400"
  if (status === "pending")
    return "border-amber-500/30 px-1.5 text-amber-700 dark:text-amber-400"
  return "border-border px-1.5 text-muted-foreground"
}

export function statusLabel(status: PaymentRow["status"]) {
  return status.charAt(0).toUpperCase() + status.slice(1)
}

export function parsePaymentType(raw: string): PaymentRow["type"] {
  const normalized = raw.toLowerCase().replace(/\s+/g, "_")
  if (normalized === "vendor" || normalized === "vendor_payment") return "vendor"
  return "customer"
}

export function parsePaymentStatus(raw: string): PaymentRow["status"] {
  const normalized = raw.toLowerCase().replace(/\s+/g, "_")
  if (normalized === "completed") return "completed"
  if (normalized === "voided" || normalized === "void") return "voided"
  return "pending"
}

export function parsePaymentMethod(raw: string): PaymentRow["paymentMethod"] {
  const normalized = raw.trim()
  if (PAYMENT_METHODS.includes(normalized as PaymentRow["paymentMethod"])) {
    return normalized as PaymentRow["paymentMethod"]
  }
  return "Cash"
}

export function paymentStatusTabFilter(row: PaymentRow, tab: string) {
  if (tab === "all") return true
  return row.status === tab
}

export function paymentTabFilter(row: PaymentRow, tab: string) {
  if (tab === "all") return true
  if (tab === "customer" || tab === "vendor") return row.type === tab
  return row.status === tab
}

export function mapImportedPayment(
  row: Record<string, string>,
  existing: PaymentRow[],
  parties: PaymentParty[] = []
): PaymentRow | null {
  const mapped = mapImportedPaymentWrite(
    row,
    parsePaymentType(row.type ?? "customer"),
    parties
  )
  if (!mapped) return null
  const maxId = existing.reduce((m, x) => Math.max(m, x.id), 0)
  return {
    id: maxId + 1,
    apiId: "",
    partyId: mapped.partyId,
    paymentNumber:
      (row.paymentNumber ?? row.payment_number ?? "").trim() ||
      nextPaymentNumber(existing, fromApiPaymentType(mapped.type)),
    type: fromApiPaymentType(mapped.type),
    partyName: mapped.partyName || "—",
    referenceNumber: mapped.referenceNumber?.trim() || "—",
    paymentDate: mapped.paymentDate,
    amount: parseMoney(String(mapped.amount)),
    paymentMethod: parsePaymentMethod(mapped.paymentMethod ?? "Cash"),
    status: mapped.status ?? "pending",
    notes: mapped.notes?.trim() || "—",
  }
}

export function paymentFromFormData(
  fd: FormData,
  base: PaymentRow = EMPTY_PAYMENT
): PaymentRow {
  const type = parsePaymentType(String(fd.get("type") ?? base.type))
  const partyName = String(fd.get("partyName") ?? "").trim()
  return {
    ...base,
    paymentNumber: String(fd.get("paymentNumber") ?? base.paymentNumber).trim(),
    type,
    partyId: String(fd.get("partyId") ?? base.partyId).trim(),
    partyName,
    referenceNumber: String(fd.get("referenceNumber") ?? "").trim() || "—",
    paymentDate:
      String(fd.get("paymentDate") ?? "").trim() ||
      new Date().toISOString().slice(0, 10),
    amount: parseMoney(String(fd.get("amount") ?? "0")),
    paymentMethod: parsePaymentMethod(String(fd.get("paymentMethod") ?? "Cash")),
    status: parsePaymentStatus(String(fd.get("status") ?? "pending")),
    notes: String(fd.get("notes") ?? "").trim() || "—",
  }
}

export function parsePersistedPayments(raw: string | null): PaymentRow[] | null {
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as unknown
    const result = z.array(paymentSchema).safeParse(parsed)
    return result.success ? result.data : null
  } catch {
    return null
  }
}
