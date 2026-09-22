import { formatMoney } from "@/lib/customers"
import { formatDate, type PaymentRow } from "@/lib/payments"
import i18n from "@/i18n"

export type PaymentReportPreset = "this_month" | "last_month" | "custom"

export type PaymentReportDateRange = {
  start: string
  end: string
}

export type PaymentReportFilter = {
  preset: PaymentReportPreset
  start: string
  end: string
}

export type PaymentReportSummary = {
  paymentCount: number
  receivedCount: number
  paidOutCount: number
  received: string
  paidOut: string
  netCashFlow: string
  pendingIn: string
  pendingOut: string
  outstanding: string
  avgReceipt: string
  voidedCount: number
  collectionShare: number
}

export type PaymentReportTrends = {
  receivedChangePct: number | null
  paidOutChangePct: number | null
  netChangePct: number | null
  countChangePct: number | null
  avgReceiptChangePct: number | null
  compareLabel: string | null
}

export type PaymentCashFlowRow = {
  date: string
  label: string
  received: string
  paidOut: string
  net: string
  receivedCount: number
  paidOutCount: number
}

export type PaymentAgingBucket =
  | "0-30 days"
  | "31-60 days"
  | "61-90 days"
  | "90+ days"

export type PaymentAgingRow = {
  bucket: PaymentAgingBucket
  receivable: string
  payable: string
  receivableCount: number
  payableCount: number
}

export type PaymentPartyRow = {
  partyName: string
  type: PaymentRow["type"]
  paymentCount: number
  total: string
}

export type PaymentMethodRow = {
  method: PaymentRow["paymentMethod"]
  count: number
  total: string
  share: number
}

export const PAYMENT_AGING_BUCKETS: PaymentAgingBucket[] = [
  "0-30 days",
  "31-60 days",
  "61-90 days",
  "90+ days",
]

export const PAYMENT_REPORT_PRESETS: {
  value: PaymentReportPreset
  label: string
  description: string
}[] = [
  {
    value: "this_month",
    label: "This month",
    description: "From the 1st through today",
  },
  {
    value: "last_month",
    label: "Last month",
    description: "The previous calendar month",
  },
  {
    value: "custom",
    label: "Custom",
    description: "Choose a from and to date",
  },
]

function sumAmounts(values: string[]): number {
  return values.reduce((acc, value) => {
    const parsed = Number(value)
    return acc + (Number.isFinite(parsed) ? parsed : 0)
  }, 0)
}

function toMoney(value: number): string {
  return value.toFixed(2)
}

function toNumber(value: string): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function toLocalIsoDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

function shiftDate(iso: string, days: number): string {
  const date = new Date(`${iso}T00:00:00`)
  date.setDate(date.getDate() + days)
  return toLocalIsoDate(date)
}

function daysBetween(from: string, to: string): number {
  const start = new Date(`${from}T00:00:00`)
  const end = new Date(`${to}T00:00:00`)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 0
  return Math.round((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000))
}

function monthStartIso(year: number, monthIndex: number): string {
  return toLocalIsoDate(new Date(year, monthIndex, 1))
}

function monthEndIso(year: number, monthIndex: number): string {
  return toLocalIsoDate(new Date(year, monthIndex + 1, 0))
}

export function resolvePaymentReportRange(
  filter: Pick<PaymentReportFilter, "preset" | "start" | "end">,
  now = new Date()
): PaymentReportDateRange {
  const today = toLocalIsoDate(now)

  if (filter.preset === "this_month") {
    return {
      start: monthStartIso(now.getFullYear(), now.getMonth()),
      end: today,
    }
  }

  if (filter.preset === "last_month") {
    const year = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear()
    const month = now.getMonth() === 0 ? 11 : now.getMonth() - 1
    return {
      start: monthStartIso(year, month),
      end: monthEndIso(year, month),
    }
  }

  let start = filter.start.trim() || today
  let end = filter.end.trim() || today
  if (start > end) {
    const swap = start
    start = end
    end = swap
  }
  return { start, end }
}

export function createDefaultPaymentReportFilter(
  now = new Date()
): PaymentReportFilter {
  const range = resolvePaymentReportRange(
    { preset: "this_month", start: "", end: "" },
    now
  )
  return { preset: "this_month", start: range.start, end: range.end }
}

