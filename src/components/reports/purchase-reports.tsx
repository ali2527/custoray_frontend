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
  PurchasePerformanceLineChart,
  PurchasesVsReturnsChart,
  PurchaseTopVendorsChart,
} from "@/components/reports/purchase-reports-charts"
import { PurchaseReportsSkeleton } from "@/components/reports/purchase-reports-skeleton"
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
import { usePurchases } from "@/context/purchases-context"
import { useReturns } from "@/context/returns-context"
import {
  computePurchaseDailyTotals,
  computePurchaseReportSummary,
  computePurchaseReportTrends,
  computePurchaseTimeline,
  computePurchaseTopVendors,
  createDefaultPurchaseReportFilter,
  formatPurchaseReportFilterLabel,
  formatPurchaseReportMoney,
  getRecentPurchases,
  PURCHASE_REPORT_PRESETS,
  resolvePurchaseReportRange,
  resolvePurchaseTimelineBucket,
  type PurchaseReportFilter,
  type PurchaseReportPreset,
} from "@/lib/purchase-reports"
import {
  computeBalance,
  formatDate,
  statusBadgeClass,
  statusLabel,
  type PurchaseRow,
} from "@/lib/purchases"
import { cn } from "@/lib/utils"

const panelClass =
  "rounded-2xl bg-card shadow-sm shadow-black/[0.03] ring-1 ring-border/50"

function formatTrend(value: number | null): string | null {
  if (value == null || !Number.isFinite(value)) return null
  const sign = value > 0 ? "+" : ""
  return `${sign}${value.toFixed(1)}%`
}

