"use client"

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { ColumnDef } from "@tanstack/react-table"
import {
  IconCopy,
  IconDotsVertical,
  IconEye,
  IconPencil,
  IconReceipt,
  IconRotateClockwise,
  IconTrash,
  IconX,
} from "@tabler/icons-react"
import { toast } from "sonner"
import { useTranslation } from "react-i18next"
import type { TFunction } from "i18next"

import { OrderDetail } from "@/components/orders/order-detail"
import { OrderForm } from "@/components/orders/order-form"
import { SaleLineDetail } from "@/components/sales/sale-line-detail"
import { SalesViewTableOption } from "@/components/sales/sales-view-toggle"
import { DataTableColumnHeader } from "@/components/data-table-column-header"
import { DataTable } from "@/components/data-table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { useAuth } from "@/context/auth-context"
import { useOrders } from "@/context/orders-context"
import { usePosSettings } from "@/context/pos-settings-context"
import { useProducts } from "@/context/products-context"
import { useReturns } from "@/context/returns-context"
import { useInvoiceLineReturn } from "@/hooks/use-invoice-line-return"
import {
  apiCreateOrder,
  apiUpdateOrder,
  type ApiOrderCreateInput,
} from "@/lib/api/business"
import { invalidateCustomers } from "@/lib/customers-query"
import {
  persistCancelOrder,
  persistCreateOrder,
  persistDeleteOrder,
  persistDuplicateOrder,
  persistUpdateOrder,
} from "@/lib/order-persist"
import { mapApiOrderToRow, mapApiReturnToRow, resolveDefaultStoreId } from "@/lib/pos-api"
import { persistCompletedReturn } from "@/lib/return-persist"
import {
  confirmCancelAction,
  confirmDeleteAction,
  confirmDuplicateAction,
  confirmReturnAction,
} from "@/lib/confirm-action"
import {
  loadSalesViewMode,
  saveSalesViewMode,
  type BillItemViewMode,
} from "@/lib/app-preferences"
import { buildSampleCsv } from "@/lib/csv"
import { markSetupMilestone } from "@/lib/setup-progress"
import {
  computeBalance,
  computeOrderTotal,
  EMPTY_ORDER,
  flattenOrderForExport,
  formatDate,
  formatMoney,
  importOrdersFromRows,
  nextInvoiceNumber,
  ORDER_IMPORT_COLUMNS,
  ORDER_IMPORT_SAMPLE_ROW,
  ORDER_STATUSES,
  PAYMENT_METHODS,
  orderFromFormData,
  statusBadgeClass,
  type OrderRow,
} from "@/lib/orders"
import { buildReturnFromOrder } from "@/lib/returns"
import { canCancelDocument, canReturnDocument } from "@/lib/return-eligibility"
import {
  flattenOrdersToSaleLines,
  flattenSaleLineForExport,
  type SaleLineRow,
} from "@/lib/sales-report"

function textFilterMeta(label: string) {
  return { dataTableFilterVariant: "text" as const, dataTableFilterLabel: label }
}

function rangeFilterMeta(label: string) {
  return { dataTableFilterVariant: "range" as const, dataTableFilterLabel: label }
}

function statusFilterMeta(t: TFunction<"sales">, label = t("columns.status")) {
  return {
    dataTableFilterVariant: "select" as const,
    dataTableFilterLabel: label,
    dataTableFilterSelectLabels: Object.fromEntries(
      ORDER_STATUSES.map((status) => [status, t(`status.${status}`)])
    ),
  }
}

type SaleFormSidebarState =
  | { step: "form"; mode: "add" }
  | { step: "form"; mode: "edit"; order: OrderRow }
  | null

function selectColumn<T>(t: TFunction<"sales">): ColumnDef<T> {
  return {
    id: "select",
    header: ({ table }) => (
      <div className="flex items-center justify-center">
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && "indeterminate")
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label={t("table.selectAll", { ns: "common" })}
        />
      </div>
    ),
    cell: ({ row }) => (
      <div className="flex items-center justify-center">
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label={t("table.selectRow", { ns: "common" })}
        />
      </div>
    ),
    enableSorting: false,
    enableHiding: false,
  }
}

function srNoColumn<T>(t: TFunction<"sales">): ColumnDef<T> {
  return {
    id: "srNo",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title={t("columns.srNo")} />
    ),
    cell: ({ row, table }) => {
      const { pageIndex, pageSize } = table.getState().pagination
      const srNo = pageIndex * pageSize + row.index + 1
      return (
        <span className="text-muted-foreground font-mono tabular-nums">{srNo}</span>
      )
    },
    enableSorting: false,
    meta: { dataTableFilter: false },
  }
}