export function previousComparableRange(
  range: PaymentReportDateRange
): PaymentReportDateRange | null {
  const lengthDays = daysBetween(range.start, range.end) + 1
  if (lengthDays <= 0) return null
  const prevEnd = shiftDate(range.start, -1)
  const prevStart = shiftDate(prevEnd, -(lengthDays - 1))
  return { start: prevStart, end: prevEnd }
}

export function formatPaymentReportFilterLabel(
  filter: PaymentReportFilter
): string {
  const range = resolvePaymentReportRange(filter)
  if (filter.preset === "this_month") return i18n.t("presets.thisMonth", { ns: "reports" })
  if (filter.preset === "last_month") return i18n.t("presets.lastMonth", { ns: "reports" })
  if (range.start === range.end) return formatDate(range.start)
  return `${formatDate(range.start)} – ${formatDate(range.end)}`
}

function inDateRange(date: string, start: string, end: string): boolean {
  return date >= start && date <= end
}

function pctChange(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null
  return ((current - previous) / previous) * 100
}

export function filterPaymentsByPeriod(
  payments: PaymentRow[],
  filter: PaymentReportFilter
): PaymentRow[] {
  const range = resolvePaymentReportRange(filter)
  return payments.filter((row) =>
    inDateRange(row.paymentDate, range.start, range.end)
  )
}

function summarizePayments(payments: PaymentRow[]): PaymentReportSummary {
  const settled = payments.filter((row) => row.status === "completed")
  const pending = payments.filter((row) => row.status === "pending")

  const receipts = settled.filter((row) => row.type === "customer")
  const payouts = settled.filter((row) => row.type === "vendor")

  const received = sumAmounts(receipts.map((row) => row.amount))
  const paidOut = sumAmounts(payouts.map((row) => row.amount))
  const pendingIn = sumAmounts(
    pending.filter((row) => row.type === "customer").map((row) => row.amount)
  )
  const pendingOut = sumAmounts(
    pending.filter((row) => row.type === "vendor").map((row) => row.amount)
  )

  const totalSettled = received + paidOut

  return {
    paymentCount: payments.length,
    receivedCount: receipts.length,
    paidOutCount: payouts.length,
    received: toMoney(received),
    paidOut: toMoney(paidOut),
    netCashFlow: toMoney(received - paidOut),
    pendingIn: toMoney(pendingIn),
    pendingOut: toMoney(pendingOut),
    outstanding: toMoney(pendingIn + pendingOut),
    avgReceipt: toMoney(receipts.length > 0 ? received / receipts.length : 0),
    voidedCount: payments.filter((row) => row.status === "voided").length,
    collectionShare: totalSettled > 0 ? (received / totalSettled) * 100 : 0,
  }
}

export function computePaymentReportSummary(
  payments: PaymentRow[],
  filter: PaymentReportFilter
): PaymentReportSummary {
  return summarizePayments(filterPaymentsByPeriod(payments, filter))
}

export function computePaymentReportTrends(
  payments: PaymentRow[],
  filter: PaymentReportFilter
): PaymentReportTrends {
  const currentRange = resolvePaymentReportRange(filter)
  const range = previousComparableRange(currentRange)
  if (!range) {
    return {
      receivedChangePct: null,
      paidOutChangePct: null,
      netChangePct: null,
      countChangePct: null,
      avgReceiptChangePct: null,
      compareLabel: null,
    }
  }

  const current = computePaymentReportSummary(payments, filter)
  const previous = summarizePayments(
    payments.filter((row) =>
      inDateRange(row.paymentDate, range.start, range.end)
    )
  )

  return {
    receivedChangePct: pctChange(
      toNumber(current.received),
      toNumber(previous.received)
    ),
    paidOutChangePct: pctChange(
      toNumber(current.paidOut),
      toNumber(previous.paidOut)
    ),
    netChangePct: pctChange(
      toNumber(current.netCashFlow),
      toNumber(previous.netCashFlow)
    ),
    countChangePct: pctChange(current.paymentCount, previous.paymentCount),
    avgReceiptChangePct: pctChange(
      toNumber(current.avgReceipt),
      toNumber(previous.avgReceipt)
    ),
    compareLabel:
      filter.preset === "this_month"
        ? i18n.t("compare.vsLastMonth", { ns: "reports" })
        : filter.preset === "last_month"
          ? i18n.t("compare.vsPriorMonth", { ns: "reports" })
          : i18n.t("compare.vsPriorPeriod", { ns: "reports" }),
  }
}

