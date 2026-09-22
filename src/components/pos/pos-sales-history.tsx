"use client"

import * as React from "react"
import Link from "next/link"
import {
  IconChevronDown,
  IconDownload,
  IconLayoutGrid,
  IconLayoutList,
  IconReceipt,
  IconRotateClockwise,
  IconSearch,
  IconShoppingCart,
} from "@tabler/icons-react"
import { toast } from "sonner"
import { useTranslation } from "react-i18next"

import { InvoicePdfButton } from "@/components/invoices/invoice-pdf-button"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { SearchInput } from "@/components/ui/search-input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useOrders } from "@/context/orders-context"
import { useProducts } from "@/context/products-context"
import { useReturns } from "@/context/returns-context"
import { usePosSettings } from "@/context/pos-settings-context"
import { confirmReturnAction } from "@/lib/confirm-action"
import { apiPosReturn } from "@/lib/api/business"
import { ApiClientError } from "@/lib/api/client"
import { mapApiReturnToRow, resolveDefaultStoreId } from "@/lib/pos-api"
import { emitProductsChanged } from "@/lib/inventory-product-rows"
import { isDiscountLine, isAdditionLine } from "@/lib/pos"
import { formatMoney } from "@/lib/customers"
import { downloadRowsAsXls } from "@/lib/excel-export"
import { buildReturnFromOrder } from "@/lib/returns"
import {
  formatDate,
  ORDER_STATUSES,
  PAYMENT_METHODS,
  statusBadgeClass,
  statusLabel,
  type OrderRow,
} from "@/lib/orders"
import { isPosOrder, POS_DISCOUNT_LINE_NAME } from "@/lib/pos"
import { canReturnDocument } from "@/lib/return-eligibility"
import { cn } from "@/lib/utils"

function formatPosMoney(value: string) {
  return formatMoney(value).replace(/^\$/, "Rs ")
}

const panelClass =
  "rounded-xl bg-card shadow-sm shadow-black/[0.04] ring-1 ring-border/40"

const POS_SALES_VIEW_KEY = "custoray-pos-sales-view-mode"

type StatusFilter = "all" | OrderRow["status"]
type PaymentFilter = "all" | OrderRow["paymentMethod"]
type ViewLayout = "list" | "grid"

function loadViewLayout(): ViewLayout {
  if (typeof window === "undefined") return "grid"
  const stored = window.localStorage.getItem(POS_SALES_VIEW_KEY)
  return stored === "list" || stored === "grid" ? stored : "grid"
}

function saveViewLayout(layout: ViewLayout) {
  if (typeof window === "undefined") return
  window.localStorage.setItem(POS_SALES_VIEW_KEY, layout)
}

function orderItemCount(order: OrderRow): number {
  return order.lines
    .filter((line) => line.productName !== POS_DISCOUNT_LINE_NAME)
    .reduce((sum, line) => sum + line.quantity, 0)
}

function sumOrderTotals(orders: OrderRow[]): number {
  return orders.reduce((acc, order) => {
    const value = Number(order.totalAmount)
    return acc + (Number.isFinite(value) ? value : 0)
  }, 0)
}

function productLinesForOrder(order: OrderRow) {
  return order.lines.filter((line) => line.productName !== POS_DISCOUNT_LINE_NAME)
}

function ViewLayoutToggle({
  value,
  onChange,
}: {
  value: ViewLayout
  onChange: (value: ViewLayout) => void
}) {
  const { t } = useTranslation("pos")
  return (
    <div
      className="border-border/70 bg-background inline-flex h-9 shrink-0 items-center overflow-hidden rounded-full border shadow-sm"
      role="group"
      aria-label={t("salesHistory.viewLayout")}
    >
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className={cn(
          "size-9 rounded-none border-0 shadow-none",
          value === "list"
            ? "bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary"
            : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
        )}
        aria-label={t("salesHistory.tableView")}
        aria-pressed={value === "list"}
        onClick={() => onChange("list")}
      >
        <IconLayoutList className="size-4 opacity-90" />
      </Button>
      <div className="bg-border/70 h-5 w-px" aria-hidden />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className={cn(
          "size-9 rounded-none border-0 shadow-none",
          value === "grid"
            ? "bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary"
            : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
        )}
        aria-label={t("salesHistory.gridView")}
        aria-pressed={value === "grid"}
        onClick={() => onChange("grid")}
      >
        <IconLayoutGrid className="size-4 opacity-90" />
      </Button>
    </div>
  )
}

