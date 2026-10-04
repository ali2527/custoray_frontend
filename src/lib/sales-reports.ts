import { formatMoney } from "@/lib/customers"
import { computeBalance, formatDate, type OrderRow } from "@/lib/orders"
import { isPosOrder, POS_DISCOUNT_LINE_NAME } from "@/lib/pos"
import type { ReturnRow } from "@/lib/returns"
import i18n from "@/i18n"

export type SalesReportPreset = "this_month" | "last_month" | "custom"

export type SalesReportDateRange = {
  start: string
  end: string
}

export type SalesReportFilter = {
  preset: SalesReportPreset
  start: string
  end: string
}

/** @deprecated Use SalesReportFilter / SalesReportPreset */
export type SalesReportPeriod = SalesReportPreset

export type SalesReportSummary = {
  saleCount: number
  completedCount: number
  returnCount: number
  grossSales: string
  totalReturns: string
  netSales: string
  avgTicket: string
  itemsSold: number
  outstanding: string
  collected: string
  collectionRate: number
  returnRate: number
}

export type SalesPaymentBreakdownRow = {
  method: OrderRow["paymentMethod"]
  count: number
  total: string
  share: number
}

export type SalesStatusBreakdownRow = {
  status: OrderRow["status"]
  count: number
  total: string
}

export type SalesChannelBreakdownRow = {
  channel: "pos" | "back_office"
  label: string
  count: number
  total: string
  share: number
}

export type SalesTopProductRow = {
  productName: string
  quantity: number
  revenue: string
}

export type SalesTopCustomerRow = {
  customerName: string
  orderCount: number
  revenue: string
}

export type SalesWeekdayRow = {
  weekday: number
  label: string
  sales: string
  saleCount: number
}

