import { z } from "zod"

import { ApiClientError } from "@/lib/api/client"
import type { ApiBuyer } from "@/lib/api/business"

export const CUSTOMER_STATUS_OPTIONS = ["active", "inactive"] as const

export const customerSchema = z.object({
  id: z.number(),
  apiId: z.string().optional().default(""),
  name: z.string(),
  description: z.string(),
  openingBalance: z.string(),
  totalSales: z.string(),
  totalPayments: z.string(),
  phone: z.string(),
  status: z.enum(CUSTOMER_STATUS_OPTIONS),
  imageUrl: z.string().default(""),
})

export type CustomerRow = z.infer<typeof customerSchema>
export type CustomerStatus = CustomerRow["status"]
export type CustomerWrite = {
  name: string
  phone?: string
  description?: string
  status?: CustomerStatus
  openingBalance?: number
  imageUrl?: string
}

export const CUSTOMERS_STORAGE_KEY = "custoray-customers-v5"
export const CUSTOMERS_CHANGED_EVENT = "custoray-customers-changed"

export function customerTimelineHref(id: string | number) {
  return `/customers/timeline?id=${encodeURIComponent(String(id))}`
}

export const CUSTOMER_IMPORT_COLUMNS = [
  "name",
  "description",
  "phone",
  "openingBalance",
  "status",
] as const

export const CUSTOMER_IMPORT_SAMPLE_ROW = {
  name: "Acme Retail",
  description: "Wholesale buyer",
  phone: "+92 300 1234567",
  openingBalance: "0.00",
  status: "active",
}

export const EMPTY_CUSTOMER: CustomerRow = {
  id: 0,
  apiId: "",
  name: "",
  description: "",
  openingBalance: "0.00",
  totalSales: "0.00",
  totalPayments: "0.00",
  phone: "",
  status: "active",
  imageUrl: "",
}

export function emitCustomersChanged() {
  if (typeof window === "undefined") return
  window.dispatchEvent(new Event(CUSTOMERS_CHANGED_EVENT))
}

export function customersStorageKey(tenantId?: string | null) {
  if (!tenantId) return null
  return `${CUSTOMERS_STORAGE_KEY}:${tenantId}`
}

export function loadCachedCustomers(tenantId?: string | null): CustomerRow[] {
  if (typeof window === "undefined") return []
  const key = customersStorageKey(tenantId)
  if (!key) return []
  try {
    const parsed = parsePersistedCustomers(window.localStorage.getItem(key))
    return parsed ?? []
  } catch {
    return []
  }
}

export function cacheCustomers(rows: CustomerRow[], tenantId?: string | null) {
  if (typeof window === "undefined") return
  const key = customersStorageKey(tenantId)
  if (!key) return
  try {
    window.localStorage.removeItem(CUSTOMERS_STORAGE_KEY)
    window.localStorage.setItem(key, JSON.stringify(rows))
  } catch {
    /* ignore quota */
  }
}

export function computeBalance(
  customer: Pick<CustomerRow, "openingBalance" | "totalSales" | "totalPayments">
): string {
  const opening = Number(customer.openingBalance)
  const sales = Number(customer.totalSales)
  const payments = Number(customer.totalPayments)
  const balance =
    (Number.isFinite(opening) ? opening : 0) +
    (Number.isFinite(sales) ? sales : 0) -
    (Number.isFinite(payments) ? payments : 0)
  return balance.toFixed(2)
}

export function formatMoney(value: string): string {
  const n = Number(value)
  if (!Number.isFinite(n)) return value
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(n)
}

export function parseMoney(raw: string): string {
  const t = raw.replace(/[^0-9.-]/g, "")
  const n = Number(t)
  return Number.isFinite(n) ? n.toFixed(2) : "0.00"
}

export function statusBadgeClass(status: CustomerRow["status"]) {
  if (status === "active")
    return "border-emerald-500/30 px-1.5 text-emerald-700 dark:text-emerald-400"
  return "border-border px-1.5 text-muted-foreground"
}

export function statusLabel(status: CustomerRow["status"]) {
  return status.charAt(0).toUpperCase() + status.slice(1)
}

export function parseStatus(raw: string): CustomerRow["status"] {
  const statusRaw = raw.toLowerCase().replace(/\s+/g, "_")
  if (statusRaw === "on_hold" || statusRaw === "on-hold") return "inactive"
  if (statusRaw === "inactive") return "inactive"
  return "active"
}

export function parseImportedCustomerStatus(raw: string | undefined): CustomerStatus | "" {
  const value = (raw ?? "").trim().toLowerCase().replace(/\s+/g, "_")
  if (!value) return ""
  if (value === "on_hold" || value === "on-hold" || value === "inactive") return "inactive"
  if (value === "active") return "active"
  return ""
}

export function customerTabFilter(row: CustomerRow, tab: string) {
  if (tab === "all") return true
  return row.status === tab
}

