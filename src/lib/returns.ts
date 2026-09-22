import { z } from "zod"

import { formatMoney, parseMoney } from "@/lib/customers"
import {
  DEFAULT_DOCUMENT_NUMBER_SETTINGS,
  loadDocumentNumberSettings,
  nextDocumentNumber,
} from "@/lib/document-number-settings"
import { ALL_ITEMS_RETURNED_NAME } from "@/lib/return-eligibility"
import { computeLineTotal, computeOrderTotal, type OrderRow } from "@/lib/orders"
import { computePurchaseTotal, type PurchaseRow } from "@/lib/purchases"
import {
  cartLineTotal,
  normalizeDiscountAmount,
  POS_DISCOUNT_LINE_NAME,
  type PosCartLine,
} from "@/lib/pos"

export const POS_RETURN_DESCRIPTION = "POS return"

export function isPosReturn(
  returnDoc: Pick<
    ReturnRow,
    "type" | "sourceId" | "description" | "returnNumber" | "referenceNumber"
  >
): boolean {
  if (returnDoc.type !== "sales") return false
  const description = returnDoc.description ?? ""
  if (
    description === POS_RETURN_DESCRIPTION ||
    description.startsWith(`${POS_RETURN_DESCRIPTION} ·`) ||
    description.startsWith("POS return")
  ) {
    return true
  }
  return (
    returnDoc.returnNumber.startsWith("SR-") &&
    returnDoc.referenceNumber.startsWith("POS-")
  )
}

export { formatMoney }

export const returnLineSchema = z.object({
  id: z.number(),
  sourceLineId: z.number(),
  productName: z.string(),
  quantity: z.number(),
  maxQuantity: z.number(),
  unitPrice: z.string(),
  lineTotal: z.string(),
})

export type ReturnLineRow = z.infer<typeof returnLineSchema>

export const returnSchema = z.object({
  id: z.number(),
  apiId: z.string().optional(),
  sourceApiId: z.string().optional(),
  returnNumber: z.string(),
  type: z.enum(["sales", "purchase"]),
  sourceId: z.number(),
  referenceNumber: z.string(),
  partyName: z.string(),
  returnDate: z.string(),
  description: z.string(),
  totalAmount: z.string(),
  refundedAmount: z.string(),
  sourcePaidAmount: z.string(),
  sourceTotalBefore: z.string(),
  sourceTotalAfter: z.string(),
  refundDue: z.string(),
  balanceDue: z.string(),
  status: z.enum(["pending", "completed", "cancelled"]),
  lines: z.array(returnLineSchema).min(1),
})

export type ReturnRow = z.infer<typeof returnSchema>

export const RETURN_TYPES = ["sales", "purchase"] as const
export const RETURN_STATUSES = ["pending", "completed", "cancelled"] as const

export const RETURN_IMPORT_COLUMNS = [
  "returnNumber",
  "type",
  "referenceNumber",
  "partyName",
  "returnDate",
  "productName",
  "quantity",
  "unitPrice",
  "status",
  "description",
] as const

export const RETURN_IMPORT_SAMPLE_ROW: Record<
  (typeof RETURN_IMPORT_COLUMNS)[number],
  string
> = {
  returnNumber: "SR-3101",
  type: "sales",
  referenceNumber: "INV-1003",
  partyName: "Contoso Foods",
  returnDate: "2026-09-21",
  productName: "Frozen Chicken 10kg",
  quantity: "1",
  unitPrice: "1240.00",
  status: "pending",
  description: "Imported return",
}

export const RETURNS_STORAGE_KEY = "custoray-returns-v2"

