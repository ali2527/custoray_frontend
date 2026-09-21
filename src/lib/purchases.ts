import { z } from "zod"

import { formatMoney, parseMoney } from "@/lib/customers"

export { formatMoney, parseMoney }

export const purchaseLineSchema = z.object({
  id: z.number(),
  productName: z.string(),
  quantity: z.number(),
  unitPrice: z.string(),
  lineTotal: z.string(),
})

export type PurchaseLineRow = z.infer<typeof purchaseLineSchema>

export const purchaseSchema = z.object({
  id: z.number(),
  purchaseNumber: z.string(),
  vendorName: z.string(),
  description: z.string(),
  purchaseDate: z.string(),
  totalAmount: z.string(),
  paidAmount: z.string(),
  status: z.enum(["pending", "completed", "cancelled"]),
  lines: z.array(purchaseLineSchema).min(1),
})

export type PurchaseRow = z.infer<typeof purchaseSchema>

export const PURCHASE_STATUSES = ["pending", "completed", "cancelled"] as const

export const PURCHASE_IMPORT_COLUMNS = [
  "purchaseNumber",
  "vendorName",
  "purchaseDate",
  "productName",
  "quantity",
  "unitPrice",
  "paidAmount",
  "status",
  "description",
] as const

export const PURCHASE_IMPORT_SAMPLE_ROW: Record<
  (typeof PURCHASE_IMPORT_COLUMNS)[number],
  string
> = {
  purchaseNumber: "PO-2101",
  vendorName: "Karachi Steel Supplies",
  purchaseDate: "2026-09-21",
  productName: "Steel Rod 12mm (bundle)",
  quantity: "10",
  unitPrice: "1450.00",
  paidAmount: "14500.00",
  status: "completed",
  description: "Imported purchase",
}

export const PURCHASES_STORAGE_KEY = "custoray-purchases-v1"

export function computeLineTotal(quantity: number, unitPrice: string): string {
  const price = Number(unitPrice)
  const qty = Number.isFinite(quantity) ? quantity : 0
  const total = (Number.isFinite(price) ? price : 0) * qty
  return total.toFixed(2)
}

export function computePurchaseTotal(
  lines: Pick<PurchaseLineRow, "lineTotal">[]
): string {
  const sum = lines.reduce((acc, line) => {
    const n = Number(line.lineTotal)
    return acc + (Number.isFinite(n) ? n : 0)
  }, 0)
  return sum.toFixed(2)
}

export function computeBalance(
  purchase: Pick<PurchaseRow, "totalAmount" | "paidAmount">
): string {
  const total = Number(purchase.totalAmount)
  const paid = Number(purchase.paidAmount)
  const balance =
    (Number.isFinite(total) ? total : 0) - (Number.isFinite(paid) ? paid : 0)
  return balance.toFixed(2)
}