export type PaymentTimelineBucket = "day" | "week" | "month" | "year"

export function resolvePaymentTimelineBucket(
  range: PaymentReportDateRange,
  preset?: PaymentReportPreset
): PaymentTimelineBucket {
  const days = daysBetween(range.start, range.end) + 1
  if (days > 365 * 3) return "year"
  if (days > 93) return "month"
  if (preset === "this_month" || preset === "last_month" || days <= 31) {
    return "day"
  }
  return "week"
}

export function paymentTimelineBucketLabel(
  bucket: PaymentTimelineBucket
): string {
  return i18n.t(`buckets.${bucket}`, { ns: "reports" })
}

function startOfWeekMonday(iso: string): string {
  const date = new Date(`${iso}T00:00:00`)
  const day = date.getDay()
  const diff = day === 0 ? -6 : 1 - day
  date.setDate(date.getDate() + diff)
  return toLocalIsoDate(date)
}

function formatWeekLabel(weekStart: string): string {
  const start = new Date(`${weekStart}T00:00:00`)
  const end = new Date(start)
  end.setDate(end.getDate() + 6)
  const dayMonth: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" }
  const from = new Intl.DateTimeFormat("en-GB", dayMonth).format(start)
  const to = new Intl.DateTimeFormat("en-GB", dayMonth).format(end)
  return `${from} – ${to}`
}

function formatMonthBucketLabel(yyyyMm: string): string {
  const [year, month] = yyyyMm.split("-").map(Number)
  if (!year || !month) return yyyyMm
  return new Intl.DateTimeFormat("en-GB", {
    month: "short",
    year: "numeric",
  }).format(new Date(year, month - 1, 1))
}

function bucketKeyForDate(iso: string, bucket: PaymentTimelineBucket): string {
  if (bucket === "year") return iso.slice(0, 4)
  if (bucket === "month") return iso.slice(0, 7)
  if (bucket === "week") return startOfWeekMonday(iso)
  return iso
}

function bucketLabelForKey(key: string, bucket: PaymentTimelineBucket): string {
  if (bucket === "year") return key
  if (bucket === "month") return formatMonthBucketLabel(key)
  if (bucket === "week") return formatWeekLabel(key)
  return formatDate(key)
}

/** Continuous in/out series, zero-filled then bucketed by range length. */
export function computePaymentCashFlow(
  payments: PaymentRow[],
  filter: PaymentReportFilter
): PaymentCashFlowRow[] {
  const range = resolvePaymentReportRange(filter)
  const settled = filterPaymentsByPeriod(payments, filter).filter(
    (row) => row.status === "completed"
  )

  const daily = new Map<
    string,
    {
      received: number
      paidOut: number
      receivedCount: number
      paidOutCount: number
    }
  >()

  for (const row of settled) {
    const current = daily.get(row.paymentDate) ?? {
      received: 0,
      paidOut: 0,
      receivedCount: 0,
      paidOutCount: 0,
    }
    const amount = toNumber(row.amount)
    if (row.type === "customer") {
      current.received += amount
      current.receivedCount += 1
    } else {
      current.paidOut += amount
      current.paidOutCount += 1
    }
    daily.set(row.paymentDate, current)
  }

  const bucket = resolvePaymentTimelineBucket(range, filter.preset)
  const buckets = new Map<
    string,
    {
      received: number
      paidOut: number
      receivedCount: number
      paidOutCount: number
    }
  >()

  let cursor = range.start
  while (cursor <= range.end) {
    const stats = daily.get(cursor) ?? {
      received: 0,
      paidOut: 0,
      receivedCount: 0,
      paidOutCount: 0,
    }
    const key = bucketKeyForDate(cursor, bucket)
    const current = buckets.get(key) ?? {
      received: 0,
      paidOut: 0,
      receivedCount: 0,
      paidOutCount: 0,
    }
    buckets.set(key, {
      received: current.received + stats.received,
      paidOut: current.paidOut + stats.paidOut,
      receivedCount: current.receivedCount + stats.receivedCount,
      paidOutCount: current.paidOutCount + stats.paidOutCount,
    })
    cursor = shiftDate(cursor, 1)
  }

  return Array.from(buckets.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([key, stats]) => ({
      date: key,
      label: bucketLabelForKey(key, bucket),
      received: toMoney(stats.received),
      paidOut: toMoney(stats.paidOut),
      net: toMoney(stats.received - stats.paidOut),
      receivedCount: stats.receivedCount,
      paidOutCount: stats.paidOutCount,
    }))
}

