import { z } from "zod"

import { formatMoney, parseMoney } from "@/lib/customers"
import i18n from "@/i18n"
import { dateLocaleForLanguage } from "@/i18n/config"

export { formatMoney, parseMoney }

export const PAYMENT_METHODS = ["Cash", "Bank transfer", "Card", "Credit"] as const

export const ORDER_STATUSES = ["pending", "completed", "cancelled"] as const

export const ORDER_IMPORT_COLUMNS = [
  "invoiceNumber",
  "customerName",
  "orderDate",
  "productName",
  "quantity",
  "unitPrice",
  "paidAmount",
  "paymentMethod",
  "status",
  "description",
] as const

export const ORDER_IMPORT_SAMPLE_ROW: Record<(typeof ORDER_IMPORT_COLUMNS)[number], string> = {
  invoiceNumber: "INV-2001",
  customerName: "Acme Retail Co.",
  orderDate: "2026-09-21",
  productName: "Premium Basmati Rice 25kg",
  quantity: "2",
  unitPrice: "3200.00",
  paidAmount: "6400.00",
  paymentMethod: "Cash",
  status: "completed",
  description: "Imported sale",
}

export const orderLineSchema = z.object({
  id: z.number(),
  productName: z.string(),
  quantity: z.number(),
  unitPrice: z.string(),
  lineTotal: z.string(),
})

export type OrderLineRow = z.infer<typeof orderLineSchema>

export const orderSchema = z.object({
  id: z.number(),
  invoiceNumber: z.string(),
  customerName: z.string(),
  description: z.string(),
  orderDate: z.string(),
  totalAmount: z.string(),
  paidAmount: z.string(),
  paymentMethod: z.enum(["Cash", "Bank transfer", "Card", "Credit"]),
  status: z.enum(["pending", "completed", "cancelled"]),
  lines: z.array(orderLineSchema).min(1),
})

export type OrderRow = z.infer<typeof orderSchema>

export const ORDERS_STORAGE_KEY = "custoray-orders-v2"

export function computeLineTotal(quantity: number, unitPrice: string): string {
  const price = Number(unitPrice)
  const qty = Number.isFinite(quantity) ? quantity : 0
  const total =
    (Number.isFinite(price) ? price : 0) * qty
  return total.toFixed(2)
}

export function computeOrderTotal(lines: Pick<OrderLineRow, "lineTotal">[]): string {
  const sum = lines.reduce((acc, line) => {
    const n = Number(line.lineTotal)
    return acc + (Number.isFinite(n) ? n : 0)
  }, 0)
  return sum.toFixed(2)
}

export function computeBalance(
  order: Pick<OrderRow, "totalAmount" | "paidAmount">
): string {
  const total = Number(order.totalAmount)
  const paid = Number(order.paidAmount)
  const balance =
    (Number.isFinite(total) ? total : 0) - (Number.isFinite(paid) ? paid : 0)
  return balance.toFixed(2)
}

