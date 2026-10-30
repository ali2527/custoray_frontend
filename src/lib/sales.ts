import { z } from "zod"

import { formatMoney, parseMoney } from "@/lib/customers"
import { DEFAULT_PAYMENT_METHODS } from "@/lib/payment-methods-settings"

export { formatMoney, parseMoney }

export const PAYMENT_METHODS = DEFAULT_PAYMENT_METHODS

export const saleSchema = z.object({
  id: z.number(),
  saleNumber: z.string(),
  customerName: z.string(),
  description: z.string(),
  saleDate: z.string(),
  totalAmount: z.string(),
  paidAmount: z.string(),
  paymentMethod: z.string().min(1),
  status: z.enum(["pending", "completed", "cancelled"]),
})

export type SaleRow = z.infer<typeof saleSchema>

export const SALES_STORAGE_KEY = "custoray-sales-v1"

export const initialSales: SaleRow[] = [
  {
    id: 1,
    saleNumber: "S-1001",
    customerName: "Acme Retail Co.",
    description: "Bulk order — 12 cartons mixed SKUs",
    saleDate: "2026-06-01",
    totalAmount: "45200.00",
    paidAmount: "45200.00",
    paymentMethod: "Bank transfer",
    status: "completed",
  },
  {
    id: 2,
    saleNumber: "S-1002",
    customerName: "Northwind Traders",
    description: "Seasonal restock — priority dispatch",
    saleDate: "2026-06-05",
    totalAmount: "28950.75",
    paidAmount: "15000.00",
    paymentMethod: "Credit",
    status: "pending",
  },
  {
    id: 3,
    saleNumber: "S-1003",
    customerName: "Contoso Foods",
    description: "Cold chain delivery — weekly slot",
    saleDate: "2026-06-10",
    totalAmount: "12400.00",
    paidAmount: "12400.00",
    paymentMethod: "Cash",
    status: "completed",
  },
  {
    id: 4,
    saleNumber: "S-1004",
    customerName: "Fabrikam Logistics",
    description: "Cancelled — stock unavailable",
    saleDate: "2026-06-12",
    totalAmount: "8750.00",
    paidAmount: "0.00",
    paymentMethod: "Card",
    status: "cancelled",
  },
  {
    id: 5,
    saleNumber: "S-1005",
    customerName: "Litware Inc.",
    description: "Awaiting manager approval",
    saleDate: "2026-06-18",
    totalAmount: "5600.50",
    paidAmount: "2000.00",
    paymentMethod: "Bank transfer",
    status: "pending",
  },
]

export const EMPTY_SALE: SaleRow = {
  id: 0,
  saleNumber: "",
  customerName: "",
  description: "",
  saleDate: new Date().toISOString().slice(0, 10),
  totalAmount: "0",
  paidAmount: "0",
  paymentMethod: "Cash",
  status: "pending",
}

export function computeBalance(
  sale: Pick<SaleRow, "totalAmount" | "paidAmount">
): string {
  const total = Number(sale.totalAmount)
  const paid = Number(sale.paidAmount)
  const balance =
    (Number.isFinite(total) ? total : 0) - (Number.isFinite(paid) ? paid : 0)
  return balance.toFixed(2)
}

export function formatDate(value: string): string {
  const date = new Date(`${value}T00:00:00`)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date)
}

export function statusBadgeClass(status: SaleRow["status"]) {
  if (status === "completed")
    return "border-emerald-500/30 px-1.5 text-emerald-700 dark:text-emerald-400"
  if (status === "pending")
    return "border-blue-500/30 px-1.5 text-blue-700 dark:text-blue-400"
  return "border-border px-1.5 text-muted-foreground"
}

export function statusLabel(status: SaleRow["status"]) {
  return status.charAt(0).toUpperCase() + status.slice(1)
}

export function parseStatus(raw: string): SaleRow["status"] {
  const statusRaw = raw.toLowerCase().replace(/\s+/g, "_")
  if (statusRaw === "on_hold" || statusRaw === "on-hold") return "pending"
  if (statusRaw === "completed") return "completed"
  if (statusRaw === "cancelled" || statusRaw === "canceled") return "cancelled"
  return "pending"
}

export function parsePaymentMethod(raw: string): SaleRow["paymentMethod"] {
  const normalized = raw.trim().toLowerCase()
  if (normalized === "bank transfer" || normalized === "bank_transfer") {
    return "Bank transfer"
  }
  if (normalized === "card") return "Card"
  if (normalized === "credit") return "Credit"
  return "Cash"
}

export function mapImportedSale(
  row: Record<string, string>,
  existing: SaleRow[]
): SaleRow | null {
  const maxId = existing.reduce((m, x) => Math.max(m, x.id), 0)
  const id = Number(row.id)
  const finalId = Number.isFinite(id) && id > 0 ? id : maxId + 1
  const customerName = (row.customerName ?? row.customer ?? row.customer_name ?? "").trim()
  const saleNumber = (row.saleNumber ?? row.sale_number ?? row.invoice ?? "").trim()
  if (!customerName && !saleNumber) return null

  return {
    id: finalId,
    saleNumber: saleNumber || `S-${finalId}`,
    customerName: customerName || "—",
    description: (row.description ?? row.desc ?? "").trim() || "—",
    saleDate: (row.saleDate ?? row.sale_date ?? row.date ?? "").trim() || new Date().toISOString().slice(0, 10),
    totalAmount: parseMoney(String(row.totalAmount ?? row.total_amount ?? row.total ?? "0")),
    paidAmount: parseMoney(String(row.paidAmount ?? row.paid_amount ?? row.paid ?? "0")),
    paymentMethod: parsePaymentMethod(row.paymentMethod ?? row.payment_method ?? "Cash"),
    status: parseStatus(row.status ?? "pending"),
  }
}

export function saleFromFormData(fd: FormData, id: number): SaleRow {
  const customerName = String(fd.get("customerName") ?? "").trim()
  const saleNumber = String(fd.get("saleNumber") ?? "").trim()
  return {
    id,
    saleNumber: saleNumber || `S-${id || "new"}`,
    customerName: customerName || "—",
    description: String(fd.get("description") ?? "").trim() || "—",
    saleDate: String(fd.get("saleDate") ?? "").trim() || new Date().toISOString().slice(0, 10),
    totalAmount: parseMoney(String(fd.get("totalAmount") ?? "0")),
    paidAmount: parseMoney(String(fd.get("paidAmount") ?? "0")),
    paymentMethod: parsePaymentMethod(String(fd.get("paymentMethod") ?? "Cash")),
    status: parseStatus(String(fd.get("status") ?? "pending")),
  }
}

export function parsePersistedSales(raw: string | null): SaleRow[] | null {
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as unknown
    const normalized = Array.isArray(parsed)
      ? parsed.map((row) =>
          row && typeof row === "object" && (row as { status?: string }).status === "on_hold"
            ? { ...row, status: "pending" }
            : row
        )
      : parsed
    const result = z.array(saleSchema).safeParse(normalized)
    return result.success ? result.data : null
  } catch {
    return null
  }
}

export function nextSaleNumber(existing: SaleRow[]): string {
  const maxNum = existing.reduce((max, sale) => {
    const match = sale.saleNumber.match(/(\d+)\s*$/)
    const num = match ? Number(match[1]) : 0
    return Math.max(max, num)
  }, 1000)
  return `S-${maxNum + 1}`
}
