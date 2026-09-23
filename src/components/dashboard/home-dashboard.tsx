"use client"

import * as React from "react"
import Link from "next/link"
import { useTranslation } from "react-i18next"
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts"

import { SectionCards, type DashboardStat } from "@/components/section-cards"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useOrders } from "@/context/orders-context"
import { useExpenses } from "@/context/expenses-context"
import { usePurchases } from "@/context/purchases-context"
import { useReturns } from "@/context/returns-context"
import i18n from "@/i18n"
import { dateLocaleForLanguage } from "@/i18n/config"
import { formatMoney } from "@/lib/customers"
import {
  formatDate,
  statusBadgeClass,
  statusLabel,
  type OrderRow,
} from "@/lib/orders"
import { isPosOrder } from "@/lib/pos"
import {
  formatDate as formatPurchaseDate,
  statusBadgeClass as purchaseStatusBadgeClass,
  statusLabel as purchaseStatusLabel,
  type PurchaseRow,
} from "@/lib/purchases"
import {
  computePurchaseReportSummary,
  computePurchaseTimeline,
  getRecentPurchases,
  type PurchaseDailyTotalRow,
  type PurchaseReportFilter,
} from "@/lib/purchase-reports"
import {
  computeSalesReportSummary,
  computeSalesTimeline,
  createDefaultSalesReportFilter,
  getRecentSalesOrders,
  type SalesDailyTotalRow,
} from "@/lib/sales-reports"
import { cn } from "@/lib/utils"

const panelClass =
  "rounded-2xl bg-card shadow-sm shadow-black/[0.03] ring-1 ring-border/50"

type InOutPoint = {
  date: string
  label: string
  inn: number
  out: number
  expense: number
}

function formatDashMoney(value: string | number): string {
  const n = typeof value === "number" ? value : Number(value)
  const amount = Number.isFinite(n) ? n.toFixed(2) : "0.00"
  return formatMoney(amount).replace("$", "Rs ")
}

function formatAxisMoney(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1000) return `${(value / 1000).toFixed(value >= 10_000 ? 0 : 1)}k`
  return String(Math.round(value))
}

function eachIsoDate(start: string, end: string): string[] {
  if (!start || !end || start > end) return []
  const dates: string[] = []
  const cursor = new Date(`${start}T00:00:00`)
  const last = new Date(`${end}T00:00:00`)
  if (Number.isNaN(cursor.getTime()) || Number.isNaN(last.getTime())) return []

  while (cursor.getTime() <= last.getTime()) {
    const year = cursor.getFullYear()
    const month = String(cursor.getMonth() + 1).padStart(2, "0")
    const day = String(cursor.getDate()).padStart(2, "0")
    dates.push(`${year}-${month}-${day}`)
    cursor.setDate(cursor.getDate() + 1)
  }
  return dates
}

function shortAxisLabel(iso: string, fallback: string): string {
  const date = new Date(`${iso}T00:00:00`)
  if (Number.isNaN(date.getTime())) return fallback
  return new Intl.DateTimeFormat(dateLocaleForLanguage(i18n.language), {
    day: "numeric",
    month: "short",
  }).format(date)
}

function emptyInOutPoint(date: string, label?: string): InOutPoint {
  return {
    date,
    label: label ?? shortAxisLabel(date, date),
    inn: 0,
    out: 0,
    expense: 0,
  }
}

function mergeInOut(
  purchases: PurchaseDailyTotalRow[],
  sales: SalesDailyTotalRow[],
  expensesByDate: Map<string, number>,
  start: string,
  end: string
): InOutPoint[] {
  const map = new Map<string, InOutPoint>()

  for (const row of purchases) {
    map.set(row.date, {
      ...emptyInOutPoint(row.date, shortAxisLabel(row.date, row.label)),
      inn: Number(row.net) || 0,
    })
  }

  for (const row of sales) {
    const current = map.get(row.date) ?? emptyInOutPoint(row.date, shortAxisLabel(row.date, row.label))
    current.out = Number(row.net) || 0
    if (!current.label) current.label = shortAxisLabel(row.date, row.label)
    map.set(row.date, current)
  }

  for (const [date, amount] of expensesByDate) {
    const current = map.get(date) ?? emptyInOutPoint(date)
    current.expense = amount
    map.set(date, current)
  }

  const spanned = eachIsoDate(start, end)
  if (spanned.length === 0) {
    return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date))
  }

  return spanned.map((date) => map.get(date) ?? emptyInOutPoint(date))
}