function agingBucketFor(days: number): PaymentAgingBucket {
  if (days <= 30) return "0-30 days"
  if (days <= 60) return "31-60 days"
  if (days <= 90) return "61-90 days"
  return "90+ days"
}

/**
 * Ages every still-pending payment by how long it has been outstanding.
 * Deliberately ignores the period filter — money owed does not stop being owed
 * because you changed the date range.
 */
export function computePaymentAging(
  payments: PaymentRow[],
  now = new Date()
): PaymentAgingRow[] {
  const today = toLocalIsoDate(now)
  const totals = new Map<
    PaymentAgingBucket,
    {
      receivable: number
      payable: number
      receivableCount: number
      payableCount: number
    }
  >()

  for (const row of payments) {
    if (row.status !== "pending") continue
    const age = Math.max(0, daysBetween(row.paymentDate, today))
    const bucket = agingBucketFor(age)
    const current = totals.get(bucket) ?? {
      receivable: 0,
      payable: 0,
      receivableCount: 0,
      payableCount: 0,
    }
    const amount = toNumber(row.amount)
    if (row.type === "customer") {
      current.receivable += amount
      current.receivableCount += 1
    } else {
      current.payable += amount
      current.payableCount += 1
    }
    totals.set(bucket, current)
  }

  return PAYMENT_AGING_BUCKETS.map((bucket) => {
    const stats = totals.get(bucket) ?? {
      receivable: 0,
      payable: 0,
      receivableCount: 0,
      payableCount: 0,
    }
    return {
      bucket,
      receivable: toMoney(stats.receivable),
      payable: toMoney(stats.payable),
      receivableCount: stats.receivableCount,
      payableCount: stats.payableCount,
    }
  })
}

export function computePaymentMethodBreakdown(
  payments: PaymentRow[],
  filter: PaymentReportFilter
): PaymentMethodRow[] {
  const settled = filterPaymentsByPeriod(payments, filter).filter(
    (row) => row.status === "completed"
  )
  const total = sumAmounts(settled.map((row) => row.amount))
  const map = new Map<
    PaymentRow["paymentMethod"],
    { count: number; total: number }
  >()

  for (const row of settled) {
    const current = map.get(row.paymentMethod) ?? { count: 0, total: 0 }
    map.set(row.paymentMethod, {
      count: current.count + 1,
      total: current.total + toNumber(row.amount),
    })
  }

  return Array.from(map.entries())
    .map(([method, stats]) => ({
      method,
      count: stats.count,
      total: toMoney(stats.total),
      share: total > 0 ? (stats.total / total) * 100 : 0,
    }))
    .sort((a, b) => Number(b.total) - Number(a.total))
}

export function computeTopPaymentParties(
  payments: PaymentRow[],
  filter: PaymentReportFilter,
  type: PaymentRow["type"],
  limit = 6
): PaymentPartyRow[] {
  const settled = filterPaymentsByPeriod(payments, filter).filter(
    (row) => row.status === "completed" && row.type === type
  )
  const map = new Map<string, { paymentCount: number; total: number }>()

  for (const row of settled) {
    const name = row.partyName.trim() || "—"
    const current = map.get(name) ?? { paymentCount: 0, total: 0 }
    map.set(name, {
      paymentCount: current.paymentCount + 1,
      total: current.total + toNumber(row.amount),
    })
  }

  return Array.from(map.entries())
    .map(([partyName, stats]) => ({
      partyName,
      type,
      paymentCount: stats.paymentCount,
      total: toMoney(stats.total),
    }))
    .sort((a, b) => Number(b.total) - Number(a.total))
    .slice(0, limit)
}