function StatCard({
  label,
  value,
  hint,
}: {
  label: string
  value: string
  hint?: string
}) {
  return (
    <div className={cn(panelClass, "p-4")}>
      <p className="text-muted-foreground text-xs font-medium">{label}</p>
      <p className="mt-1 text-lg font-semibold tabular-nums tracking-tight">{value}</p>
      {hint ? <p className="text-muted-foreground mt-0.5 text-[11px]">{hint}</p> : null}
    </div>
  )
}

type SaleOrderActionsProps = {
  order: OrderRow
  onReturn: () => void
  returning: boolean
  compact?: boolean
}

function SaleOrderActions({ order, onReturn, returning, compact }: SaleOrderActionsProps) {
  const { t } = useTranslation("pos")
  const returnable = canReturnDocument(order)

  return (
    <div className={cn("flex flex-wrap gap-2", compact && "justify-end")}>
      <InvoicePdfButton
        order={order}
        size="sm"
        variant="outline"
        label={compact ? t("salesHistory.pdf") : t("salesHistory.downloadPdf")}
      />
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={!returnable || returning}
        onClick={(event) => {
          event.stopPropagation()
          onReturn()
        }}
      >
        <IconRotateClockwise className="size-3.5" />
        {t("return")}
      </Button>
    </div>
  )
}