function getSalesBillColumns(
  t: TFunction<"sales">,
  openBillSidebar: (row: OrderRow) => void,
  onEditBill: (row: OrderRow) => void,
  onOpenInvoice: (orderId: number) => void,
  onDuplicate: (row: OrderRow) => void,
  onDelete: (row: OrderRow) => void,
  onReturn: (row: OrderRow) => void,
  onCancel: (row: OrderRow) => void
): ColumnDef<OrderRow>[] {
  return [
    selectColumn<OrderRow>(t),
    srNoColumn<OrderRow>(t),
    {
      accessorKey: "invoiceNumber",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("columns.invoiceNumber")} />
      ),
      cell: ({ row }) => (
        <button
          type="button"
          className="text-foreground text-left font-medium hover:underline"
          onClick={() => openBillSidebar(row.original)}
        >
          {row.original.invoiceNumber}
        </button>
      ),
      enableHiding: false,
      meta: textFilterMeta(t("columns.invoiceNumber")),
    },
    {
      accessorKey: "customerName",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("columns.customer")} />
      ),
      cell: ({ row }) => (
        <span className="text-foreground max-w-[10rem] truncate">
          {row.original.customerName}
        </span>
      ),
      meta: textFilterMeta(t("columns.customer")),
    },
    {
      id: "items",
      accessorFn: (row) => (row.lines ?? []).length,
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("columns.items")} align="center" />
      ),
      cell: ({ row }) => (
        <div className="flex justify-center">
          <span className="text-muted-foreground tabular-nums">
            {(row.original.lines ?? []).length}
          </span>
        </div>
      ),
      meta: rangeFilterMeta(t("columns.items")),
    },
    {
      accessorKey: "orderDate",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("columns.date")} />
      ),
      cell: ({ row }) => (
        <span className="text-muted-foreground tabular-nums text-xs">
          {formatDate(row.original.orderDate)}
        </span>
      ),
      meta: textFilterMeta(t("columns.date")),
    },
    {
      accessorKey: "totalAmount",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("columns.totalAmount")} align="center" />
      ),
      cell: ({ row }) => (
        <div className="flex justify-center">
          <span className="text-foreground tabular-nums">
            {formatMoney(row.original.totalAmount)}
          </span>
        </div>
      ),
      meta: rangeFilterMeta(t("columns.totalAmount")),
    },
    {
      id: "adjustments",
      accessorFn: (row) =>
        (row.lines ?? []).reduce((sum, line) => {
          const list = Number(line.listPrice ?? line.unitPrice)
          const unit = Number(line.unitPrice)
          if (!Number.isFinite(list) || !Number.isFinite(unit)) return sum
          return sum + (unit - list) * (Number(line.quantity) || 0)
        }, 0),
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title={t("columns.adjustments")}
          align="center"
        />
      ),
      cell: ({ row }) => {
        const adjustment = (row.original.lines ?? []).reduce((sum, line) => {
          const list = Number(line.listPrice ?? line.unitPrice)
          const unit = Number(line.unitPrice)
          if (!Number.isFinite(list) || !Number.isFinite(unit)) return sum
          return sum + (unit - list) * (Number(line.quantity) || 0)
        }, 0)
        if (Math.abs(adjustment) < 0.005) {
          return (
            <div className="flex justify-center">
              <span className="text-muted-foreground tabular-nums">—</span>
            </div>
          )
        }
        const amount = formatMoney(Math.abs(adjustment).toFixed(2))
        return (
          <div className="flex justify-center">
            <span
              className={
                adjustment < 0
                  ? "text-emerald-700 dark:text-emerald-400 tabular-nums"
                  : "text-amber-700 dark:text-amber-400 tabular-nums"
              }
            >
              {adjustment < 0 ? `−${amount}` : `+${amount}`}
            </span>
          </div>
        )
      },
      meta: rangeFilterMeta(t("columns.adjustments")),
    },
    {
      accessorKey: "paidAmount",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("columns.paidAmount")} align="center" />
      ),
      cell: ({ row }) => (
        <div className="flex justify-center">
          <span className="text-foreground tabular-nums">
            {formatMoney(row.original.paidAmount)}
          </span>
        </div>
      ),
      meta: rangeFilterMeta(t("columns.paidAmount")),
    },
    {
      id: "balance",
      accessorFn: (row) => Number(computeBalance(row)),
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("columns.balance")} align="center" />
      ),
      cell: ({ row }) => {
        const balance = computeBalance(row.original)
        return (
          <div className="flex justify-center">
            <span
              className={
                Number(balance) > 0
                  ? "text-amber-700 tabular-nums dark:text-amber-400"
                  : "text-muted-foreground tabular-nums"
              }
            >
              {formatMoney(balance)}
            </span>
          </div>
        )
      },
      meta: rangeFilterMeta(t("columns.balance")),
    },
    {
      accessorKey: "status",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("columns.status")} />
      ),
      cell: ({ row }) => (
        <Badge variant="outline" className={statusBadgeClass(row.original.status)}>
          {t(`status.${row.original.status}`)}
        </Badge>
      ),
      meta: statusFilterMeta(t),
    },
    {
      id: "actions",
      enableSorting: false,
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="data-[state=open]:bg-muted text-muted-foreground flex size-8"
              size="icon"
            >
              <IconDotsVertical />
              <span className="sr-only">{t("actions.openMenu")}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem onClick={() => onOpenInvoice(row.original.id)}>
              <IconReceipt />
              {t("actions.viewInvoice")}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onEditBill(row.original)}>
              <IconPencil />
              {t("actions.edit")}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onDuplicate(row.original)}>
              <IconCopy />
              {t("actions.duplicate")}
            </DropdownMenuItem>
            {canReturnDocument(row.original) ? (
              <DropdownMenuItem onClick={() => onReturn(row.original)}>
                <IconRotateClockwise />
                {t("actions.return")}
              </DropdownMenuItem>
            ) : null}
            {canCancelDocument(row.original) ? (
              <DropdownMenuItem onClick={() => onCancel(row.original)}>
                <IconX />
                {t("actions.cancel")}
              </DropdownMenuItem>
            ) : null}
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onClick={() => onDelete(row.original)}>
              <IconTrash />
              {t("actions.delete")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ]
}

