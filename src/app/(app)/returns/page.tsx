"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { ColumnDef } from "@tanstack/react-table"
import { IconDotsVertical, IconEye, IconTrash } from "@tabler/icons-react"
import { toast } from "sonner"
import { useTranslation } from "react-i18next"
import type { TFunction } from "i18next"

import { ReturnDetail } from "@/components/returns/return-detail"
import { ReturnLineDetail } from "@/components/returns/return-line-detail"
import { ReturnViewTableOption } from "@/components/returns/return-view-toggle"
import { DataTableColumnHeader } from "@/components/data-table-column-header"
import { DataTable, type DataTableTab } from "@/components/data-table"
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
import { useReturns } from "@/context/returns-context"
import {
  loadReturnViewMode,
  saveReturnViewMode,
  type BillItemViewMode,
} from "@/lib/app-preferences"
import { confirmDeleteAction } from "@/lib/confirm-action"
import { buildSampleCsv } from "@/lib/csv"
import {
  flattenReturnForExport,
  formatDate,
  formatMoney,
  importReturnsFromRows,
  RETURN_IMPORT_COLUMNS,
  RETURN_IMPORT_SAMPLE_ROW,
  RETURN_STATUSES,
  RETURN_TYPES,
  type ReturnRow,
} from "@/lib/returns"
import {
  flattenReturnLineForExport,
  flattenReturnsToLines,
  type ReturnLineReportRow,
} from "@/lib/returns-report"

function returnBillTabFilter(row: ReturnRow, tab: string) {
  if (tab === "all") return true
  if (tab === "sales" || tab === "purchase") return row.type === tab
  return row.status === tab
}

function returnLineTabFilter(row: ReturnLineReportRow, tab: string) {
  if (tab === "all") return true
  if (tab === "sales" || tab === "purchase") return row.type === tab
  if (tab === "pending" || tab === "completed") return row.returnStatus === tab
  return true
}

function textFilterMeta(label: string) {
  return { dataTableFilterVariant: "text" as const, dataTableFilterLabel: label }
}

function rangeFilterMeta(label: string) {
  return { dataTableFilterVariant: "range" as const, dataTableFilterLabel: label }
}

function typeFilterMeta(t: TFunction<"returns">) {
  return {
    dataTableFilterVariant: "select" as const,
    dataTableFilterLabel: t("columns.type"),
    dataTableFilterSelectLabels: {
      sales: t("type.sales"),
      purchase: t("type.purchase"),
    },
  }
}

function statusFilterMeta(t: TFunction<"returns">) {
  return {
    dataTableFilterVariant: "select" as const,
    dataTableFilterLabel: t("columns.status"),
    dataTableFilterSelectLabels: {
      pending: t("status.pending", { ns: "common" }),
      completed: t("status.completed", { ns: "common" }),
      cancelled: t("status.cancelled", { ns: "common" }),
    },
  }
}

function statusBadgeClass(status: ReturnRow["status"]) {
  if (status === "completed")
    return "border-emerald-500/30 px-1.5 text-emerald-700 dark:text-emerald-400"
  if (status === "pending")
    return "border-blue-500/30 px-1.5 text-blue-700 dark:text-blue-400"
  return "border-border px-1.5 text-muted-foreground"
}

function selectColumn<T>(t: TFunction<"returns">): ColumnDef<T> {
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

function srNoColumn<T>(t: TFunction<"returns">): ColumnDef<T> {
  return {
    id: "srNo",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title={t("columns.srNo")} />
    ),
    cell: ({ row, table }) => {
      const { pageIndex, pageSize } = table.getState().pagination
      return (
        <span className="text-muted-foreground font-mono tabular-nums">
          {pageIndex * pageSize + row.index + 1}
        </span>
      )
    },
    enableSorting: false,
    meta: { dataTableFilter: false },
  }
}