export function filterCustomerRows(rows: CustomerRow[], tab: string, search = "") {
  const query = search.trim().toLowerCase()
  return rows.filter((row) => {
    if (!customerTabFilter(row, tab)) return false
    if (!query) return true
    return [row.name, row.description, row.phone, row.status].some((value) =>
      String(value).toLowerCase().includes(query)
    )
  })
}

export function mapApiBuyerToRow(item: ApiBuyer, index: number): CustomerRow {
  const legacyId = Number(item.legacyId)
  return {
    id: Number.isFinite(legacyId) && legacyId > 0 ? legacyId : index + 1,
    apiId: item.id,
    name: item.name ?? "",
    description: item.description ?? "",
    openingBalance: parseMoney(String(item.openingBalance ?? "0")),
    totalSales: parseMoney(String(item.totalSales ?? "0")),
    totalPayments: parseMoney(String(item.totalPayments ?? "0")),
    phone: item.phone ?? "",
    status: parseStatus(item.status ?? "active"),
    imageUrl: item.imageUrl ?? "",
  }
}

export function toApiCustomerWrite(row: CustomerRow): CustomerWrite {
  return {
    name: row.name.trim(),
    phone: row.phone.trim() === "—" ? "" : row.phone.trim(),
    description: row.description.trim() === "—" ? "" : row.description.trim(),
    status: row.status,
    openingBalance: Number(parseMoney(row.openingBalance)),
    imageUrl: row.imageUrl.trim(),
  }
}

export function mapImportedCustomerWrite(row: Record<string, string>): CustomerWrite | null {
  const name = (row.name ?? "").trim()
  if (!name) return null
  const parsedStatus = parseImportedCustomerStatus(row.status)
  if ((row.status ?? "").trim() && !parsedStatus) return null
  return {
    name,
    description: (row.description ?? row.desc ?? "").trim(),
    phone: (row.phone ?? row.phone_number ?? "").trim(),
    openingBalance: Number(
      parseMoney(String(row.openingBalance ?? row.opening_balance ?? "0"))
    ),
    status: parsedStatus || "active",
  }
}

export function mapImportedCustomer(
  row: Record<string, string>,
  existing: CustomerRow[]
): CustomerRow | null {
  const mapped = mapImportedCustomerWrite(row)
  if (!mapped) return null
  const maxId = existing.reduce((m, x) => Math.max(m, x.id), 0)
  const id = Number(row.id)
  const finalId = Number.isFinite(id) && id > 0 ? id : maxId + 1
  return {
    id: finalId,
    apiId: "",
    name: mapped.name,
    description: mapped.description || "",
    openingBalance: parseMoney(String(mapped.openingBalance ?? "0")),
    totalSales: "0.00",
    totalPayments: "0.00",
    phone: mapped.phone || "",
    status: mapped.status || "active",
    imageUrl: (row.imageUrl ?? row.image_url ?? "").trim(),
  }
}

export function customerFromFormData(fd: FormData, base: CustomerRow = EMPTY_CUSTOMER): CustomerRow {
  const name = String(fd.get("name") ?? "").trim()
  return {
    ...base,
    name,
    description: String(fd.get("description") ?? "").trim(),
    openingBalance: parseMoney(String(fd.get("openingBalance") ?? base.openingBalance)),
    phone: String(fd.get("phone") ?? "").trim(),
    status: parseStatus(String(fd.get("status") ?? base.status)),
    imageUrl: String(fd.get("imageUrl") ?? "").trim(),
  }
}

export function applySalesReturnToCustomer(
  customer: CustomerRow,
  returnAmount: string,
  refundDue: string
): Pick<CustomerRow, "totalSales" | "totalPayments"> {
  const sales = Number(customer.totalSales)
  const payments = Number(customer.totalPayments)
  const returned = Number(returnAmount)
  const refund = Number(refundDue)
  return {
    totalSales: Math.max(
      0,
      (Number.isFinite(sales) ? sales : 0) - (Number.isFinite(returned) ? returned : 0)
    ).toFixed(2),
    totalPayments: Math.max(
      0,
      (Number.isFinite(payments) ? payments : 0) - (Number.isFinite(refund) ? refund : 0)
    ).toFixed(2),
  }
}

export function parsePersistedCustomers(raw: string | null): CustomerRow[] | null {
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as unknown
    const normalized = Array.isArray(parsed)
      ? parsed.map((row) =>
          row && typeof row === "object" && (row as { status?: string }).status === "on_hold"
            ? { ...row, status: "inactive" }
            : row
        )
      : parsed
    const result = z.array(customerSchema).safeParse(normalized)
    return result.success ? result.data : null
  } catch {
    return null
  }
}

export function customerErrorMessage(error: unknown, fallback: string) {
  if (error instanceof ApiClientError) return error.message
  if (error instanceof Error) return error.message
  return fallback
}
