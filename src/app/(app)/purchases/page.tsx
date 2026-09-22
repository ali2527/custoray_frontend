"use client"

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react"
import { ColumnDef } from "@tanstack/react-table"
import {
  IconCopy,
  IconDotsVertical,
  IconEye,
  IconFileInvoice,
  IconPencil,
  IconRotateClockwise,
  IconTrash,
  IconX,
} from "@tabler/icons-react"
import { toast } from "sonner"
import { useTranslation } from "react-i18next"
import type { TFunction } from "i18next"

import { PurchaseDetail } from "@/components/purchases/purchase-detail"
import { PurchaseForm } from "@/components/purchases/purchase-form"
import { PurchaseLineDetail } from "@/components/purchases/purchase-line-detail"
import { PurchaseStatusBadge } from "@/components/purchases/purchase-status-badge"
import { PurchaseViewTableOption } from "@/components/purchases/purchase-view-toggle"
import { ReturnCreateSheet } from "@/components/returns/return-create-sheet"
import { DataTableColumnHeader } from "@/components/data-table-column-header"
import { DataTable, type DataTableTab } from "@/components/data-table"
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
import { usePurchases } from "@/context/purchases-context"
import {
  loadPurchaseViewMode,
  savePurchaseViewMode,
  type BillItemViewMode,
} from "@/lib/app-preferences"
import {
  confirmCancelAction,
  confirmDeleteAction,
  confirmDuplicateAction,
} from "@/lib/confirm-action"
import { buildSampleCsv } from "@/lib/csv"
import {
  computeBalance,
  computePurchaseTotal,
  EMPTY_PURCHASE,
  flattenPurchaseForExport,
  formatDate,
  formatMoney,
  importPurchasesFromRows,
  nextPurchaseNumber,
  PURCHASE_IMPORT_COLUMNS,
  PURCHASE_IMPORT_SAMPLE_ROW,
  PURCHASE_STATUSES,
  purchaseFromFormData,
  type PurchaseRow,
} from "@/lib/purchases"
import {
  flattenPurchaseLineForExport,
  flattenPurchasesToLines,
  type PurchaseLineReportRow,
} from "@/lib/purchases-report"
import { buildReturnFromPurchase, type ReturnRow } from "@/lib/returns"
import { canCancelDocument, canReturnDocument } from "@/lib/return-eligibility"

type PurchaseSidebarState =
  | { mode: "view"; purchase: PurchaseRow }
  | { mode: "edit"; purchase: PurchaseRow }
  | { mode: "add" }
  | null

function purchaseTabFilter(row: PurchaseRow, tab: string) {
  if (tab === "all") return true
  return row.status === tab
}

function purchaseLineTabFilter(row: PurchaseLineReportRow, tab: string) {
  if (tab === "all") return true
  return row.purchaseStatus === tab
}

function textFilterMeta(label: string) {
  return { dataTableFilterVariant: "text" as const, dataTableFilterLabel: label }
}

function rangeFilterMeta(label: string) {
  return { dataTableFilterVariant: "range" as const, dataTableFilterLabel: label }
}

function statusFilterMeta(t: TFunction<"purchases">) {
  return {
    dataTableFilterVariant: "select" as const,
    dataTableFilterLabel: t("columns.status"),
    dataTableFilterSelectLabels: {
      pending: t("status.pending"),
      completed: t("status.completed"),
      cancelled: t("status.cancelled"),
    },
  }
}