function orderIconTone(order: OrderRow): string {
  if (isPosOrder(order)) return "bg-primary/15 text-primary"
  if (order.status === "pending") return "bg-amber-500/15 text-amber-700 dark:text-amber-400"
  if (order.status === "cancelled") return "bg-rose-500/10 text-rose-600"
  return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
}

function InOutChart({
  data,
  periodLabel,
}: {
  data: InOutPoint[]
  periodLabel: string
}) {
  const { t } = useTranslation("common")
  const chartConfig = {
    inn: { label: t("dashboard.chartPurchases"), color: "#2f9e9a" },
    out: { label: t("dashboard.chartSales"), color: "#92c720" },
    expense: { label: t("dashboard.chartExpenses"), color: "#e07a3d" },
  } satisfies ChartConfig

  return (
    <div className={cn(panelClass, "overflow-hidden")}>
      <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-2">
        <div>
          <p className="text-sm font-semibold tracking-tight">
            {t("dashboard.inVsOut")}
          </p>
          <p className="text-muted-foreground mt-0.5 text-xs">
            {t("dashboard.inVsOutHint", { period: periodLabel })}
          </p>
        </div>
      </div>
      <div className="px-3 pb-5 pt-1 sm:px-5">
        <ChartContainer
          config={chartConfig}
          className="!aspect-auto h-[320px] w-full min-h-[320px]"
        >
          <LineChart
            accessibilityLayer
            data={data}
            margin={{ top: 10, right: 12, left: 0, bottom: 0 }}
          >
            <CartesianGrid
              vertical
              horizontal
              syncWithTicks
              strokeDasharray="4 4"
              className="stroke-border/70"
            />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={{ stroke: "var(--border)", strokeOpacity: 0.8 }}
              tickMargin={10}
              minTickGap={16}
              interval="preserveStartEnd"
              tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
            />
            <YAxis
              tickLine={false}
              axisLine={{ stroke: "var(--border)", strokeOpacity: 0.8 }}
              width={46}
              tickCount={6}
              tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
              tickFormatter={formatAxisMoney}
              domain={[0, (dataMax: number) => Math.max(Number(dataMax) || 0, 1)]}
              allowDecimals={false}
              allowDataOverflow={false}
            />
            <ChartTooltip
              cursor={{ stroke: "var(--border)", strokeDasharray: "4 4" }}
              content={<ChartTooltipContent indicator="line" />}
            />
            <ChartLegend content={<ChartLegendContent />} />
            <Line
              type="monotone"
              dataKey="inn"
              stroke="var(--color-inn)"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
            <Line
              type="monotone"
              dataKey="out"
              stroke="var(--color-out)"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
            <Line
              type="monotone"
              dataKey="expense"
              stroke="var(--color-expense)"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
          </LineChart>
        </ChartContainer>
      </div>
    </div>
  )
}