export const initialReturns: ReturnRow[] = [
  {
    id: 1,
    returnNumber: "RET-1001",
    type: "sales",
    sourceId: 3,
    referenceNumber: "INV-1003",
    partyName: "Contoso Foods",
    returnDate: "2026-07-21",
    description: "Partial return — damaged goods",
    totalAmount: "2480.00",
    refundedAmount: "2480.00",
    sourcePaidAmount: "12400.00",
    sourceTotalBefore: "12400.00",
    sourceTotalAfter: "9920.00",
    refundDue: "0.00",
    balanceDue: "0.00",
    status: "completed",
    lines: [
      {
        id: 1,
        sourceLineId: 1,
        productName: "Frozen Chicken 10kg",
        quantity: 2,
        maxQuantity: 10,
        unitPrice: "1240.00",
        lineTotal: "2480.00",
      },
    ],
  },
  {
    id: 2,
    returnNumber: "RET-1002",
    type: "sales",
    sourceId: 0,
    referenceNumber: "POS-1002",
    partyName: "Walk-in Customer",
    returnDate: "2026-07-29",
    description: "POS return",
    totalAmount: "1240.00",
    refundedAmount: "1240.00",
    sourcePaidAmount: "3720.00",
    sourceTotalBefore: "3720.00",
    sourceTotalAfter: "2480.00",
    refundDue: "0.00",
    balanceDue: "0.00",
    status: "completed",
    lines: [
      {
        id: 1,
        sourceLineId: 1,
        productName: "Frozen Chicken 10kg",
        quantity: 1,
        maxQuantity: 3,
        unitPrice: "1240.00",
        lineTotal: "1240.00",
      },
    ],
  },
  {
    id: 3,
    returnNumber: "RET-1003",
    type: "sales",
    sourceId: 7,
    referenceNumber: "INV-1006",
    partyName: "Acme Retail Co.",
    returnDate: "2026-08-01",
    description: "Wrong item shipped",
    totalAmount: "3200.00",
    refundedAmount: "3200.00",
    sourcePaidAmount: "18600.00",
    sourceTotalBefore: "18600.00",
    sourceTotalAfter: "15400.00",
    refundDue: "0.00",
    balanceDue: "0.00",
    status: "completed",
    lines: [
      {
        id: 1,
        sourceLineId: 1,
        productName: "Premium Basmati Rice 25kg",
        quantity: 1,
        maxQuantity: 4,
        unitPrice: "3200.00",
        lineTotal: "3200.00",
      },
    ],
  },
]

export const EMPTY_RETURN_LINE: ReturnLineRow = {
  id: 1,
  sourceLineId: 1,
  productName: "",
  quantity: 1,
  maxQuantity: 1,
  unitPrice: "0",
  lineTotal: "0.00",
}