function getSalesLineColumns(
  t: TFunction<"sales">,
  openLineSidebar: (row: SaleLineRow) => void,
  onEditLine: (row: SaleLineRow) => void,
  onOpenInvoice: (orderId: number) => void,
  onDeleteLine: (row: SaleLineRow) => void,
  onReturnLine: (row: SaleLineRow) => void,
  onCancelLine: (row: SaleLineRow) => void,
  resolveOrder: (line: SaleLineRow) => OrderRow | undefined
): ColumnDef<SaleLineRow>[] {
  return [
    selectColumn<SaleLineRow>(t),
    srNoColumn<SaleLineRow>(t),
    {
      accessorKey: "invoiceNumber",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("columns.invoiceNumber")} />
      ),
      cell: ({ row }) => (
        <button
          type="button"
          className="text-foreground text-left font-medium hover:underline"
          onClick={() => openLineSidebar(row.original)}
        >
          {row.original.invoiceNumber}
        </button>
      ),
      enableHiding: false,
      meta: textFilterMeta(t("columns.invoiceNumber")),
    },
    {
      accessorKey: "customerName",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("columns.customer")} />
      ),
      cell: ({ row }) => (
        <span className="text-foreground max-w-[10rem] truncate">
          {row.original.customerName}
        </span>
      ),
      meta: textFilterMeta(t("columns.customer")),
    },
    {
      accessorKey: "orderDate",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("columns.date")} />
      ),
      cell: ({ row }) => (
        <span className="text-muted-foreground tabular-nums text-xs">
          {formatDate(row.original.orderDate)}
        </span>
      ),
      meta: textFilterMeta(t("columns.date")),
    },
    {
      accessorKey: "productName",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("columns.item")} />
      ),
      cell: ({ row }) => (
        <button
          type="button"
          className="text-foreground max-w-[14rem] truncate text-left font-medium hover:underline"
          onClick={() => openLineSidebar(row.original)}
        >
          {row.original.productName}
        </button>
      ),
      enableHiding: false,
      meta: textFilterMeta(t("columns.item")),
    },
    {
      accessorKey: "quantity",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("columns.qty")} align="center" />
      ),
      cell: ({ row }) => (
        <div className="flex justify-center">
          <span className="text-foreground tabular-nums">{row.original.quantity}</span>
        </div>
      ),
      meta: rangeFilterMeta(t("columns.qty")),
    },
    {
      accessorKey: "listPrice",
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title={t("columns.originalPrice")}
          align="center"
        />
      ),
      cell: ({ row }) => (
        <div className="flex justify-center">
          <span className="text-muted-foreground tabular-nums">
            {formatMoney(row.original.listPrice)}
          </span>
        </div>
      ),
      meta: rangeFilterMeta(t("columns.originalPrice")),
    },
    {
      accessorKey: "unitPrice",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("columns.unitPrice")} align="center" />
      ),
      cell: ({ row }) => {
        const list = Number(row.original.listPrice)
        const unit = Number(row.original.unitPrice)
        const discounted =
          Number.isFinite(list) && Number.isFinite(unit) && list > unit + 0.004
        return (
          <div className="flex justify-center">
            <span
              className={
                discounted
                  ? "text-foreground tabular-nums font-medium"
                  : "text-muted-foreground tabular-nums"
              }
            >
              {formatMoney(row.original.unitPrice)}
            </span>
          </div>
        )
      },
      meta: rangeFilterMeta(t("columns.unitPrice")),
    },
    {
      id: "adjustments",
      accessorFn: (row) => {
        const list = Number(row.listPrice)
        const unit = Number(row.unitPrice)
        if (!Number.isFinite(list) || !Number.isFinite(unit)) return 0
        return (unit - list) * (Number(row.quantity) || 0)
      },
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title={t("columns.adjustments")}
          align="center"
        />
      ),
      cell: ({ row }) => {
        const list = Number(row.original.listPrice)
        const unit = Number(row.original.unitPrice)
        const qty = Number(row.original.quantity) || 0
        const adjustment =
          Number.isFinite(list) && Number.isFinite(unit)
            ? (unit - list) * qty
            : 0
        if (Math.abs(adjustment) < 0.005) {
          return (
            <div className="flex justify-center">
              <span className="text-muted-foreground tabular-nums">—</span>
            </div>
          )
        }
        const amount = formatMoney(Math.abs(adjustment).toFixed(2))
        return (
          <div className="flex justify-center">
            <span
              className={
                adjustment < 0
                  ? "text-emerald-700 dark:text-emerald-400 tabular-nums"
                  : "text-amber-700 dark:text-amber-400 tabular-nums"
              }
            >
              {adjustment < 0 ? `−${amount}` : `+${amount}`}
            </span>
          </div>
        )
      },
      meta: rangeFilterMeta(t("columns.adjustments")),
    },
    {
      accessorKey: "lineTotal",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("columns.lineTotal")} align="center" />
      ),
      cell: ({ row }) => (
        <div className="flex justify-center">
          <span className="text-foreground tabular-nums">
            {formatMoney(row.original.lineTotal)}
          </span>
        </div>
      ),
      meta: rangeFilterMeta(t("columns.lineTotal")),
    },
    {
      accessorKey: "orderStatus",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("columns.status")} />
      ),
      cell: ({ row }) => (
        <Badge variant="outline" className={statusBadgeClass(row.original.orderStatus)}>
          {t(`status.${row.original.orderStatus}`)}
        </Badge>
      ),
      meta: statusFilterMeta(t),
    },
    {
      id: "actions",
      enableSorting: false,
      cell: ({ row }) => {
        const parent = resolveOrder(row.original)
        return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="data-[state=open]:bg-muted text-muted-foreground flex size-8"
              size="icon"
            >
              <IconDotsVertical />
              <span className="sr-only">{t("actions.openMenu")}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem onClick={() => openLineSidebar(row.original)}>
              <IconEye />
              {t("actions.view")}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onEditLine(row.original)}>
              <IconPencil />
              {t("actions.edit")}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onOpenInvoice(row.original.orderId)}>
              <IconReceipt />
              {t("actions.viewInvoice")}
            </DropdownMenuItem>
            {parent && canReturnDocument(parent) ? (
              <DropdownMenuItem onClick={() => onReturnLine(row.original)}>
                <IconRotateClockwise />
                {t("actions.return")}
              </DropdownMenuItem>
            ) : null}
            {parent && canCancelDocument(parent) ? (
              <DropdownMenuItem onClick={() => onCancelLine(row.original)}>
                <IconX />
                {t("actions.cancel")}
              </DropdownMenuItem>
            ) : null}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              onClick={() => onDeleteLine(row.original)}
            >
              <IconTrash />
              {t("actions.delete")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        )
      },
    },
  ]
}

