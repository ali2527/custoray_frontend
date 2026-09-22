import { parseMoney, type CustomerRow } from "@/lib/customers"
import {
  computeBalance,
  computeLineTotal,
  nextInvoiceNumber,
  ordersForCustomer,
  type OrderRow,
} from "@/lib/orders"
import { type PurchaseRow } from "@/lib/purchases"
import {
  nextReturnNumber,
  returnsForCustomer,
  type ReturnRow,
} from "@/lib/returns"

export const TIMELINE_KIND_OPTIONS = ["invoice", "purchase", "return"] as const
export const TIMELINE_STATUS_OPTIONS = ["pending", "completed", "cancelled"] as const

export type TimelineKind = (typeof TIMELINE_KIND_OPTIONS)[number]
export type TimelineStatus = (typeof TIMELINE_STATUS_OPTIONS)[number]

export const TIMELINE_IMPORT_COLUMNS = [
  "date",
  "type",
  "number",
  "amount",
  "status",
] as const

export const TIMELINE_IMPORT_SAMPLE_ROW = {
  date: "2026-09-15",
  type: "invoice",
  number: "INV-3001",
  amount: "15000.00",
  status: "completed",
}

export type CustomerTimelineRow = {
  id: string
  kind: TimelineKind
  date: string
  number: string
  amount: string
  paid: string
  balance: string
  runningBalance: string
  details: string
  reference: string
  status: string
  order?: OrderRow
  purchase?: PurchaseRow
  returnDoc?: ReturnRow
}

export type ImportedTimelineEntry =
  | { kind: "invoice"; order: OrderRow }
  | { kind: "return"; returnDoc: ReturnRow }

export function parseImportedTimelineKind(
  raw: string | undefined
): TimelineKind | "" {
  const value = (raw ?? "").trim().toLowerCase().replace(/\s+/g, "_")
  if (!value) return ""
  if (
    value === "invoice" ||
    value === "sale" ||
    value === "sales" ||
    value === "inv"
  ) {
    return "invoice"
  }
  if (
    value === "purchase" ||
    value === "po" ||
    value === "bill" ||
    value === "purchases"
  ) {
    return "purchase"
  }
  if (
    value === "return" ||
    value === "sales_return" ||
    value === "purchase_return" ||
    value === "refund" ||
    value === "ret" ||
    value === "pr"
  ) {
    return "return"
  }
  return ""
}

export function parseImportedTimelineStatus(
  raw: string | undefined
): TimelineStatus | "" {
  const value = (raw ?? "").trim().toLowerCase().replace(/\s+/g, "_")
  if (!value) return ""
  if (value === "completed" || value === "complete" || value === "paid") {
    return "completed"
  }
  if (value === "pending") return "pending"
  if (value === "cancelled" || value === "canceled") return "cancelled"
  return ""
}

export function parseImportedTimelineDate(raw: string | undefined): string {
  const value = (raw ?? "").trim()
  if (!value) return new Date().toISOString().slice(0, 10)
  const iso = value.match(/^(\d{4}-\d{2}-\d{2})/)
  if (iso) return iso[1]
  const parsed = new Date(value)
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10)
  }
  return ""
}

function blankText(value: string | undefined): string {
  const next = (value ?? "").trim()
  if (!next || next === "—") return ""
  return next
}

function itemSummary(
  lines: { productName: string }[],
  extra?: string
): string {
  const names = lines
    .map((line) => line.productName.trim())
    .filter(Boolean)
    .slice(0, 2)
  const fromLines = names.join(", ")
  return blankText(extra) || fromLines
}

export function buildCustomerTimelineRows(
  customer: Pick<CustomerRow, "name">,
  orders: OrderRow[],
  returns: ReturnRow[]
): CustomerTimelineRow[] {
  const invoices: CustomerTimelineRow[] = ordersForCustomer(
    orders,
    customer.name
  ).map((order) => ({
    id: `invoice-${order.id}`,
    kind: "invoice" as const,
    date: order.orderDate,
    number: order.invoiceNumber,
    amount: order.totalAmount,
    paid: order.paidAmount,
    balance: computeBalance(order),
    runningBalance: "0.00",
    details: itemSummary(order.lines, order.description),
    reference: "",
    status: order.status,
    order,
  }))
  const returnRows: CustomerTimelineRow[] = returnsForCustomer(
    returns,
    customer.name
  ).map((doc) => ({
    id: `return-${doc.id}`,
    kind: "return" as const,
    date: doc.returnDate,
    number: doc.returnNumber,
    amount: doc.totalAmount,
    paid: doc.refundedAmount,
    balance: "0.00",
    runningBalance: "0.00",
    details: itemSummary(doc.lines, doc.description),
    reference: blankText(doc.referenceNumber),
    status: doc.status,
    returnDoc: doc,
  }))

  const chronological = [...invoices, ...returnRows].sort(
    (a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id)
  )
  let running = 0
  for (const row of chronological) {
    if (row.status !== "cancelled") {
      if (row.kind === "invoice") running += Number(row.balance) || 0
      else running -= Number(row.amount) || 0
    }
    row.runningBalance = running.toFixed(2)
  }
  return chronological.reverse()
}