export const initialOrders: OrderRow[] = [
  {
    id: 1,
    invoiceNumber: "INV-1001",
    customerName: "Acme Retail Co.",
    description: "Bulk order — mixed SKUs",
    orderDate: "2026-07-08",
    totalAmount: "45200.00",
    paidAmount: "45200.00",
    paymentMethod: "Bank transfer",
    status: "completed",
    lines: [
      {
        id: 1,
        productName: "Premium Basmati Rice 25kg",
        quantity: 8,
        unitPrice: "3200.00",
        lineTotal: "25600.00",
      },
      {
        id: 2,
        productName: "Sunflower Oil 5L",
        quantity: 12,
        unitPrice: "1100.00",
        lineTotal: "13200.00",
      },
      {
        id: 3,
        productName: "Mixed Spices Carton",
        quantity: 4,
        unitPrice: "1600.00",
        lineTotal: "6400.00",
      },
    ],
  },
  {
    id: 2,
    invoiceNumber: "INV-1002",
    customerName: "Northwind Traders",
    description: "Seasonal restock — priority dispatch",
    orderDate: "2026-07-12",
    totalAmount: "28950.75",
    paidAmount: "15000.00",
    paymentMethod: "Credit",
    status: "pending",
    lines: [
      {
        id: 1,
        productName: "Organic Honey 500g",
        quantity: 24,
        unitPrice: "850.50",
        lineTotal: "20412.00",
      },
      {
        id: 2,
        productName: "Green Tea Box 100s",
        quantity: 15,
        unitPrice: "569.25",
        lineTotal: "8538.75",
      },
    ],
  },
  {
    id: 3,
    invoiceNumber: "INV-1003",
    customerName: "Contoso Foods",
    description: "Cold chain delivery — weekly slot",
    orderDate: "2026-07-18",
    totalAmount: "12400.00",
    paidAmount: "12400.00",
    paymentMethod: "Cash",
    status: "completed",
    lines: [
      {
        id: 1,
        productName: "Frozen Chicken 10kg",
        quantity: 10,
        unitPrice: "1240.00",
        lineTotal: "12400.00",
      },
    ],
  },
  {
    id: 4,
    invoiceNumber: "INV-1004",
    customerName: "Fabrikam Logistics",
    description: "Cancelled — stock unavailable",
    orderDate: "2026-07-20",
    totalAmount: "8750.00",
    paidAmount: "0.00",
    paymentMethod: "Card",
    status: "cancelled",
    lines: [
      {
        id: 1,
        productName: "Industrial Pallet Wrap",
        quantity: 25,
        unitPrice: "350.00",
        lineTotal: "8750.00",
      },
    ],
  },
  {
    id: 5,
    invoiceNumber: "INV-1005",
    customerName: "Litware Inc.",
    description: "Awaiting manager approval",
    orderDate: "2026-07-22",
    totalAmount: "5600.50",
    paidAmount: "2000.00",
    paymentMethod: "Bank transfer",
    status: "pending",
    lines: [
      {
        id: 1,
        productName: "Office Supplies Bundle",
        quantity: 5,
        unitPrice: "720.10",
        lineTotal: "3600.50",
      },
      {
        id: 2,
        productName: "Printer Paper Ream",
        quantity: 8,
        unitPrice: "250.00",
        lineTotal: "2000.00",
      },
    ],
  },
  {
    id: 6,
    invoiceNumber: "POS-1001",
    customerName: "Walk-in Customer",
    description: "POS sale",
    orderDate: "2026-07-25",
    totalAmount: "2450.00",
    paidAmount: "2450.00",
    paymentMethod: "Cash",
    status: "completed",
    lines: [
      {
        id: 1,
        productName: "Sunflower Oil 5L",
        quantity: 1,
        unitPrice: "1100.00",
        lineTotal: "1100.00",
      },
      {
        id: 2,
        productName: "Green Tea Box 100s",
        quantity: 2,
        unitPrice: "569.25",
        lineTotal: "1138.50",
      },
      {
        id: 3,
        productName: "Organic Honey 500g",
        quantity: 1,
        unitPrice: "211.50",
        lineTotal: "211.50",
      },
    ],
  },
  {
    id: 7,
    invoiceNumber: "INV-1006",
    customerName: "Acme Retail Co.",
    description: "Follow-up bulk order",
    orderDate: "2026-07-27",
    totalAmount: "18600.00",
    paidAmount: "18600.00",
    paymentMethod: "Bank transfer",
    status: "completed",
    lines: [
      {
        id: 1,
        productName: "Premium Basmati Rice 25kg",
        quantity: 4,
        unitPrice: "3200.00",
        lineTotal: "12800.00",
      },
      {
        id: 2,
        productName: "Mixed Spices Carton",
        quantity: 2,
        unitPrice: "1600.00",
        lineTotal: "3200.00",
      },
      {
        id: 3,
        productName: "Sunflower Oil 5L",
        quantity: 2,
        unitPrice: "1300.00",
        lineTotal: "2600.00",
      },
    ],
  },
  {
    id: 8,
    invoiceNumber: "POS-1002",
    customerName: "Walk-in Customer",
    description: "POS sale",
    orderDate: "2026-07-28",
    totalAmount: "3720.00",
    paidAmount: "3720.00",
    paymentMethod: "Card",
    status: "completed",
    lines: [
      {
        id: 1,
        productName: "Frozen Chicken 10kg",
        quantity: 3,
        unitPrice: "1240.00",
        lineTotal: "3720.00",
      },
    ],
  },
  {
    id: 9,
    invoiceNumber: "INV-1007",
    customerName: "Northwind Traders",
    description: "Credit restock",
    orderDate: "2026-07-29",
    totalAmount: "9800.00",
    paidAmount: "0.00",
    paymentMethod: "Credit",
    status: "completed",
    lines: [
      {
        id: 1,
        productName: "Organic Honey 500g",
        quantity: 10,
        unitPrice: "850.00",
        lineTotal: "8500.00",
      },
      {
        id: 2,
        productName: "Printer Paper Ream",
        quantity: 5,
        unitPrice: "260.00",
        lineTotal: "1300.00",
      },
    ],
  },
  {
    id: 10,
    invoiceNumber: "POS-1003",
    customerName: "Walk-in Customer",
    description: "POS sale",
    orderDate: "2026-07-30",
    totalAmount: "1890.00",
    paidAmount: "1890.00",
    paymentMethod: "Cash",
    status: "completed",
    lines: [
      {
        id: 1,
        productName: "Mixed Spices Carton",
        quantity: 1,
        unitPrice: "1600.00",
        lineTotal: "1600.00",
      },
      {
        id: 2,
        productName: "Office Supplies Bundle",
        quantity: 1,
        unitPrice: "290.00",
        lineTotal: "290.00",
      },
    ],
  },
  {
    id: 11,
    invoiceNumber: "INV-1008",
    customerName: "Contoso Foods",
    description: "Weekly cold chain",
    orderDate: "2026-07-31",
    totalAmount: "15600.00",
    paidAmount: "15600.00",
    paymentMethod: "Bank transfer",
    status: "completed",
    lines: [
      {
        id: 1,
        productName: "Frozen Chicken 10kg",
        quantity: 8,
        unitPrice: "1240.00",
        lineTotal: "9920.00",
      },
      {
        id: 2,
        productName: "Sunflower Oil 5L",
        quantity: 4,
        unitPrice: "1420.00",
        lineTotal: "5680.00",
      },
    ],
  },
  {
    id: 12,
    invoiceNumber: "POS-1004",
    customerName: "Walk-in Customer",
    description: "POS sale",
    orderDate: "2026-08-01",
    totalAmount: "4280.00",
    paidAmount: "4280.00",
    paymentMethod: "Card",
    status: "completed",
    lines: [
      {
        id: 1,
        productName: "Premium Basmati Rice 25kg",
        quantity: 1,
        unitPrice: "3200.00",
        lineTotal: "3200.00",
      },
      {
        id: 2,
        productName: "Green Tea Box 100s",
        quantity: 2,
        unitPrice: "540.00",
        lineTotal: "1080.00",
      },
    ],
  },
  {
    id: 13,
    invoiceNumber: "INV-1009",
    customerName: "Litware Inc.",
    description: "Office replenishment",
    orderDate: "2026-08-02",
    totalAmount: "7200.00",
    paidAmount: "3600.00",
    paymentMethod: "Bank transfer",
    status: "completed",
    lines: [
      {
        id: 1,
        productName: "Office Supplies Bundle",
        quantity: 6,
        unitPrice: "720.00",
        lineTotal: "4320.00",
      },
      {
        id: 2,
        productName: "Printer Paper Ream",
        quantity: 12,
        unitPrice: "240.00",
        lineTotal: "2880.00",
      },
    ],
  },
  {
    id: 14,
    invoiceNumber: "POS-1005",
    customerName: "Walk-in Customer",
    description: "POS sale",
    orderDate: "2026-08-03",
    totalAmount: "3120.00",
    paidAmount: "3120.00",
    paymentMethod: "Cash",
    status: "completed",
    lines: [
      {
        id: 1,
        productName: "Organic Honey 500g",
        quantity: 2,
        unitPrice: "850.00",
        lineTotal: "1700.00",
      },
      {
        id: 2,
        productName: "Sunflower Oil 5L",
        quantity: 1,
        unitPrice: "1100.00",
        lineTotal: "1100.00",
      },
      {
        id: 3,
        productName: "Green Tea Box 100s",
        quantity: 1,
        unitPrice: "320.00",
        lineTotal: "320.00",
      },
    ],
  },
  {
    id: 15,
    invoiceNumber: "INV-1010",
    customerName: "Acme Retail Co.",
    description: "Same-day top-up order",
    orderDate: "2026-08-03",
    totalAmount: "21400.00",
    paidAmount: "21400.00",
    paymentMethod: "Bank transfer",
    status: "completed",
    lines: [
      {
        id: 1,
        productName: "Premium Basmati Rice 25kg",
        quantity: 5,
        unitPrice: "3200.00",
        lineTotal: "16000.00",
      },
      {
        id: 2,
        productName: "Mixed Spices Carton",
        quantity: 2,
        unitPrice: "1700.00",
        lineTotal: "3400.00",
      },
      {
        id: 3,
        productName: "Industrial Pallet Wrap",
        quantity: 4,
        unitPrice: "500.00",
        lineTotal: "2000.00",
      },
    ],
  },
  {
    id: 16,
    invoiceNumber: "INV-1011",
    customerName: "Acme Retail Co.",
    description: "June restock",
    orderDate: "2026-06-18",
    totalAmount: "9600.00",
    paidAmount: "9600.00",
    paymentMethod: "Bank transfer",
    status: "completed",
    lines: [
      {
        id: 1,
        productName: "Sunflower Oil 5L",
        quantity: 6,
        unitPrice: "1100.00",
        lineTotal: "6600.00",
      },
      {
        id: 2,
        productName: "Mixed Spices Carton",
        quantity: 2,
        unitPrice: "1500.00",
        lineTotal: "3000.00",
      },
    ],
  },
]