function RecentSales({ orders }: { orders: OrderRow[] }) {
  const { t } = useTranslation("common")
  const { t: tr } = useTranslation("reports")

  return (
    <div className={cn(panelClass, "h-full overflow-hidden")}>
      <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-3">
        <div>
          <p className="text-sm font-semibold tracking-tight">
            {t("dashboard.recentSales")}
          </p>
          <p className="text-muted-foreground mt-0.5 text-xs">
            {t("dashboard.latestInvoices")}
          </p>
        </div>
        <Button variant="ghost" size="sm" className="h-8 shrink-0 px-2.5" asChild>
          <Link href="/sales">{t("dashboard.viewAll")}</Link>
        </Button>
      </div>

      <div className="border-border/50 border-t">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="text-muted-foreground h-10 px-4 text-[11px] font-semibold tracking-wide uppercase">
                {tr("salesPage.invoice")}
              </TableHead>
              <TableHead className="text-muted-foreground h-10 px-4 text-[11px] font-semibold tracking-wide uppercase">
                {tr("salesPage.customer")}
              </TableHead>
              <TableHead className="text-muted-foreground h-10 px-4 text-[11px] font-semibold tracking-wide uppercase">
                {tr("salesPage.date")}
              </TableHead>
              <TableHead className="text-muted-foreground h-10 px-4 text-[11px] font-semibold tracking-wide uppercase">
                {tr("salesPage.status")}
              </TableHead>
              <TableHead className="text-muted-foreground h-10 px-4 text-right text-[11px] font-semibold tracking-wide uppercase">
                {tr("salesPage.total")}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={5} className="p-0">
                  <div className="text-muted-foreground flex min-h-[14rem] items-center justify-center px-5 text-center text-sm">
                    {t("dashboard.noInvoices")}
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              orders.map((order) => {
                const pos = isPosOrder(order)
                return (
                  <TableRow key={order.id} className="border-border/50">
                    <TableCell className="px-4 py-3 font-medium tabular-nums">
                      {order.invoiceNumber}
                    </TableCell>
                    <TableCell className="max-w-[16rem] px-4 py-3">
                      <div className="flex min-w-0 items-center gap-2.5">
                        <div
                          className={cn(
                            "flex size-8 shrink-0 items-center justify-center rounded-lg text-[10px] font-semibold",
                            orderIconTone(order)
                          )}
                        >
                          {pos
                            ? "POS"
                            : order.customerName.slice(0, 1).toUpperCase()}
                        </div>
                        <p className="truncate text-sm font-medium">
                          {order.customerName}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground px-4 py-3 whitespace-nowrap tabular-nums">
                      {formatDate(order.orderDate)}
                    </TableCell>
                    <TableCell className="px-4 py-3">
                      <Badge
                        variant="outline"
                        className={cn(
                          "h-5 px-1.5 text-[10px]",
                          statusBadgeClass(order.status)
                        )}
                      >
                        {statusLabel(order.status)}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-4 py-3 text-right font-semibold tabular-nums">
                      {formatDashMoney(order.totalAmount)}
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

function RecentPurchases({ purchases }: { purchases: PurchaseRow[] }) {
  const { t } = useTranslation("common")
  const { t: tr } = useTranslation("reports")

  return (
    <div className={cn(panelClass, "h-full overflow-hidden")}>
      <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-3">
        <div>
          <p className="text-sm font-semibold tracking-tight">
            {t("dashboard.recentPurchases")}
          </p>
          <p className="text-muted-foreground mt-0.5 text-xs">
            {t("dashboard.latestPurchases")}
          </p>
        </div>
        <Button variant="ghost" size="sm" className="h-8 shrink-0 px-2.5" asChild>
          <Link href="/purchases">{t("dashboard.viewAll")}</Link>
        </Button>
      </div>

      <div className="border-border/50 border-t">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="text-muted-foreground h-10 px-4 text-[11px] font-semibold tracking-wide uppercase">
                {tr("purchasesPage.poNumber")}
              </TableHead>
              <TableHead className="text-muted-foreground h-10 px-4 text-[11px] font-semibold tracking-wide uppercase">
                {tr("purchasesPage.vendor")}
              </TableHead>
              <TableHead className="text-muted-foreground h-10 px-4 text-[11px] font-semibold tracking-wide uppercase">
                {tr("purchasesPage.date")}
              </TableHead>
              <TableHead className="text-muted-foreground h-10 px-4 text-[11px] font-semibold tracking-wide uppercase">
                {tr("purchasesPage.status")}
              </TableHead>
              <TableHead className="text-muted-foreground h-10 px-4 text-right text-[11px] font-semibold tracking-wide uppercase">
                {tr("purchasesPage.total")}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {purchases.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={5} className="p-0">
                  <div className="text-muted-foreground flex min-h-[14rem] items-center justify-center px-5 text-center text-sm">
                    {t("dashboard.noPurchases")}
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              purchases.map((purchase) => (
                <TableRow key={purchase.id} className="border-border/50">
                  <TableCell className="px-4 py-3 font-medium tabular-nums">
                    {purchase.purchaseNumber}
                  </TableCell>
                  <TableCell className="max-w-[16rem] px-4 py-3">
                    <p className="truncate text-sm font-medium">
                      {purchase.vendorName}
                    </p>
                  </TableCell>
                  <TableCell className="text-muted-foreground px-4 py-3 whitespace-nowrap tabular-nums">
                    {formatPurchaseDate(purchase.purchaseDate)}
                  </TableCell>
                  <TableCell className="px-4 py-3">
                    <Badge
                      variant="outline"
                      className={cn(
                        "h-5 px-1.5 text-[10px]",
                        purchaseStatusBadgeClass(purchase.status)
                      )}
                    >
                      {purchaseStatusLabel(purchase.status)}
                    </Badge>
                  </TableCell>
                  <TableCell className="px-4 py-3 text-right font-semibold tabular-nums">
                    {formatDashMoney(purchase.totalAmount)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

export function HomeDashboard() {
  const { t, i18n } = useTranslation("common")
  const { orders } = useOrders()
  const { purchases } = usePurchases()
  const { returns } = useReturns()
  const { expenses } = useExpenses()

  const filter = React.useMemo(() => createDefaultSalesReportFilter(), [])
  const purchaseFilter = filter as PurchaseReportFilter
  const periodLabel = t("dashboard.periodThisMonth")

  const salesSummary = React.useMemo(
    () => computeSalesReportSummary(orders, returns, filter),
    [filter, orders, returns]
  )
  const purchaseSummary = React.useMemo(
    () => computePurchaseReportSummary(purchases, returns, purchaseFilter),
    [purchaseFilter, purchases, returns]
  )
  const salesTimeline = React.useMemo(
    () => computeSalesTimeline(orders, returns, filter),
    [filter, orders, returns]
  )
  const purchaseTimeline = React.useMemo(
    () => computePurchaseTimeline(purchases, returns, purchaseFilter),
    [purchaseFilter, purchases, returns]
  )

  const paidMonthExpenses = React.useMemo(
    () =>
      expenses.filter((row) => {
        if (row.status !== "paid") return false
        if (filter.start && row.expenseDate < filter.start) return false
        if (filter.end && row.expenseDate > filter.end) return false
        return true
      }),
    [expenses, filter.end, filter.start]
  )

  const expensesByDate = React.useMemo(() => {
    const map = new Map<string, number>()
    for (const row of paidMonthExpenses) {
      map.set(row.expenseDate, (map.get(row.expenseDate) ?? 0) + (Number(row.amount) || 0))
    }
    return map
  }, [paidMonthExpenses])

  const expensesThisMonthTotal = React.useMemo(
    () =>
      paidMonthExpenses.reduce((sum, row) => sum + (Number(row.amount) || 0), 0),
    [paidMonthExpenses]
  )

  const inOutData = React.useMemo(
    () =>
      mergeInOut(
        purchaseTimeline,
        salesTimeline,
        expensesByDate,
        filter.start,
        filter.end
      ),
    [expensesByDate, filter.end, filter.start, purchaseTimeline, salesTimeline]
  )
  const recentOrders = React.useMemo(
    () => getRecentSalesOrders(orders, filter, 8),
    [filter, orders]
  )
  const recentPurchases = React.useMemo(
    () => getRecentPurchases(purchases, purchaseFilter, 8),
    [purchaseFilter, purchases]
  )

  const cameIn = Number(purchaseSummary.netPurchases) || 0
  const wentOut = Number(salesSummary.netSales) || 0
  const net = wentOut - cameIn - expensesThisMonthTotal

  const stats: DashboardStat[] = [
    {
      key: "came-in",
      label: t("dashboard.cameIn"),
      value: formatDashMoney(cameIn),
      footerTitle: t("dashboard.cameInTitle"),
      footerHint: t("dashboard.cameInHint", {
        count: purchaseSummary.completedCount,
        amount: formatDashMoney(purchaseSummary.grossPurchases),
      }),
    },
    {
      key: "went-out",
      label: t("dashboard.wentOut"),
      value: formatDashMoney(wentOut),
      footerTitle: t("dashboard.wentOutTitle"),
      footerHint: t("dashboard.wentOutHint", {
        count: salesSummary.completedCount,
        amount: formatDashMoney(salesSummary.grossSales),
      }),
    },
    {
      key: "expenses",
      label: t("dashboard.expensesThisMonth"),
      value: formatDashMoney(expensesThisMonthTotal),
      footerTitle: t("dashboard.expensesThisMonthTitle"),
      footerHint: t("dashboard.expensesThisMonthHint", {
        count: paidMonthExpenses.length,
        amount: formatDashMoney(expensesThisMonthTotal),
      }),
    },
    {
      key: "net",
      label: t("dashboard.netPosition"),
      value: formatDashMoney(net),
      footerTitle:
        net >= 0 ? t("dashboard.netPositive") : t("dashboard.netNegative"),
      footerHint: t("dashboard.netHint"),
    },
  ]

  return (
    <div key={i18n.language} className="flex flex-col gap-4">
      <SectionCards stats={stats} />

      <InOutChart data={inOutData} periodLabel={periodLabel} />

      <div className="grid gap-4 xl:grid-cols-2">
        <RecentSales orders={recentOrders} />
        <RecentPurchases purchases={recentPurchases} />
      </div>
    </div>
  )
}
