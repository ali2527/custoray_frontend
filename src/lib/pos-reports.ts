import { formatMoney } from "@/lib/customers"
import { formatDate, type OrderRow } from "@/lib/orders"
import { isPosReturn, type ReturnRow } from "@/lib/returns"
import { isPosOrder, POS_DISCOUNT_LINE_NAME } from "@/lib/pos"

export type PosReportPeriod = "today" | "7d" | "30d" | "all"

export type PosReportSummary = {
  saleCount: number
  returnCount: number
  grossSales: string
  totalReturns: string
  netSales: string
  avgTicket: string
  itemsSold: number
}

export type PosPaymentBreakdownRow = {
  method: OrderRow["paymentMethod"]
  count: number
  total: string
  share: number
}

export type PosStatusBreakdownRow = {
  status: OrderRow["status"]
  count: number
  total: string
}

export type PosTopProductRow = {
  productName: string
  quantity: number
  revenue: string
}

export type PosDailyTotalRow = {
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

function periodStartDate(period: PosReportPeriod): string | null {
  if (period === "all") return null
  const now = new Date()
  const start = new Date(now)
  if (period === "today") {
    // same calendar day
  } else if (period === "7d") {
    start.setDate(start.getDate() - 6)
  } else if (period === "30d") {
    start.setDate(start.getDate() - 29)
  }
  return start.toISOString().slice(0, 10)
}

export function filterPosOrdersByPeriod(
  orders: OrderRow[],
  period: PosReportPeriod
): OrderRow[] {
  const posOrders = orders.filter(isPosOrder)
  const start = periodStartDate(period)
  if (!start) return posOrders
  const today = new Date().toISOString().slice(0, 10)
  return posOrders.filter((order) => {
    if (period === "today") return order.orderDate === today
    return order.orderDate >= start && order.orderDate <= today
  })
}

export function filterPosReturnsByPeriod(
  returns: ReturnRow[],
  period: PosReportPeriod
): ReturnRow[] {
  const posReturns = returns.filter(isPosReturn)
  const start = periodStartDate(period)
  if (!start) return posReturns
  const today = new Date().toISOString().slice(0, 10)
  return posReturns.filter((row) => {
    if (period === "today") return row.returnDate === today
    return row.returnDate >= start && row.returnDate <= today
  })
}

export function countPosLineItems(order: OrderRow): number {
  return order.lines
    .filter((line) => line.productName !== POS_DISCOUNT_LINE_NAME)
    .reduce((sum, line) => sum + line.quantity, 0)
}

export function computePosReportSummary(
  orders: OrderRow[],
  returns: ReturnRow[],
  period: PosReportPeriod
): PosReportSummary {
  const filteredOrders = filterPosOrdersByPeriod(orders, period).filter(
    (order) => order.status !== "cancelled"
  )
  const filteredReturns = filterPosReturnsByPeriod(returns, period).filter(
    (row) => row.status === "completed"
  )

  const gross = sumAmounts(
    filteredOrders
      .filter((order) => order.status === "completed")
      .map((order) => order.totalAmount)
  )
  const returned = sumAmounts(filteredReturns.map((row) => row.totalAmount))
  const completedSales = filteredOrders.filter((order) => order.status === "completed")
  const itemsSold = completedSales.reduce(
    (sum, order) => sum + countPosLineItems(order),
    0
  )
  const avgTicket =
    completedSales.length > 0 ? gross / completedSales.length : 0

  return {
    saleCount: filteredOrders.length,
    returnCount: filteredReturns.length,
    grossSales: toMoney(gross),
    totalReturns: toMoney(returned),
    netSales: toMoney(Math.max(0, gross - returned)),
    avgTicket: toMoney(avgTicket),
    itemsSold,
  }
}

export function computePosPaymentBreakdown(
  orders: OrderRow[],
  period: PosReportPeriod
): PosPaymentBreakdownRow[] {
  const filteredOrders = filterPosOrdersByPeriod(orders, period).filter(
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

export function computePosStatusBreakdown(
  orders: OrderRow[],
  period: PosReportPeriod
): PosStatusBreakdownRow[] {
  const filteredOrders = filterPosOrdersByPeriod(orders, period)
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

export function computePosTopProducts(
  orders: OrderRow[],
  period: PosReportPeriod,
  limit = 8
): PosTopProductRow[] {
  const filteredOrders = filterPosOrdersByPeriod(orders, period).filter(
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
        revenue:
          current.revenue + (Number.isFinite(revenue) ? revenue : 0),
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

export function computePosDailyTotals(
  orders: OrderRow[],
  returns: ReturnRow[],
  period: PosReportPeriod
): PosDailyTotalRow[] {
  const filteredOrders = filterPosOrdersByPeriod(orders, period).filter(
    (order) => order.status === "completed"
  )
  const filteredReturns = filterPosReturnsByPeriod(returns, period).filter(
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

export function formatPosReportMoney(value: string): string {
  return formatMoney(value)
}

export const POS_REPORT_PERIODS: { value: PosReportPeriod; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "7d", label: "7 days" },
  { value: "30d", label: "30 days" },
  { value: "all", label: "All time" },
]