export function getRecentPayments(
  payments: PaymentRow[],
  filter: PaymentReportFilter,
  limit = 12
): PaymentRow[] {
  return filterPaymentsByPeriod(payments, filter)
    .slice()
    .sort((a, b) => {
      const dateCmp = b.paymentDate.localeCompare(a.paymentDate)
      if (dateCmp !== 0) return dateCmp
      return b.id - a.id
    })
    .slice(0, limit)
}

export function formatPaymentReportMoney(value: string): string {
  return formatMoney(value).replace(/^\$/, "Rs ")
}

/** Deterministic 0–1 from a string seed (stable across renders). */
function demoNoise(seed: string): number {
  let hash = 0
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0
  }
  return (hash % 1000) / 1000
}

const DEMO_CUSTOMERS = [
  "Acme Retail Co.",
  "Northwind Traders",
  "Contoso Foods",
  "Litware Inc.",
  "Fabrikam Logistics",
] as const

const DEMO_VENDORS = [
  "Karachi Steel Supplies",
  "Lahore Packaging Co.",
  "Islamabad Tech Distributors",
  "Multan Agro Traders",
  "Peshawar Hardware Hub",
] as const

const DEMO_METHODS: PaymentRow["paymentMethod"][] = [
  "Cash",
  "Bank transfer",
  "Card",
  "Credit",
]

/**
 * Dense relative-date demo payments so This month / Last month / Custom show a
 * populated cash-flow curve. Covers ~120 days so the aging buckets fill too.
 */
export function buildPaymentReportDemoPayments(now = new Date()): PaymentRow[] {
  const today = toLocalIsoDate(now)
  const payments: PaymentRow[] = []
  let id = 1
  let customerSeq = 4100
  let vendorSeq = 5100

  for (let offset = 119; offset >= 0; offset--) {
    const date = shiftDate(today, -offset)
    const weekday = new Date(`${date}T00:00:00`).getDay()
    if (weekday === 0) continue

    const dayNoise = demoNoise(`pay-${date}`)
    let count = weekday === 6 ? 1 : 2
    if (dayNoise > 0.82) count += 1

    for (let n = 0; n < count; n++) {
      const seed = `${date}-${n}`
      const isCustomer = demoNoise(`${seed}-type`) > 0.42
      const party = isCustomer
        ? DEMO_CUSTOMERS[
            Math.floor(demoNoise(`${seed}-party`) * DEMO_CUSTOMERS.length)
          ]
        : DEMO_VENDORS[
            Math.floor(demoNoise(`${seed}-party`) * DEMO_VENDORS.length)
          ]

      const base = isCustomer ? 18000 : 22000
      const amount = base * (0.35 + demoNoise(`${seed}-amt`) * 1.9)

      // Older entries are nearly always settled; recent ones may still be open.
      const statusRoll = demoNoise(`${seed}-status`)
      const status: PaymentRow["status"] =
        statusRoll > 0.97
          ? "voided"
          : offset < 45 && statusRoll > 0.82
            ? "pending"
            : "completed"

      const method =
        DEMO_METHODS[
          Math.floor(demoNoise(`${seed}-method`) * DEMO_METHODS.length)
        ]

      payments.push({
        id: id++,
        apiId: "",
        partyId: "",
        paymentNumber: isCustomer
          ? `CP-${customerSeq++}`
          : `VP-${vendorSeq++}`,
        type: isCustomer ? "customer" : "vendor",
        partyName: party,
        referenceNumber: isCustomer
          ? `INV-${1100 + (id % 400)}`
          : `PO-${2100 + (id % 400)}`,
        paymentDate: date,
        amount: amount.toFixed(2),
        paymentMethod: method,
        status,
        notes:
          status === "voided"
            ? "Voided — duplicate entry"
            : status === "pending"
              ? "Awaiting clearance"
              : isCustomer
                ? "Customer receipt"
                : "Vendor settlement",
      })
    }
  }

  return payments
}
