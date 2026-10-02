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
  CashFlowChart,
  OutstandingAgingChart,
  TopPartiesChart,
} from "@/components/reports/payment-reports-charts"
import { PaymentReportsSkeleton } from "@/components/reports/payment-reports-skeleton"
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
import { usePayments } from "@/context/payments-context"
import {
  computePaymentAging,
  computePaymentCashFlow,
  computePaymentReportSummary,
  computePaymentReportTrends,
  computeTopPaymentParties,
  createDefaultPaymentReportFilter,
  formatPaymentReportFilterLabel,
  formatPaymentReportMoney,
  getRecentPayments,
  PAYMENT_REPORT_PRESETS,
  resolvePaymentReportRange,
  resolvePaymentTimelineBucket,
  type PaymentReportFilter,
  type PaymentReportPreset,
} from "@/lib/payment-reports"
import {
  formatDate,
  statusBadgeClass,
  statusLabel,
  typeBadgeClass,
  type PaymentRow,
} from "@/lib/payments"
import { cn } from "@/lib/utils"

const panelClass =
  "rounded-2xl bg-card shadow-sm shadow-black/[0.03] ring-1 ring-border/50"

function formatTrend(value: number | null): string | null {
  if (value == null || !Number.isFinite(value)) return null
  const sign = value > 0 ? "+" : ""
  return `${sign}${value.toFixed(1)}%`
}

