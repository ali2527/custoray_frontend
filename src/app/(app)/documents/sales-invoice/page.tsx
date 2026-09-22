"use client"

import { useCallback, useMemo, useState, type FormEvent } from "react"
import { ColumnDef } from "@tanstack/react-table"
import {
  IconCopy,
  IconDotsVertical,
  IconEye,
  IconPencil,
  IconTrash,
} from "@tabler/icons-react"
import { toast } from "sonner"
import { useTranslation } from "react-i18next"
import type { TFunction } from "i18next"

import { OrderDetail } from "@/components/orders/order-detail"
import { OrderForm } from "@/components/orders/order-form"
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
import { useOrders } from "@/context/orders-context"
import { markSetupMilestone } from "@/lib/setup-progress"
import { useInvoiceLineReturn } from "@/hooks/use-invoice-line-return"
import {
  confirmDeleteAction,
  confirmDuplicateAction,
} from "@/lib/confirm-action"
import {
  computeBalance,
  EMPTY_ORDER,
  formatDate,
  formatMoney,
  mapImportedOrder,
  nextInvoiceNumber,
  orderFromFormData,
  statusBadgeClass,
  statusLabel,
  type OrderRow,
} from "@/lib/orders"
import { canReturnDocument } from "@/lib/return-eligibility"

type InvoiceSidebarState =
  | { mode: "view"; order: OrderRow }
  | { mode: "edit"; order: OrderRow }
  | { mode: "add" }
  | null

function invoiceTabFilter(row: OrderRow, tab: string) {
  if (tab === "all") return true
  return row.status === tab
}

function getInvoiceColumns(
  t: TFunction<"documents">,
  tc: TFunction<"common">,
  openInvoiceSidebar: (row: OrderRow, mode: "view" | "edit") => void,
  onDelete: (row: OrderRow) => void,
  onDuplicate: (row: OrderRow) => void
): ColumnDef<OrderRow>[] {
  return [
    {
      id: "select",
      header: ({ table }) => (
        <div className="flex items-center justify-center">
          <Checkbox
            checked={
              table.getIsAllPageRowsSelected() ||
              (table.getIsSomePageRowsSelected() && "indeterminate")
            }
            onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
            aria-label={tc("table.selectAll")}
          />
        </div>
      ),
      cell: ({ row }) => (
        <div className="flex items-center justify-center">
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(!!value)}
            aria-label={tc("table.selectRow")}
          />
        </div>
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "invoiceNumber",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("table.invoiceNumber")} />
      ),
      cell: ({ row }) => (
        <button
          type="button"
          className="text-foreground text-left font-medium hover:underline"
          onClick={() => openInvoiceSidebar(row.original, "view")}
        >
          {row.original.invoiceNumber}
        </button>
      ),
      enableHiding: false,
      meta: { dataTableFilter: false },
    },
    {
      accessorKey: "customerName",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("labels.customer")} />
      ),
      cell: ({ row }) => (
        <span className="text-foreground max-w-[10rem] truncate">
          {row.original.customerName}
        </span>
      ),
      meta: { dataTableFilter: false },
    },
    {
      id: "items",
      accessorFn: (row) => row.lines.length,
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("table.items")} align="center" />
      ),
      cell: ({ row }) => (
        <div className="flex justify-center">
          <span className="text-muted-foreground tabular-nums">
            {row.original.lines.length}
          </span>
        </div>
      ),
      meta: { dataTableFilter: false },
    },
    {
      accessorKey: "orderDate",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("labels.date")} />
      ),
      cell: ({ row }) => (
        <span className="text-muted-foreground tabular-nums text-xs">
          {formatDate(row.original.orderDate)}
        </span>
      ),
      meta: { dataTableFilter: false },
    },
    {
      accessorKey: "totalAmount",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("table.totalAmount")} align="center" />
      ),
      cell: ({ row }) => (
        <div className="flex justify-center">
          <span className="text-foreground tabular-nums">
            {formatMoney(row.original.totalAmount)}
          </span>
        </div>
      ),
      meta: { dataTableFilter: false },
    },
    {
      accessorKey: "paidAmount",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("table.paidAmount")} align="center" />
      ),
      cell: ({ row }) => (
        <div className="flex justify-center">
          <span className="text-foreground tabular-nums">
            {formatMoney(row.original.paidAmount)}
          </span>
        </div>
      ),
      meta: { dataTableFilter: false },
    },
    {
      id: "balance",
      accessorFn: (row) => Number(computeBalance(row)),
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("labels.balance")} align="center" />
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
      meta: { dataTableFilter: false },
    },
    {
      accessorKey: "status",
      header: ({ column }) => <DataTableColumnHeader column={column} title={t("labels.status")} />,
      cell: ({ row }) => (
        <Badge variant="outline" className={statusBadgeClass(row.original.status)}>
          {statusLabel(row.original.status)}
        </Badge>
      ),
      meta: { dataTableFilter: false },
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
              <span className="sr-only">{tc("actions.openMenu")}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem onClick={() => openInvoiceSidebar(row.original, "view")}>
              <IconEye />
              {tc("actions.view")}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => openInvoiceSidebar(row.original, "edit")}>
              <IconPencil />
              {tc("actions.edit")}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onDuplicate(row.original)}>
              <IconCopy />
              {tc("actions.duplicate")}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onClick={() => onDelete(row.original)}>
              <IconTrash />
              {tc("actions.delete")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ]
}