function getPurchaseColumns(
  t: TFunction<"purchases">,
  openPurchaseSidebar: (row: PurchaseRow, mode: "view" | "edit") => void,
  onDelete: (row: PurchaseRow) => void,
  onDuplicate: (row: PurchaseRow) => void,
  onReturn: (row: PurchaseRow) => void,
  onCancel: (row: PurchaseRow) => void
): ColumnDef<PurchaseRow>[] {
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
    },
    {
      id: "srNo",
      header: ({ column }) => <DataTableColumnHeader column={column} title={t("columns.srNo")} />,
      cell: ({ row, table }) => {
        const { pageIndex, pageSize } = table.getState().pagination
        const srNo = pageIndex * pageSize + row.index + 1
        return (
          <span className="text-muted-foreground font-mono tabular-nums">{srNo}</span>
        )
      },
      enableSorting: false,
      meta: { dataTableFilter: false },
    },
    {
      accessorKey: "purchaseNumber",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("columns.poNumber")} />
      ),
      cell: ({ row }) => (
        <button
          type="button"
          className="text-foreground text-left font-medium hover:underline"
          onClick={() => openPurchaseSidebar(row.original, "view")}
        >
          {row.original.purchaseNumber}
        </button>
      ),
      enableHiding: false,
      meta: textFilterMeta(t("columns.poNumber")),
    },
    {
      accessorKey: "vendorName",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("columns.vendor")} />
      ),
      cell: ({ row }) => (
        <span className="text-foreground max-w-[10rem] truncate">
          {row.original.vendorName}
        </span>
      ),
      meta: textFilterMeta(t("columns.vendor")),
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
      accessorKey: "purchaseDate",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("columns.date")} />
      ),
      cell: ({ row }) => (
        <span className="text-muted-foreground tabular-nums text-xs">
          {formatDate(row.original.purchaseDate)}
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
      header: ({ column }) => <DataTableColumnHeader column={column} title={t("columns.status")} />,
      cell: ({ row }) => <PurchaseStatusBadge status={row.original.status} />,
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
            <DropdownMenuItem onClick={() => openPurchaseSidebar(row.original, "view")}>
              <IconEye />
              {t("actions.view")}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => openPurchaseSidebar(row.original, "edit")}>
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