function getReturnBillColumns(
  t: TFunction<"returns">,
  openView: (row: ReturnRow) => void,
  onDelete: (row: ReturnRow) => void
): ColumnDef<ReturnRow>[] {
  return [
    selectColumn<ReturnRow>(t),
    srNoColumn<ReturnRow>(t),
    {
      accessorKey: "returnNumber",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("columns.returnNumber")} />
      ),
      cell: ({ row }) => (
        <button
          type="button"
          className="text-foreground text-left font-medium hover:underline"
          onClick={() => openView(row.original)}
        >
          {row.original.returnNumber}
        </button>
      ),
      enableHiding: false,
      meta: textFilterMeta(t("columns.returnNumber")),
    },
    {
      accessorKey: "type",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("columns.type")} />
      ),
      cell: ({ row }) => (
        <span>{t(`type.${row.original.type}`)}</span>
      ),
      meta: typeFilterMeta(t),
    },
    {
      accessorKey: "referenceNumber",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("columns.reference")} />
      ),
      meta: textFilterMeta(t("columns.reference")),
    },
    {
      accessorKey: "partyName",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("columns.party")} />
      ),
      cell: ({ row }) => (
        <span className="max-w-[10rem] truncate">{row.original.partyName}</span>
      ),
      meta: textFilterMeta(t("columns.party")),
    },
    {
      accessorKey: "returnDate",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("columns.date")} />
      ),
      cell: ({ row }) => (
        <span className="text-muted-foreground text-xs tabular-nums">
          {formatDate(row.original.returnDate)}
        </span>
      ),
      meta: textFilterMeta(t("columns.date")),
    },
    {
      accessorKey: "totalAmount",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("columns.returnAmt")} align="center" />
      ),
      cell: ({ row }) => (
        <div className="flex justify-center tabular-nums">
          {formatMoney(row.original.totalAmount)}
        </div>
      ),
      meta: rangeFilterMeta(t("columns.returnAmt")),
    },
    {
      accessorKey: "refundDue",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("columns.refundDue")} align="center" />
      ),
      cell: ({ row }) => (
        <div className="flex justify-center">
          {Number(row.original.refundDue) > 0 ? (
            <span className="text-emerald-700 tabular-nums dark:text-emerald-400">
              {formatMoney(row.original.refundDue)}
            </span>
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
        </div>
      ),
      meta: rangeFilterMeta(t("columns.refundDue")),
    },
    {
      accessorKey: "balanceDue",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("columns.balanceDue")} align="center" />
      ),
      cell: ({ row }) => (
        <div className="flex justify-center">
          {Number(row.original.balanceDue) > 0 ? (
            <span className="text-amber-700 tabular-nums dark:text-amber-400">
              {formatMoney(row.original.balanceDue)}
            </span>
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
        </div>
      ),
      meta: rangeFilterMeta(t("columns.balanceDue")),
    },
    {
      accessorKey: "status",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("columns.status")} />
      ),
      cell: ({ row }) => (
        <Badge variant="outline" className={statusBadgeClass(row.original.status)}>
          {t(`status.${row.original.status}`, { ns: "common" })}
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
            <Button variant="ghost" className="text-muted-foreground flex size-8" size="icon">
              <IconDotsVertical />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem onClick={() => openView(row.original)}>
              <IconEye />
              {t("actions.view")}
            </DropdownMenuItem>
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

function getReturnLineColumns(
  t: TFunction<"returns">,
  openLineView: (row: ReturnLineReportRow) => void,
  onDeleteReturn: (returnId: number) => void
): ColumnDef<ReturnLineReportRow>[] {
  return [
    selectColumn<ReturnLineReportRow>(t),
    srNoColumn<ReturnLineReportRow>(t),
    {
      accessorKey: "returnNumber",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("columns.returnNumber")} />
      ),
      cell: ({ row }) => (
        <button
          type="button"
          className="text-foreground text-left font-medium hover:underline"
          onClick={() => openLineView(row.original)}
        >
          {row.original.returnNumber}
        </button>
      ),
      meta: textFilterMeta(t("columns.returnNumber")),
    },
    {
      accessorKey: "type",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("columns.type")} />
      ),
      cell: ({ row }) => <span>{t(`type.${row.original.type}`)}</span>,
      meta: typeFilterMeta(t),
    },
    {
      accessorKey: "referenceNumber",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("columns.reference")} />
      ),
      meta: textFilterMeta(t("columns.reference")),
    },
    {
      accessorKey: "productName",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("columns.item")} />
      ),
      cell: ({ row }) => (
        <span className="max-w-[14rem] truncate">{row.original.productName}</span>
      ),
      meta: textFilterMeta(t("columns.item")),
    },
    {
      accessorKey: "quantity",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("columns.qty")} align="center" />
      ),
      cell: ({ row }) => (
        <div className="flex justify-center tabular-nums">{row.original.quantity}</div>
      ),
      meta: rangeFilterMeta(t("columns.qty")),
    },
    {
      accessorKey: "lineTotal",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("columns.lineTotal")} align="center" />
      ),
      cell: ({ row }) => (
        <div className="flex justify-center tabular-nums">
          {formatMoney(row.original.lineTotal)}
        </div>
      ),
      meta: rangeFilterMeta(t("columns.lineTotal")),
    },
    {
      accessorKey: "refundDue",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("columns.refundDue")} align="center" />
      ),
      cell: ({ row }) => (
        <div className="flex justify-center">
          {Number(row.original.refundDue) > 0 ? (
            <span className="text-emerald-700 tabular-nums dark:text-emerald-400">
              {formatMoney(row.original.refundDue)}
            </span>
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
        </div>
      ),
      meta: rangeFilterMeta(t("columns.refundDue")),
    },
    {
      accessorKey: "returnStatus",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("columns.status")} />
      ),
      cell: ({ row }) => (
        <Badge variant="outline" className={statusBadgeClass(row.original.returnStatus)}>
          {t(`status.${row.original.returnStatus}`, { ns: "common" })}
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
            <Button variant="ghost" className="text-muted-foreground flex size-8" size="icon">
              <IconDotsVertical />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem onClick={() => openLineView(row.original)}>
              <IconEye />
              {t("actions.view")}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              onClick={() => onDeleteReturn(row.original.returnId)}
            >
              <IconTrash />
              {t("actions.deleteReturn")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ]
}