export const EMPTY_ORDER_LINE: OrderLineRow = {
  id: 0,
  productName: "",
  quantity: 1,
  unitPrice: "0",
  lineTotal: "0.00",
}

export const EMPTY_ORDER: OrderRow = {
  id: 0,
  invoiceNumber: "",
  customerName: "",
  description: "",
  orderDate: new Date().toISOString().slice(0, 10),
  totalAmount: "0",
  paidAmount: "0",
  paymentMethod: "Cash",
  status: "pending",
  lines: [{ ...EMPTY_ORDER_LINE, id: 1 }],
}

export function formatDate(value: string): string {
  const date = new Date(`${value}T00:00:00`)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat(dateLocaleForLanguage(i18n.language), {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date)
}

export function statusBadgeClass(status: OrderRow["status"] | undefined | null) {
  const normalized = status ?? "pending"
  if (normalized === "completed")
    return "border-emerald-500/30 px-1.5 text-emerald-700 dark:text-emerald-400"
  if (normalized === "pending")
    return "border-blue-500/30 px-1.5 text-blue-700 dark:text-blue-400"
  return "border-border px-1.5 text-muted-foreground"
}

export function statusLabel(status: OrderRow["status"] | undefined | null) {
  const normalized = status ?? "pending"
  return i18n.t(`status.${normalized}`, { ns: "common", defaultValue: normalized })
}

export function parseStatus(raw: string): OrderRow["status"] {
  const statusRaw = raw.toLowerCase().replace(/\s+/g, "_")
  if (statusRaw === "on_hold" || statusRaw === "on-hold") return "pending"
  if (statusRaw === "completed") return "completed"
  if (statusRaw === "cancelled" || statusRaw === "canceled") return "cancelled"
  return "pending"
}

export function parsePaymentMethod(raw: string): OrderRow["paymentMethod"] {
  const normalized = raw.trim().toLowerCase()
  if (normalized === "bank transfer" || normalized === "bank_transfer") {
    return "Bank transfer"
  }
  if (normalized === "card") return "Card"
  if (normalized === "credit") return "Credit"
  return "Cash"
}

export function nextInvoiceNumber(existing: OrderRow[]): string {
  const maxNum = existing.reduce((max, order) => {
    const match = order.invoiceNumber.match(/(\d+)\s*$/)
    const num = match ? Number(match[1]) : 0
    return Math.max(max, num)
  }, 1000)
  return `INV-${maxNum + 1}`
}

export function parseLinesFromFormData(fd: FormData): OrderLineRow[] {
  const lines: OrderLineRow[] = []
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

export function orderFromFormData(fd: FormData, id: number): OrderRow {
  const customerName = String(fd.get("customerName") ?? "").trim()
  const invoiceNumber = String(fd.get("invoiceNumber") ?? "").trim()
  const lines = parseLinesFromFormData(fd)
  const totalAmount = computeOrderTotal(lines)

  return {
    id,
    invoiceNumber: invoiceNumber || `INV-${id || "new"}`,
    customerName: customerName || "—",
    description: String(fd.get("description") ?? "").trim() || "—",
    orderDate:
      String(fd.get("orderDate") ?? "").trim() ||
      new Date().toISOString().slice(0, 10),
    totalAmount,
    paidAmount: parseMoney(String(fd.get("paidAmount") ?? "0")),
    paymentMethod: parsePaymentMethod(String(fd.get("paymentMethod") ?? "Cash")),
    status: parseStatus(String(fd.get("status") ?? "pending")),
    lines: lines.length > 0 ? lines : [{ ...EMPTY_ORDER_LINE, id: 1 }],
  }
}

export function mapImportedOrder(
  row: Record<string, string>,
  existing: OrderRow[]
): OrderRow | null {
  const maxId = existing.reduce((m, x) => Math.max(m, x.id), 0)
  const finalId = maxId + 1
  const customerName = (
    row.customerName ??
    row.customer ??
    row.customer_name ??
    ""
  ).trim()
  const invoiceNumber = (
    row.invoiceNumber ??
    row.invoice_number ??
    row.invoice ??
    row.saleNumber ??
    ""
  ).trim()
  if (!customerName && !invoiceNumber) return null

  const line = importedOrderLine(row, 1)
  const totalAmount = parseMoney(
    String(row.totalAmount ?? row.total_amount ?? row.total ?? line.lineTotal)
  )

  return {
    id: finalId,
    invoiceNumber: uniqueInvoiceNumber(invoiceNumber || `INV-${finalId}`, existing),
    customerName: customerName || "—",
    description: (row.description ?? row.desc ?? "").trim() || "—",
    orderDate:
      (row.orderDate ?? row.order_date ?? row.saleDate ?? row.date ?? "").trim() ||
      new Date().toISOString().slice(0, 10),
    totalAmount,
    paidAmount: parseMoney(String(row.paidAmount ?? row.paid_amount ?? row.paid ?? "0")),
    paymentMethod: parsePaymentMethod(row.paymentMethod ?? row.payment_method ?? "Cash"),
    status: parseStatus(row.status ?? "pending"),
    lines: [line],
  }
}

function importedOrderLine(row: Record<string, string>, id: number): OrderLineRow {
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

function uniqueInvoiceNumber(desired: string, existing: OrderRow[]): string {
  if (!desired) return nextInvoiceNumber(existing)
  if (!existing.some((order) => order.invoiceNumber === desired)) return desired
  return nextInvoiceNumber(existing)
}

export function flattenOrderForExport(order: OrderRow): Record<string, unknown>[] {
  const lines = order.lines?.length
    ? order.lines
    : [{ productName: "", quantity: 1, unitPrice: "0.00" }]
  return lines.map((line) => ({
    invoiceNumber: order.invoiceNumber,
    customerName: order.customerName,
    orderDate: order.orderDate,
    productName: line.productName,
    quantity: line.quantity,
    unitPrice: line.unitPrice,
    paidAmount: order.paidAmount,
    paymentMethod: order.paymentMethod,
    status: order.status,
    description: order.description === "—" ? "" : order.description,
  }))
}

export function importOrdersFromRows(
  rows: Record<string, string>[],
  existing: OrderRow[]
): OrderRow[] {
  const groups = new Map<string, Record<string, string>[]>()
  const orphans: Record<string, string>[] = []

  for (const row of rows) {
    const invoiceNumber = (
      row.invoiceNumber ??
      row.invoice_number ??
      row.invoice ??
      row.saleNumber ??
      ""
    ).trim()
    if (!invoiceNumber) {
      orphans.push(row)
      continue
    }
    const list = groups.get(invoiceNumber) ?? []
    list.push(row)
    groups.set(invoiceNumber, list)
  }

  const created: OrderRow[] = []
  let acc = [...existing]

  const push = (mapped: OrderRow | null) => {
    if (!mapped) return
    acc = [...acc, mapped]
    created.push(mapped)
  }

  for (const group of groups.values()) {
    const header = mapImportedOrder(group[0], acc)
    if (!header) continue
    header.lines = group.map((row, index) => importedOrderLine(row, index + 1))
    header.totalAmount = computeOrderTotal(header.lines)
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
    push(mapImportedOrder(row, acc))
  }

  return created
}

export function parsePersistedOrders(raw: string | null): OrderRow[] | null {
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
    const result = z.array(orderSchema).safeParse(normalized)
    return result.success ? result.data : null
  } catch {
    return null
  }
}

export function ordersForCustomer(
  orders: OrderRow[],
  customerName: string
): OrderRow[] {
  const normalized = customerName.trim().toLowerCase()
  if (!normalized || normalized === "—") return []

  return orders
    .filter((order) => order.customerName.trim().toLowerCase() === normalized)
    .sort((a, b) => b.orderDate.localeCompare(a.orderDate))
}
