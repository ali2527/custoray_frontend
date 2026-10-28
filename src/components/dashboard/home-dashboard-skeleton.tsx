"use client"

import Link from "next/link"
import { useTranslation } from "react-i18next"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"

const panelClass =
  "rounded-2xl bg-card shadow-sm shadow-black/[0.03] ring-1 ring-border/50"

function StatCardSkeleton({
  label,
  footerTitle,
}: {
  label: string
  footerTitle: string
}) {
  return (
    <Card className="@container/card">
      <CardHeader>
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
          <Skeleton className="h-8 w-[7.5rem] @[250px]/card:h-9" />
        </CardTitle>
      </CardHeader>
      <CardFooter className="flex-col items-start gap-1.5 text-sm">
        <div className="line-clamp-1 font-medium">{footerTitle}</div>
        <Skeleton className="h-3 w-40" />
      </CardFooter>
    </Card>
  )
}

function ChartSkeleton() {
  const { t } = useTranslation("common")
  const periodLabel = t("dashboard.periodThisMonth")

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
        <div className="relative h-[320px] w-full min-h-[320px] overflow-hidden rounded-xl">
          <Skeleton className="absolute inset-0 rounded-xl" />
          <div className="absolute inset-x-8 bottom-8 flex items-end justify-between gap-3">
            {Array.from({ length: 8 }).map((_, index) => (
              <Skeleton
                key={index}
                className="w-full max-w-8 rounded-t-md"
                style={{ height: `${36 + ((index * 17) % 48)}%` }}
              />
            ))}
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-center gap-4">
          <div className="flex items-center gap-2 text-xs">
            <span className="size-2 rounded-full bg-[#2f9e9a]" />
            {t("dashboard.chartPurchases")}
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="size-2 rounded-full bg-[#92c720]" />
            {t("dashboard.chartSales")}
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="size-2 rounded-full bg-[#e07a3d]" />
            {t("dashboard.chartExpenses")}
          </div>
        </div>
      </div>
    </div>
  )
}

function RecentSalesSkeleton() {
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
            {Array.from({ length: 6 }).map((_, index) => (
              <TableRow key={index} className="border-border/50">
                <TableCell className="px-4 py-3">
                  <Skeleton className="h-4 w-16" />
                </TableCell>
                <TableCell className="max-w-[16rem] px-4 py-3">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <Skeleton className="size-8 shrink-0 rounded-lg" />
                    <Skeleton className="h-4 w-28 max-w-full" />
                  </div>
                </TableCell>
                <TableCell className="px-4 py-3">
                  <Skeleton className="h-4 w-20" />
                </TableCell>
                <TableCell className="px-4 py-3">
                  <Skeleton className="h-5 w-14 rounded-full" />
                </TableCell>
                <TableCell className="px-4 py-3 text-right">
                  <Skeleton className="ms-auto h-4 w-16" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

function RecentPurchasesSkeleton() {
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
            {Array.from({ length: 6 }).map((_, index) => (
              <TableRow key={index} className="border-border/50">
                <TableCell className="px-4 py-3">
                  <Skeleton className="h-4 w-16" />
                </TableCell>
                <TableCell className="max-w-[16rem] px-4 py-3">
                  <Skeleton className="h-4 w-32 max-w-full" />
                </TableCell>
                <TableCell className="px-4 py-3">
                  <Skeleton className="h-4 w-20" />
                </TableCell>
                <TableCell className="px-4 py-3">
                  <Skeleton className="h-5 w-14 rounded-full" />
                </TableCell>
                <TableCell className="px-4 py-3 text-right">
                  <Skeleton className="ms-auto h-4 w-16" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

export function HomeDashboardSkeleton() {
  const { t, i18n } = useTranslation("common")

  const stats = [
    {
      key: "came-in",
      label: t("dashboard.cameIn"),
      footerTitle: t("dashboard.cameInTitle"),
    },
    {
      key: "went-out",
      label: t("dashboard.wentOut"),
      footerTitle: t("dashboard.wentOutTitle"),
    },
    {
      key: "expenses",
      label: t("dashboard.expensesThisMonth"),
      footerTitle: t("dashboard.expensesThisMonthTitle"),
    },
    {
      key: "net",
      label: t("dashboard.netPosition"),
      footerTitle: t("dashboard.netPositive"),
    },
  ]

  return (
    <div
      key={i18n.language}
      className="flex flex-col gap-4"
      aria-busy="true"
      aria-label="Loading dashboard"
    >
      <div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 gap-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
        {stats.map((stat) => (
          <StatCardSkeleton
            key={stat.key}
            label={stat.label}
            footerTitle={stat.footerTitle}
          />
        ))}
      </div>

      <ChartSkeleton />

      <div className="grid gap-4 xl:grid-cols-2">
        <RecentSalesSkeleton />
        <RecentPurchasesSkeleton />
      </div>
    </div>
  )
}