export function mapImportedTimelineEntry(
  row: Record<string, string>,
  customerName: string,
  orders: OrderRow[],
  returns: ReturnRow[]
): ImportedTimelineEntry | null {
  const name = customerName.trim()
  if (!name) return null

  const kindRaw = (row.type ?? row.kind ?? "").trim()
  const parsedKind = parseImportedTimelineKind(kindRaw)
  if (kindRaw && !parsedKind) return null
  if (parsedKind === "purchase") return null
  const kind = parsedKind || "invoice"

  const statusRaw = (row.status ?? "").trim()
  const parsedStatus = parseImportedTimelineStatus(statusRaw)
  if (statusRaw && !parsedStatus) return null
  const status = parsedStatus || "completed"

  const date = parseImportedTimelineDate(row.date ?? row.orderDate ?? row.returnDate)
  if (!date) return null

  const amountRaw = (row.amount ?? row.totalAmount ?? row.total ?? "").trim()
  if (!amountRaw) return null
  const amount = parseMoney(amountRaw)
  if (Number(amount) < 0) return null

  const number = (
    row.number ??
    row.invoiceNumber ??
    row.returnNumber ??
    ""
  ).trim()

  if (kind === "invoice") {
    const id = orders.reduce((max, item) => Math.max(max, item.id), 0) + 1
    const paidAmount = status === "completed" ? amount : "0.00"
    return {
      kind,
      order: {
        id,
        invoiceNumber: number || nextInvoiceNumber(orders),
        customerName: name,
        description: (row.description ?? "").trim() || "Imported",
        orderDate: date,
        totalAmount: amount,
        paidAmount,
        paymentMethod: "Cash",
        status,
        lines: [
          {
            id: 1,
            productName: "Imported item",
            quantity: 1,
            unitPrice: amount,
            lineTotal: computeLineTotal(1, amount),
          },
        ],
      },
    }
  }

  const id = returns.reduce((max, item) => Math.max(max, item.id), 0) + 1
  const refundedAmount = status === "completed" ? amount : "0.00"
  return {
    kind,
    returnDoc: {
      id,
      returnNumber: number || nextReturnNumber(returns, "sales"),
      type: "sales",
      sourceId: 0,
      referenceNumber: (row.reference ?? row.referenceNumber ?? "").trim() || "—",
      partyName: name,
      returnDate: date,
      description: (row.description ?? "").trim() || "Imported",
      totalAmount: amount,
      refundedAmount,
      sourcePaidAmount: amount,
      sourceTotalBefore: amount,
      sourceTotalAfter: "0.00",
      refundDue: "0.00",
      balanceDue: "0.00",
      status,
      lines: [
        {
          id: 1,
          sourceLineId: 1,
          productName: "Imported item",
          quantity: 1,
          maxQuantity: 1,
          unitPrice: amount,
          lineTotal: computeLineTotal(1, amount),
        },
      ],
    },
  }
}

export function applyImportedTimelineRows(
  rows: Record<string, string>[],
  customerName: string,
  orders: OrderRow[],
  returns: ReturnRow[]
): {
  orders: OrderRow[]
  returns: ReturnRow[]
  added: number
  failed: number
} {
  let nextOrders = [...orders]
  let nextReturns = [...returns]
  let added = 0
  let failed = 0

  for (const row of rows) {
    const mapped = mapImportedTimelineEntry(
      row,
      customerName,
      nextOrders,
      nextReturns
    )
    if (!mapped) {
      failed += 1
      continue
    }
    if (mapped.kind === "invoice") {
      nextOrders = [...nextOrders, mapped.order]
    } else {
      nextReturns = [...nextReturns, mapped.returnDoc]
    }
    added += 1
  }

  return { orders: nextOrders, returns: nextReturns, added, failed }
}

export function timelineMonthKey(date: string): string {
  return date.slice(0, 7)
}

export function formatTimelineMonthLabel(ym: string, locale = "en"): string {
  const year = Number(ym.slice(0, 4))
  const month = Number(ym.slice(5, 7))
  if (!year || !month) return ym
  return new Intl.DateTimeFormat(locale, {
    month: "long",
    year: "numeric",
  }).format(new Date(year, month - 1, 1))
}