export const initialPurchases: PurchaseRow[] = [
  {
    id: 1,
    purchaseNumber: "PO-2001",
    vendorName: "Karachi Steel Supplies",
    description: "Monthly raw steel restock",
    purchaseDate: "2026-06-02",
    totalAmount: "78500.00",
    paidAmount: "78500.00",
    status: "completed",
    lines: [
      {
        id: 1,
        productName: "Steel Rod 12mm (bundle)",
        quantity: 40,
        unitPrice: "1450.00",
        lineTotal: "58000.00",
      },
      {
        id: 2,
        productName: "Galvanized Sheet 4x8",
        quantity: 15,
        unitPrice: "1366.67",
        lineTotal: "20500.00",
      },
    ],
  },
  {
    id: 2,
    purchaseNumber: "PO-2002",
    vendorName: "Lahore Packaging Co.",
    description: "Corrugated cartons — Q2 batch",
    purchaseDate: "2026-06-08",
    totalAmount: "32400.00",
    paidAmount: "15000.00",
    status: "pending",
    lines: [
      {
        id: 1,
        productName: "Corrugated Carton Large",
        quantity: 500,
        unitPrice: "48.00",
        lineTotal: "24000.00",
      },
      {
        id: 2,
        productName: "Packing Tape Roll",
        quantity: 120,
        unitPrice: "70.00",
        lineTotal: "8400.00",
      },
    ],
  },
  {
    id: 3,
    purchaseNumber: "PO-2003",
    vendorName: "Islamabad Tech Distributors",
    description: "POS hardware refresh",
    purchaseDate: "2026-06-11",
    totalAmount: "45600.00",
    paidAmount: "45600.00",
    status: "completed",
    lines: [
      {
        id: 1,
        productName: "Barcode Scanner USB",
        quantity: 12,
        unitPrice: "3800.00",
        lineTotal: "45600.00",
      },
    ],
  },
  {
    id: 4,
    purchaseNumber: "PO-2004",
    vendorName: "Multan Agro Traders",
    description: "Cancelled — quality inspection failed",
    purchaseDate: "2026-06-14",
    totalAmount: "9800.00",
    paidAmount: "0.00",
    status: "cancelled",
    lines: [
      {
        id: 1,
        productName: "Organic Wheat 50kg",
        quantity: 20,
        unitPrice: "490.00",
        lineTotal: "9800.00",
      },
    ],
  },
  {
    id: 5,
    purchaseNumber: "PO-2005",
    vendorName: "Peshawar Hardware Hub",
    description: "Awaiting delivery slot confirmation",
    purchaseDate: "2026-06-19",
    totalAmount: "11250.50",
    paidAmount: "5000.00",
    status: "pending",
    lines: [
      {
        id: 1,
        productName: "Industrial Drill Set",
        quantity: 5,
        unitPrice: "1850.10",
        lineTotal: "9250.50",
      },
      {
        id: 2,
        productName: "Safety Gloves Box",
        quantity: 8,
        unitPrice: "250.00",
        lineTotal: "2000.00",
      },
    ],
  },
]

export const EMPTY_PURCHASE_LINE: PurchaseLineRow = {
  id: 0,
  productName: "",
  quantity: 1,
  unitPrice: "0",
  lineTotal: "0.00",
}

