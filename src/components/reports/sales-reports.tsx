"use client"

import * as React from "react"
import {
  IconAdjustmentsHorizontal,
  IconCloudDownload,
  IconTrendingDown,
  IconTrendingUp,
} from "@tabler/icons-react"
import { toast } from "sonner"
import { useTranslation } from "react-i18next"

import {
  SalesPerformanceLineChart,
  SalesTopProductsChart,
  SalesVsReturnsChart,
} from "@/components/reports/sales-reports-charts"
import { SalesReportsSkeleton } from "@/components/reports/sales-reports-skeleton"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { downloadRowsAsXls } from "@/lib/excel-export"
import {
  computeBalance,
  formatDate,
  statusBadgeClass,
  statusLabel,
  type OrderRow,
} from "@/lib/orders"
import { isPosOrder } from "@/lib/pos"
import { useOrders } from "@/context/orders-context"
import { useReturns } from "@/context/returns-context"
import {
  computeSalesDailyTotals,
  computeSalesReportSummary,
  computeSalesReportTrends,
  computeSalesTimeline,
  computeSalesTopProducts,
  createDefaultSalesReportFilter,
  formatSalesReportFilterLabel,
  formatSalesReportMoney,
  getRecentSalesOrders,
  resolveSalesReportRange,
  resolveSalesTimelineBucket,
  SALES_REPORT_PRESETS,
  type SalesReportFilter,
  type SalesReportPreset,
} from "@/lib/sales-reports"
import { cn } from "@/lib/utils"

const panelClass =
  "rounded-2xl bg-card shadow-sm shadow-black/[0.03] ring-1 ring-border/50"

function formatTrend(value: number | null): string | null {
  if (value == null || !Number.isFinite(value)) return null
  const sign = value > 0 ? "+" : ""
  return `${sign}${value.toFixed(1)}%`
}

function SalesStatCard({
  label,
  value,
  trend,
  footerTitle,
  footerHint,
}: {
  label: string
  value: string
  trend?: number | null
  footerTitle: string
  footerHint: string
}) {
  const trendLabel = formatTrend(trend ?? null)
  const hasTrend = trendLabel != null
  const positive = (trend ?? 0) >= 0
  const TrendIcon = positive ? IconTrendingUp : IconTrendingDown

  return (
    <Card className="@container/card">
      <CardHeader>
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
          {value}
        </CardTitle>
        {hasTrend ? (
          <CardAction>
            <Badge variant="outline">
              <TrendIcon />
              {trendLabel}
            </Badge>
          </CardAction>
        ) : null}
      </CardHeader>
      <CardFooter className="flex-col items-start gap-1.5 text-sm">
        <div className="line-clamp-1 flex gap-2 font-medium">
          {footerTitle}
          {hasTrend ? <TrendIcon className="size-4" /> : null}
        </div>
        <div className="text-muted-foreground">{footerHint}</div>
      </CardFooter>
    </Card>
  )
}

function orderIconTone(order: OrderRow): string {
  if (isPosOrder(order)) return "bg-primary/15 text-primary"
  if (order.status === "pending") return "bg-amber-500/15 text-amber-700 dark:text-amber-400"
  if (order.status === "cancelled") return "bg-rose-500/10 text-rose-600"
  return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
}

