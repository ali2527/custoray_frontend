import { z } from "zod"

import { customerDisplayId, formatMoney, type CustomerRow } from "@/lib/customers"
import { computeLineTotal, type OrderRow } from "@/lib/orders"
import { ALL_ITEMS_RETURNED_NAME } from "@/lib/return-eligibility"
import { type ReturnRow } from "@/lib/returns"

export { formatMoney }

export const customerRecordLineSchema = z.object({
  productName: z.string(),
  quantity: z.number(),
  unitPrice: z.string(),
  lineTotal: z.string(),
})

export type CustomerRecordLine = z.infer<typeof customerRecordLineSchema>

export const customerRecordInvoiceSchema = z.object({
  id: z.number(),
  invoiceNumber: z.string(),
  orderDate: z.string(),
  totalAmount: z.string(),
  lines: z.array(customerRecordLineSchema),
})

export type CustomerRecordInvoice = z.infer<typeof customerRecordInvoiceSchema>

export const customerRecordReturnSchema = z.object({
  id: z.number(),
  returnNumber: z.string(),
  returnDate: z.string(),
  referenceNumber: z.string(),
  totalAmount: z.string(),
  lines: z.array(customerRecordLineSchema),
})

export type CustomerRecordReturnDoc = z.infer<typeof customerRecordReturnSchema>

export const customerRecordMonthSchema = z.object({
  yearMonth: z.string(),
  title: z.string(),
  opening: z.string(),
  invoices: z.array(customerRecordInvoiceSchema),
  returns: z.array(customerRecordReturnSchema),
  invoiceTotal: z.string(),
  returnTotal: z.string(),
  closing: z.string(),
})

export type CustomerRecordMonth = z.infer<typeof customerRecordMonthSchema>

export const customerRecordSchema = z.object({
  asOf: z.string(),
  customer: z.object({
    id: z.number(),
    code: z.string().optional(),
    name: z.string(),
    phone: z.string(),
    description: z.string(),
  }),
  months: z.array(customerRecordMonthSchema),
  totals: z.object({
    opening: z.string(),
    invoiceTotal: z.string(),
    returnTotal: z.string(),
    closing: z.string(),
  }),
})

export type CustomerRecord = z.infer<typeof customerRecordSchema>

function toAmount(value: string): number {
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

function money(value: number): string {
  return value.toFixed(2)
}

function sameParty(a: string, b: string): boolean {
  const left = a.trim().toLowerCase()
  const right = b.trim().toLowerCase()
  if (!left || !right || left === "—" || right === "—") return false
  return left === right
}

function yearMonth(date: string): string {
  return date.slice(0, 7)
}

function lastDayOfMonth(ym: string): number {
  const y = Number(ym.slice(0, 4))
  const m = Number(ym.slice(5, 7))
  return new Date(y, m, 0).getDate()
}

function formatMonthHeading(ym: string): string {
  const y = Number(ym.slice(0, 4))
  const m = Number(ym.slice(5, 7))
  return new Intl.DateTimeFormat("en-GB", {
    month: "long",
    year: "numeric",
  }).format(new Date(y, m - 1, 1))
}

function formatThrough(asOf: string): string {
  const date = new Date(`${asOf}T00:00:00`)
  if (Number.isNaN(date.getTime())) return asOf
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
  }).format(date)
}

function monthTitle(ym: string, asOf: string, isLast: boolean): string {
  const heading = formatMonthHeading(ym)
  const asOfMonth = yearMonth(asOf)
  if (!isLast || asOfMonth !== ym) return heading
  const asOfDay = Number(asOf.slice(8, 10))
  if (!Number.isFinite(asOfDay) || asOfDay >= lastDayOfMonth(ym)) return heading
  return `${heading} (through ${formatThrough(asOf)})`
}