function getPurchaseLineColumns(
  t: TFunction<"purchases">,
  openLineSidebar: (row: PurchaseLineReportRow) => void,
  onEditLine: (row: PurchaseLineReportRow) => void,
  onOpenPurchase: (purchaseId: number) => void,
  onDeleteLine: (row: PurchaseLineReportRow) => void,
  onReturnLine: (row: PurchaseLineReportRow) => void,
  onCancelLine: (row: PurchaseLineReportRow) => void,
  resolvePurchase: (line: PurchaseLineReportRow) => PurchaseRow | undefined
): ColumnDef<PurchaseLineReportRow>[] {
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
    },
    {
      id: "srNo",
      header: ({ column }) => <DataTableColumnHeader column={column} title={t("columns.srNo")} />,
      cell: ({ row, table }) => {
        const { pageIndex, pageSize } = table.getState().pagination
        const srNo = pageIndex * pageSize + row.index + 1
        return (
          <span className="text-muted-foreground font-mono tabular-nums">{srNo}</span>
        )
      },
      enableSorting: false,
      meta: { dataTableFilter: false },
    },
    {
      accessorKey: "purchaseNumber",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("columns.poNumber")} />
      ),
      cell: ({ row }) => (
        <button
          type="button"
          className="text-foreground text-left font-medium hover:underline"
          onClick={() => openLineSidebar(row.original)}
        >
          {row.original.purchaseNumber}
        </button>
      ),
      enableHiding: false,
      meta: textFilterMeta(t("columns.poNumber")),
    },
    {
      accessorKey: "vendorName",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("columns.vendor")} />
      ),
      cell: ({ row }) => (
        <span className="text-foreground max-w-[10rem] truncate">
          {row.original.vendorName}
        </span>
      ),
      meta: textFilterMeta(t("columns.vendor")),
    },
    {
      accessorKey: "purchaseDate",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("columns.date")} />
      ),
      cell: ({ row }) => (
        <span className="text-muted-foreground tabular-nums text-xs">
          {formatDate(row.original.purchaseDate)}
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
      accessorKey: "unitPrice",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("columns.unitPrice")} align="center" />
      ),
      cell: ({ row }) => (
        <div className="flex justify-center">
          <span className="text-muted-foreground tabular-nums">
            {formatMoney(row.original.unitPrice)}
          </span>
        </div>
      ),
      meta: rangeFilterMeta(t("columns.unitPrice")),
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
      accessorKey: "purchaseStatus",
      header: ({ column }) => <DataTableColumnHeader column={column} title={t("columns.status")} />,
      cell: ({ row }) => (
        <PurchaseStatusBadge status={row.original.purchaseStatus} />
      ),
      meta: statusFilterMeta(t),
    },
    {
      id: "actions",
      enableSorting: false,
      cell: ({ row }) => {
        const parent = resolvePurchase(row.original)
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
            <DropdownMenuItem onClick={() => onOpenPurchase(row.original.purchaseId)}>
              <IconFileInvoice />
              {t("actions.openPurchase")}
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

export default function PurchasesPage() {
  const { t } = useTranslation("purchases")
  const {
    purchases,
    setPurchases,
    addPurchase,
    updatePurchase,
    removePurchase,
    duplicatePurchase,
    getPurchase,
  } = usePurchases()
  const [viewMode, setViewMode] = useState<BillItemViewMode>("bill")
  const [sidebar, setSidebar] = useState<PurchaseSidebarState>(null)
  const [viewLine, setViewLine] = useState<PurchaseLineReportRow | null>(null)
  const [returnDraft, setReturnDraft] = useState<Omit<ReturnRow, "id"> | null>(null)

  useEffect(() => {
    setViewMode(loadPurchaseViewMode())
  }, [])

  const purchaseLines = useMemo(
    () => flattenPurchasesToLines(purchases),
    [purchases]
  )

  const closeSidebar = () => setSidebar(null)

  const handleViewModeChange = useCallback((mode: BillItemViewMode) => {
    setViewMode(mode)
    savePurchaseViewMode(mode)
    if (mode === "item") {
      closeSidebar()
    } else {
      setViewLine(null)
    }
  }, [])

  const openCreatePurchase = useCallback(() => {
    setViewLine(null)
    setSidebar({ mode: "add" })
  }, [])

  const handleImportPurchases = useCallback(
    (rows: Record<string, string>[]) => {
      let added = 0
      setPurchases((prev) => {
        const created = importPurchasesFromRows(rows, prev)
        added = created.length
        return added > 0 ? [...prev, ...created] : prev
      })
      return added
    },
    [setPurchases]
  )

  const purchaseImportSampleCsv = useMemo(
    () => buildSampleCsv([...PURCHASE_IMPORT_COLUMNS], PURCHASE_IMPORT_SAMPLE_ROW),
    []
  )

  const openPurchaseBill = useCallback(
    (purchaseId: number) => {
      const purchase = getPurchase(purchaseId)
      if (!purchase) return
      setViewLine(null)
      setViewMode("bill")
      savePurchaseViewMode("bill")
      setSidebar({ mode: "view", purchase })
    },
    [getPurchase]
  )

  const handleDelete = useCallback(
    async (purchase: PurchaseRow) => {
      if (
        !(await confirmDeleteAction({
          itemName: purchase.purchaseNumber,
          entityLabel: t("entity.purchaseOrder"),
        }))
      ) {
        return
      }
      removePurchase(purchase.id)
      if (sidebar?.mode !== "add" && sidebar?.purchase.id === purchase.id) {
        closeSidebar()
      }
      toast.message(t("toasts.removedNamed", { name: purchase.purchaseNumber }))
    },
    [removePurchase, sidebar, t]
  )

  const handleDuplicate = useCallback(
    async (purchase: PurchaseRow) => {
      if (
        !(await confirmDuplicateAction({
          itemName: purchase.purchaseNumber,
          entityLabel: t("entity.purchaseOrder"),
        }))
      ) {
        return
      }
      const copy = duplicatePurchase(purchase.id)
      if (copy) toast.success(t("toasts.duplicatedNamed", { name: purchase.purchaseNumber }))
    },
    [duplicatePurchase, t]
  )

  const handleDeleteLines = useCallback(
    async (selected: PurchaseLineReportRow[]) => {
      if (
        !(await confirmDeleteAction({
          count: selected.length,
          entityLabel: t("entity.purchaseLineItem"),
        }))
      ) {
        return
      }

      const selectedKeys = new Set(selected.map((line) => line.id))
      setPurchases((prev) =>
        prev
          .map((purchase) => {
            const remaining = (purchase.lines ?? []).filter(
              (line) => !selectedKeys.has(`${purchase.id}-${line.id}`)
            )
            if (remaining.length === (purchase.lines ?? []).length) return purchase
            if (remaining.length === 0) return null
            return {
              ...purchase,
              lines: remaining,
              totalAmount: computePurchaseTotal(remaining),
            }
          })
          .filter((purchase): purchase is PurchaseRow => purchase !== null)
      )

      if (viewLine && selectedKeys.has(viewLine.id)) {
        setViewLine(null)
      }

      toast.message(t("toasts.removedLines", { count: selected.length }))
    },
    [setPurchases, viewLine, t]
  )

  const handleDeleteLine = useCallback(
    (line: PurchaseLineReportRow) => {
      void handleDeleteLines([line])
    },
    [handleDeleteLines]
  )

  const openReturnFromBill = useCallback((purchase: PurchaseRow) => {
    if (!canReturnDocument(purchase)) {
      toast.error(t("toasts.onlyCompletedPaid"))
      return
    }
    setReturnDraft(buildReturnFromPurchase(purchase))
  }, [t])

  const openReturnFromLine = useCallback(
    (line: PurchaseLineReportRow) => {
      const purchase = getPurchase(line.purchaseId)
      if (!purchase) {
        toast.error(t("toasts.sourceNotFound"))
        return
      }
      if (!canReturnDocument(purchase)) {
        toast.error(t("toasts.onlyCompletedPaid"))
        return
      }
      setReturnDraft(buildReturnFromPurchase(purchase, { lineIds: [line.lineId] }))
    },
    [getPurchase, t]
  )

  const handleCancelBill = useCallback(
    async (purchase: PurchaseRow) => {
      if (!canCancelDocument(purchase)) return
      if (
        !(await confirmCancelAction({
          itemName: purchase.purchaseNumber,
          entityLabel: t("entity.purchase"),
        }))
      ) {
        return
      }
      updatePurchase(purchase.id, { status: "cancelled" })
      if (sidebar?.mode !== "add" && sidebar?.purchase.id === purchase.id) {
        closeSidebar()
      }
      toast.success(t("toasts.cancelled", { name: purchase.purchaseNumber }))
    },
    [sidebar, updatePurchase, closeSidebar, t]
  )

  const handleCancelLine = useCallback(
    async (line: PurchaseLineReportRow) => {
      const purchase = getPurchase(line.purchaseId)
      if (!purchase || !canCancelDocument(purchase)) {
        toast.error(t("toasts.onlyPendingUnpaid"))
        return
      }
      if (
        !(await confirmCancelAction({
          itemName: purchase.purchaseNumber,
          entityLabel: t("entity.purchase"),
        }))
      ) {
        return
      }
      updatePurchase(purchase.id, { status: "cancelled" })
      if (viewLine?.purchaseId === purchase.id) setViewLine(null)
      toast.success(t("toasts.cancelled", { name: purchase.purchaseNumber }))
    },
    [getPurchase, updatePurchase, viewLine, t]
  )

  const resolvePurchaseForLine = useCallback(
    (line: PurchaseLineReportRow) => getPurchase(line.purchaseId),
    [getPurchase]
  )

  const openEditPurchaseFromLine = useCallback(
    (line: PurchaseLineReportRow) => {
      const purchase = getPurchase(line.purchaseId)
      if (!purchase) return
      setViewLine(null)
      setSidebar({ mode: "edit", purchase })
    },
    [getPurchase]
  )

  const handleSubmit = useCallback(
    (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault()
      const fd = new FormData(e.currentTarget)
      const vendorName = String(fd.get("vendorName") ?? "").trim()
      if (!vendorName) {
        toast.error(t("toasts.vendorRequired"))
        return
      }

      const parsed = purchaseFromFormData(
        fd,
        sidebar?.mode === "edit" && sidebar.purchase ? sidebar.purchase.id : 0
      )
      if (parsed.lines.length === 0 || !parsed.lines.some((l) => l.productName.trim())) {
        toast.error(t("toasts.lineRequired"))
        return
      }

      if (sidebar?.mode === "add") {
        addPurchase(parsed)
        toast.success(t("toasts.created"))
        closeSidebar()
        return
      }

      if (sidebar?.mode === "edit" && sidebar.purchase) {
        updatePurchase(sidebar.purchase.id, parsed)
        toast.success(t("toasts.saved"))
        closeSidebar()
      }
    },
    [sidebar, addPurchase, updatePurchase, t]
  )

  const billColumns = useMemo(
    () =>
      getPurchaseColumns(
        t,
        (row, mode) => setSidebar({ purchase: row, mode }),
        handleDelete,
        handleDuplicate,
        openReturnFromBill,
        handleCancelBill
      ),
    [t, handleDelete, handleDuplicate, openReturnFromBill, handleCancelBill]
  )

  const lineColumns = useMemo(
    () =>
      getPurchaseLineColumns(
        t,
        (row) => setViewLine(row),
        openEditPurchaseFromLine,
        openPurchaseBill,
        handleDeleteLine,
        openReturnFromLine,
        handleCancelLine,
        resolvePurchaseForLine
      ),
    [
      t,
      openPurchaseBill,
      openEditPurchaseFromLine,
      handleDeleteLine,
      openReturnFromLine,
      handleCancelLine,
      resolvePurchaseForLine,
    ]
  )

  const purchaseTableOptions = useMemo(
    () => (
      <PurchaseViewTableOption
        value={viewMode}
        onValueChange={handleViewModeChange}
      />
    ),
    [viewMode, handleViewModeChange]
  )

  const sheetPurchase = sidebar && sidebar.mode !== "add" ? sidebar.purchase : null
  const formPurchase =
    sidebar?.mode === "add"
      ? { ...EMPTY_PURCHASE, purchaseNumber: nextPurchaseNumber(purchases) }
      : sheetPurchase ?? EMPTY_PURCHASE
  const formId =
    sidebar?.mode === "add"
      ? "purchase-add-form"
      : sheetPurchase
        ? `purchase-edit-${sheetPurchase.id}`
        : "purchase-edit"

  const purchaseTabs: DataTableTab[] = [
    { value: "all", label: t("tabs.all") },
    { value: "pending", label: t("tabs.pending") },
    { value: "completed", label: t("tabs.completed") },
    { value: "cancelled", label: t("tabs.cancelled") },
  ]

  return (
    <>
      <ReturnCreateSheet
        open={returnDraft !== null}
        onOpenChange={(open) => {
          if (!open) setReturnDraft(null)
        }}
        draft={returnDraft}
        formId="purchase-return-form"
      />

      <Sheet
        open={sidebar !== null}
        onOpenChange={(open) => {
          if (!open) closeSidebar()
        }}
      >
        <SheetContent
          side="right"
          className="flex w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-lg"
        >
          {sidebar ? (
            <>
              <SheetHeader className="border-border/60 space-y-1 border-b px-6 py-5 text-left">
                <SheetTitle className="text-lg leading-tight">
                  {sidebar.mode === "add"
                    ? t("sheet.create")
                    : sidebar.mode === "edit"
                      ? t("sheet.edit")
                      : sheetPurchase?.purchaseNumber}
                </SheetTitle>
                <SheetDescription>
                  {sidebar.mode === "add" ? (
                    t("sheet.addDescription")
                  ) : sidebar.mode === "edit" && sheetPurchase ? (
                    <>
                      {sheetPurchase.purchaseNumber}
                      <span className="text-muted-foreground"> · ID {sheetPurchase.id}</span>
                    </>
                  ) : sheetPurchase ? (
                    <>
                      {sheetPurchase.vendorName}
                      <span className="text-muted-foreground">
                        {" "}
                        · {formatDate(sheetPurchase.purchaseDate)}
                      </span>
                    </>
                  ) : null}
                </SheetDescription>
              </SheetHeader>
              <div
                key={
                  sidebar.mode === "add"
                    ? "add"
                    : `${sheetPurchase?.id}-${sidebar.mode}`
                }
                className="min-h-0 flex-1 overflow-y-auto px-6 py-5"
              >
                {sidebar.mode === "view" && sheetPurchase ? (
                  <PurchaseDetail purchase={sheetPurchase} />
                ) : sidebar.mode === "edit" || sidebar.mode === "add" ? (
                  <PurchaseForm
                    formId={formId}
                    purchase={formPurchase}
                    isNew={sidebar.mode === "add"}
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
                        sheetPurchase &&
                        setSidebar({ mode: "edit", purchase: sheetPurchase })
                      }
                    >
                      {t("actions.edit")}
                    </Button>
                    <SheetClose asChild>
                      <Button className="w-full sm:w-auto">{t("actions.close", { ns: "common" })}</Button>
                    </SheetClose>
                  </>
                ) : (
                  <>
                    <SheetClose asChild>
                      <Button variant="outline" type="button">
                        {t("actions.cancel")}
                      </Button>
                    </SheetClose>
                    <Button type="submit" form={formId}>
                      {sidebar.mode === "add" ? t("sheet.createButton") : t("sheet.saveButton")}
                    </Button>
                  </>
                )}
              </SheetFooter>
            </>
          ) : null}
        </SheetContent>
      </Sheet>

      <Sheet
        open={viewLine !== null}
        onOpenChange={(open) => {
          if (!open) setViewLine(null)
        }}
      >
        <SheetContent
          side="right"
          className="flex w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-md"
        >
          {viewLine ? (
            <>
              <SheetHeader className="border-border/60 space-y-1 border-b px-6 py-5 text-left">
                <SheetTitle className="text-lg leading-tight">
                  {viewLine.productName}
                </SheetTitle>
                <SheetDescription>
                  {viewLine.purchaseNumber}
                  <span className="text-muted-foreground"> · {viewLine.vendorName}</span>
                </SheetDescription>
              </SheetHeader>
              <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
                <PurchaseLineDetail line={viewLine} />
              </div>
              <SheetFooter className="border-border/60 gap-2 border-t px-6 py-4 sm:flex-row sm:justify-end">
                <Button
                  variant="outline"
                  className="w-full sm:w-auto"
                  onClick={() => openPurchaseBill(viewLine.purchaseId)}
                >
                  {t("actions.openPurchase")}
                </Button>
                <SheetClose asChild>
                  <Button className="w-full sm:w-auto">{t("actions.close", { ns: "common" })}</Button>
                </SheetClose>
              </SheetFooter>
            </>
          ) : null}
        </SheetContent>
      </Sheet>

      {viewMode === "bill" ? (
          <DataTable
            data={purchases}
            columns={billColumns}
            settingsKey="purchases-bills"
            addButtonLabel={t("addButton")}
            searchPlaceholder={t("search.bills")}
            importSampleFilename="purchases-sample.csv"
            importSampleCsvContent={purchaseImportSampleCsv}
            importColumns={[...PURCHASE_IMPORT_COLUMNS]}
            importSelectColumns={{
              status: [...PURCHASE_STATUSES],
            }}
            importRequiredSelectColumns={[]}
            exportFilename="purchases-export.csv"
            onImportRows={handleImportPurchases}
            exportRowTransform={flattenPurchaseForExport}
            onAddClick={openCreatePurchase}
            tableOptionsExtra={purchaseTableOptions}
            bulkActions={[
              {
                id: "delete",
                label: t("actions.deleteSelected"),
                icon: <IconTrash className="size-4" />,
                variant: "destructive",
                onClick: async (selected) => {
                  if (
                    !(await confirmDeleteAction({
                      count: selected.length,
                      entityLabel: t("entity.purchaseOrder"),
                    }))
                  ) {
                    return
                  }
                  const ids = new Set(selected.map((s) => s.id))
                  setPurchases((prev) => prev.filter((r) => !ids.has(r.id)))
                  toast.message(t("toasts.removedPurchases", { count: selected.length }))
                },
              },
            ]}
            tabs={purchaseTabs}
            defaultTab="all"
            tabFilter={purchaseTabFilter}
          />
        ) : (
          <DataTable
            data={purchaseLines}
            columns={lineColumns}
            settingsKey="purchases-items"
            addButtonLabel={t("addButton")}
            searchPlaceholder={t("search.items")}
            importSampleFilename="purchases-sample.csv"
            importSampleCsvContent={purchaseImportSampleCsv}
            importColumns={[...PURCHASE_IMPORT_COLUMNS]}
            importSelectColumns={{
              status: [...PURCHASE_STATUSES],
            }}
            importRequiredSelectColumns={[]}
            onImportRows={handleImportPurchases}
            exportRowTransform={flattenPurchaseLineForExport}
            onAddClick={openCreatePurchase}
            exportFilename="purchase-lines-export.csv"
            tableOptionsExtra={purchaseTableOptions}
            bulkActions={[
              {
                id: "delete",
                label: t("actions.deleteSelected"),
                icon: <IconTrash className="size-4" />,
                variant: "destructive",
                onClick: handleDeleteLines,
              },
            ]}
            tabs={purchaseTabs}
            defaultTab="all"
            tabFilter={purchaseLineTabFilter}
          />
        )}
    </>
  )
}
