import { formatMoney } from "@/lib/customers"
import { computeBalance, formatDate, type PurchaseRow } from "@/lib/purchases"
import type { ReturnRow } from "@/lib/returns"
import i18n from "@/i18n"

export type PurchaseReportPreset = "this_month" | "last_month" | "custom"

export type PurchaseReportDateRange = {
  start: string
  end: string
}

export type PurchaseReportFilter = {
  preset: PurchaseReportPreset
  start: string
  end: string
}

export type PurchaseReportSummary = {
  purchaseCount: number
  completedCount: number
  returnCount: number
  grossPurchases: string
  totalReturns: string
  netPurchases: string
  avgOrderValue: string
  itemsPurchased: number
  outstanding: string
  paid: string
  paymentRate: number
  returnRate: number
}

export type PurchaseTopVendorRow = {
  vendorName: string
  purchaseCount: number
  spend: string
}

export type PurchaseTopProductRow = {
  productName: string
  quantity: number
  spend: string
}

export type PurchaseDailyTotalRow = {
  date: string
  label: string
  purchases: string
  returns: string
  net: string
  purchaseCount: number
  returnCount: number
}

function sumAmounts(values: string[]): number {
  return values.reduce((acc, value) => {
    const parsed = Number(value)
    return acc + (Number.isFinite(parsed) ? parsed : 0)
  }, 0)
}