function PaymentStatCard({
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

function paymentIconTone(payment: PaymentRow): string {
  if (payment.status === "voided") return "bg-muted text-muted-foreground"
  if (payment.status === "pending")
    return "bg-amber-500/15 text-amber-700 dark:text-amber-400"
  if (payment.type === "customer")
    return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
  return "bg-violet-500/15 text-violet-700 dark:text-violet-400"
}

function PaymentList({ payments }: { payments: PaymentRow[] }) {
  const { t } = useTranslation("reports")
  return (
    <div className={cn(panelClass, "overflow-hidden")}>
      <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-3">
        <div>
          <p className="text-sm font-semibold tracking-tight">
            {t("paymentsPage.recentPayments")}
          </p>
          <p className="text-muted-foreground mt-0.5 text-xs">
            {t("paymentsPage.receiptsPayouts")}
          </p>
        </div>
        {payments.length > 0 ? (
          <span className="text-muted-foreground rounded-full bg-muted px-2.5 py-1 text-[11px] font-medium tabular-nums">
            {t("shared.shownCount", { count: payments.length })}
          </span>
        ) : null}
      </div>

      {payments.length === 0 ? (
        <p className="text-muted-foreground flex items-center justify-center px-5 py-12 text-center text-sm">
          {t("paymentsPage.noPayments")}
        </p>
      ) : (
        <div className="border-border/50 border-t">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-muted-foreground h-10 px-4 text-[11px] font-semibold tracking-wide uppercase">
                  {t("paymentsPage.number")}
                </TableHead>
                <TableHead className="text-muted-foreground h-10 px-4 text-[11px] font-semibold tracking-wide uppercase">
                  {t("paymentsPage.party")}
                </TableHead>
                <TableHead className="text-muted-foreground h-10 px-4 text-[11px] font-semibold tracking-wide uppercase">
                  {t("paymentsPage.direction")}
                </TableHead>
                <TableHead className="text-muted-foreground h-10 px-4 text-[11px] font-semibold tracking-wide uppercase">
                  {t("paymentsPage.date")}
                </TableHead>
                <TableHead className="text-muted-foreground h-10 px-4 text-[11px] font-semibold tracking-wide uppercase">
                  {t("paymentsPage.method")}
                </TableHead>
                <TableHead className="text-muted-foreground h-10 px-4 text-[11px] font-semibold tracking-wide uppercase">
                  {t("paymentsPage.status")}
                </TableHead>
                <TableHead className="text-muted-foreground h-10 px-4 text-right text-[11px] font-semibold tracking-wide uppercase">
                  {t("paymentsPage.amount")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.map((payment) => {
                const inbound = payment.type === "customer"
                return (
                  <TableRow key={payment.id} className="border-border/50">
                    <TableCell className="px-4 py-3 font-medium tabular-nums">
                      {payment.paymentNumber}
                    </TableCell>
                    <TableCell className="max-w-[16rem] px-4 py-3">
                      <div className="flex min-w-0 items-center gap-2.5">
                        <div
                          className={cn(
                            "flex size-8 shrink-0 items-center justify-center rounded-lg text-[10px] font-semibold",
                            paymentIconTone(payment)
                          )}
                        >
                          {payment.partyName.slice(0, 1).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">
                            {payment.partyName}
                          </p>
                          <p className="text-muted-foreground truncate text-[11px]">
                            {payment.referenceNumber}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="px-4 py-3">
                      <Badge
                        variant="outline"
                        className={cn(
                          "h-5 px-1.5 text-[10px]",
                          typeBadgeClass(payment.type)
                        )}
                      >
                        {inbound ? t("paymentsPage.in") : t("paymentsPage.out")}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground px-4 py-3 whitespace-nowrap tabular-nums">
                      {formatDate(payment.paymentDate)}
                    </TableCell>
                    <TableCell className="px-4 py-3 whitespace-nowrap">
                      {payment.paymentMethod}
                    </TableCell>
                    <TableCell className="px-4 py-3">
                      <Badge
                        variant="outline"
                        className={cn(
                          "h-5 px-1.5 text-[10px]",
                          statusBadgeClass(payment.status)
                        )}
                      >
                        {statusLabel(payment.status)}
                      </Badge>
                    </TableCell>
                    <TableCell
                      className={cn(
                        "px-4 py-3 text-right font-semibold tabular-nums",
                        payment.status === "voided"
                          ? "text-muted-foreground line-through"
                          : inbound
                            ? "text-emerald-700 dark:text-emerald-400"
                            : "text-rose-700 dark:text-rose-400"
                      )}
                    >
                      {inbound ? "+" : "−"}
                      {formatPaymentReportMoney(payment.amount)}
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
  preset: PaymentReportPreset,
  start: string,
  end: string
): PaymentReportFilter {
  if (preset === "custom") {
    return { preset, start, end }
  }
  const range = resolvePaymentReportRange({ preset, start: "", end: "" })
  return { preset, start: range.start, end: range.end }
}

export function PaymentReports() {
  const { t } = useTranslation("reports")
  const { payments } = usePayments()
  const [filter, setFilter] = React.useState<PaymentReportFilter>(() =>
    createDefaultPaymentReportFilter()
  )
  const [ready, setReady] = React.useState(false)

  React.useEffect(() => {
    const frame = window.requestAnimationFrame(() => setReady(true))
    return () => window.cancelAnimationFrame(frame)
  }, [])

  const summary = React.useMemo(
    () => computePaymentReportSummary(payments, filter),
    [filter, payments]
  )
  const trends = React.useMemo(
    () => computePaymentReportTrends(payments, filter),
    [filter, payments]
  )
  const cashFlow = React.useMemo(
    () => computePaymentCashFlow(payments, filter),
    [filter, payments]
  )
  const aging = React.useMemo(() => computePaymentAging(payments), [payments])
  const topCustomers = React.useMemo(
    () => computeTopPaymentParties(payments, filter, "customer", 6),
    [filter, payments]
  )
  const recentPayments = React.useMemo(
    () => getRecentPayments(payments, filter, 12),
    [filter, payments]
  )

  const periodLabel = formatPaymentReportFilterLabel(filter)
  const range = resolvePaymentReportRange(filter)
  const timelineBucket = resolvePaymentTimelineBucket(range, filter.preset)
  const activeFilterCount = filter.preset === "this_month" ? 0 : 1
  const customDatesEnabled = filter.preset === "custom"

  const setPreset = (preset: PaymentReportPreset) => {
    setFilter((prev) => withPresetDates(preset, prev.start, prev.end))
  }

  const resetFilters = () => {
    setFilter(createDefaultPaymentReportFilter())
  }

  const handleExport = () => {
    if (cashFlow.length === 0) {
      toast.error(t("shared.toastNoData"))
      return
    }

    downloadRowsAsXls(
      cashFlow.map((row) => ({
        [t("paymentsPage.exportDate")]: row.label,
        [t("paymentsPage.exportReceived")]: row.received,
        [t("paymentsPage.exportPaidOut")]: row.paidOut,
        [t("paymentsPage.exportNet")]: row.net,
        [t("paymentsPage.exportReceiptCount")]: row.receivedCount,
        [t("paymentsPage.exportPayoutCount")]: row.paidOutCount,
      })),
      `payment-report-${filter.preset}.xls`
    )
    toast.success(t("shared.toastExported"))
  }

  if (!ready) {
    return <PaymentReportsSkeleton />
  }

  const net = Number(summary.netCashFlow)

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
                    {PAYMENT_REPORT_PRESETS.map(({ value }) => {
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
                      <Label htmlFor="payment-report-from" className="text-xs">
                        {t("shared.fromDate")}
                      </Label>
                      <Input
                        id="payment-report-from"
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
                      <Label htmlFor="payment-report-to" className="text-xs">
                        {t("shared.toDate")}
                      </Label>
                      <Input
                        id="payment-report-to"
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
        <PaymentStatCard
          label={t("paymentsPage.moneyIn")}
          value={formatPaymentReportMoney(summary.received)}
          trend={trends.receivedChangePct}
          footerTitle={t("paymentsPage.customerReceipts", {
            count: summary.receivedCount,
          })}
          footerHint={t("paymentsPage.avgReceipt", {
            amount: formatPaymentReportMoney(summary.avgReceipt),
          })}
        />
        <PaymentStatCard
          label={t("paymentsPage.moneyOut")}
          value={formatPaymentReportMoney(summary.paidOut)}
          trend={trends.paidOutChangePct}
          footerTitle={t("paymentsPage.vendorPayouts", {
            count: summary.paidOutCount,
          })}
          footerHint={t("paymentsPage.inboundShare", {
            rate: summary.collectionShare.toFixed(0),
          })}
        />
        <PaymentStatCard
          label={t("paymentsPage.netCashFlow")}
          value={formatPaymentReportMoney(summary.netCashFlow)}
          trend={trends.netChangePct}
          footerTitle={
            net >= 0
              ? t("paymentsPage.positivePeriod")
              : t("paymentsPage.negativePeriod")
          }
          footerHint={
            net >= 0
              ? t("paymentsPage.receiptsOutpaced")
              : t("paymentsPage.payoutsOutpaced")
          }
        />
        <PaymentStatCard
          label={t("paymentsPage.outstanding")}
          value={formatPaymentReportMoney(summary.outstanding)}
          footerTitle={t("paymentsPage.owedToYou", {
            amount: formatPaymentReportMoney(summary.pendingIn),
          })}
          footerHint={t("paymentsPage.owedToVendors", {
            amount: formatPaymentReportMoney(summary.pendingOut),
          })}
        />
      </div>

      <CashFlowChart
        data={cashFlow}
        trends={trends}
        bucket={timelineBucket}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <OutstandingAgingChart data={aging} />
        <TopPartiesChart
          data={topCustomers}
          title={t("paymentsPage.topPayingCustomers")}
          description={t("paymentsPage.largestReceipts")}
        />
      </div>

      <PaymentList payments={recentPayments} />
    </div>
  )
}