export type TimelineFilters = {
  month?: string
  kind?: string
  status?: string
  search?: string
}

export function filterTimelineRows(
  rows: CustomerTimelineRow[],
  filters: TimelineFilters = {}
): CustomerTimelineRow[] {
  const month = (filters.month ?? "all").trim() || "all"
  const kind = (filters.kind ?? "all").trim() || "all"
  const status = (filters.status ?? "all").trim() || "all"
  const query = (filters.search ?? "").trim().toLowerCase()
  return rows.filter((row) => {
    if (month !== "all" && timelineMonthKey(row.date) !== month) return false
    if (kind !== "all" && row.kind !== kind) return false
    if (status !== "all" && row.status !== status) return false
    if (!query) return true
    return [row.number, row.details, row.reference, row.kind, row.status].some(
      (value) => String(value).toLowerCase().includes(query)
    )
  })
}

export type TimelineTotals = {
  total: string
  credit: string
  remaining: string
  balance: string
}

function totalsFromRows(rows: CustomerTimelineRow[]): Omit<TimelineTotals, "balance"> {
  let billed = 0
  let paid = 0
  let credits = 0
  let remaining = 0
  for (const row of rows) {
    if (row.status === "cancelled") continue
    if (row.kind === "return") {
      credits += Number(row.amount) || 0
    } else {
      billed += Number(row.amount) || 0
      paid += Number(row.paid) || 0
      remaining += Number(row.balance) || 0
    }
  }
  return {
    total: billed.toFixed(2),
    credit: (paid + credits).toFixed(2),
    remaining: remaining.toFixed(2),
  }
}

export function summarizeTimeline(rows: CustomerTimelineRow[]): TimelineTotals {
  const base = totalsFromRows(rows)
  const chronological = [...rows].sort(
    (a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id)
  )
  return {
    ...base,
    balance: chronological[chronological.length - 1]?.runningBalance ?? "0.00",
  }
}

export type TimelineMonthGroup = TimelineTotals & {
  month: string
  rows: CustomerTimelineRow[]
}

export function groupTimelineByMonth(
  rows: CustomerTimelineRow[]
): TimelineMonthGroup[] {
  const buckets = new Map<string, CustomerTimelineRow[]>()
  for (const row of rows) {
    const key = timelineMonthKey(row.date) || "unknown"
    const current = buckets.get(key) ?? []
    current.push(row)
    buckets.set(key, current)
  }
  return [...buckets.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([month, monthRows]) => ({
      month,
      rows: monthRows,
      ...summarizeTimeline(monthRows),
    }))
}

export function listTimelineMonths(rows: CustomerTimelineRow[]): string[] {
  return [
    ...new Set(
      rows.map((row) => timelineMonthKey(row.date)).filter((key) => key.length === 7)
    ),
  ].sort((a, b) => b.localeCompare(a))
}

export function timelineDateBounds(rows: CustomerTimelineRow[]): {
  minDate: string
  maxDate: string
  minMonth: string
  maxMonth: string
} {
  let minDate = ""
  let maxDate = ""
  for (const row of rows) {
    const day = row.date.slice(0, 10)
    if (day.length < 10) continue
    if (!minDate || day < minDate) minDate = day
    if (!maxDate || day > maxDate) maxDate = day
  }
  return {
    minDate,
    maxDate,
    minMonth: minDate.slice(0, 7),
    maxMonth: maxDate.slice(0, 7),
  }
}

export type TimelineExportRange =
  | { mode: "all" }
  | { mode: "month"; from: string; to: string }
  | { mode: "date"; from: string; to: string }

export function filterTimelineExportRange(
  rows: CustomerTimelineRow[],
  range: TimelineExportRange
): CustomerTimelineRow[] {
  if (range.mode === "all") return rows
  const from = (range.from ?? "").trim()
  const to = (range.to ?? "").trim()
  if (!from && !to) return rows
  const start = !to || from <= to ? from : to
  const end = !from || from <= to ? to : from
  return rows.filter((row) => {
    const value =
      range.mode === "month" ? timelineMonthKey(row.date) : row.date.slice(0, 10)
    if (start && value < start) return false
    if (end && value > end) return false
    return true
  })
}

export function timelineExportRows(
  rows: CustomerTimelineRow[]
): Record<string, unknown>[] {
  return rows.map((row) => ({
    date: row.date,
    type: row.kind,
    number: row.number,
    details: row.details,
    reference: row.reference,
    amount: row.amount,
    paid: row.paid,
    due: row.balance,
    running: row.runningBalance,
    status: row.status,
    month: timelineMonthKey(row.date),
  }))
}