function PurchaseStatCard({
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

function purchaseIconTone(purchase: PurchaseRow): string {
  if (purchase.status === "pending")
    return "bg-amber-500/15 text-amber-700 dark:text-amber-400"
  if (purchase.status === "cancelled") return "bg-rose-500/10 text-rose-600"
  return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
}

function PurchaseList({ purchases }: { purchases: PurchaseRow[] }) {
  const { t } = useTranslation("reports")
  return (
    <div className={cn(panelClass, "overflow-hidden")}>
      <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-3">
        <div>
          <p className="text-sm font-semibold tracking-tight">
            {t("purchasesPage.recentPurchases")}
          </p>
          <p className="text-muted-foreground mt-0.5 text-xs">
            {t("purchasesPage.latestOrders")}
          </p>
        </div>
        {purchases.length > 0 ? (
          <span className="text-muted-foreground rounded-full bg-muted px-2.5 py-1 text-[11px] font-medium tabular-nums">
            {t("shared.shownCount", { count: purchases.length })}
          </span>
        ) : null}
      </div>

      {purchases.length === 0 ? (
        <p className="text-muted-foreground flex items-center justify-center px-5 py-12 text-center text-sm">
          {t("purchasesPage.noOrders")}
        </p>
      ) : (
        <div className="border-border/50 border-t">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-muted-foreground h-10 px-4 text-[11px] font-semibold tracking-wide uppercase">
                  {t("purchasesPage.poNumber")}
                </TableHead>
                <TableHead className="text-muted-foreground h-10 px-4 text-[11px] font-semibold tracking-wide uppercase">
                  {t("purchasesPage.vendor")}
                </TableHead>
                <TableHead className="text-muted-foreground h-10 px-4 text-[11px] font-semibold tracking-wide uppercase">
                  {t("purchasesPage.date")}
                </TableHead>
                <TableHead className="text-muted-foreground h-10 px-4 text-right text-[11px] font-semibold tracking-wide uppercase">
                  {t("purchasesPage.items")}
                </TableHead>
                <TableHead className="text-muted-foreground h-10 px-4 text-[11px] font-semibold tracking-wide uppercase">
                  {t("purchasesPage.status")}
                </TableHead>
                <TableHead className="text-muted-foreground h-10 px-4 text-right text-[11px] font-semibold tracking-wide uppercase">
                  {t("purchasesPage.total")}
                </TableHead>
                <TableHead className="text-muted-foreground h-10 px-4 text-right text-[11px] font-semibold tracking-wide uppercase">
                  {t("purchasesPage.payable")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {purchases.map((purchase) => {
                const balance = Number(computeBalance(purchase))
                const itemCount = purchase.lines.reduce(
                  (sum, line) => sum + line.quantity,
                  0
                )
                return (
                  <TableRow key={purchase.id} className="border-border/50">
                    <TableCell className="px-4 py-3 font-medium tabular-nums">
                      {purchase.purchaseNumber}
                    </TableCell>
                    <TableCell className="max-w-[16rem] px-4 py-3">
                      <div className="flex min-w-0 items-center gap-2.5">
                        <div
                          className={cn(
                            "flex size-8 shrink-0 items-center justify-center rounded-lg text-[10px] font-semibold",
                            purchaseIconTone(purchase)
                          )}
                        >
                          {purchase.vendorName.slice(0, 1).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">
                            {purchase.vendorName}
                          </p>
                          {purchase.description &&
                          purchase.description !== "—" ? (
                            <p className="text-muted-foreground truncate text-[11px]">
                              {purchase.description}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground px-4 py-3 whitespace-nowrap tabular-nums">
                      {formatDate(purchase.purchaseDate)}
                    </TableCell>
                    <TableCell className="px-4 py-3 text-right tabular-nums">
                      {itemCount}
                    </TableCell>
                    <TableCell className="px-4 py-3">
                      <Badge
                        variant="outline"
                        className={cn(
                          "h-5 px-1.5 text-[10px]",
                          statusBadgeClass(purchase.status)
                        )}
                      >
                        {statusLabel(purchase.status)}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-4 py-3 text-right font-semibold tabular-nums">
                      {formatPurchaseReportMoney(purchase.totalAmount)}
                    </TableCell>
                    <TableCell
                      className={cn(
                        "px-4 py-3 text-right tabular-nums",
                        balance > 0
                          ? "font-medium text-amber-700 dark:text-amber-400"
                          : "text-muted-foreground"
                      )}
                    >
                      {formatPurchaseReportMoney(balance.toFixed(2))}
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
  preset: PurchaseReportPreset,
  start: string,
  end: string
): PurchaseReportFilter {
  if (preset === "custom") {
    return { preset, start, end }
  }
  const range = resolvePurchaseReportRange({ preset, start: "", end: "" })
  return { preset, start: range.start, end: range.end }
}

export function PurchaseReports() {
  const { t } = useTranslation("reports")
  const { purchases } = usePurchases()
  const { returns: allReturns } = useReturns()
  const returns = React.useMemo(
    () => allReturns.filter((row) => row.type === "purchase"),
    [allReturns]
  )
  const [filter, setFilter] = React.useState<PurchaseReportFilter>(() =>
    createDefaultPurchaseReportFilter()
  )
  const [ready, setReady] = React.useState(false)

  React.useEffect(() => {
    const frame = window.requestAnimationFrame(() => setReady(true))
    return () => window.cancelAnimationFrame(frame)
  }, [])

  const summary = React.useMemo(
    () => computePurchaseReportSummary(purchases, returns, filter),
    [filter, purchases, returns]
  )
  const trends = React.useMemo(
    () => computePurchaseReportTrends(purchases, returns, filter),
    [filter, purchases, returns]
  )
  const dailyTotals = React.useMemo(
    () => computePurchaseDailyTotals(purchases, returns, filter),
    [filter, purchases, returns]
  )
  const timeline = React.useMemo(
    () => computePurchaseTimeline(purchases, returns, filter),
    [filter, purchases, returns]
  )
  const topVendors = React.useMemo(
    () => computePurchaseTopVendors(purchases, filter, 6),
    [filter, purchases]
  )
  const recentPurchases = React.useMemo(
    () => getRecentPurchases(purchases, filter, 12),
    [filter, purchases]
  )

  const periodLabel = formatPurchaseReportFilterLabel(filter)
  const range = resolvePurchaseReportRange(filter)
  const timelineBucket = resolvePurchaseTimelineBucket(range, filter.preset)
  const activeFilterCount = filter.preset === "this_month" ? 0 : 1
  const customDatesEnabled = filter.preset === "custom"

  const setPreset = (preset: PurchaseReportPreset) => {
    setFilter((prev) => withPresetDates(preset, prev.start, prev.end))
  }

  const resetFilters = () => {
    setFilter(createDefaultPurchaseReportFilter())
  }

  const handleExport = () => {
    if (dailyTotals.length === 0) {
      toast.error(t("shared.toastNoData"))
      return
    }

    downloadRowsAsXls(
      dailyTotals.map((row) => ({
        [t("purchasesPage.exportDate")]: row.label,
        [t("purchasesPage.exportPurchases")]: row.purchases,
        [t("purchasesPage.exportReturns")]: row.returns,
        [t("purchasesPage.exportNet")]: row.net,
        [t("purchasesPage.exportOrderCount")]: row.purchaseCount,
        [t("purchasesPage.exportReturnCount")]: row.returnCount,
      })),
      `purchase-report-${filter.preset}.xls`
    )
    toast.success(t("shared.toastExported"))
  }

  if (!ready) {
    return <PurchaseReportsSkeleton />
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
                    {PURCHASE_REPORT_PRESETS.map(({ value }) => {
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
                      <Label htmlFor="purchase-report-from" className="text-xs">
                        {t("shared.fromDate")}
                      </Label>
                      <Input
                        id="purchase-report-from"
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
                      <Label htmlFor="purchase-report-to" className="text-xs">
                        {t("shared.toDate")}
                      </Label>
                      <Input
                        id="purchase-report-to"
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
        <PurchaseStatCard
          label={t("purchasesPage.netPurchases")}
          value={formatPurchaseReportMoney(summary.netPurchases)}
          trend={trends.netChangePct}
          footerTitle={
            (trends.netChangePct ?? 0) >= 0
              ? t("purchasesPage.spendRising")
              : t("purchasesPage.spendEasing")
          }
          footerHint={t("purchasesPage.grossAfterReturns", {
            amount: formatPurchaseReportMoney(summary.grossPurchases),
          })}
        />
        <PurchaseStatCard
          label={t("purchasesPage.paymentRate")}
          value={`${summary.paymentRate.toFixed(0)}%`}
          trend={trends.paymentRateChangePct}
          footerTitle={
            summary.paymentRate >= 80
              ? t("purchasesPage.vendorsSettled")
              : t("purchasesPage.payablesNeedAttention")
          }
          footerHint={t("purchasesPage.payableAmount", {
            amount: formatPurchaseReportMoney(summary.outstanding),
          })}
        />
        <PurchaseStatCard
          label={t("purchasesPage.avgOrderValue")}
          value={formatPurchaseReportMoney(summary.avgOrderValue)}
          trend={trends.avgOrderValueChangePct}
          footerTitle={
            (trends.avgOrderValueChangePct ?? 0) >= 0
              ? t("purchasesPage.orderSizeGrowing")
              : t("purchasesPage.orderSizeShrinking")
          }
          footerHint={t("purchasesPage.acrossReceived", {
            count: summary.completedCount,
          })}
        />
        <PurchaseStatCard
          label={t("purchasesPage.receivedOrders")}
          value={String(summary.completedCount)}
          trend={trends.orderChangePct}
          footerTitle={t("purchasesPage.itemsReceived", {
            count: summary.itemsPurchased,
          })}
          footerHint={
            summary.returnRate > 0
              ? t("purchasesPage.returnRate", {
                  rate: summary.returnRate.toFixed(0),
                  amount: formatPurchaseReportMoney(summary.totalReturns),
                })
              : t("purchasesPage.ordersInPeriod", { count: summary.purchaseCount })
          }
        />
      </div>

      <PurchasePerformanceLineChart
        data={timeline}
        trends={trends}
        bucket={timelineBucket}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <PurchasesVsReturnsChart
          data={timeline}
          summary={summary}
          trends={trends}
          periodLabel={periodLabel}
          bucket={timelineBucket}
        />
        <PurchaseTopVendorsChart data={topVendors} />
      </div>

      <PurchaseList purchases={recentPurchases} />
    </div>
  )
}