function SaleOrderLines({ order }: { order: OrderRow }) {
  const { t } = useTranslation("pos")
  const productLines = productLinesForOrder(order)

  return (
    <>
      <div className="space-y-1.5">
        {productLines.map((line) => (
          <div
            key={line.id}
            className="bg-muted/25 flex items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm"
          >
            <div className="min-w-0">
              <p className="truncate font-medium">{line.productName}</p>
              <p className="text-muted-foreground text-xs tabular-nums">
                {line.quantity} × {formatPosMoney(line.unitPrice)}
              </p>
            </div>
            <p className="shrink-0 font-medium tabular-nums">
              {formatPosMoney(line.lineTotal)}
            </p>
          </div>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-muted-foreground text-xs tabular-nums">
          {t("salesHistory.paidOf", {
            paid: formatPosMoney(order.paidAmount),
            total: formatPosMoney(order.totalAmount),
          })}
        </p>
      </div>
    </>
  )
}

type SaleCardProps = {
  order: OrderRow
  expanded: boolean
  onToggle: () => void
  onReturn: () => void
  returning: boolean
}

function SaleCard({ order, expanded, onToggle, onReturn, returning }: SaleCardProps) {
  const { t } = useTranslation("pos")
  const items = orderItemCount(order)
  const returnable = canReturnDocument(order)

  return (
    <article
      className={cn(
        panelClass,
        "overflow-hidden transition-colors",
        expanded && "ring-primary/25"
      )}
    >
      <button
        type="button"
        onClick={onToggle}
        className="hover:bg-muted/20 flex w-full items-start gap-3 px-4 py-3.5 text-left transition-colors"
      >
        <div className="bg-primary/10 text-primary mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg">
          <IconReceipt className="size-4" stroke={1.75} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <p className="text-sm font-semibold tabular-nums tracking-tight">
              {order.invoiceNumber}
            </p>
            <Badge
              variant="outline"
              className={cn("h-5 px-1.5 text-[10px] font-normal", statusBadgeClass(order.status))}
            >
              {statusLabel(order.status)}
            </Badge>
            <Badge
              variant="outline"
              className="h-5 border-border/50 px-1.5 text-[10px] font-normal"
            >
              {order.paymentMethod}
            </Badge>
          </div>
          <p className="text-muted-foreground mt-0.5 truncate text-xs">{order.customerName}</p>
          <p className="text-muted-foreground mt-1 text-[11px]">
            {formatDate(order.orderDate)} · {t("salesHistory.itemCount", { count: items })}
          </p>
        </div>

        <div className="flex shrink-0 flex-col items-end gap-1">
          <p className="text-sm font-semibold tabular-nums">{formatPosMoney(order.totalAmount)}</p>
          <IconChevronDown
            className={cn(
              "text-muted-foreground size-4 transition-transform",
              expanded && "rotate-180"
            )}
            stroke={1.75}
          />
        </div>
      </button>

      {expanded ? (
        <div className="border-border/40 border-t px-4 pb-4">
          <div className="mt-3">
            <SaleOrderLines order={order} />
          </div>
          <div className="mt-3">
            <SaleOrderActions order={order} onReturn={onReturn} returning={returning} />
          </div>
          {!returnable ? (
            <p className="text-muted-foreground mt-2 text-[11px]">
              {t("salesHistory.returnsAvailable")}
            </p>
          ) : null}
        </div>
      ) : null}
    </article>
  )
}

type SalesHistoryTableProps = {
  orders: OrderRow[]
  expandedId: number | null
  onToggle: (orderId: number) => void
  onReturn: (order: OrderRow) => void
  returningId: number | null
}

function SalesHistoryTable({
  orders,
  expandedId,
  onToggle,
  onReturn,
  returningId,
}: SalesHistoryTableProps) {
  const { t } = useTranslation("pos")
  return (
    <div className="overflow-hidden rounded-lg border">
      <Table>
        <TableHeader className="bg-muted sticky top-0 z-10">
          <TableRow>
            <TableHead className="w-8" />
            <TableHead>{t("salesHistory.exportReceipt")}</TableHead>
            <TableHead>{t("salesHistory.exportCustomer")}</TableHead>
            <TableHead>{t("salesHistory.exportDate")}</TableHead>
            <TableHead>{t("salesHistory.exportPayment")}</TableHead>
            <TableHead className="text-center">{t("salesHistory.exportItems")}</TableHead>
            <TableHead className="text-right">{t("salesHistory.exportTotal")}</TableHead>
            <TableHead className="text-right">{t("salesHistory.exportPaid")}</TableHead>
            <TableHead>{t("salesHistory.exportStatus")}</TableHead>
            <TableHead className="text-right">{t("salesHistory.actions")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders.map((order) => {
            const expanded = expandedId === order.id
            const items = orderItemCount(order)

            return (
              <React.Fragment key={order.id}>
                <TableRow
                  className={cn("cursor-pointer", expanded && "bg-muted/30")}
                  onClick={() => onToggle(order.id)}
                >
                  <TableCell>
                    <IconChevronDown
                      className={cn(
                        "text-muted-foreground size-4 transition-transform",
                        expanded && "rotate-180"
                      )}
                      stroke={1.75}
                    />
                  </TableCell>
                  <TableCell className="font-medium tabular-nums">
                    {order.invoiceNumber}
                  </TableCell>
                  <TableCell className="max-w-[10rem] truncate">
                    {order.customerName}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs tabular-nums">
                    {formatDate(order.orderDate)}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs">
                    {order.paymentMethod}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-center tabular-nums">
                    {items}
                  </TableCell>
                  <TableCell className="text-right font-medium tabular-nums">
                    {formatPosMoney(order.totalAmount)}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-right tabular-nums">
                    {formatPosMoney(order.paidAmount)}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={cn(
                        "h-5 px-1.5 text-[10px] font-normal",
                        statusBadgeClass(order.status)
                      )}
                    >
                      {statusLabel(order.status)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right" onClick={(event) => event.stopPropagation()}>
                    <SaleOrderActions
                      order={order}
                      onReturn={() => onReturn(order)}
                      returning={returningId === order.id}
                      compact
                    />
                  </TableCell>
                </TableRow>
                {expanded ? (
                  <TableRow className="bg-muted/15 hover:bg-muted/15">
                    <TableCell colSpan={10} className="p-0">
                      <div className="border-border/40 border-t px-4 py-4">
                        <SaleOrderLines order={order} />
                      </div>
                    </TableCell>
                  </TableRow>
                ) : null}
              </React.Fragment>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}

export function PosSalesHistory() {
  const { t } = useTranslation("pos")
  const { orders, getOrder, updateOrder } = useOrders()
  const { refreshProducts } = useProducts()
  const { addReturn } = useReturns()
  const { storeId: settingsStoreId } = usePosSettings()

  const [search, setSearch] = React.useState("")
  const [statusFilter, setStatusFilter] = React.useState<StatusFilter>("all")
  const [paymentFilter, setPaymentFilter] = React.useState<PaymentFilter>("all")
  const [expandedId, setExpandedId] = React.useState<number | null>(null)
  const [returningId, setReturningId] = React.useState<number | null>(null)
  const [viewLayout, setViewLayout] = React.useState<ViewLayout>("grid")

  React.useEffect(() => {
    setViewLayout(loadViewLayout())
  }, [])

  const handleViewLayoutChange = React.useCallback((layout: ViewLayout) => {
    setViewLayout(layout)
    saveViewLayout(layout)
  }, [])

  const allPosOrders = React.useMemo(
    () =>
      orders
        .filter(isPosOrder)
        .sort((a, b) => {
          const dateCompare = b.orderDate.localeCompare(a.orderDate)
          if (dateCompare !== 0) return dateCompare
          return b.id - a.id
        }),
    [orders]
  )

  const posOrders = React.useMemo(() => {
    const query = search.trim().toLowerCase()
    return allPosOrders.filter((order) => {
      if (statusFilter !== "all" && order.status !== statusFilter) return false
      if (paymentFilter !== "all" && order.paymentMethod !== paymentFilter) return false
      if (!query) return true
      return (
        order.invoiceNumber.toLowerCase().includes(query) ||
        order.customerName.toLowerCase().includes(query) ||
        order.paymentMethod.toLowerCase().includes(query)
      )
    })
  }, [allPosOrders, paymentFilter, search, statusFilter])

  const summary = React.useMemo(() => {
    const completed = posOrders.filter((order) => order.status === "completed")
    const pending = posOrders.filter((order) => order.status === "pending")
    return {
      count: posOrders.length,
      total: sumOrderTotals(posOrders),
      completedCount: completed.length,
      completedTotal: sumOrderTotals(completed),
      pendingCount: pending.length,
    }
  }, [posOrders])

  const handleReturnOrder = React.useCallback(
    async (order: OrderRow) => {
      if (!canReturnDocument(order)) {
        toast.error(t("salesHistory.cannotReturn"))
        return
      }

      if (!order.apiId) {
        toast.error(t("salesHistory.cannotReturn"))
        return
      }

      const draft = buildReturnFromOrder(order)
      if (
        !(await confirmReturnAction({
          scope: "invoice",
          itemName: order.invoiceNumber,
          referenceNumber: order.invoiceNumber,
          totalAmount: draft.totalAmount,
          refundDue: draft.refundDue,
        }))
      ) {
        return
      }

      setReturningId(order.id)
      try {
        const storeId = settingsStoreId || (await resolveDefaultStoreId())
        const lines = order.lines
          .filter(
            (line) =>
              !isDiscountLine(line) &&
              !isAdditionLine(line) &&
              Number(line.unitPrice) >= 0 &&
              line.quantity > 0
          )
          .map((line) => ({
            productId: line.productApiId || null,
            productName: line.productName,
            quantity: line.quantity,
            unitPrice: Math.max(0, Number(line.unitPrice) || 0),
          }))

        if (lines.length === 0) {
          toast.error(t("salesHistory.cannotReturn"))
          return
        }

        const apiReturn = await apiPosReturn({
          storeId,
          sourceOrderId: order.apiId,
          partyName: order.customerName,
          referenceNumber: order.invoiceNumber,
          description: `POS return from ${order.invoiceNumber}`,
          status: "completed",
          restock: true,
          lines,
        })

        const created = addReturn(
          {
            ...mapApiReturnToRow(apiReturn, { sourceNumericId: order.id }),
            status: "completed",
          },
          {
            getOrder,
            onApplySales: updateOrder,
          }
        )

        void refreshProducts({ silent: true })
        emitProductsChanged()
        toast.success(t("salesHistory.returnRecorded", { returnNumber: created.returnNumber }))
      } catch (error) {
        const message =
          error instanceof ApiClientError
            ? error.message
            : error instanceof Error
              ? error.message
              : "Return failed"
        toast.error(message)
      } finally {
        setReturningId(null)
      }
    },
    [
      addReturn,
      getOrder,
      refreshProducts,
      settingsStoreId,
      t,
      updateOrder,
    ]
  )

  const handleExport = () => {
    if (posOrders.length === 0) {
      toast.error(t("salesHistory.noSalesExport"))
      return
    }

    downloadRowsAsXls(
      posOrders.map((order) => ({
        [t("salesHistory.exportReceipt")]: order.invoiceNumber,
        [t("salesHistory.exportDate")]: formatDate(order.orderDate),
        [t("salesHistory.exportCustomer")]: order.customerName,
        [t("salesHistory.exportPayment")]: order.paymentMethod,
        [t("salesHistory.exportStatus")]: statusLabel(order.status),
        [t("salesHistory.exportTotal")]: order.totalAmount,
        [t("salesHistory.exportPaid")]: order.paidAmount,
        [t("salesHistory.exportItems")]: orderItemCount(order),
      })),
      "pos-sales-history.xls"
    )
    toast.success(t("salesHistory.exported"))
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">{t("salesHistory.title")}</h2>
          <p className="text-muted-foreground mt-1 text-sm">
            {t("salesHistory.hint")}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" onClick={handleExport}>
            <IconDownload className="size-4" />
            {t("salesHistory.export")}
          </Button>
          <Button type="button" size="sm" asChild>
            <Link href="/pos">
              <IconShoppingCart className="size-4" />
              {t("salesHistory.openRegister")}
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label={t("salesHistory.receipts")}
          value={String(summary.count)}
          hint={t("salesHistory.totalInRegister", { count: allPosOrders.length })}
        />
        <StatCard
          label={t("salesHistory.filteredTotal")}
          value={formatPosMoney(summary.total.toFixed(2))}
          hint={t("salesHistory.allStatuses")}
        />
        <StatCard
          label={t("salesHistory.completed")}
          value={String(summary.completedCount)}
          hint={formatPosMoney(summary.completedTotal.toFixed(2))}
        />
        <StatCard
          label={t("salesHistory.pending")}
          value={String(summary.pendingCount)}
          hint={t("salesHistory.awaitingPayment")}
        />
      </div>

      <div className={cn(panelClass, "overflow-hidden")}>
        <div className="border-border/40 border-b px-4 py-4">
          <div className="flex items-center gap-2 overflow-x-auto">
            <SearchInput
              placeholder={t("salesHistory.searchPlaceholder")}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              icon={<IconSearch className="size-5" />}
              className="h-11 min-w-[14rem] flex-1 rounded-full text-base shadow-sm focus-visible:ring-0 focus-visible:ring-offset-0 hover:ring-0 focus:ring-0 focus:outline-none sm:max-w-md"
            />
            <Select
              value={paymentFilter}
              onValueChange={(value) => setPaymentFilter(value as PaymentFilter)}
            >
              <SelectTrigger className="h-11 w-[150px] shrink-0">
                <SelectValue placeholder={t("salesHistory.paymentMethod")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("salesHistory.allPayments")}</SelectItem>
                {PAYMENT_METHODS.map((method) => (
                  <SelectItem key={method} value={method}>
                    {method}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="border-border/40 flex shrink-0 items-center gap-1.5 border-l pl-2">
              <button
                type="button"
                onClick={() => setStatusFilter("all")}
                className={cn(
                  "rounded-full px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors ring-1",
                  statusFilter === "all"
                    ? "bg-primary text-primary-foreground ring-primary"
                    : "bg-muted/30 text-muted-foreground ring-border/40 hover:text-foreground"
                )}
              >
                {t("salesHistory.all")}
              </button>
              {ORDER_STATUSES.map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => setStatusFilter(status)}
                  className={cn(
                    "rounded-full px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors ring-1",
                    statusFilter === status
                      ? "bg-primary text-primary-foreground ring-primary"
                      : "bg-muted/30 text-muted-foreground ring-border/40 hover:text-foreground"
                  )}
                >
                  {statusLabel(status)}
                </button>
              ))}
            </div>
            <ViewLayoutToggle value={viewLayout} onChange={handleViewLayoutChange} />
          </div>
        </div>

        <div className="p-4">
          {posOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-14 text-center">
              <div className="bg-muted/60 text-muted-foreground flex size-12 items-center justify-center rounded-2xl">
                <IconReceipt className="size-5" stroke={1.5} />
              </div>
              <p className="text-sm font-medium">{t("salesHistory.noSalesMatch")}</p>
              <p className="text-muted-foreground max-w-sm text-xs">
                {allPosOrders.length === 0
                  ? t("salesHistory.emptyComplete")
                  : t("salesHistory.emptyFilter")}
              </p>
              {allPosOrders.length === 0 ? (
                <Button type="button" size="sm" className="mt-2" asChild>
                  <Link href="/pos">{t("salesHistory.goToRegister")}</Link>
                </Button>
              ) : null}
            </div>
          ) : viewLayout === "list" ? (
            <SalesHistoryTable
              orders={posOrders}
              expandedId={expandedId}
              onToggle={(orderId) =>
                setExpandedId((current) => (current === orderId ? null : orderId))
              }
              onReturn={handleReturnOrder}
              returningId={returningId}
            />
          ) : (
            <div className="grid gap-2 lg:grid-cols-2">
              {posOrders.map((order) => (
                <SaleCard
                  key={order.id}
                  order={order}
                  expanded={expandedId === order.id}
                  onToggle={() =>
                    setExpandedId((current) => (current === order.id ? null : order.id))
                  }
                  onReturn={() => handleReturnOrder(order)}
                  returning={returningId === order.id}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