export const EMPTY_RETURN: ReturnRow = {
  id: 0,
  returnNumber: "",
  type: "sales",
  sourceId: 0,
  referenceNumber: "—",
  partyName: "—",
  returnDate: new Date().toISOString().slice(0, 10),
  description: "—",
  totalAmount: "0.00",
  refundedAmount: "0.00",
  sourcePaidAmount: "0.00",
  sourceTotalBefore: "0.00",
  sourceTotalAfter: "0.00",
  refundDue: "0.00",
  balanceDue: "0.00",
  status: "pending",
  lines: [{ ...EMPTY_RETURN_LINE }],
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

export function computeReturnTotal(lines: Pick<ReturnLineRow, "lineTotal">[]): string {
  const sum = lines.reduce((acc, line) => {
    const n = Number(line.lineTotal)
    return acc + (Number.isFinite(n) ? n : 0)
  }, 0)
  return sum.toFixed(2)
}

export function computePaymentImpact(
  paidAmount: string,
  totalBefore: string,
  returnAmount: string
) {
  const paid = Number(paidAmount)
  const before = Number(totalBefore)
  const returned = Number(returnAmount)
  const safePaid = Number.isFinite(paid) ? paid : 0
  const safeBefore = Number.isFinite(before) ? before : 0
  const safeReturned = Number.isFinite(returned) ? returned : 0
  const totalAfter = Math.max(0, safeBefore - safeReturned)
  const refundDue = Math.max(0, safePaid - totalAfter)
  const balanceDue = Math.max(0, totalAfter - safePaid)
  return {
    sourceTotalAfter: totalAfter.toFixed(2),
    refundDue: refundDue.toFixed(2),
    balanceDue: balanceDue.toFixed(2),
  }
}

export function nextReturnNumber(
  existing: ReturnRow[],
  type: ReturnRow["type"]
): string {
  const key = type === "sales" ? "salesReturns" : "purchaseReturns"
  const settings = loadDocumentNumberSettings()[key]
  return nextDocumentNumber(
    existing.filter((row) => row.type === type).map((row) => row.returnNumber),
    settings.prefix,
    DEFAULT_DOCUMENT_NUMBER_SETTINGS[key].prefix
  )
}

export function parseReturnType(raw: string): ReturnRow["type"] {
  const value = raw.trim().toLowerCase()
  if (value === "purchase" || value === "purchases" || value === "vendor") {
    return "purchase"
  }
  return "sales"
}

export function parseReturnStatus(raw: string): ReturnRow["status"] {
  const statusRaw = raw.toLowerCase().replace(/\s+/g, "_")
  if (statusRaw === "completed") return "completed"
  if (statusRaw === "cancelled" || statusRaw === "canceled") return "cancelled"
  return "pending"
}

function importedReturnLine(row: Record<string, string>, id: number): ReturnLineRow {
  const productName = (row.productName ?? row.product ?? row.product_name ?? "").trim()
  const quantity = Number(row.quantity ?? row.qty) || 1
  const unitPrice = parseMoney(
    String(row.unitPrice ?? row.unit_price ?? row.rate ?? "0")
  )
  const lineTotal = computeLineTotal(quantity, unitPrice)
  return {
    id,
    sourceLineId: Number(row.sourceLineId ?? row.source_line_id) || 0,
    productName: productName || "Imported item",
    quantity,
    maxQuantity: quantity,
    unitPrice,
    lineTotal,
  }
}

function uniqueReturnNumber(
  desired: string,
  type: ReturnRow["type"],
  existing: ReturnRow[]
): string {
  if (!desired) return nextReturnNumber(existing, type)
  if (!existing.some((row) => row.returnNumber === desired)) return desired
  return nextReturnNumber(existing, type)
}

export function mapImportedReturn(
  row: Record<string, string>,
  existing: ReturnRow[]
): ReturnRow | null {
  const maxId = existing.reduce((m, x) => Math.max(m, x.id), 0)
  const type = parseReturnType(row.type ?? row.returnType ?? "")
  const partyName = (
    row.partyName ??
    row.party ??
    row.customerName ??
    row.vendorName ??
    ""
  ).trim()
  const returnNumber = (row.returnNumber ?? row.return_number ?? "").trim()
  const referenceNumber = (
    row.referenceNumber ??
    row.reference ??
    row.invoiceNumber ??
    row.purchaseNumber ??
    ""
  ).trim()
  if (!partyName && !returnNumber && !referenceNumber) return null

  const line = importedReturnLine(row, 1)
  const totalAmount = parseMoney(
    String(row.totalAmount ?? row.total_amount ?? row.total ?? line.lineTotal)
  )
  const status = parseReturnStatus(row.status ?? "pending")
  const impact = computePaymentImpact("0", totalAmount, totalAmount)

  return {
    id: maxId + 1,
    returnNumber: uniqueReturnNumber(
      returnNumber || nextReturnNumber(existing, type),
      type,
      existing
    ),
    type,
    sourceId: Number(row.sourceId ?? row.source_id) || 0,
    referenceNumber: referenceNumber || "—",
    partyName: partyName || "—",
    returnDate:
      (row.returnDate ?? row.return_date ?? row.date ?? "").trim() ||
      new Date().toISOString().slice(0, 10),
    description: (row.description ?? row.desc ?? row.notes ?? "").trim() || "—",
    totalAmount,
    refundedAmount: parseMoney(String(row.refundedAmount ?? row.refunded ?? "0")),
    sourcePaidAmount: "0.00",
    sourceTotalBefore: totalAmount,
    sourceTotalAfter: impact.sourceTotalAfter,
    refundDue: status === "completed" ? "0.00" : totalAmount,
    balanceDue: impact.balanceDue,
    status,
    lines: [line],
  }
}

export function flattenReturnForExport(
  row: ReturnRow
): Record<string, unknown>[] {
  const lines = row.lines?.length
    ? row.lines
    : [{ productName: "", quantity: 1, unitPrice: "0.00" }]
  return lines.map((line) => ({
    returnNumber: row.returnNumber,
    type: row.type,
    referenceNumber: row.referenceNumber,
    partyName: row.partyName,
    returnDate: row.returnDate,
    productName: line.productName,
    quantity: line.quantity,
    unitPrice: line.unitPrice,
    status: row.status,
    description: row.description === "—" ? "" : row.description,
  }))
}

export function importReturnsFromRows(
  rows: Record<string, string>[],
  existing: ReturnRow[]
): ReturnRow[] {
  const groups = new Map<string, Record<string, string>[]>()
  const orphans: Record<string, string>[] = []

  for (const row of rows) {
    const returnNumber = (row.returnNumber ?? row.return_number ?? "").trim()
    if (!returnNumber) {
      orphans.push(row)
      continue
    }
    const list = groups.get(returnNumber) ?? []
    list.push(row)
    groups.set(returnNumber, list)
  }

  const created: ReturnRow[] = []
  let acc = [...existing]

  const push = (mapped: ReturnRow | null) => {
    if (!mapped) return
    acc = [...acc, mapped]
    created.push(mapped)
  }

  for (const group of groups.values()) {
    const header = mapImportedReturn(group[0], acc)
    if (!header) continue
    header.lines = group.map((row, index) => importedReturnLine(row, index + 1))
    header.totalAmount = computeReturnTotal(header.lines)
    if (header.status !== "completed") header.refundDue = header.totalAmount
    push(header)
  }

  for (const row of orphans) {
    push(mapImportedReturn(row, acc))
  }

  return created
}

export function buildReturnFromOrder(
  order: OrderRow,
  options?: { lineIds?: number[]; quantities?: Record<number, number> }
): Omit<ReturnRow, "id"> {
  const lineFilter = options?.lineIds?.length
    ? (line: OrderRow["lines"][number]) => options.lineIds!.includes(line.id)
    : () => true

  const lines: ReturnLineRow[] = (order.lines ?? [])
    .filter(lineFilter)
    .map((line, index) => {
      const requested = options?.quantities?.[line.id] ?? line.quantity
      const quantity = Math.min(Math.max(1, requested), line.quantity)
      return {
        id: index + 1,
        sourceLineId: line.id,
        productName: line.productName,
        quantity,
        maxQuantity: line.quantity,
        unitPrice: line.unitPrice,
        lineTotal: computeLineTotal(quantity, line.unitPrice),
      }
    })

  const totalAmount = computeReturnTotal(lines)
  const impact = computePaymentImpact(order.paidAmount, order.totalAmount, totalAmount)

  return {
    returnNumber: "",
    type: "sales",
    sourceId: order.id,
    referenceNumber: order.invoiceNumber,
    partyName: order.customerName,
    returnDate: new Date().toISOString().slice(0, 10),
    description: "—",
    totalAmount,
    refundedAmount: impact.refundDue,
    sourcePaidAmount: order.paidAmount,
    sourceTotalBefore: order.totalAmount,
    sourceTotalAfter: impact.sourceTotalAfter,
    refundDue: impact.refundDue,
    balanceDue: impact.balanceDue,
    status: "pending",
    lines: lines.length > 0 ? lines : [{ ...EMPTY_RETURN_LINE }],
  }
}

export function buildPosReturnFromCart(
  cart: PosCartLine[],
  options: {
    customerName: string
    returnNumber: string
    returnDate?: string
    discountAmount?: string
    status?: ReturnRow["status"]
  }
): Omit<ReturnRow, "id"> {
  const productLines: ReturnLineRow[] = cart.map((line, index) => {
    const lineTotal = cartLineTotal(line)
    const effectiveUnitPrice =
      line.quantity > 0
        ? (Number(lineTotal) / line.quantity).toFixed(2)
        : line.unitPrice

    return {
      id: index + 1,
      sourceLineId: index + 1,
      productName: line.productName,
      quantity: line.quantity,
      maxQuantity: line.quantity,
      unitPrice: effectiveUnitPrice,
      lineTotal,
    }
  })

  const subtotal = computeReturnTotal(productLines)
  const discount = normalizeDiscountAmount(subtotal, options.discountAmount ?? "0")

  const lines =
    Number(discount) > 0
      ? [
          ...productLines,
          {
            id: productLines.length + 1,
            sourceLineId: productLines.length + 1,
            productName: POS_DISCOUNT_LINE_NAME,
            quantity: 1,
            maxQuantity: 1,
            unitPrice: `-${discount}`,
            lineTotal: `-${discount}`,
          },
        ]
      : productLines

  const totalAmount = computeReturnTotal(lines)

  const description =
    Number(discount) > 0
      ? `${POS_RETURN_DESCRIPTION} · Discount ${discount}`
      : POS_RETURN_DESCRIPTION

  const status = options.status ?? "completed"

  return {
    returnNumber: options.returnNumber,
    type: "sales",
    sourceId: 0,
    referenceNumber: options.returnNumber,
    partyName: options.customerName.trim() || "Walk-in",
    returnDate: options.returnDate ?? new Date().toISOString().slice(0, 10),
    description,
    totalAmount,
    refundedAmount: status === "completed" ? totalAmount : "0.00",
    sourcePaidAmount: "0.00",
    sourceTotalBefore: "0.00",
    sourceTotalAfter: "0.00",
    refundDue: totalAmount,
    balanceDue: "0.00",
    status,
    lines: lines.length > 0 ? lines : [{ ...EMPTY_RETURN_LINE }],
  }
}

export function buildReturnFromPurchase(
  purchase: PurchaseRow,
  options?: { lineIds?: number[] }
): Omit<ReturnRow, "id"> {
  const lineFilter = options?.lineIds?.length
    ? (line: PurchaseRow["lines"][number]) => options.lineIds!.includes(line.id)
    : () => true

  const lines: ReturnLineRow[] = (purchase.lines ?? [])
    .filter(lineFilter)
    .map((line, index) => ({
      id: index + 1,
      sourceLineId: line.id,
      productName: line.productName,
      quantity: line.quantity,
      maxQuantity: line.quantity,
      unitPrice: line.unitPrice,
      lineTotal: line.lineTotal,
    }))

  const totalAmount = computeReturnTotal(lines)
  const impact = computePaymentImpact(
    purchase.paidAmount,
    purchase.totalAmount,
    totalAmount
  )

  return {
    returnNumber: "",
    type: "purchase",
    sourceId: purchase.id,
    referenceNumber: purchase.purchaseNumber,
    partyName: purchase.vendorName,
    returnDate: new Date().toISOString().slice(0, 10),
    description: "—",
    totalAmount,
    refundedAmount: impact.refundDue,
    sourcePaidAmount: purchase.paidAmount,
    sourceTotalBefore: purchase.totalAmount,
    sourceTotalAfter: impact.sourceTotalAfter,
    refundDue: impact.refundDue,
    balanceDue: impact.balanceDue,
    status: "pending",
    lines: lines.length > 0 ? lines : [{ ...EMPTY_RETURN_LINE }],
  }
}

export function applyReturnToOrder(order: OrderRow, returnDoc: ReturnRow): OrderRow {
  const returnByLineId = new Map(
    returnDoc.lines.map((line) => [line.sourceLineId, line.quantity])
  )

  const nextLines = (order.lines ?? [])
    .map((line) => {
      const returnQty = returnByLineId.get(line.id) ?? 0
      if (returnQty <= 0) return line
      const newQty = line.quantity - returnQty
      if (newQty <= 0) return null
      return {
        ...line,
        quantity: newQty,
        lineTotal: computeLineTotal(newQty, line.unitPrice),
      }
    })
    .filter((line): line is OrderRow["lines"][number] => line !== null)

  const lines =
    nextLines.length > 0
      ? nextLines
      : [
          {
            id: 1,
            productName: ALL_ITEMS_RETURNED_NAME,
            quantity: 1,
            unitPrice: "0",
            lineTotal: "0.00",
          },
        ]

  const totalAmount = computeOrderTotal(lines)
  const paid = Number(order.paidAmount)
  const safePaid = Number.isFinite(paid) ? paid : 0
  const nextTotal = Number(totalAmount)
  const paidAmount = Math.min(safePaid, nextTotal).toFixed(2)

  return {
    ...order,
    totalAmount,
    paidAmount,
    lines,
  }
}

export function applyReturnToPurchase(
  purchase: PurchaseRow,
  returnDoc: ReturnRow
): PurchaseRow {
  const returnByLineId = new Map(
    returnDoc.lines.map((line) => [line.sourceLineId, line.quantity])
  )

  const nextLines = (purchase.lines ?? [])
    .map((line) => {
      const returnQty = returnByLineId.get(line.id) ?? 0
      if (returnQty <= 0) return line
      const newQty = line.quantity - returnQty
      if (newQty <= 0) return null
      return {
        ...line,
        quantity: newQty,
        lineTotal: computeLineTotal(newQty, line.unitPrice),
      }
    })
    .filter((line): line is PurchaseRow["lines"][number] => line !== null)

  const lines =
    nextLines.length > 0
      ? nextLines
      : [
          {
            id: 1,
            productName: ALL_ITEMS_RETURNED_NAME,
            quantity: 1,
            unitPrice: "0",
            lineTotal: "0.00",
          },
        ]

  return {
    ...purchase,
    totalAmount: computePurchaseTotal(lines),
    lines,
  }
}

export function returnFromFormData(fd: FormData, id: number): ReturnRow {
  const type = (String(fd.get("type") ?? "sales") as ReturnRow["type"]) || "sales"
  const lines: ReturnLineRow[] = []
  let lineIndex = 0

  while (fd.has(`lines[${lineIndex}].productName`)) {
    const quantity = Number(fd.get(`lines[${lineIndex}].quantity`)) || 1
    const unitPrice = parseMoney(String(fd.get(`lines[${lineIndex}].unitPrice`) ?? "0"))
    const maxQuantity =
      Number(fd.get(`lines[${lineIndex}].maxQuantity`)) || quantity
    lines.push({
      id: Number(fd.get(`lines[${lineIndex}].id`)) || lineIndex + 1,
      sourceLineId: Number(fd.get(`lines[${lineIndex}].sourceLineId`)) || lineIndex + 1,
      productName: String(fd.get(`lines[${lineIndex}].productName`) ?? "").trim(),
      quantity,
      maxQuantity,
      unitPrice,
      lineTotal: computeLineTotal(quantity, unitPrice),
    })
    lineIndex++
  }

  const totalAmount = computeReturnTotal(lines)
  const sourcePaidAmount = parseMoney(String(fd.get("sourcePaidAmount") ?? "0"))
  const sourceTotalBefore = parseMoney(String(fd.get("sourceTotalBefore") ?? "0"))
  const refundedAmount = parseMoney(String(fd.get("refundedAmount") ?? "0"))
  const impact = computePaymentImpact(sourcePaidAmount, sourceTotalBefore, totalAmount)

  return {
    id,
    returnNumber: String(fd.get("returnNumber") ?? "").trim(),
    type,
    sourceId: Number(fd.get("sourceId")) || 0,
    referenceNumber: String(fd.get("referenceNumber") ?? "—").trim(),
    partyName: String(fd.get("partyName") ?? "—").trim(),
    returnDate:
      String(fd.get("returnDate") ?? "").trim() ||
      new Date().toISOString().slice(0, 10),
    description: String(fd.get("description") ?? "").trim() || "—",
    totalAmount,
    refundedAmount: refundedAmount || impact.refundDue,
    sourcePaidAmount,
    sourceTotalBefore,
    sourceTotalAfter: impact.sourceTotalAfter,
    refundDue: impact.refundDue,
    balanceDue: impact.balanceDue,
    status: (String(fd.get("status") ?? "pending") as ReturnRow["status"]) || "pending",
    lines: lines.length > 0 ? lines : [{ ...EMPTY_RETURN_LINE }],
  }
}

export function parsePersistedReturns(raw: string | null): ReturnRow[] | null {
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as unknown
    const result = z.array(returnSchema).safeParse(parsed)
    return result.success ? result.data : null
  } catch {
    return null
  }
}

export function returnsForCustomer(
  returns: ReturnRow[],
  customerName: string
): ReturnRow[] {
  const normalized = customerName.trim().toLowerCase()
  if (!normalized || normalized === "—") return []

  return returns
    .filter(
      (doc) =>
        doc.type === "sales" &&
        doc.status !== "cancelled" &&
        doc.partyName.trim().toLowerCase() === normalized
    )
    .sort((a, b) => b.returnDate.localeCompare(a.returnDate) || b.id - a.id)
}

export function returnsForVendor(
  returns: ReturnRow[],
  vendorName: string
): ReturnRow[] {
  const normalized = vendorName.trim().toLowerCase()
  if (!normalized || normalized === "—") return []

  return returns
    .filter(
      (doc) =>
        doc.type === "purchase" &&
        doc.status !== "cancelled" &&
        doc.partyName.trim().toLowerCase() === normalized
    )
    .sort((a, b) => b.returnDate.localeCompare(a.returnDate) || b.id - a.id)
}