export function todayIsoDate(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

function relatedSalesReturns(order: OrderRow, returns: ReturnRow[]): ReturnRow[] {
  return returns.filter(
    (doc) =>
      doc.type === "sales" &&
      doc.sourceId === order.id &&
      doc.status !== "cancelled"
  )
}

function mapInvoice(
  order: OrderRow,
  relatedReturns: ReturnRow[] = []
): CustomerRecordInvoice {
  const lineMap = new Map<
    number,
    { productName: string; quantity: number; unitPrice: string }
  >()

  for (const line of order.lines) {
    if (line.productName === ALL_ITEMS_RETURNED_NAME) continue
    lineMap.set(line.id, {
      productName: line.productName,
      quantity: line.quantity,
      unitPrice: line.unitPrice,
    })
  }

  for (const doc of relatedReturns) {
    for (const line of doc.lines) {
      const existing = lineMap.get(line.sourceLineId)
      if (existing) {
        existing.quantity += line.quantity
      } else {
        lineMap.set(line.sourceLineId || line.id, {
          productName: line.productName,
          quantity: line.quantity,
          unitPrice: line.unitPrice,
        })
      }
    }
  }

  const lines = Array.from(lineMap.values()).map((line) => ({
    productName: line.productName,
    quantity: line.quantity,
    unitPrice: money(toAmount(line.unitPrice)),
    lineTotal: money(toAmount(computeLineTotal(line.quantity, line.unitPrice))),
  }))

  const reconstructedTotal = lines.reduce(
    (sum, line) => sum + toAmount(line.lineTotal),
    0
  )
  const fallbackTotal =
    toAmount(order.totalAmount) +
    relatedReturns.reduce((sum, doc) => sum + toAmount(doc.totalAmount), 0)

  return {
    id: order.id,
    invoiceNumber: order.invoiceNumber,
    orderDate: order.orderDate,
    totalAmount: money(reconstructedTotal > 0 ? reconstructedTotal : fallbackTotal),
    lines,
  }
}

function mapReturn(doc: ReturnRow): CustomerRecordReturnDoc {
  return {
    id: doc.id,
    returnNumber: doc.returnNumber,
    returnDate: doc.returnDate,
    referenceNumber: doc.referenceNumber,
    totalAmount: money(toAmount(doc.totalAmount)),
    lines: doc.lines.map((line) => ({
      productName: line.productName,
      quantity: line.quantity,
      unitPrice: money(toAmount(line.unitPrice)),
      lineTotal: money(toAmount(line.lineTotal)),
    })),
  }
}

export function buildCustomerRecord(
  customer: CustomerRow,
  orders: OrderRow[],
  returns: ReturnRow[],
  asOfDate: string
): CustomerRecord {
  const asOf = asOfDate.slice(0, 10)
  const opening = money(toAmount(customer.openingBalance))

  const invoices = orders
    .filter(
      (order) =>
        order.status !== "cancelled" &&
        order.orderDate <= asOf &&
        sameParty(order.customerName, customer.name)
    )
    .sort((a, b) => a.orderDate.localeCompare(b.orderDate) || a.id - b.id)

  const salesReturns = returns
    .filter(
      (doc) =>
        doc.type === "sales" &&
        doc.status !== "cancelled" &&
        doc.returnDate <= asOf &&
        sameParty(doc.partyName, customer.name)
    )
    .sort((a, b) => a.returnDate.localeCompare(b.returnDate) || a.id - b.id)

  const monthKeys = [
    ...new Set([
      ...invoices.map((order) => yearMonth(order.orderDate)),
      ...salesReturns.map((doc) => yearMonth(doc.returnDate)),
    ]),
  ].sort()

  let running = toAmount(opening)
  const months: CustomerRecordMonth[] = monthKeys.map((ym, index) => {
    const monthInvoices = invoices
      .filter((order) => yearMonth(order.orderDate) === ym)
      .map((order) => mapInvoice(order, relatedSalesReturns(order, salesReturns)))
    const monthReturns = salesReturns
      .filter((doc) => yearMonth(doc.returnDate) === ym)
      .map(mapReturn)
    const invoiceTotal = monthInvoices.reduce(
      (sum, invoice) => sum + toAmount(invoice.totalAmount),
      0
    )
    const returnTotal = monthReturns.reduce(
      (sum, doc) => sum + toAmount(doc.totalAmount),
      0
    )
    const monthOpening = money(running)
    running += invoiceTotal - returnTotal
    return {
      yearMonth: ym,
      title: monthTitle(ym, asOf, index === monthKeys.length - 1),
      opening: monthOpening,
      invoices: monthInvoices,
      returns: monthReturns,
      invoiceTotal: money(invoiceTotal),
      returnTotal: money(returnTotal),
      closing: money(running),
    }
  })

  const invoiceTotal = months.reduce(
    (sum, month) => sum + toAmount(month.invoiceTotal),
    0
  )
  const returnTotal = months.reduce(
    (sum, month) => sum + toAmount(month.returnTotal),
    0
  )

  return {
    asOf,
    customer: {
      id: customer.id,
      code: customerDisplayId(customer),
      name: customer.name,
      phone: customer.phone,
      description: customer.description,
    },
    months,
    totals: {
      opening,
      invoiceTotal: money(invoiceTotal),
      returnTotal: money(returnTotal),
      closing: months.length > 0 ? months[months.length - 1].closing : opening,
    },
  }
}