export type SalesDailyTotalRow = {
  date: string
  label: string
  sales: string
  returns: string
  net: string
  saleCount: number
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

export function resolveSalesReportRange(
  filter: Pick<SalesReportFilter, "preset" | "start" | "end">,
  now = new Date()
): SalesReportDateRange {
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

export function createDefaultSalesReportFilter(
  now = new Date()
): SalesReportFilter {
  const range = resolveSalesReportRange(
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
  range: SalesReportDateRange
): SalesReportDateRange | null {
  const start = new Date(`${range.start}T00:00:00`)
  const end = new Date(`${range.end}T00:00:00`)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null
  const lengthDays =
    Math.round((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)) + 1
  const prevEnd = shiftDate(range.start, -1)
  const prevStart = shiftDate(prevEnd, -(lengthDays - 1))
  return { start: prevStart, end: prevEnd }
}

export function formatSalesReportFilterLabel(filter: SalesReportFilter): string {
  const range = resolveSalesReportRange(filter)
  if (filter.preset === "this_month") return i18n.t("presets.thisMonth", { ns: "reports" })
  if (filter.preset === "last_month") return i18n.t("presets.lastMonth", { ns: "reports" })
  if (range.start === range.end) return formatDate(range.start)
  return `${formatDate(range.start)} – ${formatDate(range.end)}`
}

function inDateRange(date: string, start: string, end: string): boolean {
  return date >= start && date <= end
}

function inFilterRange(date: string, filter: SalesReportFilter): boolean {
  const range = resolveSalesReportRange(filter)
  return inDateRange(date, range.start, range.end)
}

function pctChange(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null
  return ((current - previous) / previous) * 100
}

export function filterSalesOrdersByPeriod(
  orders: OrderRow[],
  filter: SalesReportFilter
): OrderRow[] {
  return orders.filter((order) => inFilterRange(order.orderDate, filter))
}

export function filterSalesReturnsByPeriod(
  returns: ReturnRow[],
  filter: SalesReportFilter
): ReturnRow[] {
  return returns.filter((row) => inFilterRange(row.returnDate, filter))
}

export function countSalesLineItems(order: OrderRow): number {
  return order.lines
    .filter((line) => line.productName !== POS_DISCOUNT_LINE_NAME)
    .reduce((sum, line) => sum + line.quantity, 0)
}

function summarizeOrdersAndReturns(
  orders: OrderRow[],
  returns: ReturnRow[]
): SalesReportSummary {
  const filteredOrders = orders.filter((order) => order.status !== "cancelled")
  const filteredReturns = returns.filter((row) => row.status === "completed")
  const completedSales = filteredOrders.filter(
    (order) => order.status === "completed"
  )
  const gross = sumAmounts(completedSales.map((order) => order.totalAmount))
  const returned = sumAmounts(filteredReturns.map((row) => row.totalAmount))
  const collected = sumAmounts(completedSales.map((order) => order.paidAmount))
  const outstanding = filteredOrders.reduce((sum, order) => {
    const balance = Number(computeBalance(order))
    return sum + (Number.isFinite(balance) && balance > 0 ? balance : 0)
  }, 0)
  const itemsSold = completedSales.reduce(
    (sum, order) => sum + countSalesLineItems(order),
    0
  )
  const avgTicket =
    completedSales.length > 0 ? gross / completedSales.length : 0
  const collectionRate = gross > 0 ? (collected / gross) * 100 : 0
  const returnRate = gross > 0 ? (returned / gross) * 100 : 0

  return {
    saleCount: filteredOrders.length,
    completedCount: completedSales.length,
    returnCount: filteredReturns.length,
    grossSales: toMoney(gross),
    totalReturns: toMoney(returned),
    netSales: toMoney(Math.max(0, gross - returned)),
    avgTicket: toMoney(avgTicket),
    itemsSold,
    outstanding: toMoney(outstanding),
    collected: toMoney(collected),
    collectionRate,
    returnRate,
  }
}

export function computeSalesReportSummary(
  orders: OrderRow[],
  returns: ReturnRow[],
  filter: SalesReportFilter
): SalesReportSummary {
  return summarizeOrdersAndReturns(
    filterSalesOrdersByPeriod(orders, filter),
    filterSalesReturnsByPeriod(returns, filter)
  )
}

export type SalesReportTrends = {
  netChangePct: number | null
  returnsChangePct: number | null
  grossChangePct: number | null
  invoiceChangePct: number | null
  avgTicketChangePct: number | null
  collectionRateChangePct: number | null
  returnRateChangePct: number | null
  compareLabel: string | null
}

export function computeSalesReportTrends(
  orders: OrderRow[],
  returns: ReturnRow[],
  filter: SalesReportFilter
): SalesReportTrends {
  const currentRange = resolveSalesReportRange(filter)
  const range = previousComparableRange(currentRange)
  if (!range) {
    return {
      netChangePct: null,
      returnsChangePct: null,
      grossChangePct: null,
      invoiceChangePct: null,
      avgTicketChangePct: null,
      collectionRateChangePct: null,
      returnRateChangePct: null,
      compareLabel: null,
    }
  }

  const current = computeSalesReportSummary(orders, returns, filter)
  const previous = summarizeOrdersAndReturns(
    orders.filter((order) =>
      inDateRange(order.orderDate, range.start, range.end)
    ),
    returns.filter((row) =>
      inDateRange(row.returnDate, range.start, range.end)
    )
  )

  return {
    netChangePct: pctChange(Number(current.netSales), Number(previous.netSales)),
    returnsChangePct: pctChange(
      Number(current.totalReturns),
      Number(previous.totalReturns)
    ),
    grossChangePct: pctChange(
      Number(current.grossSales),
      Number(previous.grossSales)
    ),
    invoiceChangePct: pctChange(current.completedCount, previous.completedCount),
    avgTicketChangePct: pctChange(
      Number(current.avgTicket),
      Number(previous.avgTicket)
    ),
    collectionRateChangePct: pctChange(
      current.collectionRate,
      previous.collectionRate
    ),
    returnRateChangePct: pctChange(current.returnRate, previous.returnRate),
    compareLabel:
      filter.preset === "this_month"
        ? i18n.t("compare.vsLastMonth", { ns: "reports" })
        : filter.preset === "last_month"
          ? i18n.t("compare.vsPriorMonth", { ns: "reports" })
          : i18n.t("compare.vsPriorPeriod", { ns: "reports" }),
  }
}

export type SalesSnapshotRow = {
  key: string
  label: string
  valueLabel: string
  share: number
}

export function computeSalesSnapshot(
  orders: OrderRow[],
  returns: ReturnRow[],
  filter: SalesReportFilter
): SalesSnapshotRow[] {
  const filteredOrders = filterSalesOrdersByPeriod(orders, filter)
  const summary = computeSalesReportSummary(orders, returns, filter)
  const channels = computeSalesChannelBreakdown(orders, filter)
  const posShare =
    channels.find((row) => row.channel === "pos")?.share ?? 0
  const gross = Number(summary.grossSales)
  const collectedShare =
    gross > 0 ? (Number(summary.collected) / gross) * 100 : 0
  const completedCount = filteredOrders.filter(
    (order) => order.status === "completed"
  ).length
  const completionRate =
    filteredOrders.length > 0
      ? (completedCount / filteredOrders.length) * 100
      : 0
  // Soft scale so typical demo volumes fill the bar without always hitting 100%.
  const itemsActivity = Math.min(100, summary.itemsSold * 5)

  return [
    {
      key: "completed",
      label: "Completed",
      valueLabel: `${completedCount} · ${completionRate.toFixed(0)}%`,
      share: completionRate,
    },
    {
      key: "items",
      label: "Items sold",
      valueLabel: String(summary.itemsSold),
      share: itemsActivity,
    },
    {
      key: "pos",
      label: "POS share",
      valueLabel: `${posShare.toFixed(0)}%`,
      share: posShare,
    },
    {
      key: "collected",
      label: "Collected",
      valueLabel: `${collectedShare.toFixed(0)}%`,
      share: collectedShare,
    },
  ]
}

export function getRecentSalesOrders(
  orders: OrderRow[],
  filter: SalesReportFilter,
  limit = 6
): OrderRow[] {
  return filterSalesOrdersByPeriod(orders, filter)
    .slice()
    .sort((a, b) => {
      const dateCmp = b.orderDate.localeCompare(a.orderDate)
      if (dateCmp !== 0) return dateCmp
      return b.id - a.id
    })
    .slice(0, limit)
}

export function computeSalesPaymentBreakdown(
  orders: OrderRow[],
  filter: SalesReportFilter
): SalesPaymentBreakdownRow[] {
  const filteredOrders = filterSalesOrdersByPeriod(orders, filter).filter(
    (order) => order.status === "completed"
  )
  const gross = sumAmounts(filteredOrders.map((order) => order.totalAmount))
  const map = new Map<OrderRow["paymentMethod"], { count: number; total: number }>()

  for (const order of filteredOrders) {
    const current = map.get(order.paymentMethod) ?? { count: 0, total: 0 }
    const amount = Number(order.totalAmount)
    map.set(order.paymentMethod, {
      count: current.count + 1,
      total: current.total + (Number.isFinite(amount) ? amount : 0),
    })
  }

  return Array.from(map.entries())
    .map(([method, stats]) => ({
      method,
      count: stats.count,
      total: toMoney(stats.total),
      share: gross > 0 ? (stats.total / gross) * 100 : 0,
    }))
    .sort((a, b) => Number(b.total) - Number(a.total))
}

export function computeSalesStatusBreakdown(
  orders: OrderRow[],
  filter: SalesReportFilter
): SalesStatusBreakdownRow[] {
  const filteredOrders = filterSalesOrdersByPeriod(orders, filter)
  const map = new Map<OrderRow["status"], { count: number; total: number }>()

  for (const order of filteredOrders) {
    const current = map.get(order.status) ?? { count: 0, total: 0 }
    const amount = Number(order.totalAmount)
    map.set(order.status, {
      count: current.count + 1,
      total: current.total + (Number.isFinite(amount) ? amount : 0),
    })
  }

  return (["completed", "pending", "cancelled"] as const)
    .filter((status) => map.has(status))
    .map((status) => {
      const stats = map.get(status)!
      return {
        status,
        count: stats.count,
        total: toMoney(stats.total),
      }
    })
}

export function computeSalesChannelBreakdown(
  orders: OrderRow[],
  filter: SalesReportFilter
): SalesChannelBreakdownRow[] {
  const filteredOrders = filterSalesOrdersByPeriod(orders, filter).filter(
    (order) => order.status === "completed"
  )
  const gross = sumAmounts(filteredOrders.map((order) => order.totalAmount))

  let posCount = 0
  let posTotal = 0
  let backCount = 0
  let backTotal = 0

  for (const order of filteredOrders) {
    const amount = Number(order.totalAmount)
    const safe = Number.isFinite(amount) ? amount : 0
    if (isPosOrder(order)) {
      posCount += 1
      posTotal += safe
    } else {
      backCount += 1
      backTotal += safe
    }
  }

  const rows: SalesChannelBreakdownRow[] = []
  if (posCount > 0) {
    rows.push({
      channel: "pos",
      label: "POS",
      count: posCount,
      total: toMoney(posTotal),
      share: gross > 0 ? (posTotal / gross) * 100 : 0,
    })
  }
  if (backCount > 0) {
    rows.push({
      channel: "back_office",
      label: "Back office",
      count: backCount,
      total: toMoney(backTotal),
      share: gross > 0 ? (backTotal / gross) * 100 : 0,
    })
  }
  return rows.sort((a, b) => Number(b.total) - Number(a.total))
}

export function computeSalesTopProducts(
  orders: OrderRow[],
  filter: SalesReportFilter,
  limit = 8
): SalesTopProductRow[] {
  const filteredOrders = filterSalesOrdersByPeriod(orders, filter).filter(
    (order) => order.status === "completed"
  )
  const map = new Map<string, { quantity: number; revenue: number }>()

  for (const order of filteredOrders) {
    for (const line of order.lines) {
      if (line.productName === POS_DISCOUNT_LINE_NAME) continue
      const current = map.get(line.productName) ?? { quantity: 0, revenue: 0 }
      const revenue = Number(line.lineTotal)
      map.set(line.productName, {
        quantity: current.quantity + line.quantity,
        revenue: current.revenue + (Number.isFinite(revenue) ? revenue : 0),
      })
    }
  }

  return Array.from(map.entries())
    .map(([productName, stats]) => ({
      productName,
      quantity: stats.quantity,
      revenue: toMoney(stats.revenue),
    }))
    .sort((a, b) => Number(b.revenue) - Number(a.revenue))
    .slice(0, limit)
}

export function computeSalesTopCustomers(
  orders: OrderRow[],
  filter: SalesReportFilter,
  limit = 8
): SalesTopCustomerRow[] {
  const filteredOrders = filterSalesOrdersByPeriod(orders, filter).filter(
    (order) => order.status === "completed"
  )
  const map = new Map<string, { orderCount: number; revenue: number }>()

  for (const order of filteredOrders) {
    const name = order.customerName.trim() || "—"
    const current = map.get(name) ?? { orderCount: 0, revenue: 0 }
    const amount = Number(order.totalAmount)
    map.set(name, {
      orderCount: current.orderCount + 1,
      revenue: current.revenue + (Number.isFinite(amount) ? amount : 0),
    })
  }

  return Array.from(map.entries())
    .map(([customerName, stats]) => ({
      customerName,
      orderCount: stats.orderCount,
      revenue: toMoney(stats.revenue),
    }))
    .sort((a, b) => Number(b.revenue) - Number(a.revenue))
    .slice(0, limit)
}

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const

export function computeSalesByWeekday(
  orders: OrderRow[],
  filter: SalesReportFilter
): SalesWeekdayRow[] {
  const filteredOrders = filterSalesOrdersByPeriod(orders, filter).filter(
    (order) => order.status === "completed"
  )
  const totals = Array.from({ length: 7 }, () => ({ sales: 0, saleCount: 0 }))

  for (const order of filteredOrders) {
    const date = new Date(`${order.orderDate}T00:00:00`)
    if (Number.isNaN(date.getTime())) continue
    const weekday = date.getDay()
    const amount = Number(order.totalAmount)
    totals[weekday].sales += Number.isFinite(amount) ? amount : 0
    totals[weekday].saleCount += 1
  }

  // Monday-first order to match common business charts.
  const order = [1, 2, 3, 4, 5, 6, 0]
  return order.map((weekday) => ({
    weekday,
    label: WEEKDAY_LABELS[weekday],
    sales: toMoney(totals[weekday].sales),
    saleCount: totals[weekday].saleCount,
  }))
}

export function computeSalesDailyTotals(
  orders: OrderRow[],
  returns: ReturnRow[],
  filter: SalesReportFilter
): SalesDailyTotalRow[] {
  const filteredOrders = filterSalesOrdersByPeriod(orders, filter).filter(
    (order) => order.status === "completed"
  )
  const filteredReturns = filterSalesReturnsByPeriod(returns, filter).filter(
    (row) => row.status === "completed"
  )

  const map = new Map<
    string,
    { sales: number; returns: number; saleCount: number; returnCount: number }
  >()

  for (const order of filteredOrders) {
    const current = map.get(order.orderDate) ?? {
      sales: 0,
      returns: 0,
      saleCount: 0,
      returnCount: 0,
    }
    const amount = Number(order.totalAmount)
    map.set(order.orderDate, {
      ...current,
      sales: current.sales + (Number.isFinite(amount) ? amount : 0),
      saleCount: current.saleCount + 1,
    })
  }

  for (const row of filteredReturns) {
    const current = map.get(row.returnDate) ?? {
      sales: 0,
      returns: 0,
      saleCount: 0,
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
      sales: toMoney(stats.sales),
      returns: toMoney(stats.returns),
      net: toMoney(Math.max(0, stats.sales - stats.returns)),
      saleCount: stats.saleCount,
      returnCount: stats.returnCount,
    }))
}

/** Continuous series for charts — bucketed by range length. */
export type SalesTimelineBucket = "day" | "week" | "month" | "year"

export function rangeDayCount(range: SalesReportDateRange): number {
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
export function resolveSalesTimelineBucket(
  range: SalesReportDateRange,
  preset?: SalesReportPreset
): SalesTimelineBucket {
  const days = rangeDayCount(range)
  if (days > 365 * 3) return "year"
  if (days > 93) return "month"
  if (
    preset === "this_month" ||
    preset === "last_month" ||
    days <= 31
  ) {
    return "day"
  }
  return "week"
}

export function salesTimelineBucketLabel(bucket: SalesTimelineBucket): string {
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

function bucketKeyForDate(iso: string, bucket: SalesTimelineBucket): string {
  if (bucket === "year") return iso.slice(0, 4)
  if (bucket === "month") return iso.slice(0, 7)
  if (bucket === "week") return startOfWeekMonday(iso)
  return iso
}

function bucketLabelForKey(key: string, bucket: SalesTimelineBucket): string {
  if (bucket === "year") return key
  if (bucket === "month") return formatMonthBucketLabel(key)
  if (bucket === "week") return formatWeekLabel(key)
  return formatDate(key)
}

function aggregateTimelineRows(
  daily: SalesDailyTotalRow[],
  bucket: SalesTimelineBucket
): SalesDailyTotalRow[] {
  if (bucket === "day") return daily

  const map = new Map<
    string,
    { sales: number; returns: number; saleCount: number; returnCount: number }
  >()

  for (const row of daily) {
    const key = bucketKeyForDate(row.date, bucket)
    const current = map.get(key) ?? {
      sales: 0,
      returns: 0,
      saleCount: 0,
      returnCount: 0,
    }
    map.set(key, {
      sales: current.sales + Number(row.sales),
      returns: current.returns + Number(row.returns),
      saleCount: current.saleCount + row.saleCount,
      returnCount: current.returnCount + row.returnCount,
    })
  }

  return Array.from(map.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([key, stats]) => ({
      date: key,
      label: bucketLabelForKey(key, bucket),
      sales: toMoney(stats.sales),
      returns: toMoney(stats.returns),
      net: toMoney(Math.max(0, stats.sales - stats.returns)),
      saleCount: stats.saleCount,
      returnCount: stats.returnCount,
    }))
}

/** Continuous series for line charts (fills zeros, then buckets by range). */
export function computeSalesTimeline(
  orders: OrderRow[],
  returns: ReturnRow[],
  filter: SalesReportFilter
): SalesDailyTotalRow[] {
  const totals = computeSalesDailyTotals(orders, returns, filter)
  const byDate = new Map(totals.map((row) => [row.date, row]))
  const range = resolveSalesReportRange(filter)

  const daily: SalesDailyTotalRow[] = []
  let cursor = range.start
  while (cursor <= range.end) {
    const existing = byDate.get(cursor)
    daily.push(
      existing ?? {
        date: cursor,
        label: formatDate(cursor),
        sales: "0.00",
        returns: "0.00",
        net: "0.00",
        saleCount: 0,
        returnCount: 0,
      }
    )
    cursor = shiftDate(cursor, 1)
  }

  const bucket = resolveSalesTimelineBucket(range, filter.preset)
  return aggregateTimelineRows(daily, bucket)
}

export function formatSalesReportMoney(value: string): string {
  return formatMoney(value)
}

export const SALES_REPORT_PRESETS: {
  value: SalesReportPreset
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

const DEMO_CUSTOMERS = [
  "Acme Retail Co.",
  "Northwind Traders",
  "Contoso Foods",
  "Litware Inc.",
  "Fabrikam Logistics",
  "Walk-in Customer",
] as const

const DEMO_PRODUCTS = [
  { name: "Premium Basmati Rice 25kg", price: 3200 },
  { name: "Sunflower Oil 5L", price: 1100 },
  { name: "Mixed Spices Carton", price: 1600 },
  { name: "Organic Honey 500g", price: 850 },
  { name: "Green Tea Box 100s", price: 540 },
  { name: "Frozen Chicken 10kg", price: 1240 },
  { name: "Office Supplies Bundle", price: 720 },
  { name: "Printer Paper Ream", price: 250 },
] as const

/**
 * Dense relative-date demo sales so This month / Last month / Custom
 * show populated weekday + timeline charts. Covers ~90 days for prior-month trends.
 */
export function buildSalesReportDemoOrders(now = new Date()): OrderRow[] {
  const today = toLocalIsoDate(now)
  const orders: OrderRow[] = []
  let id = 1
  let invoiceSeq = 1100
  let posSeq = 1100

  for (let offset = 89; offset >= 0; offset--) {
    const date = shiftDate(today, -offset)
    const weekday = new Date(`${date}T00:00:00`).getDay()
    const dayNoise = demoNoise(date)

    // Weekday volume: stronger midweek, lighter weekends.
    let saleCount =
      weekday === 0 ? 1 : weekday === 6 ? 2 : weekday === 3 || weekday === 4 ? 4 : 3
    if (offset === 0) saleCount = Math.max(saleCount, 3) // today always busy
    if (dayNoise > 0.85) saleCount += 1

    for (let n = 0; n < saleCount; n++) {
      const roll = demoNoise(`${date}-${n}`)
      const isPos = roll > 0.55
      const customer =
        DEMO_CUSTOMERS[Math.floor(demoNoise(`${date}-c-${n}`) * DEMO_CUSTOMERS.length)]
      const lineCount = 1 + Math.floor(demoNoise(`${date}-lines-${n}`) * 3)
      const lines: OrderRow["lines"] = []
      let total = 0

      for (let li = 0; li < lineCount; li++) {
        const product =
          DEMO_PRODUCTS[
            Math.floor(demoNoise(`${date}-p-${n}-${li}`) * DEMO_PRODUCTS.length)
          ]
        const qty = 1 + Math.floor(demoNoise(`${date}-q-${n}-${li}`) * (isPos ? 2 : 6))
        const unitPrice = product.price * (0.9 + demoNoise(`${date}-up-${n}-${li}`) * 0.25)
        const lineTotal = unitPrice * qty
        total += lineTotal
        lines.push({
          id: li + 1,
          productName: product.name,
          quantity: qty,
          unitPrice: unitPrice.toFixed(2),
          lineTotal: lineTotal.toFixed(2),
        })
      }

      // First sale of each day is always completed so every weekday has a bar.
      const statusRoll = demoNoise(`${date}-st-${n}`)
      const status: OrderRow["status"] =
        n === 0
          ? "completed"
          : statusRoll > 0.92
            ? "cancelled"
            : statusRoll > 0.82
              ? "pending"
              : "completed"
      const paidShare =
        status === "completed"
          ? demoNoise(`${date}-paid-${n}`) > 0.2
            ? 1
            : 0.45 + demoNoise(`${date}-partial-${n}`) * 0.4
          : status === "pending"
            ? demoNoise(`${date}-pend-paid-${n}`) * 0.5
            : 0
      const methodRoll = demoNoise(`${date}-pm-${n}`)
      const paymentMethod: OrderRow["paymentMethod"] = isPos
        ? methodRoll > 0.5
          ? "Cash"
          : "Card"
        : methodRoll > 0.66
          ? "Bank transfer"
          : methodRoll > 0.33
            ? "Credit"
            : "Cash"

      const invoiceNumber = isPos
        ? `POS-${posSeq++}`
        : `INV-${invoiceSeq++}`

      orders.push({
        id: id++,
        invoiceNumber,
        customerName: isPos ? "Walk-in Customer" : customer,
        description: isPos ? "POS sale" : "Demo wholesale order",
        orderDate: date,
        totalAmount: total.toFixed(2),
        paidAmount: (total * paidShare).toFixed(2),
        paymentMethod,
        status,
        lines,
      })
    }
  }

  return orders
}

/** Matching demo returns scattered across the same window. */
export function buildSalesReportDemoReturns(
  orders: OrderRow[],
  now = new Date()
): ReturnRow[] {
  const today = toLocalIsoDate(now)
  const completed = orders.filter((order) => order.status === "completed")
  const returns: ReturnRow[] = []
  let id = 1
  let retSeq = 1100

  for (let offset = 85; offset >= 0; offset -= 4) {
    const date = shiftDate(today, -offset)
    const candidates = completed.filter(
      (order) => order.orderDate <= date && order.orderDate >= shiftDate(date, -10)
    )
    if (candidates.length === 0) continue
    const pick =
      candidates[Math.floor(demoNoise(`ret-${date}`) * candidates.length)]
    const line = pick.lines[0]
    if (!line) continue
    const qty = Math.max(1, Math.floor(line.quantity / 2) || 1)
    const unit = Number(line.unitPrice)
    const amount = (Number.isFinite(unit) ? unit : 0) * qty
    const isPos = isPosOrder(pick)

    returns.push({
      id: id++,
      returnNumber: `RET-${retSeq++}`,
      type: "sales",
      sourceId: isPos ? 0 : pick.id,
      referenceNumber: pick.invoiceNumber,
      partyName: pick.customerName,
      returnDate: date,
      description: isPos ? "POS return" : "Partial return — demo",
      totalAmount: amount.toFixed(2),
      refundedAmount: amount.toFixed(2),
      sourcePaidAmount: pick.paidAmount,
      sourceTotalBefore: pick.totalAmount,
      sourceTotalAfter: Math.max(0, Number(pick.totalAmount) - amount).toFixed(2),
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
