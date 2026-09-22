import { z } from "zod"

import { ApiClientError } from "@/lib/api/client"
import type { ApiVendor } from "@/lib/api/business"
import {
  formatMoney,
  parseMoney,
  parseStatus,
  statusBadgeClass,
  statusLabel,
} from "@/lib/customers"

export { formatMoney, parseMoney, statusBadgeClass, statusLabel, parseStatus }

export const VENDOR_STATUS_OPTIONS = ["active", "inactive"] as const

export const vendorSchema = z.object({
  id: z.number(),
  apiId: z.string().optional().default(""),
  name: z.string(),
  description: z.string(),
  openingBalance: z.string(),
  totalPurchases: z.string(),
  totalPayments: z.string(),
  phone: z.string(),
  status: z.enum(VENDOR_STATUS_OPTIONS),
  imageUrl: z.string().default(""),
})

export type VendorRow = z.infer<typeof vendorSchema>
export type VendorStatus = VendorRow["status"]
export type VendorWrite = {
  name: string
  phone?: string
  description?: string
  status?: VendorStatus
  openingBalance?: number
  imageUrl?: string
}

export const VENDORS_STORAGE_KEY = "custoray-vendors-v2"
export const VENDORS_CHANGED_EVENT = "custoray-vendors-changed"

export function vendorSelectValue(vendor: Pick<VendorRow, "id" | "apiId">) {
  return vendor.apiId || String(vendor.id)
}

export function findVendorBySelectValue(vendors: VendorRow[], value: string) {
  return vendors.find(
    (vendor) => vendorSelectValue(vendor) === value || String(vendor.id) === value
  )
}

export function vendorTimelineHref(id: string | number) {
  return `/vendors/timeline?id=${encodeURIComponent(String(id))}`
}

export const VENDOR_IMPORT_COLUMNS = [
  "name",
  "description",
  "phone",
  "openingBalance",
  "status",
] as const

export const VENDOR_IMPORT_SAMPLE_ROW = {
  name: "Karachi Steel Supplies",
  description: "Raw materials — net 30 terms",
  phone: "+92 300 4455667",
  openingBalance: "0.00",
  status: "active",
}

export const EMPTY_VENDOR: VendorRow = {
  id: 0,
  apiId: "",
  name: "",
  description: "",
  openingBalance: "0.00",
  totalPurchases: "0.00",
  totalPayments: "0.00",
  phone: "",
  status: "active",
  imageUrl: "",
}

export function emitVendorsChanged() {
  if (typeof window === "undefined") return
  window.dispatchEvent(new Event(VENDORS_CHANGED_EVENT))
}

export function vendorsStorageKey(tenantId?: string | null) {
  if (!tenantId) return null
  return `${VENDORS_STORAGE_KEY}:${tenantId}`
}

export function loadCachedVendors(tenantId?: string | null): VendorRow[] {
  if (typeof window === "undefined") return []
  const key = vendorsStorageKey(tenantId)
  if (!key) return []
  try {
    const parsed = parsePersistedVendors(window.localStorage.getItem(key))
    return parsed ?? []
  } catch {
    return []
  }
}

export function cacheVendors(rows: VendorRow[], tenantId?: string | null) {
  if (typeof window === "undefined") return
  const key = vendorsStorageKey(tenantId)
  if (!key) return
  try {
    window.localStorage.removeItem("custoray-vendors-v1")
    window.localStorage.setItem(key, JSON.stringify(rows))
  } catch {
    /* ignore quota */
  }
}

export function computeBalance(
  vendor: Pick<VendorRow, "openingBalance" | "totalPurchases" | "totalPayments">
): string {
  const opening = Number(vendor.openingBalance)
  const purchases = Number(vendor.totalPurchases)
  const payments = Number(vendor.totalPayments)
  const balance =
    (Number.isFinite(opening) ? opening : 0) +
    (Number.isFinite(purchases) ? purchases : 0) -
    (Number.isFinite(payments) ? payments : 0)
  return balance.toFixed(2)
}

export function parseImportedVendorStatus(raw: string | undefined): VendorStatus | "" {
  const value = (raw ?? "").trim().toLowerCase().replace(/\s+/g, "_")
  if (!value) return ""
  if (value === "on_hold" || value === "on-hold" || value === "inactive") return "inactive"
  if (value === "active") return "active"
  return ""
}

export function vendorTabFilter(row: VendorRow, tab: string) {
  if (tab === "all") return true
  return row.status === tab
}

export function filterVendorRows(rows: VendorRow[], tab: string, search = "") {
  const query = search.trim().toLowerCase()
  return rows.filter((row) => {
    if (!vendorTabFilter(row, tab)) return false
    if (!query) return true
    return [row.name, row.description, row.phone, row.status].some((value) =>
      String(value).toLowerCase().includes(query)
    )
  })
}

export function mapApiVendorToRow(item: ApiVendor, index: number): VendorRow {
  return {
    id: index + 1,
    apiId: item.id,
    name: item.name ?? "",
    description: item.description ?? "",
    openingBalance: parseMoney(String(item.openingBalance ?? "0")),
    totalPurchases: parseMoney(String(item.totalPurchases ?? "0")),
    totalPayments: parseMoney(String(item.totalPayments ?? "0")),
    phone: item.phone ?? "",
    status: parseStatus(item.status ?? "active"),
    imageUrl: item.imageUrl ?? "",
  }
}

export function toApiVendorWrite(row: VendorRow): VendorWrite {
  return {
    name: row.name.trim(),
    phone: row.phone.trim() === "—" ? "" : row.phone.trim(),
    description: row.description.trim() === "—" ? "" : row.description.trim(),
    status: row.status,
    openingBalance: Number(parseMoney(row.openingBalance)),
    imageUrl: row.imageUrl.trim(),
  }
}

export function mapImportedVendorWrite(row: Record<string, string>): VendorWrite | null {
  const name = (row.name ?? "").trim()
  if (!name) return null
  const parsedStatus = parseImportedVendorStatus(row.status)
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

export function mapImportedVendor(
  row: Record<string, string>,
  existing: VendorRow[]
): VendorRow | null {
  const mapped = mapImportedVendorWrite(row)
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
    totalPurchases: "0.00",
    totalPayments: "0.00",
    phone: mapped.phone || "",
    status: mapped.status || "active",
    imageUrl: (row.imageUrl ?? row.image_url ?? "").trim(),
  }
}

export function vendorFromFormData(
  fd: FormData,
  base: VendorRow = EMPTY_VENDOR
): VendorRow {
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

export function parsePersistedVendors(raw: string | null): VendorRow[] | null {
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as unknown
    const normalized = Array.isArray(parsed)
      ? parsed.map((row, index) => {
          if (!row || typeof row !== "object") return row
          const item = row as Record<string, unknown>
          return {
            ...item,
            apiId: typeof item.apiId === "string" ? item.apiId : "",
            status: item.status === "on_hold" ? "inactive" : item.status,
            id: typeof item.id === "number" ? item.id : index + 1,
          }
        })
      : parsed
    const result = z.array(vendorSchema).safeParse(normalized)
    return result.success ? result.data : null
  } catch {
    return null
  }
}

export function vendorErrorMessage(error: unknown, fallback: string) {
  if (error instanceof ApiClientError) return error.message
  if (error instanceof Error) return error.message
  return fallback
}