export default function SalesReportPage() {
  const { t } = useTranslation("sales")
  const { session } = useAuth()
  const queryClient = useQueryClient()
  const {
    orders,
    getOrder,
    addOrder,
    updateOrder,
    removeOrder,
    refreshOrders,
  } = useOrders()
  const { addReturn, refreshReturns } = useReturns()
  const { products, getApiProductId } = useProducts()
  const { settings: posSettings } = usePosSettings()
  const { returnInvoiceLine, returningLineId } = useInvoiceLineReturn()
  const [viewMode, setViewMode] = useState<BillItemViewMode>("item")
  const [viewSaleLine, setViewSaleLine] = useState<SaleLineRow | null>(null)
  const [viewOrder, setViewOrder] = useState<OrderRow | null>(null)
  const [invoiceSheetMode, setInvoiceSheetMode] = useState<"view" | "edit">("view")
  const [saleFormSidebar, setSaleFormSidebar] = useState<SaleFormSidebarState>(null)
  const [savingSale, setSavingSale] = useState(false)

  useEffect(() => {
    setViewMode(loadSalesViewMode())
  }, [])

  useEffect(() => {
    void refreshOrders()
  }, [refreshOrders])

  const saleLines = useMemo(() => flattenOrdersToSaleLines(orders), [orders])

  const handleViewModeChange = useCallback((mode: BillItemViewMode) => {
    setViewMode(mode)
    saveSalesViewMode(mode)
    if (mode === "item") {
      setViewOrder(null)
    } else {
      setViewSaleLine(null)
    }
  }, [])

  const salesTableOptions = useMemo(
    () => (
      <SalesViewTableOption value={viewMode} onValueChange={handleViewModeChange} />
    ),
    [viewMode, handleViewModeChange]
  )

  const liveViewOrder = viewOrder ? (getOrder(viewOrder.id) ?? viewOrder) : null

  const openLineSidebar = useCallback((row: SaleLineRow) => {
    setViewSaleLine(row)
  }, [])

  const openBillSidebar = useCallback((row: OrderRow) => {
    setInvoiceSheetMode("view")
    setViewOrder(row)
  }, [])

  const onOpenInvoice = useCallback(
    (orderId: number) => {
      const order = getOrder(orderId)
      if (!order) return
      setViewSaleLine(null)
      setInvoiceSheetMode("view")
      setViewOrder(order)
    },
    [getOrder]
  )

  const openEditBill = useCallback((order: OrderRow) => {
    setViewOrder(null)
    setViewSaleLine(null)
    setSaleFormSidebar({ step: "form", mode: "edit", order })
  }, [])

  const openEditLine = useCallback(
    (line: SaleLineRow) => {
      const order = getOrder(line.orderId)
      if (!order) return
      setViewSaleLine(null)
      setSaleFormSidebar({ step: "form", mode: "edit", order })
    },
    [getOrder]
  )

  const handleDeleteBill = useCallback(
    async (order: OrderRow) => {
      if (
        !(await confirmDeleteAction({
          itemName: order.invoiceNumber,
          entityLabel: t("entity.sale"),
          warning:
            order.status === "completed"
              ? t("confirm.delete.completedStockWarning", { ns: "common" })
              : undefined,
        }))
      ) {
        return
      }
      try {
        await persistDeleteOrder(order)
        removeOrder(order.id)
        if (viewOrder?.id === order.id) setViewOrder(null)
        if (
          saleFormSidebar?.step === "form" &&
          saleFormSidebar.mode === "edit" &&
          saleFormSidebar.order.id === order.id
        ) {
          setSaleFormSidebar(null)
        }
        invalidateCustomers(queryClient, session?.tenantId)
        toast.message(t("toasts.removedNamed", { name: order.invoiceNumber }))
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Could not delete sale."
        )
      }
    },
    [removeOrder, saleFormSidebar, viewOrder, queryClient, session?.tenantId, t]
  )

  const handleDuplicateBill = useCallback(
    async (order: OrderRow) => {
      if (
        !(await confirmDuplicateAction({
          itemName: order.invoiceNumber,
          entityLabel: t("entity.sale"),
        }))
      ) {
        return
      }
      try {
        const apiOrder = await persistDuplicateOrder(order)
        addOrder(mapApiOrderToRow(apiOrder))
        invalidateCustomers(queryClient, session?.tenantId)
        toast.success(t("toasts.duplicatedNamed", { name: order.invoiceNumber }))
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Could not duplicate sale."
        )
      }
    },
    [addOrder, queryClient, session?.tenantId, t]
  )

  const handleDeleteSaleLines = useCallback(
    async (selected: SaleLineRow[]) => {
      const selectedKeys = new Set(selected.map((line) => line.id))
      const affected = new Map<number, OrderRow>()
      for (const line of selected) {
        const order = getOrder(line.orderId)
        if (order) affected.set(order.id, order)
      }
      const completedCount = [...affected.values()].filter(
        (order) => order.status === "completed"
      ).length

      if (
        !(await confirmDeleteAction({
          count: selected.length,
          entityLabel: t("entity.saleLineItem"),
          warning:
            completedCount > 0
              ? t("confirm.delete.completedStockWarningBulk", {
                  ns: "common",
                  count: completedCount,
                })
              : undefined,
        }))
      ) {
        return
      }

      let removedLines = 0
      const errors: string[] = []
      for (const order of affected.values()) {
        const selectedOnOrder = (order.lines ?? []).filter((line) =>
          selectedKeys.has(`${order.id}-${line.id}`)
        )
        const remaining = (order.lines ?? []).filter(
          (line) => !selectedKeys.has(`${order.id}-${line.id}`)
        )
        const apiId = order.apiId?.trim()
        try {
          if (remaining.length === 0) {
            await persistDeleteOrder(order)
            removeOrder(order.id)
            removedLines += selectedOnOrder.length
            continue
          }
          const next = {
            ...order,
            lines: remaining,
            totalAmount: computeOrderTotal(remaining),
          }
          if (apiId) {
            const apiOrder = await persistUpdateOrder(apiId, next)
            updateOrder(order.id, { ...mapApiOrderToRow(apiOrder), id: order.id })
          } else {
            const apiOrder = await persistCreateOrder(next)
            updateOrder(order.id, { ...mapApiOrderToRow(apiOrder), id: order.id })
          }
          removedLines += selectedOnOrder.length
        } catch (error) {
          errors.push(
            error instanceof Error
              ? `${order.invoiceNumber}: ${error.message}`
              : order.invoiceNumber
          )
        }
      }

      if (viewSaleLine && selectedKeys.has(viewSaleLine.id)) {
        setViewSaleLine(null)
      }
      if (removedLines > 0) {
        invalidateCustomers(queryClient, session?.tenantId)
        toast.message(t("toasts.removedLines", { count: removedLines }))
      }
      if (errors.length > 0) {
        toast.error(errors.slice(0, 3).join(" · "))
        await refreshOrders()
      }
    },
    [
      getOrder,
      removeOrder,
      updateOrder,
      viewSaleLine,
      queryClient,
      session?.tenantId,
      refreshOrders,
      t,
    ]
  )

  const handleDeleteSaleLine = useCallback(
    (line: SaleLineRow) => {
      void handleDeleteSaleLines([line])
    },
    [handleDeleteSaleLines]
  )

  const handleReturnBill = useCallback(
    async (order: OrderRow) => {
      if (!canReturnDocument(order)) {
        toast.error(t("toasts.onlyCompletedPaid"))
        return
      }
      const sourceApiId = order.apiId?.trim()
      if (!sourceApiId) {
        toast.error("This sale is not saved on the server yet.")
        return
      }
      const draft = buildReturnFromOrder(order)
      if (
        !(await confirmReturnAction({
          scope: "invoice",
          itemName: order.invoiceNumber,
          totalAmount: draft.totalAmount,
          refundDue: draft.refundDue,
        }))
      ) {
        return
      }
      try {
        const productIdBySourceLineId = Object.fromEntries(
          (order.lines ?? [])
            .filter((line) => line.productApiId?.trim())
            .map((line) => [line.id, line.productApiId!.trim()])
        )
        const apiReturn = await persistCompletedReturn(
          draft,
          sourceApiId,
          productIdBySourceLineId
        )
        addReturn(mapApiReturnToRow(apiReturn, { sourceNumericId: order.id }))
        await refreshOrders()
        await refreshReturns()
        invalidateCustomers(queryClient, session?.tenantId)
        toast.success(
          t("toasts.returnRecorded", {
            returnNumber: apiReturn.returnNumber,
            name: order.invoiceNumber,
          })
        )
        if (viewOrder?.id === order.id) {
          setViewOrder(getOrder(order.id) ?? null)
        }
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Could not record return."
        )
      }
    },
    [
      addReturn,
      getOrder,
      refreshOrders,
      refreshReturns,
      queryClient,
      session?.tenantId,
      viewOrder,
      t,
    ]
  )

  const handleReturnLine = useCallback(
    async (line: SaleLineRow) => {
      const order = getOrder(line.orderId)
      if (!order) {
        toast.error(t("toasts.sourceNotFound"))
        return
      }
      const orderLine = order.lines.find((item) => item.id === line.lineId)
      if (!orderLine) {
        toast.error(t("toasts.lineNotFound"))
        return
      }
      const recorded = await returnInvoiceLine(order, orderLine)
      if (recorded && viewSaleLine?.lineId === line.lineId) {
        setViewSaleLine(null)
      }
    },
    [getOrder, returnInvoiceLine, viewSaleLine, t]
  )

  const handleCancelBill = useCallback(
    async (order: OrderRow) => {
      if (!canCancelDocument(order)) return
      if (
        !(await confirmCancelAction({
          itemName: order.invoiceNumber,
          entityLabel: t("entity.sale"),
        }))
      ) {
        return
      }
      try {
        const apiId = order.apiId?.trim()
        if (apiId) {
          const apiOrder = await persistCancelOrder(apiId)
          updateOrder(order.id, { ...mapApiOrderToRow(apiOrder), id: order.id })
        } else {
          updateOrder(order.id, { status: "cancelled" })
        }
        invalidateCustomers(queryClient, session?.tenantId)
        if (viewOrder?.id === order.id) setViewOrder(null)
        toast.success(t("toasts.cancelled", { name: order.invoiceNumber }))
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Could not cancel sale."
        )
      }
    },
    [updateOrder, viewOrder, queryClient, session?.tenantId, t]
  )

  const handleCancelLine = useCallback(
    async (line: SaleLineRow) => {
      const order = getOrder(line.orderId)
      if (!order || !canCancelDocument(order)) {
        toast.error(t("toasts.onlyPendingUnpaid"))
        return
      }
      if (
        !(await confirmCancelAction({
          itemName: order.invoiceNumber,
          entityLabel: t("entity.sale"),
        }))
      ) {
        return
      }
      try {
        const apiId = order.apiId?.trim()
        if (apiId) {
          const apiOrder = await persistCancelOrder(apiId)
          updateOrder(order.id, { ...mapApiOrderToRow(apiOrder), id: order.id })
        } else {
          updateOrder(order.id, { status: "cancelled" })
        }
        invalidateCustomers(queryClient, session?.tenantId)
        if (viewSaleLine?.orderId === order.id) setViewSaleLine(null)
        toast.success(t("toasts.cancelled", { name: order.invoiceNumber }))
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Could not cancel sale."
        )
      }
    },
    [getOrder, updateOrder, viewSaleLine, queryClient, session?.tenantId, t]
  )

  const resolveOrderForLine = useCallback(
    (line: SaleLineRow) => getOrder(line.orderId),
    [getOrder]
  )

  const handleBulkDeleteBills = useCallback(
    async (selected: OrderRow[]) => {
      const completedCount = selected.filter((order) => order.status === "completed")
        .length
      if (
        !(await confirmDeleteAction({
          count: selected.length,
          entityLabel: t("entity.sale"),
          warning:
            completedCount > 0
              ? t("confirm.delete.completedStockWarningBulk", {
                  ns: "common",
                  count: completedCount,
                })
              : undefined,
        }))
      ) {
        return
      }
      let deleted = 0
      const errors: string[] = []
      for (const order of selected) {
        try {
          await persistDeleteOrder(order)
          removeOrder(order.id)
          deleted += 1
        } catch (error) {
          errors.push(
            error instanceof Error
              ? `${order.invoiceNumber}: ${error.message}`
              : order.invoiceNumber
          )
        }
      }
      if (viewOrder && selected.some((row) => row.id === viewOrder.id)) {
        setViewOrder(null)
      }
      if (deleted > 0) {
        invalidateCustomers(queryClient, session?.tenantId)
        toast.message(t("toasts.removedSales", { count: deleted }))
      }
      if (errors.length > 0) {
        toast.error(errors.slice(0, 3).join(" · "))
      }
    },
    [removeOrder, viewOrder, queryClient, session?.tenantId, t]
  )

  const billColumns = useMemo(
    () =>
      getSalesBillColumns(
        t,
        openBillSidebar,
        openEditBill,
        onOpenInvoice,
        handleDuplicateBill,
        handleDeleteBill,
        handleReturnBill,
        handleCancelBill
      ),
    [
      t,
      openBillSidebar,
      openEditBill,
      onOpenInvoice,
      handleDuplicateBill,
      handleDeleteBill,
      handleReturnBill,
      handleCancelBill,
    ]
  )

  const lineColumns = useMemo(
    () =>
      getSalesLineColumns(
        t,
        openLineSidebar,
        openEditLine,
        onOpenInvoice,
        handleDeleteSaleLine,
        handleReturnLine,
        handleCancelLine,
        resolveOrderForLine
      ),
    [
      t,
      openLineSidebar,
      openEditLine,
      onOpenInvoice,
      handleDeleteSaleLine,
      handleReturnLine,
      handleCancelLine,
      resolveOrderForLine,
    ]
  )

  const openAddSaleSidebar = useCallback(() => {
    setSaleFormSidebar({ step: "form", mode: "add" })
  }, [])

  const closeSaleFormSidebar = useCallback(() => {
    setSaleFormSidebar(null)
  }, [])

  const handleImportSales = useCallback(
    async (rows: Record<string, string>[]) => {
      const parsed = importOrdersFromRows(rows, orders)
      if (parsed.length === 0) return 0
      let added = 0
      const errors: string[] = []
      try {
        const storeId = await resolveDefaultStoreId()
        for (const order of parsed) {
          try {
            const apiOrder = await apiCreateOrder({
              storeId,
              buyerName: order.customerName,
              description: order.description === "—" ? "" : order.description,
              orderDate: order.orderDate,
              paidAmount: Number(order.paidAmount) || 0,
              paymentMethod: order.paymentMethod,
              status: order.status,
              source: "MANUAL",
              lines: order.lines
                .filter((line) => line.productName.trim())
                .map((line) => ({
                  productId: null,
                  productName: line.productName.trim(),
                  quantity: line.quantity,
                  unitPrice: Number(line.unitPrice) || 0,
                })),
            })
            addOrder(mapApiOrderToRow(apiOrder))
            added += 1
          } catch (error) {
            errors.push(
              error instanceof Error
                ? error.message
                : `Failed to import ${order.invoiceNumber}`
            )
          }
        }
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Could not import sales."
        )
        return 0
      }
      if (added > 0) {
        markSetupMilestone("invoice")
        invalidateCustomers(queryClient, session?.tenantId)
      }
      if (errors.length > 0) {
        toast.error(errors.slice(0, 3).join(" · "))
      }
      return added
    },
    [orders, addOrder, queryClient, session?.tenantId]
  )

  const salesImportSampleCsv = useMemo(
    () => buildSampleCsv([...ORDER_IMPORT_COLUMNS], ORDER_IMPORT_SAMPLE_ROW),
    []
  )

  const handleSaleFormSubmit = useCallback(
    async (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault()
      if (savingSale) return
      const fd = new FormData(e.currentTarget)
      const customerName = String(fd.get("customerName") ?? "").trim()
      if (!customerName) {
        toast.error(t("toasts.customerRequired"))
        return
      }

      const buyerId = String(fd.get("buyerId") ?? "").trim() || null
      const parsed = orderFromFormData(
        fd,
        saleFormSidebar?.step === "form" && saleFormSidebar.mode === "edit"
          ? saleFormSidebar.order.id
          : 0
      )
      if (parsed.lines.length === 0 || !parsed.lines.some((line) => line.productName.trim())) {
        toast.error(t("toasts.lineRequired"))
        return
      }

      const productLines = parsed.lines.filter((line) => line.productName.trim())
      if (productLines.some((line) => !Number.isFinite(line.quantity) || line.quantity < 1)) {
        toast.error(t("toasts.quantityInvalid"))
        return
      }

      if (!posSettings.allowOverselling) {
        const remaining = new Map<string, number>()
        for (const product of products) {
          const key =
            getApiProductId(product.id)?.trim() || `name:${product.name.trim()}`
          remaining.set(key, Number(product.stock) || 0)
        }
        const editingOrder =
          saleFormSidebar?.step === "form" && saleFormSidebar.mode === "edit"
            ? saleFormSidebar.order
            : null
        if (editingOrder?.status === "completed") {
          for (const original of editingOrder.lines) {
            const key =
              original.productApiId?.trim() || `name:${original.productName.trim()}`
            remaining.set(key, (remaining.get(key) ?? 0) + Math.max(0, original.quantity))
          }
        }
        for (const line of productLines) {
          const key =
            line.productApiId?.trim() || `name:${line.productName.trim()}`
          const available = remaining.get(key)
          if (available == null) continue
          if (available < line.quantity) {
            toast.error(
              available <= 0
                ? t("toasts.outOfStock", { name: line.productName })
                : t("toasts.onlyInStock", {
                    count: available,
                    name: line.productName,
                  })
            )
            return
          }
          remaining.set(key, available - line.quantity)
        }
      }

      const lines = productLines.map((line) => {
          const unitPrice = Number(line.unitPrice) || 0
          const listRaw = line.listPrice != null ? Number(line.listPrice) : NaN
          let listPrice = Number.isFinite(listRaw) ? listRaw : NaN
          if (!Number.isFinite(listPrice) || listPrice <= 0) {
            const product = products.find((item) => {
              const apiId = getApiProductId(item.id)?.trim()
              if (line.productApiId?.trim() && apiId === line.productApiId.trim()) {
                return true
              }
              return item.name === line.productName.trim()
            })
            const catalog = product ? Number(product.salePrice) : NaN
            listPrice = Number.isFinite(catalog) && catalog > 0 ? catalog : unitPrice
          }
          return {
            productId: line.productApiId?.trim() || null,
            productName: line.productName.trim(),
            quantity: line.quantity,
            listPrice,
            unitPrice,
          }
        })

      const payloadBase = {
        buyerId,
        buyerName: customerName,
        description: parsed.description === "—" ? "" : parsed.description,
        orderDate: parsed.orderDate,
        paidAmount: Number(parsed.paidAmount) || 0,
        paymentMethod: parsed.paymentMethod,
        status: parsed.status,
        lines,
      }

      setSavingSale(true)
      try {
        if (saleFormSidebar?.step === "form" && saleFormSidebar.mode === "add") {
          const storeId = await resolveDefaultStoreId()
          const createPayload: ApiOrderCreateInput = {
            ...payloadBase,
            storeId,
            source: "MANUAL",
          }
          const apiOrder = await apiCreateOrder(createPayload)
          addOrder(mapApiOrderToRow(apiOrder))
          await refreshOrders()
          invalidateCustomers(queryClient, session?.tenantId)
          markSetupMilestone("invoice")
          toast.success(t("toasts.saleOnNewInvoice"))
          closeSaleFormSidebar()
          return
        }

        if (saleFormSidebar?.step === "form" && saleFormSidebar.mode === "edit") {
          const existingApiId = saleFormSidebar.order.apiId?.trim()
          const localId = saleFormSidebar.order.id
          if (existingApiId) {
            const apiOrder = await apiUpdateOrder(existingApiId, payloadBase)
            updateOrder(localId, { ...mapApiOrderToRow(apiOrder), id: localId })
          } else {
            const storeId = await resolveDefaultStoreId()
            const apiOrder = await apiCreateOrder({
              ...payloadBase,
              storeId,
              source: "MANUAL",
            })
            updateOrder(localId, { ...mapApiOrderToRow(apiOrder), id: localId })
          }
          await refreshOrders()
          invalidateCustomers(queryClient, session?.tenantId)
          markSetupMilestone("invoice")
          toast.success(t("toasts.saleAdded"))
          closeSaleFormSidebar()
        }
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Could not save sale. Try again."
        )
      } finally {
        setSavingSale(false)
      }
    },
    [
      savingSale,
      saleFormSidebar,
      addOrder,
      updateOrder,
      closeSaleFormSidebar,
      queryClient,
      session?.tenantId,
      products,
      getApiProductId,
      posSettings.allowOverselling,
      refreshOrders,
      t,
    ]
  )

  const formOrder =
    saleFormSidebar?.step === "form" && saleFormSidebar.mode === "add"
      ? { ...EMPTY_ORDER, invoiceNumber: nextInvoiceNumber(orders) }
      : saleFormSidebar?.step === "form" && saleFormSidebar.mode === "edit"
        ? saleFormSidebar.order
        : EMPTY_ORDER
  const saleFormId =
    saleFormSidebar?.step === "form" && saleFormSidebar.mode === "add"
      ? "sale-add-form"
      : saleFormSidebar?.step === "form" && saleFormSidebar.mode === "edit"
        ? `sale-edit-${saleFormSidebar.order.id}`
        : "sale-edit"

  return (
    <>
      <Sheet
        open={saleFormSidebar !== null}
        onOpenChange={(open) => {
          if (!open) closeSaleFormSidebar()
        }}
      >
        <SheetContent
          side="right"
          className="flex w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-lg"
        >
          {saleFormSidebar ? (
            <>
              <SheetHeader className="border-border/60 space-y-1 border-b px-6 py-5 text-left">
                <SheetTitle className="text-lg leading-tight">
                  {saleFormSidebar.mode === "add"
                    ? t("sheet.addSale")
                    : t("sheet.editInvoice")}
                </SheetTitle>
                <SheetDescription>
                  {saleFormSidebar.mode === "add"
                    ? t("sheet.newInvoiceDescription")
                    : `${saleFormSidebar.order.invoiceNumber} · ${saleFormSidebar.order.customerName}`}
                </SheetDescription>
              </SheetHeader>
              <div
                key={
                  saleFormSidebar.mode === "add"
                    ? "add"
                    : `edit-${saleFormSidebar.order.id}`
                }
                className="min-h-0 flex-1 overflow-y-auto px-6 py-5"
              >
                <OrderForm
                  formId={saleFormId}
                  order={formOrder}
                  isNew={saleFormSidebar.mode === "add"}
                  onSubmit={handleSaleFormSubmit}
                />
              </div>
              <SheetFooter className="border-border/60 gap-2 border-t px-6 py-4 sm:flex-row sm:justify-end">
                <SheetClose asChild>
                  <Button variant="outline" type="button">
                    {t("sheet.cancel")}
                  </Button>
                </SheetClose>
                <Button type="submit" form={saleFormId} disabled={savingSale}>
                  {saleFormSidebar.mode === "add"
                    ? t("sheet.createInvoice")
                    : t("sheet.saveInvoice")}
                </Button>
              </SheetFooter>
            </>
          ) : null}
        </SheetContent>
      </Sheet>

      <Sheet
        open={viewSaleLine !== null}
        onOpenChange={(open) => {
          if (!open) setViewSaleLine(null)
        }}
      >
        <SheetContent
          side="right"
          className="flex w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-md"
        >
          {viewSaleLine ? (
            <>
              <SheetHeader className="border-border/60 space-y-1 border-b px-6 py-5 text-left">
                <SheetTitle className="text-lg leading-tight">
                  {viewSaleLine.productName}
                </SheetTitle>
                <SheetDescription>
                  {viewSaleLine.invoiceNumber}
                  <span className="text-muted-foreground">
                    {" "}
                    · {viewSaleLine.customerName}
                  </span>
                </SheetDescription>
              </SheetHeader>
              <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
                <SaleLineDetail saleLine={viewSaleLine} />
              </div>
              <SheetFooter className="border-border/60 gap-2 border-t px-6 py-4 sm:flex-row sm:justify-end">
                <Button
                  variant="outline"
                  className="w-full sm:w-auto"
                  onClick={() => onOpenInvoice(viewSaleLine.orderId)}
                >
                  {t("actions.viewInvoice")}
                </Button>
                <SheetClose asChild>
                  <Button className="w-full sm:w-auto">{t("sheet.close")}</Button>
                </SheetClose>
              </SheetFooter>
            </>
          ) : null}
        </SheetContent>
      </Sheet>

      <Sheet
        open={viewOrder !== null}
        onOpenChange={(open) => {
          if (!open) {
            setViewOrder(null)
            setInvoiceSheetMode("view")
          }
        }}
      >
        <SheetContent
          side="right"
          className="flex w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-lg"
        >
          {liveViewOrder ? (
            <>
              <SheetHeader className="border-border/60 space-y-1 border-b px-6 py-5 text-left">
                <SheetTitle className="text-lg leading-tight">
                  {invoiceSheetMode === "edit"
                    ? t("sheet.editInvoice")
                    : liveViewOrder.invoiceNumber}
                </SheetTitle>
                <SheetDescription>
                  {liveViewOrder.customerName}
                  <span className="text-muted-foreground">
                    {" "}
                    · {formatDate(liveViewOrder.orderDate)}
                  </span>
                </SheetDescription>
              </SheetHeader>
              <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
                <OrderDetail
                  order={liveViewOrder}
                  mode={invoiceSheetMode}
                  returningLineId={returningLineId}
                  onReturnLine={
                    invoiceSheetMode === "edit"
                      ? (line) => {
                          void returnInvoiceLine(liveViewOrder, line)
                        }
                      : undefined
                  }
                />
              </div>
              <SheetFooter className="border-border/60 gap-2 border-t px-6 py-4 sm:flex-row sm:justify-end">
                {invoiceSheetMode === "view" ? (
                  <>
                    <Button
                      variant="outline"
                      className="w-full sm:w-auto"
                      onClick={() => setInvoiceSheetMode("edit")}
                    >
                      <IconPencil />
                      {t("actions.edit")}
                    </Button>
                    <SheetClose asChild>
                      <Button className="w-full sm:w-auto">{t("sheet.close")}</Button>
                    </SheetClose>
                  </>
                ) : (
                  <>
                    <Button
                      variant="outline"
                      className="w-full sm:w-auto"
                      onClick={() => setInvoiceSheetMode("view")}
                    >
                      {t("actions.done", { ns: "common" })}
                    </Button>
                    <SheetClose asChild>
                      <Button className="w-full sm:w-auto">{t("sheet.close")}</Button>
                    </SheetClose>
                  </>
                )}
              </SheetFooter>
            </>
          ) : null}
        </SheetContent>
      </Sheet>

      {viewMode === "bill" ? (
        <DataTable
          data={orders}
          columns={billColumns}
          settingsKey="sales-bills"
          defaultSorting={[{ id: "orderDate", desc: true }]}
          searchPlaceholder={t("search.bills")}
          exportFilename="sales-bills-export.csv"
          addButtonLabel={t("addButton")}
          onAddClick={openAddSaleSidebar}
          importSampleFilename="sales-sample.csv"
          importSampleCsvContent={salesImportSampleCsv}
          importColumns={[...ORDER_IMPORT_COLUMNS]}
          importSelectColumns={{
            status: [...ORDER_STATUSES],
            paymentMethod: [...PAYMENT_METHODS],
          }}
          importRequiredSelectColumns={[]}
          onImportRows={handleImportSales}
          exportRowTransform={flattenOrderForExport}
          tableOptionsExtra={salesTableOptions}
          bulkActions={[
            {
              id: "delete",
              label: t("actions.deleteSelected"),
              icon: <IconTrash className="size-4" />,
              variant: "destructive",
              onClick: handleBulkDeleteBills,
            },
          ]}
        />
      ) : (
        <DataTable
          data={saleLines}
          columns={lineColumns}
          settingsKey="sales-items"
          defaultSorting={[{ id: "orderDate", desc: true }]}
          searchPlaceholder={t("search.items")}
          exportFilename="sales-items-export.csv"
          addButtonLabel={t("addButton")}
          onAddClick={openAddSaleSidebar}
          importSampleFilename="sales-sample.csv"
          importSampleCsvContent={salesImportSampleCsv}
          importColumns={[...ORDER_IMPORT_COLUMNS]}
          importSelectColumns={{
            status: [...ORDER_STATUSES],
            paymentMethod: [...PAYMENT_METHODS],
          }}
          importRequiredSelectColumns={[]}
          onImportRows={handleImportSales}
          exportRowTransform={flattenSaleLineForExport}
          tableOptionsExtra={salesTableOptions}
          bulkActions={[
            {
              id: "delete",
              label: t("actions.deleteSelected"),
              icon: <IconTrash className="size-4" />,
              variant: "destructive",
              onClick: handleDeleteSaleLines,
            },
          ]}
        />
      )}
    </>
  )
}