export const EMPTY_PURCHASE: PurchaseRow = {
  id: 0,
  purchaseNumber: "",
  vendorName: "",
  description: "",
  purchaseDate: new Date().toISOString().slice(0, 10),
  totalAmount: "0",
  paidAmount: "0",
  status: "pending",
  lines: [{ ...EMPTY_PURCHASE_LINE, id: 1 }],
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

export function statusBadgeClass(status: PurchaseRow["status"] | undefined | null) {
  const normalized = status ?? "pending"
  if (normalized === "completed")
    return "border-emerald-500/30 px-1.5 text-emerald-700 dark:text-emerald-400"
  if (normalized === "pending")
    return "border-blue-500/30 px-1.5 text-blue-700 dark:text-blue-400"
  return "border-border px-1.5 text-muted-foreground"
}

export function statusLabel(status: PurchaseRow["status"] | undefined | null) {
  const normalized = status ?? "pending"
  return normalized.charAt(0).toUpperCase() + normalized.slice(1)
}

export function parseStatus(raw: string): PurchaseRow["status"] {
  const statusRaw = raw.toLowerCase().replace(/\s+/g, "_")
  if (statusRaw === "on_hold" || statusRaw === "on-hold") return "pending"
  if (statusRaw === "completed") return "completed"
  if (statusRaw === "cancelled" || statusRaw === "canceled") return "cancelled"
  return "pending"
}

export function nextPurchaseNumber(existing: PurchaseRow[]): string {
  const maxNum = existing.reduce((max, purchase) => {
    const match = purchase.purchaseNumber.match(/(\d+)\s*$/)
    const num = match ? Number(match[1]) : 0
    return Math.max(max, num)
  }, 2000)
  return `PO-${maxNum + 1}`
}

export function parseLinesFromFormData(fd: FormData): PurchaseLineRow[] {
  const lines: PurchaseLineRow[] = []
  let index = 0
  while (true) {
    const productName = String(fd.get(`lines[${index}].productName`) ?? "").trim()
    if (!productName && index > 0) break
    if (!productName && index === 0) break

    const quantity = Number(fd.get(`lines[${index}].quantity`)) || 1
    const unitPrice = parseMoney(String(fd.get(`lines[${index}].unitPrice`) ?? "0"))
    const lineId = Number(fd.get(`lines[${index}].id`)) || index + 1

    lines.push({
      id: lineId,
      productName,
      quantity,
      unitPrice,
      lineTotal: computeLineTotal(quantity, unitPrice),
    })
    index++
  }
  return lines
}

export function purchaseFromFormData(fd: FormData, id: number): PurchaseRow {
  const vendorName = String(fd.get("vendorName") ?? "").trim()
  const purchaseNumber = String(fd.get("purchaseNumber") ?? "").trim()
  const lines = parseLinesFromFormData(fd)
  const totalAmount = computePurchaseTotal(lines)

  return {
    id,
    purchaseNumber: purchaseNumber || `PO-${id || "new"}`,
    vendorName: vendorName || "—",
    description: String(fd.get("description") ?? "").trim() || "—",
    purchaseDate:
      String(fd.get("purchaseDate") ?? "").trim() ||
      new Date().toISOString().slice(0, 10),
    totalAmount,
    paidAmount: parseMoney(String(fd.get("paidAmount") ?? "0")),
    status: parseStatus(String(fd.get("status") ?? "pending")),
    lines: lines.length > 0 ? lines : [{ ...EMPTY_PURCHASE_LINE, id: 1 }],
  }
}

export function mapImportedPurchase(
  row: Record<string, string>,
  existing: PurchaseRow[]
): PurchaseRow | null {
  const maxId = existing.reduce((m, x) => Math.max(m, x.id), 0)
  const finalId = maxId + 1
  const vendorName = (
    row.vendorName ??
    row.vendor ??
    row.vendor_name ??
    ""
  ).trim()
  const purchaseNumber = (
    row.purchaseNumber ??
    row.purchase_number ??
    row.po ??
    ""
  ).trim()
  if (!vendorName && !purchaseNumber) return null

  const line = importedPurchaseLine(row, 1)
  const totalAmount = parseMoney(
    String(row.totalAmount ?? row.total_amount ?? row.total ?? line.lineTotal)
  )

  return {
    id: finalId,
    purchaseNumber: uniquePurchaseNumber(
      purchaseNumber || `PO-${finalId}`,
      existing
    ),
    vendorName: vendorName || "—",
    description: (row.description ?? row.desc ?? "").trim() || "—",
    purchaseDate:
      (row.purchaseDate ?? row.purchase_date ?? row.date ?? "").trim() ||
      new Date().toISOString().slice(0, 10),
    totalAmount,
    paidAmount: parseMoney(String(row.paidAmount ?? row.paid_amount ?? row.paid ?? "0")),
    status: parseStatus(row.status ?? "pending"),
    lines: [line],
  }
}

function importedPurchaseLine(row: Record<string, string>, id: number): PurchaseLineRow {
  const productName = (row.productName ?? row.product ?? row.product_name ?? "").trim()
  const quantity = Number(row.quantity ?? row.qty) || 1
  const unitPrice = parseMoney(
    String(row.unitPrice ?? row.unit_price ?? row.rate ?? "0")
  )
  return {
    id,
    productName: productName || "Imported item",
    quantity,
    unitPrice,
    lineTotal: computeLineTotal(quantity, unitPrice),
  }
}

function uniquePurchaseNumber(desired: string, existing: PurchaseRow[]): string {
  if (!desired) return nextPurchaseNumber(existing)
  if (!existing.some((purchase) => purchase.purchaseNumber === desired)) return desired
  return nextPurchaseNumber(existing)
}

export function flattenPurchaseForExport(
  purchase: PurchaseRow
): Record<string, unknown>[] {
  const lines = purchase.lines?.length
    ? purchase.lines
    : [{ productName: "", quantity: 1, unitPrice: "0.00" }]
  return lines.map((line) => ({
    purchaseNumber: purchase.purchaseNumber,
    vendorName: purchase.vendorName,
    purchaseDate: purchase.purchaseDate,
    productName: line.productName,
    quantity: line.quantity,
    unitPrice: line.unitPrice,
    paidAmount: purchase.paidAmount,
    status: purchase.status,
    description: purchase.description === "—" ? "" : purchase.description,
  }))
}

export function importPurchasesFromRows(
  rows: Record<string, string>[],
  existing: PurchaseRow[]
): PurchaseRow[] {
  const groups = new Map<string, Record<string, string>[]>()
  const orphans: Record<string, string>[] = []

  for (const row of rows) {
    const purchaseNumber = (
      row.purchaseNumber ??
      row.purchase_number ??
      row.po ??
      ""
    ).trim()
    if (!purchaseNumber) {
      orphans.push(row)
      continue
    }
    const list = groups.get(purchaseNumber) ?? []
    list.push(row)
    groups.set(purchaseNumber, list)
  }

  const created: PurchaseRow[] = []
  let acc = [...existing]

  const push = (mapped: PurchaseRow | null) => {
    if (!mapped) return
    acc = [...acc, mapped]
    created.push(mapped)
  }

  for (const group of groups.values()) {
    const header = mapImportedPurchase(group[0], acc)
    if (!header) continue
    header.lines = group.map((row, index) => importedPurchaseLine(row, index + 1))
    header.totalAmount = computePurchaseTotal(header.lines)
    const paidOverride = (
      group[0].paidAmount ??
      group[0].paid_amount ??
      group[0].paid ??
      ""
    ).trim()
    if (paidOverride) header.paidAmount = parseMoney(paidOverride)
    push(header)
  }

  for (const row of orphans) {
    push(mapImportedPurchase(row, acc))
  }

  return created
}

export function normalizePurchaseRow(raw: unknown): PurchaseRow | null {
  if (!raw || typeof raw !== "object") return null
  const p = raw as Partial<PurchaseRow>
  if (typeof p.id !== "number" || !Number.isFinite(p.id)) return null

  const lines = Array.isArray(p.lines)
    ? p.lines.map((line, index) => {
        const quantity = Number(line?.quantity) || 1
        const unitPrice = parseMoney(String(line?.unitPrice ?? "0"))
        return {
          id: typeof line?.id === "number" ? line.id : index + 1,
          productName: String(line?.productName ?? "").trim() || "—",
          quantity,
          unitPrice,
          lineTotal: parseMoney(
            String(line?.lineTotal ?? computeLineTotal(quantity, unitPrice))
          ),
        }
      })
    : []

  const safeLines =
    lines.length > 0 ? lines : [{ ...EMPTY_PURCHASE_LINE, id: 1, productName: "—" }]

  return {
    id: p.id,
    purchaseNumber: String(p.purchaseNumber ?? `PO-${p.id}`).trim() || `PO-${p.id}`,
    vendorName: String(p.vendorName ?? "—").trim() || "—",
    description: String(p.description ?? "—").trim() || "—",
    purchaseDate:
      String(p.purchaseDate ?? "").trim() || new Date().toISOString().slice(0, 10),
    totalAmount: parseMoney(
      String(p.totalAmount ?? computePurchaseTotal(safeLines))
    ),
    paidAmount: parseMoney(String(p.paidAmount ?? "0")),
    status: p.status ? parseStatus(String(p.status)) : "pending",
    lines: safeLines,
  }
}

export function parsePersistedPurchases(raw: string | null): PurchaseRow[] | null {
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return null

    const normalized = parsed
      .map(normalizePurchaseRow)
      .filter((purchase): purchase is PurchaseRow => purchase !== null)

    if (normalized.length === 0) return null

    const strict = z.array(purchaseSchema).safeParse(normalized)
    return strict.success ? strict.data : normalized
  } catch {
    return null
  }
}

export function purchasesForVendor(
  purchases: PurchaseRow[],
  vendorName: string
): PurchaseRow[] {
  const normalized = vendorName.trim().toLowerCase()
  if (!normalized || normalized === "—") return []

  return purchases
    .filter((purchase) => purchase.vendorName.trim().toLowerCase() === normalized)
    .sort((a, b) => b.purchaseDate.localeCompare(a.purchaseDate))
}