export default function ReturnsPage() {
  const { t } = useTranslation("returns")
  const { returns, setReturns, removeReturn } = useReturns()
  const [viewMode, setViewMode] = useState<BillItemViewMode>("item")
  const [viewReturn, setViewReturn] = useState<ReturnRow | null>(null)
  const [viewLine, setViewLine] = useState<ReturnLineReportRow | null>(null)

  useEffect(() => {
    setViewMode(loadReturnViewMode())
  }, [])

  const returnLines = useMemo(() => flattenReturnsToLines(returns), [returns])

  const handleViewModeChange = useCallback((mode: BillItemViewMode) => {
    setViewMode(mode)
    saveReturnViewMode(mode)
    if (mode === "item") setViewReturn(null)
    else setViewLine(null)
  }, [])

  const handleDelete = useCallback(
    async (row: ReturnRow) => {
      if (
        !(await confirmDeleteAction({
          itemName: row.returnNumber,
          entityLabel: t("entity.return"),
        }))
      ) {
        return
      }
      removeReturn(row.id)
      if (viewReturn?.id === row.id) setViewReturn(null)
      toast.message(t("toasts.removedNamed", { name: row.returnNumber }))
    },
    [removeReturn, viewReturn, t]
  )

  const handleDeleteById = useCallback(
    async (returnId: number) => {
      const row = returns.find((r) => r.id === returnId)
      if (row) await handleDelete(row)
    },
    [returns, handleDelete]
  )

  const handleImportReturns = useCallback(
    (rows: Record<string, string>[]) => {
      let added = 0
      setReturns((prev) => {
        const created = importReturnsFromRows(rows, prev)
        added = created.length
        return added > 0 ? [...prev, ...created] : prev
      })
      return added
    },
    [setReturns]
  )

  const returnImportSampleCsv = useMemo(
    () => buildSampleCsv([...RETURN_IMPORT_COLUMNS], RETURN_IMPORT_SAMPLE_ROW),
    []
  )

  const tableOptions = useMemo(
    () => <ReturnViewTableOption value={viewMode} onValueChange={handleViewModeChange} />,
    [viewMode, handleViewModeChange]
  )

  const billColumns = useMemo(
    () => getReturnBillColumns(t, (row) => setViewReturn(row), handleDelete),
    [t, handleDelete]
  )

  const lineColumns = useMemo(
    () =>
      getReturnLineColumns(t, (row) => setViewLine(row), (id) => {
        void handleDeleteById(id)
      }),
    [t, handleDeleteById]
  )

  const returnTabs: DataTableTab[] = [
    { value: "all", label: t("tabs.all") },
    { value: "sales", label: t("tabs.sales") },
    { value: "purchase", label: t("tabs.purchase") },
    { value: "pending", label: t("tabs.pending") },
    { value: "completed", label: t("tabs.completed") },
  ]

  return (
    <>
      <Sheet open={viewReturn !== null} onOpenChange={(o) => !o && setViewReturn(null)}>
        <SheetContent side="right" className="flex w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
          {viewReturn ? (
            <>
              <SheetHeader className="border-border/60 border-b px-6 py-5 text-left">
                <SheetTitle>{viewReturn.returnNumber}</SheetTitle>
                <SheetDescription>
                  {viewReturn.referenceNumber} · {viewReturn.partyName}
                </SheetDescription>
              </SheetHeader>
              <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
                <ReturnDetail returnDoc={viewReturn} />
              </div>
              <SheetFooter className="border-border/60 border-t px-6 py-4">
                <SheetClose asChild>
                  <Button>{t("actions.close", { ns: "common" })}</Button>
                </SheetClose>
              </SheetFooter>
            </>
          ) : null}
        </SheetContent>
      </Sheet>

      <Sheet open={viewLine !== null} onOpenChange={(o) => !o && setViewLine(null)}>
        <SheetContent side="right" className="flex w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-md">
          {viewLine ? (
            <>
              <SheetHeader className="border-border/60 border-b px-6 py-5 text-left">
                <SheetTitle>{viewLine.productName}</SheetTitle>
                <SheetDescription>{viewLine.returnNumber}</SheetDescription>
              </SheetHeader>
              <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
                <ReturnLineDetail line={viewLine} />
              </div>
              <SheetFooter className="border-border/60 border-t px-6 py-4">
                <SheetClose asChild>
                  <Button>{t("actions.close", { ns: "common" })}</Button>
                </SheetClose>
              </SheetFooter>
            </>
          ) : null}
        </SheetContent>
      </Sheet>

      {viewMode === "bill" ? (
        <DataTable
          data={returns}
          columns={billColumns}
          settingsKey="returns-bills"
          searchPlaceholder={t("search.bills")}
          exportFilename="returns-export.csv"
          showAddButton={false}
          importSampleFilename="returns-sample.csv"
          importSampleCsvContent={returnImportSampleCsv}
          importColumns={[...RETURN_IMPORT_COLUMNS]}
          importSelectColumns={{
            type: [...RETURN_TYPES],
            status: [...RETURN_STATUSES],
          }}
          importRequiredSelectColumns={[]}
          onImportRows={handleImportReturns}
          exportRowTransform={flattenReturnForExport}
          tableOptionsExtra={tableOptions}
          tabs={returnTabs}
          defaultTab="all"
          tabFilter={returnBillTabFilter}
        />
      ) : (
        <DataTable
          data={returnLines}
          columns={lineColumns}
          settingsKey="returns-items"
          searchPlaceholder={t("search.items")}
          exportFilename="return-lines-export.csv"
          showAddButton={false}
          importSampleFilename="returns-sample.csv"
          importSampleCsvContent={returnImportSampleCsv}
          importColumns={[...RETURN_IMPORT_COLUMNS]}
          importSelectColumns={{
            type: [...RETURN_TYPES],
            status: [...RETURN_STATUSES],
          }}
          importRequiredSelectColumns={[]}
          onImportRows={handleImportReturns}
          exportRowTransform={flattenReturnLineForExport}
          tableOptionsExtra={tableOptions}
          tabs={returnTabs}
          defaultTab="all"
          tabFilter={returnLineTabFilter}
        />
      )}
    </>
  )
}