function toMoney(value: number): string {
  return value.toFixed(2)
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

function monthStartIso(year: number, monthIndex: number): string {
  return toLocalIsoDate(new Date(year, monthIndex, 1))
}

function monthEndIso(year: number, monthIndex: number): string {
  return toLocalIsoDate(new Date(year, monthIndex + 1, 0))
}

export function resolvePurchaseReportRange(
  filter: Pick<PurchaseReportFilter, "preset" | "start" | "end">,
  now = new Date()
): PurchaseReportDateRange {
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

export function createDefaultPurchaseReportFilter(
  now = new Date()
): PurchaseReportFilter {
  const range = resolvePurchaseReportRange(
    { preset: "this_month", start: "", end: "" },
    now
  )
  return {
    preset: "this_month",
    start: range.start,
    end: range.end,
  }
}

export function previousComparableRange(
  range: PurchaseReportDateRange
): PurchaseReportDateRange | null {
  const start = new Date(`${range.start}T00:00:00`)
  const end = new Date(`${range.end}T00:00:00`)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null
  const lengthDays =
    Math.round((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)) + 1
  const prevEnd = shiftDate(range.start, -1)
  const prevStart = shiftDate(prevEnd, -(lengthDays - 1))
  return { start: prevStart, end: prevEnd }
}

export function formatPurchaseReportFilterLabel(
  filter: PurchaseReportFilter
): string {
  const range = resolvePurchaseReportRange(filter)
  if (filter.preset === "this_month") return i18n.t("presets.thisMonth", { ns: "reports" })
  if (filter.preset === "last_month") return i18n.t("presets.lastMonth", { ns: "reports" })
  if (range.start === range.end) return formatDate(range.start)
  return `${formatDate(range.start)} – ${formatDate(range.end)}`
}

function inDateRange(date: string, start: string, end: string): boolean {
  return date >= start && date <= end
}

function inFilterRange(date: string, filter: PurchaseReportFilter): boolean {
  const range = resolvePurchaseReportRange(filter)
  return inDateRange(date, range.start, range.end)
}

function pctChange(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null
  return ((current - previous) / previous) * 100
}

export function filterPurchasesByPeriod(
  purchases: PurchaseRow[],
  filter: PurchaseReportFilter
): PurchaseRow[] {
  return purchases.filter((purchase) =>
    inFilterRange(purchase.purchaseDate, filter)
  )
}

/** Purchase returns only — sales returns live in the sales report. */
export function filterPurchaseReturnsByPeriod(
  returns: ReturnRow[],
  filter: PurchaseReportFilter
): ReturnRow[] {
  return returns.filter(
    (row) => row.type === "purchase" && inFilterRange(row.returnDate, filter)
  )
}

export function countPurchaseLineItems(purchase: PurchaseRow): number {
  return purchase.lines.reduce((sum, line) => sum + line.quantity, 0)
}

function summarizePurchasesAndReturns(
  purchases: PurchaseRow[],
  returns: ReturnRow[]
): PurchaseReportSummary {
  const active = purchases.filter((purchase) => purchase.status !== "cancelled")
  const completedReturns = returns.filter((row) => row.status === "completed")
  const received = active.filter((purchase) => purchase.status === "completed")

  const gross = sumAmounts(received.map((purchase) => purchase.totalAmount))
  const returned = sumAmounts(completedReturns.map((row) => row.totalAmount))
  const paid = sumAmounts(received.map((purchase) => purchase.paidAmount))
  const outstanding = active.reduce((sum, purchase) => {
    const balance = Number(computeBalance(purchase))
    return sum + (Number.isFinite(balance) && balance > 0 ? balance : 0)
  }, 0)
  const itemsPurchased = received.reduce(
    (sum, purchase) => sum + countPurchaseLineItems(purchase),
    0
  )
  const avgOrderValue = received.length > 0 ? gross / received.length : 0
  const paymentRate = gross > 0 ? (paid / gross) * 100 : 0
  const returnRate = gross > 0 ? (returned / gross) * 100 : 0

  return {
    purchaseCount: active.length,
    completedCount: received.length,
    returnCount: completedReturns.length,
    grossPurchases: toMoney(gross),
    totalReturns: toMoney(returned),
    netPurchases: toMoney(Math.max(0, gross - returned)),
    avgOrderValue: toMoney(avgOrderValue),
    itemsPurchased,
    outstanding: toMoney(outstanding),
    paid: toMoney(paid),
    paymentRate,
    returnRate,
  }
}

export function computePurchaseReportSummary(
  purchases: PurchaseRow[],
  returns: ReturnRow[],
  filter: PurchaseReportFilter
): PurchaseReportSummary {
  return summarizePurchasesAndReturns(
    filterPurchasesByPeriod(purchases, filter),
    filterPurchaseReturnsByPeriod(returns, filter)
  )
}

export type PurchaseReportTrends = {
  netChangePct: number | null
  returnsChangePct: number | null
  grossChangePct: number | null
  orderChangePct: number | null
  avgOrderValueChangePct: number | null
  paymentRateChangePct: number | null
  returnRateChangePct: number | null
  compareLabel: string | null
}

export function computePurchaseReportTrends(
  purchases: PurchaseRow[],
  returns: ReturnRow[],
  filter: PurchaseReportFilter
): PurchaseReportTrends {
  const currentRange = resolvePurchaseReportRange(filter)
  const range = previousComparableRange(currentRange)
  if (!range) {
    return {
      netChangePct: null,
      returnsChangePct: null,
      grossChangePct: null,
      orderChangePct: null,
      avgOrderValueChangePct: null,
      paymentRateChangePct: null,
      returnRateChangePct: null,
      compareLabel: null,
    }
  }

  const current = computePurchaseReportSummary(purchases, returns, filter)
  const previous = summarizePurchasesAndReturns(
    purchases.filter((purchase) =>
      inDateRange(purchase.purchaseDate, range.start, range.end)
    ),
    returns.filter(
      (row) =>
        row.type === "purchase" &&
        inDateRange(row.returnDate, range.start, range.end)
    )
  )

  return {
    netChangePct: pctChange(
      Number(current.netPurchases),
      Number(previous.netPurchases)
    ),
    returnsChangePct: pctChange(
      Number(current.totalReturns),
      Number(previous.totalReturns)
    ),
    grossChangePct: pctChange(
      Number(current.grossPurchases),
      Number(previous.grossPurchases)
    ),
    orderChangePct: pctChange(current.completedCount, previous.completedCount),
    avgOrderValueChangePct: pctChange(
      Number(current.avgOrderValue),
      Number(previous.avgOrderValue)
    ),
    paymentRateChangePct: pctChange(current.paymentRate, previous.paymentRate),
    returnRateChangePct: pctChange(current.returnRate, previous.returnRate),
    compareLabel:
      filter.preset === "this_month"
        ? i18n.t("compare.vsLastMonth", { ns: "reports" })
        : filter.preset === "last_month"
          ? i18n.t("compare.vsPriorMonth", { ns: "reports" })
          : i18n.t("compare.vsPriorPeriod", { ns: "reports" }),
  }
}

export function getRecentPurchases(
  purchases: PurchaseRow[],
  filter: PurchaseReportFilter,
  limit = 6
): PurchaseRow[] {
  return filterPurchasesByPeriod(purchases, filter)
    .slice()
    .sort((a, b) => {
      const dateCmp = b.purchaseDate.localeCompare(a.purchaseDate)
      if (dateCmp !== 0) return dateCmp
      return b.id - a.id
    })
    .slice(0, limit)
}

export function computePurchaseTopVendors(
  purchases: PurchaseRow[],
  filter: PurchaseReportFilter,
  limit = 8
): PurchaseTopVendorRow[] {
  const received = filterPurchasesByPeriod(purchases, filter).filter(
    (purchase) => purchase.status === "completed"
  )
  const map = new Map<string, { purchaseCount: number; spend: number }>()

  for (const purchase of received) {
    const name = purchase.vendorName.trim() || "—"
    const current = map.get(name) ?? { purchaseCount: 0, spend: 0 }
    const amount = Number(purchase.totalAmount)
    map.set(name, {
      purchaseCount: current.purchaseCount + 1,
      spend: current.spend + (Number.isFinite(amount) ? amount : 0),
    })
  }

  return Array.from(map.entries())
    .map(([vendorName, stats]) => ({
      vendorName,
      purchaseCount: stats.purchaseCount,
      spend: toMoney(stats.spend),
    }))
    .sort((a, b) => Number(b.spend) - Number(a.spend))
    .slice(0, limit)
}

export function computePurchaseTopProducts(
  purchases: PurchaseRow[],
  filter: PurchaseReportFilter,
  limit = 8
): PurchaseTopProductRow[] {
  const received = filterPurchasesByPeriod(purchases, filter).filter(
    (purchase) => purchase.status === "completed"
  )
  const map = new Map<string, { quantity: number; spend: number }>()

  for (const purchase of received) {
    for (const line of purchase.lines) {
      const current = map.get(line.productName) ?? { quantity: 0, spend: 0 }
      const spend = Number(line.lineTotal)
      map.set(line.productName, {
        quantity: current.quantity + line.quantity,
        spend: current.spend + (Number.isFinite(spend) ? spend : 0),
      })
    }
  }

  return Array.from(map.entries())
    .map(([productName, stats]) => ({
      productName,
      quantity: stats.quantity,
      spend: toMoney(stats.spend),
    }))
    .sort((a, b) => Number(b.spend) - Number(a.spend))
    .slice(0, limit)
}

export function computePurchaseDailyTotals(
  purchases: PurchaseRow[],
  returns: ReturnRow[],
  filter: PurchaseReportFilter
): PurchaseDailyTotalRow[] {
  const received = filterPurchasesByPeriod(purchases, filter).filter(
    (purchase) => purchase.status === "completed"
  )
  const completedReturns = filterPurchaseReturnsByPeriod(returns, filter).filter(
    (row) => row.status === "completed"
  )

  const map = new Map<
    string,
    {
      purchases: number
      returns: number
      purchaseCount: number
      returnCount: number
    }
  >()

  for (const purchase of received) {
    const current = map.get(purchase.purchaseDate) ?? {
      purchases: 0,
      returns: 0,
      purchaseCount: 0,
      returnCount: 0,
    }
    const amount = Number(purchase.totalAmount)
    map.set(purchase.purchaseDate, {
      ...current,
      purchases: current.purchases + (Number.isFinite(amount) ? amount : 0),
      purchaseCount: current.purchaseCount + 1,
    })
  }

  for (const row of completedReturns) {
    const current = map.get(row.returnDate) ?? {
      purchases: 0,
      returns: 0,
      purchaseCount: 0,
      returnCount: 0,
    }
    const amount = Number(row.totalAmount)
    map.set(row.returnDate, {
      ...current,
      returns: current.returns + (Number.isFinite(amount) ? amount : 0),
      returnCount: current.returnCount + 1,
    })
  }

  return Array.from(map.entries())
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([date, stats]) => ({
      date,
      label: formatDate(date),
      purchases: toMoney(stats.purchases),
      returns: toMoney(stats.returns),
      net: toMoney(Math.max(0, stats.purchases - stats.returns)),
      purchaseCount: stats.purchaseCount,
      returnCount: stats.returnCount,
    }))
}

/** Continuous series for charts — bucketed by range length. */
export type PurchaseTimelineBucket = "day" | "week" | "month" | "year"

export function rangeDayCount(range: PurchaseReportDateRange): number {
  const start = new Date(`${range.start}T00:00:00`)
  const end = new Date(`${range.end}T00:00:00`)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 0
  return (
    Math.round((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)) + 1
  )
}

/**
 * This / Last month (and short custom ≤31 days) → day
 * up to 3 months → week
 * up to 3 years → month
 * longer → year
 */
export function resolvePurchaseTimelineBucket(
  range: PurchaseReportDateRange,
  preset?: PurchaseReportPreset
): PurchaseTimelineBucket {
  const days = rangeDayCount(range)
  if (days > 365 * 3) return "year"
  if (days > 93) return "month"
  if (preset === "this_month" || preset === "last_month" || days <= 31) {
    return "day"
  }
  return "week"
}

export function purchaseTimelineBucketLabel(
  bucket: PurchaseTimelineBucket
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

function bucketKeyForDate(iso: string, bucket: PurchaseTimelineBucket): string {
  if (bucket === "year") return iso.slice(0, 4)
  if (bucket === "month") return iso.slice(0, 7)
  if (bucket === "week") return startOfWeekMonday(iso)
  return iso
}

function bucketLabelForKey(key: string, bucket: PurchaseTimelineBucket): string {
  if (bucket === "year") return key
  if (bucket === "month") return formatMonthBucketLabel(key)
  if (bucket === "week") return formatWeekLabel(key)
  return formatDate(key)
}

function aggregateTimelineRows(
  daily: PurchaseDailyTotalRow[],
  bucket: PurchaseTimelineBucket
): PurchaseDailyTotalRow[] {
  if (bucket === "day") return daily

  const map = new Map<
    string,
    {
      purchases: number
      returns: number
      purchaseCount: number
      returnCount: number
    }
  >()

  for (const row of daily) {
    const key = bucketKeyForDate(row.date, bucket)
    const current = map.get(key) ?? {
      purchases: 0,
      returns: 0,
      purchaseCount: 0,
      returnCount: 0,
    }
    map.set(key, {
      purchases: current.purchases + Number(row.purchases),
      returns: current.returns + Number(row.returns),
      purchaseCount: current.purchaseCount + row.purchaseCount,
      returnCount: current.returnCount + row.returnCount,
    })
  }

  return Array.from(map.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([key, stats]) => ({
      date: key,
      label: bucketLabelForKey(key, bucket),
      purchases: toMoney(stats.purchases),
      returns: toMoney(stats.returns),
      net: toMoney(Math.max(0, stats.purchases - stats.returns)),
      purchaseCount: stats.purchaseCount,
      returnCount: stats.returnCount,
    }))
}

/** Continuous series for line charts (fills zeros, then buckets by range). */
export function computePurchaseTimeline(
  purchases: PurchaseRow[],
  returns: ReturnRow[],
  filter: PurchaseReportFilter
): PurchaseDailyTotalRow[] {
  const totals = computePurchaseDailyTotals(purchases, returns, filter)
  const byDate = new Map(totals.map((row) => [row.date, row]))
  const range = resolvePurchaseReportRange(filter)

  const daily: PurchaseDailyTotalRow[] = []
  let cursor = range.start
  while (cursor <= range.end) {
    const existing = byDate.get(cursor)
    daily.push(
      existing ?? {
        date: cursor,
        label: formatDate(cursor),
        purchases: "0.00",
        returns: "0.00",
        net: "0.00",
        purchaseCount: 0,
        returnCount: 0,
      }
    )
    cursor = shiftDate(cursor, 1)
  }

  const bucket = resolvePurchaseTimelineBucket(range, filter.preset)
  return aggregateTimelineRows(daily, bucket)
}

export function formatPurchaseReportMoney(value: string): string {
  return formatMoney(value)
}

export const PURCHASE_REPORT_PRESETS: {
  value: PurchaseReportPreset
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

/** Deterministic 0–1 from a string seed (stable across renders). */
function demoNoise(seed: string): number {
  let hash = 0
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0
  }
  return (hash % 1000) / 1000
}

const DEMO_VENDORS = [
  "Karachi Steel Supplies",
  "Lahore Packaging Co.",
  "Islamabad Tech Distributors",
  "Multan Agro Traders",
  "Peshawar Hardware Hub",
  "Sialkot Tools & Co.",
] as const

const DEMO_SUPPLIES = [
  { name: "Steel Rod 12mm (bundle)", price: 1450 },
  { name: "Galvanized Sheet 4x8", price: 1370 },
  { name: "Corrugated Carton Large", price: 48 },
  { name: "Packing Tape Roll", price: 70 },
  { name: "Barcode Scanner USB", price: 3800 },
  { name: "Industrial Drill Set", price: 1850 },
  { name: "Safety Gloves Box", price: 250 },
  { name: "Organic Wheat 50kg", price: 490 },
] as const

/**
 * Dense relative-date demo purchases so This month / Last month / Custom
 * show populated timeline charts. Covers ~90 days for prior-period trends.
 */
export function buildPurchaseReportDemoPurchases(
  now = new Date()
): PurchaseRow[] {
  const today = toLocalIsoDate(now)
  const purchases: PurchaseRow[] = []
  let id = 1
  let poSeq = 2100

  for (let offset = 89; offset >= 0; offset--) {
    const date = shiftDate(today, -offset)
    const weekday = new Date(`${date}T00:00:00`).getDay()
    const dayNoise = demoNoise(`po-${date}`)

    // Procurement clusters on working days and pauses on Sundays.
    let orderCount = weekday === 0 ? 0 : weekday === 6 ? 1 : 2
    if (offset === 0) orderCount = Math.max(orderCount, 2)
    if (dayNoise > 0.8) orderCount += 1

    for (let n = 0; n < orderCount; n++) {
      const vendor =
        DEMO_VENDORS[
          Math.floor(demoNoise(`${date}-v-${n}`) * DEMO_VENDORS.length)
        ]
      const lineCount = 1 + Math.floor(demoNoise(`${date}-pl-${n}`) * 3)
      const lines: PurchaseRow["lines"] = []
      let total = 0

      for (let li = 0; li < lineCount; li++) {
        const supply =
          DEMO_SUPPLIES[
            Math.floor(demoNoise(`${date}-s-${n}-${li}`) * DEMO_SUPPLIES.length)
          ]
        const qty =
          1 + Math.floor(demoNoise(`${date}-pq-${n}-${li}`) * 40)
        const unitPrice =
          supply.price * (0.88 + demoNoise(`${date}-pu-${n}-${li}`) * 0.28)
        const lineTotal = unitPrice * qty
        total += lineTotal
        lines.push({
          id: li + 1,
          productName: supply.name,
          quantity: qty,
          unitPrice: unitPrice.toFixed(2),
          lineTotal: lineTotal.toFixed(2),
        })
      }

      // First order of each day is always received so every day has a bar.
      const statusRoll = demoNoise(`${date}-ps-${n}`)
      const status: PurchaseRow["status"] =
        n === 0
          ? "completed"
          : statusRoll > 0.93
            ? "cancelled"
            : statusRoll > 0.8
              ? "pending"
              : "completed"
      const paidShare =
        status === "completed"
          ? demoNoise(`${date}-pp-${n}`) > 0.25
            ? 1
            : 0.4 + demoNoise(`${date}-ppart-${n}`) * 0.4
          : status === "pending"
            ? demoNoise(`${date}-ppend-${n}`) * 0.5
            : 0

      purchases.push({
        id: id++,
        purchaseNumber: `PO-${poSeq++}`,
        vendorName: vendor,
        description:
          status === "cancelled"
            ? "Cancelled — quality inspection failed"
            : status === "pending"
              ? "Awaiting delivery confirmation"
              : "Stock replenishment",
        purchaseDate: date,
        totalAmount: total.toFixed(2),
        paidAmount: (total * paidShare).toFixed(2),
        status,
        lines,
      })
    }
  }

  return purchases
}

/** Matching demo vendor returns scattered across the same window. */
export function buildPurchaseReportDemoReturns(
  purchases: PurchaseRow[],
  now = new Date()
): ReturnRow[] {
  const today = toLocalIsoDate(now)
  const received = purchases.filter(
    (purchase) => purchase.status === "completed"
  )
  const returns: ReturnRow[] = []
  let id = 1
  let retSeq = 2100

  for (let offset = 85; offset >= 0; offset -= 5) {
    const date = shiftDate(today, -offset)
    const candidates = received.filter(
      (purchase) =>
        purchase.purchaseDate <= date &&
        purchase.purchaseDate >= shiftDate(date, -12)
    )
    if (candidates.length === 0) continue
    const pick =
      candidates[Math.floor(demoNoise(`pret-${date}`) * candidates.length)]
    const line = pick.lines[0]
    if (!line) continue
    const qty = Math.max(1, Math.floor(line.quantity / 4) || 1)
    const unit = Number(line.unitPrice)
    const amount = (Number.isFinite(unit) ? unit : 0) * qty

    returns.push({
      id: id++,
      returnNumber: `PRET-${retSeq++}`,
      type: "purchase",
      sourceId: pick.id,
      referenceNumber: pick.purchaseNumber,
      partyName: pick.vendorName,
      returnDate: date,
      description: "Damaged on arrival — returned to vendor",
      totalAmount: amount.toFixed(2),
      refundedAmount: amount.toFixed(2),
      sourcePaidAmount: pick.paidAmount,
      sourceTotalBefore: pick.totalAmount,
      sourceTotalAfter: Math.max(
        0,
        Number(pick.totalAmount) - amount
      ).toFixed(2),
      refundDue: "0.00",
      balanceDue: "0.00",
      status: "completed",
      lines: [
        {
          id: 1,
          sourceLineId: line.id,
          productName: line.productName,
          quantity: qty,
          maxQuantity: line.quantity,
          unitPrice: line.unitPrice,
          lineTotal: amount.toFixed(2),
        },
      ],
    })
  }

  return returns
}