function TransactionList({ orders }: { orders: OrderRow[] }) {
  const { t } = useTranslation("reports")
  return (
    <div className={cn(panelClass, "overflow-hidden")}>
      <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-3">
        <div>
          <p className="text-sm font-semibold tracking-tight">{t("salesPage.recentSales")}</p>
          <p className="text-muted-foreground mt-0.5 text-xs">
            {t("salesPage.latestInvoices")}
          </p>
        </div>
        {orders.length > 0 ? (
          <span className="text-muted-foreground rounded-full bg-muted px-2.5 py-1 text-[11px] font-medium tabular-nums">
            {t("shared.shownCount", { count: orders.length })}
          </span>
        ) : null}
      </div>

      {orders.length === 0 ? (
        <p className="text-muted-foreground flex items-center justify-center px-5 py-12 text-center text-sm">
          {t("salesPage.noInvoices")}
        </p>
      ) : (
        <div className="border-border/50 border-t">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-muted-foreground h-10 px-4 text-[11px] font-semibold tracking-wide uppercase">
                  {t("salesPage.invoice")}
                </TableHead>
                <TableHead className="text-muted-foreground h-10 px-4 text-[11px] font-semibold tracking-wide uppercase">
                  {t("salesPage.customer")}
                </TableHead>
                <TableHead className="text-muted-foreground h-10 px-4 text-[11px] font-semibold tracking-wide uppercase">
                  {t("salesPage.channel")}
                </TableHead>
                <TableHead className="text-muted-foreground h-10 px-4 text-[11px] font-semibold tracking-wide uppercase">
                  {t("salesPage.date")}
                </TableHead>
                <TableHead className="text-muted-foreground h-10 px-4 text-[11px] font-semibold tracking-wide uppercase">
                  {t("salesPage.payment")}
                </TableHead>
                <TableHead className="text-muted-foreground h-10 px-4 text-[11px] font-semibold tracking-wide uppercase">
                  {t("salesPage.status")}
                </TableHead>
                <TableHead className="text-muted-foreground h-10 px-4 text-right text-[11px] font-semibold tracking-wide uppercase">
                  {t("salesPage.total")}
                </TableHead>
                <TableHead className="text-muted-foreground h-10 px-4 text-right text-[11px] font-semibold tracking-wide uppercase">
                  {t("salesPage.balance")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((order) => {
                const balance = Number(computeBalance(order))
                const pos = isPosOrder(order)
                return (
                  <TableRow key={order.id} className="border-border/50">
                    <TableCell className="px-4 py-3 font-medium tabular-nums">
                      {order.invoiceNumber}
                    </TableCell>
                    <TableCell className="max-w-[14rem] px-4 py-3">
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
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">
                            {order.customerName}
                          </p>
                          {order.description && order.description !== "—" ? (
                            <p className="text-muted-foreground truncate text-[11px]">
                              {order.description}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="px-4 py-3">
                      <Badge
                        variant="outline"
                        className={cn(
                          "h-5 px-1.5 text-[10px]",
                          pos
                            ? "border-primary/30 text-primary"
                            : "border-border text-muted-foreground"
                        )}
                      >
                        {pos ? t("shared.channelPos") : t("shared.channelBackOffice")}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground px-4 py-3 whitespace-nowrap tabular-nums">
                      {formatDate(order.orderDate)}
                    </TableCell>
                    <TableCell className="px-4 py-3 whitespace-nowrap">
                      {order.paymentMethod}
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
                      {formatSalesReportMoney(order.totalAmount)}
                    </TableCell>
                    <TableCell
                      className={cn(
                        "px-4 py-3 text-right tabular-nums",
                        balance > 0
                          ? "font-medium text-amber-700 dark:text-amber-400"
                          : "text-muted-foreground"
                      )}
                    >
                      {formatSalesReportMoney(balance.toFixed(2))}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}

function withPresetDates(
  preset: SalesReportPreset,
  start: string,
  end: string
): SalesReportFilter {
  if (preset === "custom") {
    return { preset, start, end }
  }
  const range = resolveSalesReportRange({ preset, start: "", end: "" })
  return { preset, start: range.start, end: range.end }
}

export function SalesReports() {
  const { t } = useTranslation("reports")
  const { orders } = useOrders()
  const { returns: allReturns } = useReturns()
  const returns = React.useMemo(
    () => allReturns.filter((row) => row.type === "sales"),
    [allReturns]
  )
  const [filter, setFilter] = React.useState<SalesReportFilter>(() =>
    createDefaultSalesReportFilter()
  )
  const [ready, setReady] = React.useState(false)

  React.useEffect(() => {
    const frame = window.requestAnimationFrame(() => setReady(true))
    return () => window.cancelAnimationFrame(frame)
  }, [])

  const summary = React.useMemo(
    () => computeSalesReportSummary(orders, returns, filter),
    [filter, orders, returns]
  )
  const trends = React.useMemo(
    () => computeSalesReportTrends(orders, returns, filter),
    [filter, orders, returns]
  )
  const dailyTotals = React.useMemo(
    () => computeSalesDailyTotals(orders, returns, filter),
    [filter, orders, returns]
  )
  const timeline = React.useMemo(
    () => computeSalesTimeline(orders, returns, filter),
    [filter, orders, returns]
  )
  const topProducts = React.useMemo(
    () => computeSalesTopProducts(orders, filter, 6),
    [filter, orders]
  )
  const recentOrders = React.useMemo(
    () => getRecentSalesOrders(orders, filter, 12),
    [filter, orders]
  )

  const periodLabel = formatSalesReportFilterLabel(filter)
  const range = resolveSalesReportRange(filter)
  const timelineBucket = resolveSalesTimelineBucket(range, filter.preset)
  const activeFilterCount = filter.preset === "this_month" ? 0 : 1
  const customDatesEnabled = filter.preset === "custom"

  const setPreset = (preset: SalesReportPreset) => {
    setFilter((prev) => withPresetDates(preset, prev.start, prev.end))
  }

  const resetFilters = () => {
    setFilter(createDefaultSalesReportFilter())
  }

  const handleExport = () => {
    if (dailyTotals.length === 0) {
      toast.error(t("shared.toastNoData"))
      return
    }

    downloadRowsAsXls(
      dailyTotals.map((row) => ({
        [t("salesPage.exportDate")]: row.label,
        [t("salesPage.exportSales")]: row.sales,
        [t("salesPage.exportReturns")]: row.returns,
        [t("salesPage.exportNet")]: row.net,
        [t("salesPage.exportSaleCount")]: row.saleCount,
        [t("salesPage.exportReturnCount")]: row.returnCount,
      })),
      `sales-report-${filter.preset}.xls`
    )
    toast.success(t("shared.toastExported"))
  }

  if (!ready) {
    return <SalesReportsSkeleton />
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{periodLabel}</p>
          <p className="text-muted-foreground truncate text-xs">
            {formatDate(range.start)}
            {range.start !== range.end ? ` – ${formatDate(range.end)}` : ""}
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2 lg:shrink-0">
          <Popover modal={false}>
            <div className="border-border/70 bg-background inline-flex h-9 shrink-0 items-center overflow-visible rounded-full border shadow-sm">
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "text-muted-foreground hover:bg-muted/50 hover:text-foreground relative size-9 rounded-full border-0 shadow-none",
                    activeFilterCount > 0 && "bg-primary/5 text-foreground"
                  )}
                  aria-label={t("shared.openFilters")}
                >
                  <IconAdjustmentsHorizontal className="size-4 opacity-90" />
                  {activeFilterCount > 0 ? (
                    <span className="bg-primary text-primary-foreground border-background pointer-events-none absolute top-0 right-0 z-10 flex size-5 translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 text-[10px] font-semibold tabular-nums leading-none shadow-sm">
                      {activeFilterCount > 9 ? "9+" : activeFilterCount}
                    </span>
                  ) : null}
                </Button>
              </PopoverTrigger>
            </div>
            <PopoverContent
              align="end"
              sideOffset={6}
              className="border-border/70 text-popover-foreground w-[min(100vw-1.5rem,22rem)] max-w-[22rem] overflow-hidden rounded-xl border bg-popover p-0 shadow-xl"
              onOpenAutoFocus={(e) => e.preventDefault()}
            >
              <div className="from-muted/50 border-border/60 bg-gradient-to-b to-popover border-b px-4 py-3.5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 space-y-1">
                    <h3 className="text-foreground text-sm font-semibold tracking-tight">
                      {t("shared.reportFilters")}
                    </h3>
                    <p className="text-muted-foreground text-[11px] leading-relaxed">
                      {t("shared.filtersHint")}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-muted-foreground hover:text-foreground h-8 shrink-0 border-border/80 px-2.5 text-xs font-medium"
                    disabled={activeFilterCount === 0}
                    onClick={resetFilters}
                  >
                    {t("shared.resetFilters")}
                  </Button>
                </div>
              </div>

              <div className="max-h-[min(70vh,28rem)] space-y-4 overflow-y-auto px-4 py-3">
                <div className="space-y-2">
                  <Label className="text-muted-foreground block text-[11px] font-semibold tracking-wide uppercase">
                    {t("shared.period")}
                  </Label>
                  <div className="flex flex-wrap gap-1.5">
                    {SALES_REPORT_PRESETS.map(({ value }) => {
                      const selected = filter.preset === value
                      return (
                        <Button
                          key={value}
                          type="button"
                          variant={selected ? "default" : "outline"}
                          size="sm"
                          className="h-7 rounded-full px-2.5 text-xs"
                          onClick={() => setPreset(value)}
                        >
                          {t(`presets.${value}`)}
                        </Button>
                      )
                    })}
                  </div>
                </div>

                <div className="border-border/80 space-y-3 border-t pt-3">
                  <Label className="text-muted-foreground block text-[11px] font-semibold tracking-wide uppercase">
                    {t("shared.dateRange")}
                  </Label>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="sales-report-from" className="text-xs">
                        {t("shared.fromDate")}
                      </Label>
                      <Input
                        id="sales-report-from"
                        type="date"
                        value={range.start}
                        max={range.end || undefined}
                        disabled={!customDatesEnabled}
                        onChange={(event) =>
                          setFilter((prev) => ({
                            ...prev,
                            preset: "custom",
                            start: event.target.value,
                          }))
                        }
                        className="border-input/80 bg-background h-8 text-sm shadow-none"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="sales-report-to" className="text-xs">
                        {t("shared.toDate")}
                      </Label>
                      <Input
                        id="sales-report-to"
                        type="date"
                        value={range.end}
                        min={range.start || undefined}
                        disabled={!customDatesEnabled}
                        onChange={(event) =>
                          setFilter((prev) => ({
                            ...prev,
                            preset: "custom",
                            end: event.target.value,
                          }))
                        }
                        className="border-input/80 bg-background h-8 text-sm shadow-none"
                      />
                    </div>
                  </div>
                  <p className="text-muted-foreground text-[11px]">
                    {customDatesEnabled
                      ? `${formatDate(range.start)} – ${formatDate(range.end)}`
                      : t("shared.switchToCustom")}
                  </p>
                </div>
              </div>
            </PopoverContent>
          </Popover>

          <Button
            type="button"
            variant="outline"
            className="h-9 rounded-full px-7 shadow-sm"
            onClick={handleExport}
          >
            <IconCloudDownload />
            <span className="hidden sm:inline">{t("shared.export")}</span>
          </Button>
        </div>
      </div>

      <div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 gap-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs sm:grid-cols-2 xl:grid-cols-4">
        <SalesStatCard
          label={t("salesPage.netSales")}
          value={formatSalesReportMoney(summary.netSales)}
          trend={trends.netChangePct}
          footerTitle={
            (trends.netChangePct ?? 0) >= 0
              ? t("salesPage.trendingUp")
              : t("salesPage.trendingDown")
          }
          footerHint={t("salesPage.grossAfterReturns", {
            amount: formatSalesReportMoney(summary.grossSales),
          })}
        />
        <SalesStatCard
          label={t("salesPage.collectionRate")}
          value={`${summary.collectionRate.toFixed(0)}%`}
          trend={trends.collectionRateChangePct}
          footerTitle={
            summary.collectionRate >= 80
              ? t("salesPage.strongCollections")
              : t("salesPage.collectionsNeedAttention")
          }
          footerHint={t("salesPage.outstanding", {
            amount: formatSalesReportMoney(summary.outstanding),
          })}
        />
        <SalesStatCard
          label={t("salesPage.avgTicket")}
          value={formatSalesReportMoney(summary.avgTicket)}
          trend={trends.avgTicketChangePct}
          footerTitle={
            (trends.avgTicketChangePct ?? 0) >= 0
              ? t("salesPage.ticketImproving")
              : t("salesPage.ticketSoftening")
          }
          footerHint={t("salesPage.acrossCompleted", {
            count: summary.completedCount,
          })}
        />
        <SalesStatCard
          label={t("salesPage.completedInvoices")}
          value={String(summary.completedCount)}
          trend={trends.invoiceChangePct}
          footerTitle={t("salesPage.itemsSold", { count: summary.itemsSold })}
          footerHint={
            summary.returnRate > 0
              ? t("salesPage.returnRate", {
                  rate: summary.returnRate.toFixed(0),
                  amount: formatSalesReportMoney(summary.totalReturns),
                })
              : t("salesPage.invoicesInPeriod", { count: summary.saleCount })
          }
        />
      </div>

      <SalesPerformanceLineChart
        data={timeline}
        trends={trends}
        bucket={timelineBucket}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <SalesVsReturnsChart
          data={timeline}
          summary={summary}
          trends={trends}
          periodLabel={periodLabel}
          bucket={timelineBucket}
        />
        <SalesTopProductsChart data={topProducts} />
      </div>

      <TransactionList orders={recentOrders} />
    </div>
  )
}