export default function SalesInvoicePage() {
  const { t } = useTranslation("documents")
  const { t: tc } = useTranslation("common")
  const { orders, setOrders, getOrder, addOrder, updateOrder, removeOrder, duplicateOrder } =
    useOrders()
  const { returnInvoiceLine, returningLineId } = useInvoiceLineReturn()
  const [sidebar, setSidebar] = useState<InvoiceSidebarState>(null)

  const closeSidebar = () => setSidebar(null)

  const handleDelete = useCallback(
    async (order: OrderRow) => {
      if (
        !(await confirmDeleteAction({
          itemName: order.invoiceNumber,
          entityLabel: t("entity.salesInvoice"),
        }))
      ) {
        return
      }
      removeOrder(order.id)
      if (sidebar?.mode !== "add" && sidebar?.order.id === order.id) {
        closeSidebar()
      }
      toast.message(t("toasts.removedNamed", { name: order.invoiceNumber }))
    },
    [removeOrder, sidebar, t]
  )

  const handleDuplicate = useCallback(
    async (order: OrderRow) => {
      if (
        !(await confirmDuplicateAction({
          itemName: order.invoiceNumber,
          entityLabel: t("entity.salesInvoice"),
        }))
      ) {
        return
      }
      const copy = duplicateOrder(order.id)
      if (copy) toast.success(t("toasts.duplicatedNamed", { name: order.invoiceNumber }))
    },
    [duplicateOrder, t]
  )

  const handleSubmit = useCallback(
    (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault()
      const fd = new FormData(e.currentTarget)
      const customerName = String(fd.get("customerName") ?? "").trim()
      if (!customerName) {
        toast.error(t("toasts.customerRequired"))
        return
      }

      const parsed = orderFromFormData(
        fd,
        sidebar?.mode === "edit" && sidebar.order ? sidebar.order.id : 0
      )
      if (parsed.lines.length === 0 || !parsed.lines.some((l) => l.productName.trim())) {
        toast.error(t("toasts.lineRequired"))
        return
      }

      if (sidebar?.mode === "add") {
        addOrder(parsed)
        toast.success(t("toasts.salesCreated"))
        closeSidebar()
        return
      }

      if (sidebar?.mode === "edit" && sidebar.order) {
        updateOrder(sidebar.order.id, parsed)
        toast.success(t("toasts.salesSaved"))
        closeSidebar()
      }
    },
    [sidebar, addOrder, updateOrder, t]
  )

  const columns = useMemo(
    () =>
      getInvoiceColumns(
        t,
        tc,
        (row, mode) => setSidebar({ order: row, mode }),
        handleDelete,
        handleDuplicate
      ),
    [handleDelete, handleDuplicate, t, tc]
  )

  const sheetOrder = sidebar && sidebar.mode !== "add" ? sidebar.order : null
  const liveSheetOrder = sheetOrder ? (getOrder(sheetOrder.id) ?? sheetOrder) : null
  const formOrder =
    sidebar?.mode === "add"
      ? { ...EMPTY_ORDER, invoiceNumber: nextInvoiceNumber(orders) }
      : liveSheetOrder ?? EMPTY_ORDER
  const formId =
    sidebar?.mode === "add"
      ? "sales-invoice-add-form"
      : liveSheetOrder
        ? `sales-invoice-edit-${liveSheetOrder.id}`
        : "sales-invoice-edit"

  return (
    <>
      <Sheet
        open={sidebar !== null}
        onOpenChange={(open) => {
          if (!open) closeSidebar()
        }}
      >
        <SheetContent
          side="right"
          className="flex w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-xl"
        >
          {sidebar ? (
            <>
              <SheetHeader className="border-border/60 space-y-1 border-b px-6 py-5 text-left">
                <SheetTitle className="text-lg leading-tight">
                  {sidebar.mode === "add"
                    ? t("sheet.createSales")
                    : sidebar.mode === "edit"
                      ? t("sheet.editSales")
                      : liveSheetOrder?.invoiceNumber}
                </SheetTitle>
                <SheetDescription>
                  {sidebar.mode === "add" ? (
                    t("sheet.addSalesHint")
                  ) : sidebar.mode === "edit" && liveSheetOrder ? (
                    <>
                      {liveSheetOrder.invoiceNumber}
                      <span className="text-muted-foreground"> · {t("sheet.id", { id: liveSheetOrder.id })}</span>
                    </>
                  ) : liveSheetOrder ? (
                    <>
                      {liveSheetOrder.customerName}
                      <span className="text-muted-foreground">
                        {" "}
                        · {formatDate(liveSheetOrder.orderDate)}
                      </span>
                    </>
                  ) : null}
                </SheetDescription>
              </SheetHeader>
              <div
                key={
                  sidebar.mode === "add"
                    ? "add"
                    : `${liveSheetOrder?.id}-${sidebar.mode}-${liveSheetOrder?.lines.map((line) => `${line.id}:${line.quantity}`).join(",")}`
                }
                className="min-h-0 flex-1 overflow-y-auto px-6 py-5"
              >
                {sidebar.mode === "view" && liveSheetOrder ? (
                  <OrderDetail order={liveSheetOrder} />
                ) : sidebar.mode === "edit" && liveSheetOrder ? (
                  canReturnDocument(liveSheetOrder) ? (
                    <div className="flex flex-col gap-6">
                      <OrderDetail
                        order={liveSheetOrder}
                        mode="edit"
                        returningLineId={returningLineId}
                        onReturnLine={(line) => {
                          void returnInvoiceLine(liveSheetOrder, line)
                        }}
                      />
                      <div className="border-border/60 border-t pt-5">
                        <p className="text-muted-foreground mb-4 text-xs font-medium uppercase tracking-wide">
                          {t("sheet.invoiceDetails")}
                        </p>
                        <OrderForm
                          formId={formId}
                          order={formOrder}
                          isNew={false}
                          onSubmit={handleSubmit}
                        />
                      </div>
                    </div>
                  ) : (
                    <OrderForm
                      formId={formId}
                      order={formOrder}
                      isNew={false}
                      onSubmit={handleSubmit}
                    />
                  )
                ) : sidebar.mode === "add" ? (
                  <OrderForm
                    formId={formId}
                    order={formOrder}
                    isNew
                    onSubmit={handleSubmit}
                  />
                ) : null}
              </div>
              <SheetFooter className="border-border/60 gap-2 border-t px-6 py-4 sm:flex-row sm:justify-end">
                {sidebar.mode === "view" ? (
                  <>
                    <Button
                      variant="outline"
                      className="w-full sm:w-auto"
                      onClick={() =>
                        liveSheetOrder && setSidebar({ mode: "edit", order: liveSheetOrder })
                      }
                    >
                      {tc("actions.edit")}
                    </Button>
                    <SheetClose asChild>
                      <Button className="w-full sm:w-auto">{tc("actions.close")}</Button>
                    </SheetClose>
                  </>
                ) : (
                  <>
                    <SheetClose asChild>
                      <Button variant="outline" type="button">
                        {tc("actions.cancel")}
                      </Button>
                    </SheetClose>
                    <Button type="submit" form={formId}>
                      {sidebar.mode === "add" ? t("sheet.createInvoice") : t("sheet.saveInvoice")}
                    </Button>
                  </>
                )}
              </SheetFooter>
            </>
          ) : null}
        </SheetContent>
      </Sheet>

      <DataTable
        data={orders}
        columns={columns}
        addButtonLabel={t("table.newSalesInvoice")}
        searchPlaceholder={t("table.searchSales")}
        importRowMapper={mapImportedOrder}
        importSampleFilename="sales-invoices-sample.csv"
        exportFilename="sales-invoices-export.csv"
        onDataChange={setOrders}
        onRowsImported={() => markSetupMilestone("invoice")}
        onAddClick={() => setSidebar({ mode: "add" })}
        bulkActions={[
          {
            id: "delete",
            label: tc("actions.deleteSelected"),
            icon: <IconTrash className="size-4" />,
            variant: "destructive",
            onClick: async (selected) => {
              if (
                !(await confirmDeleteAction({
                  count: selected.length,
                  entityLabel: t("entity.salesInvoice"),
                }))
              ) {
                return
              }
              const ids = new Set(selected.map((s) => s.id))
              setOrders((prev) => prev.filter((r) => !ids.has(r.id)))
              toast.message(
                t("toasts.removedSalesCount", { count: selected.length })
              )
            },
          },
        ]}
        tabs={[
          { value: "all", label: tc("tabs.all") },
          { value: "pending", label: tc("status.pending") },
          { value: "completed", label: tc("status.completed") },
          { value: "cancelled", label: tc("status.cancelled") },
        ]}
        defaultTab="all"
        tabFilter={invoiceTabFilter}
      />
    </>
  )
}
