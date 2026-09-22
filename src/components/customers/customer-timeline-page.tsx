"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import {
  IconAdjustmentsHorizontal,
  IconArrowLeft,
  IconChevronLeft,
  IconChevronRight,
  IconChevronsLeft,
  IconChevronsRight,
  IconCloudDownload,
  IconCloudUpload,
  IconSearch,
} from "@tabler/icons-react"
import {
  type ColumnDef,
  type PaginationState,
  type Row,
  type Table as TanStackTable,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
} from "@tanstack/react-table"
import { FileDown, FileJson, FileSpreadsheet, FileText } from "lucide-react"
import { useTranslation } from "react-i18next"
import type { TFunction } from "i18next"
import { toast } from "sonner"

import { DataTableColumnHeader } from "@/components/data-table-column-header"
import { DataTableExportDialog } from "@/components/data-table-export-dialog"
import { DataTableImportDialog } from "@/components/data-table-import-dialog"
import { loadCompanySettings } from "@/lib/company-settings"
import { downloadCustomerTimelinePdf } from "@/lib/customer-timeline-pdf"
import {
  downloadCustomerTimelineCsv,
  downloadCustomerTimelineExcel,
  downloadCustomerTimelineJson,
  timelineStatementFilename,
  type TimelineExportLabels,
} from "@/lib/customer-timeline-export"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { SearchInput } from "@/components/ui/search-input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useOrders } from "@/context/orders-context"
import { useReturns } from "@/context/returns-context"
import { formatMoney, type CustomerRow } from "@/lib/customers"
import {
  applyImportedTimelineRows,
  buildCustomerTimelineRows,
  filterTimelineExportRange,
  filterTimelineRows,
  formatTimelineMonthLabel,
  groupTimelineByMonth,
  listTimelineMonths,
  timelineDateBounds,
  timelineMonthKey,
  TIMELINE_IMPORT_COLUMNS,
  TIMELINE_IMPORT_SAMPLE_ROW,
  TIMELINE_STATUS_OPTIONS,
  type CustomerTimelineRow,
  type TimelineMonthGroup,
} from "@/lib/customer-timeline"
import { buildSampleCsv } from "@/lib/csv"
import { dateLocaleForLanguage } from "@/i18n/config"
import { cn } from "@/lib/utils"
import { formatDate, statusBadgeClass as orderStatusClass } from "@/lib/orders"

function statusClass(row: CustomerTimelineRow) {
  if (row.kind === "invoice") return orderStatusClass(row.order?.status)
  if (row.status === "completed") {
    return "border-emerald-500/30 text-emerald-700 dark:text-emerald-400"
  }
  if (row.status === "pending") {
    return "border-blue-500/30 text-blue-700 dark:text-blue-400"
  }
  return "text-muted-foreground"
}

function MoneyCell({
  value,
  tone = "default",
}: {
  value: string
  tone?: "default" | "return" | "warn" | "muted"
}) {
  return (
    <div className="flex justify-end">
      <span
        className={cn(
          "tabular-nums",
          tone === "return" && "text-red-700 dark:text-red-400",
          tone === "warn" && "text-amber-700 dark:text-amber-400",
          tone === "muted" && "text-muted-foreground",
          tone === "default" && "text-foreground"
        )}
      >
        {tone === "return" ? `(${formatMoney(value)})` : formatMoney(value)}
      </span>
    </div>
  )
}

function getTimelineColumns(
  t: TFunction
): ColumnDef<CustomerTimelineRow>[] {
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
      accessorKey: "date",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("timeline.columns.date")} />
      ),
      cell: ({ row }) => (
        <span className="text-muted-foreground tabular-nums text-sm">
          {formatDate(row.original.date)}
        </span>
      ),
      meta: { dataTableFilter: false },
    },
    {
      accessorKey: "number",
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title={t("timeline.columns.document")}
        />
      ),
      cell: ({ row }) => (
        <span className="text-foreground font-medium">{row.original.number}</span>
      ),
      enableHiding: false,
      meta: { dataTableFilter: false },
    },
    {
      accessorKey: "kind",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("timeline.columns.type")} />
      ),
      cell: ({ row }) => {
        const isReturn = row.original.kind === "return"
        return (
          <Badge
            variant="outline"
            className={
              isReturn
                ? "border-red-500/30 px-1.5 text-red-700 dark:text-red-400"
                : "text-muted-foreground px-1.5"
            }
          >
            {isReturn ? t("timeline.typeReturn") : t("timeline.typeInvoice")}
          </Badge>
        )
      },
      meta: { dataTableFilter: false },
    },
    {
      accessorKey: "details",
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title={t("timeline.columns.details")}
        />
      ),
      cell: ({ row }) => (
        <span className="text-foreground max-w-[16rem] truncate text-sm">
          {row.original.details || "—"}
        </span>
      ),
      meta: { dataTableFilter: false },
    },
    {
      accessorKey: "reference",
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title={t("timeline.columns.reference")}
        />
      ),
      cell: ({ row }) => (
        <span className="text-muted-foreground max-w-[10rem] truncate text-sm">
          {row.original.reference || "—"}
        </span>
      ),
      meta: { dataTableFilter: false },
    },
    {
      accessorKey: "amount",
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title={t("timeline.columns.amount")}
          align="end"
        />
      ),
      cell: ({ row }) => (
        <MoneyCell
          value={row.original.amount}
          tone={row.original.kind === "return" ? "return" : "default"}
        />
      ),
      meta: { dataTableFilter: false },
    },
    {
      accessorKey: "paid",
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title={t("timeline.columns.paid")}
          align="end"
        />
      ),
      cell: ({ row }) => (
        <MoneyCell
          value={row.original.paid}
          tone={row.original.kind === "return" ? "return" : "muted"}
        />
      ),
      meta: { dataTableFilter: false },
    },
    {
      accessorKey: "balance",
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title={t("timeline.columns.balance")}
          align="end"
        />
      ),
      cell: ({ row }) =>
        row.original.kind === "return" ? (
          <div className="text-muted-foreground text-end">—</div>
        ) : (
          <MoneyCell
            value={row.original.balance}
            tone={Number(row.original.balance) > 0 ? "warn" : "muted"}
          />
        ),
      meta: { dataTableFilter: false },
    },
    {
      accessorKey: "runningBalance",
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title={t("timeline.columns.running")}
          align="end"
        />
      ),
      cell: ({ row }) => (
        <MoneyCell
          value={row.original.runningBalance}
          tone={Number(row.original.runningBalance) > 0 ? "warn" : "muted"}
        />
      ),
      meta: { dataTableFilter: false },
    },
    {
      accessorKey: "status",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("timeline.columns.status")} />
      ),
      cell: ({ row }) => (
        <Badge variant="outline" className={statusClass(row.original)}>
          {t(`status.${row.original.status}`, { ns: "common" })}
        </Badge>
      ),
      meta: { dataTableFilter: false },
    },
  ]
}

function TimelineFiltersButton({
  status,
  month,
  months,
  locale,
  i18nNs,
  onStatusChange,
  onMonthChange,
}: {
  status: string
  month: string
  months: string[]
  locale: string
  i18nNs: "customers" | "vendors"
  onStatusChange: (value: string) => void
  onMonthChange: (value: string) => void
}) {
  const { t } = useTranslation(i18nNs)
  const { t: tc } = useTranslation()
  const filterCount = Number(status !== "all") + Number(month !== "all")

  return (
    <Popover modal={false}>
      <div className="border-border/70 bg-background inline-flex h-9 shrink-0 items-center overflow-visible rounded-full border shadow-sm">
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={cn(
              "text-muted-foreground hover:bg-muted/50 hover:text-foreground relative size-9 rounded-full border-0 shadow-none",
              filterCount > 0 && "bg-primary/5 text-foreground"
            )}
            aria-label={tc("table.openFilters")}
          >
            <IconAdjustmentsHorizontal className="size-4 opacity-90" />
            {filterCount > 0 ? (
              <span className="bg-primary text-primary-foreground border-background pointer-events-none absolute top-0 right-0 z-10 flex size-5 translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 text-[10px] font-semibold tabular-nums leading-none shadow-sm">
                {filterCount}
              </span>
            ) : null}
          </Button>
        </PopoverTrigger>
      </div>
      <PopoverContent
        align="start"
        sideOffset={6}
        className="border-border/70 text-popover-foreground w-[min(100vw-1.5rem,22rem)] max-w-[22rem] overflow-hidden rounded-xl border bg-popover p-0 shadow-xl"
        onOpenAutoFocus={(event) => event.preventDefault()}
      >
        <div className="from-muted/50 border-border/60 bg-gradient-to-b to-popover border-b px-4 py-3.5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 space-y-1">
              <h3 className="text-foreground text-sm font-semibold tracking-tight">
                {tc("table.tableOptions")}
              </h3>
              <p className="text-muted-foreground text-[11px] leading-relaxed">
                {tc("table.tableOptionsHint")}
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="text-muted-foreground hover:text-foreground h-8 shrink-0 border-border/80 px-2.5 text-xs font-medium"
              disabled={filterCount === 0}
              onClick={() => {
                onStatusChange("all")
                onMonthChange("all")
              }}
            >
              {tc("table.resetFilters")}
            </Button>
          </div>
        </div>
        <div className="space-y-3 px-4 py-3">
          <div className="space-y-2">
            <Label className="text-muted-foreground block text-[11px] font-semibold tracking-wide uppercase">
              {t("timeline.filters.status")}
            </Label>
            <select
              className="border-input/80 bg-background h-8 w-full rounded-md border px-2 text-sm shadow-none outline-none focus-visible:ring-ring/50 focus-visible:ring-[3px]"
              value={status}
              onChange={(event) => onStatusChange(event.target.value)}
            >
              <option value="all">{t("timeline.filters.allStatuses")}</option>
              {TIMELINE_STATUS_OPTIONS.map((value) => (
                <option key={value} value={value}>
                  {tc(`status.${value}`)}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label className="text-muted-foreground block text-[11px] font-semibold tracking-wide uppercase">
              {t("timeline.filters.month")}
            </Label>
            <select
              className="border-input/80 bg-background h-8 w-full rounded-md border px-2 text-sm shadow-none outline-none focus-visible:ring-ring/50 focus-visible:ring-[3px]"
              value={month}
              onChange={(event) => onMonthChange(event.target.value)}
            >
              <option value="all">{t("timeline.filters.allMonths")}</option>
              {months.map((value) => (
                <option key={value} value={value}>
                  {formatTimelineMonthLabel(value, locale)}
                </option>
              ))}
            </select>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}

type ExportRangeState = {
  mode: "all" | "month" | "date"
  monthFrom: string
  monthTo: string
  dateFrom: string
  dateTo: string
}

function TimelineExportRangeFields({
  range,
  bounds,
  rowCount,
  monthCount,
  periodLabel,
  i18nNs,
  onChange,
}: {
  range: ExportRangeState
  bounds: ReturnType<typeof timelineDateBounds>
  rowCount: number
  monthCount: number
  periodLabel: string
  i18nNs: "customers" | "vendors"
  onChange: (next: ExportRangeState) => void
}) {
  const { t } = useTranslation(i18nNs)
  const modes = [
    { value: "all" as const, label: t("timeline.exportRange.all") },
    { value: "month" as const, label: t("timeline.exportRange.months") },
    { value: "date" as const, label: t("timeline.exportRange.dates") },
  ]

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-foreground text-sm font-medium">
          {t("timeline.exportRange.label")}
        </h3>
        <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
          {range.mode === "month"
            ? t("timeline.exportRange.hintMonths")
            : range.mode === "date"
              ? t("timeline.exportRange.hintDates")
              : t("timeline.exportRange.hintAll")}
        </p>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {modes.map((mode) => (
          <Button
            key={mode.value}
            type="button"
            variant={range.mode === mode.value ? "default" : "outline"}
            size="sm"
            className="h-8 rounded-full px-3 text-xs"
            onClick={() =>
              onChange({
                ...range,
                mode: mode.value,
                monthFrom: range.monthFrom || bounds.minMonth,
                monthTo: range.monthTo || bounds.maxMonth,
                dateFrom: range.dateFrom || bounds.minDate,
                dateTo: range.dateTo || bounds.maxDate,
              })
            }
          >
            {mode.label}
          </Button>
        ))}
      </div>
      {range.mode === "month" ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="timeline-export-month-from" className="text-xs">
              {t("timeline.exportRange.fromMonth")}
            </Label>
            <Input
              id="timeline-export-month-from"
              type="month"
              value={range.monthFrom}
              min={bounds.minMonth || undefined}
              max={range.monthTo || bounds.maxMonth || undefined}
              onChange={(event) =>
                onChange({ ...range, monthFrom: event.target.value })
              }
              className="border-input/80 bg-background h-9 text-sm shadow-none"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="timeline-export-month-to" className="text-xs">
              {t("timeline.exportRange.toMonth")}
            </Label>
            <Input
              id="timeline-export-month-to"
              type="month"
              value={range.monthTo}
              min={range.monthFrom || bounds.minMonth || undefined}
              max={bounds.maxMonth || undefined}
              onChange={(event) =>
                onChange({ ...range, monthTo: event.target.value })
              }
              className="border-input/80 bg-background h-9 text-sm shadow-none"
            />
          </div>
        </div>
      ) : null}
      {range.mode === "date" ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="timeline-export-date-from" className="text-xs">
              {t("timeline.exportRange.fromDate")}
            </Label>
            <Input
              id="timeline-export-date-from"
              type="date"
              value={range.dateFrom}
              min={bounds.minDate || undefined}
              max={range.dateTo || bounds.maxDate || undefined}
              onChange={(event) =>
                onChange({ ...range, dateFrom: event.target.value })
              }
              className="border-input/80 bg-background h-9 text-sm shadow-none"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="timeline-export-date-to" className="text-xs">
              {t("timeline.exportRange.toDate")}
            </Label>
            <Input
              id="timeline-export-date-to"
              type="date"
              value={range.dateTo}
              min={range.dateFrom || bounds.minDate || undefined}
              max={bounds.maxDate || undefined}
              onChange={(event) =>
                onChange({ ...range, dateTo: event.target.value })
              }
              className="border-input/80 bg-background h-9 text-sm shadow-none"
            />
          </div>
        </div>
      ) : null}
      <div className="bg-muted/50 text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg px-3 py-2 text-xs">
        <span className="text-foreground font-medium tabular-nums">
          {rowCount === 0
            ? t("timeline.exportRange.previewEmpty")
            : t("timeline.exportRange.preview", {
                count: rowCount,
                months: monthCount,
              })}
        </span>
        {rowCount > 0 ? (
          <span className="truncate">{periodLabel}</span>
        ) : null}
      </div>
    </div>
  )
}

export type TimelineParty = {
  name: string
  phone: string
  description: string
  openingBalance: string
}

export function StatementTimelinePage({
  party,
  allRows,
  backHref,
  i18nNs,
  documentKind,
  importKinds,
  importSampleFilename,
  importSampleRow,
  onImport,
}: {
  party: TimelineParty
  allRows: CustomerTimelineRow[]
  backHref: string
  i18nNs: "customers" | "vendors"
  documentKind: "invoice" | "purchase"
  importKinds: string[]
  importSampleFilename: string
  importSampleRow: Record<string, unknown>
  onImport: (imported: Record<string, string>[]) => void
}) {
  const { t, i18n } = useTranslation(i18nNs)
  const { t: tc } = useTranslation()
  const [importOpen, setImportOpen] = useState(false)
  const [exportOpen, setExportOpen] = useState(false)
  const [exportRange, setExportRange] = useState<ExportRangeState>({
    mode: "all",
    monthFrom: "",
    monthTo: "",
    dateFrom: "",
    dateTo: "",
  })
  const [search, setSearch] = useState("")
  const [kind, setKind] = useState("all")
  const [status, setStatus] = useState("all")
  const [month, setMonth] = useState("all")
  const locale = dateLocaleForLanguage(i18n.language)
  const rows = useMemo(
    () => filterTimelineRows(allRows, { search, kind, status, month }),
    [allRows, search, kind, status, month]
  )
  const exportBaseRows = useMemo(
    () => filterTimelineRows(allRows, { search, kind, status }),
    [allRows, search, kind, status]
  )
  const exportBounds = useMemo(
    () => timelineDateBounds(exportBaseRows),
    [exportBaseRows]
  )
  const exportRows = useMemo(() => {
    if (exportRange.mode === "month") {
      return filterTimelineExportRange(exportBaseRows, {
        mode: "month",
        from: exportRange.monthFrom,
        to: exportRange.monthTo,
      })
    }
    if (exportRange.mode === "date") {
      return filterTimelineExportRange(exportBaseRows, {
        mode: "date",
        from: exportRange.dateFrom,
        to: exportRange.dateTo,
      })
    }
    return exportBaseRows
  }, [exportBaseRows, exportRange])
  const exportMonthCount = useMemo(
    () => listTimelineMonths(exportRows).length,
    [exportRows]
  )
  const exportPeriodSlug = useMemo(() => {
    if (
      exportRange.mode === "month" &&
      exportRange.monthFrom &&
      exportRange.monthTo
    ) {
      return exportRange.monthFrom === exportRange.monthTo
        ? exportRange.monthFrom
        : `${exportRange.monthFrom}-to-${exportRange.monthTo}`
    }
    if (
      exportRange.mode === "date" &&
      exportRange.dateFrom &&
      exportRange.dateTo
    ) {
      return exportRange.dateFrom === exportRange.dateTo
        ? exportRange.dateFrom
        : `${exportRange.dateFrom}-to-${exportRange.dateTo}`
    }
    return "all"
  }, [exportRange])
  const exportFilename = useMemo(
    () => timelineStatementFilename(party.name, exportPeriodSlug),
    [party.name, exportPeriodSlug]
  )

  const exportOpened = useRef(false)
  useEffect(() => {
    if (exportOpen && !exportOpened.current) {
      setExportRange({
        mode: "all",
        monthFrom: exportBounds.minMonth,
        monthTo: exportBounds.maxMonth,
        dateFrom: exportBounds.minDate,
        dateTo: exportBounds.maxDate,
      })
    }
    exportOpened.current = exportOpen
  }, [exportOpen, exportBounds])
  const months = useMemo(() => listTimelineMonths(allRows), [allRows])
  const monthSummaries = useMemo(
    () =>
      new Map(
        groupTimelineByMonth(rows).map((group) => [group.month, group])
      ),
    [rows]
  )
  const columns = useMemo(() => getTimelineColumns(t), [t])
  const tabs = [
    { value: "all", label: t("timeline.tabs.all") },
    { value: documentKind, label: t("timeline.tabs.invoices") },
    { value: "return", label: t("timeline.tabs.returns") },
  ]
  const [rowSelection, setRowSelection] = useState({})
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  })
  const table = useReactTable({
    data: rows,
    columns,
    state: { pagination, rowSelection },
    getRowId: (row) => row.id,
    enableRowSelection: true,
    enableSorting: false,
    onRowSelectionChange: setRowSelection,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  })
  const pageRows = table.getRowModel().rows
  const pageGroups = useMemo(() => {
    const buckets = new Map<string, Row<CustomerTimelineRow>[]>()
    for (const row of pageRows) {
      const key = timelineMonthKey(row.original.date) || "unknown"
      const current = buckets.get(key) ?? []
      current.push(row)
      buckets.set(key, current)
    }
    return [...buckets.entries()].map(([month, monthRows]) => ({
      month,
      rows: monthRows,
      summary: monthSummaries.get(month),
    }))
  }, [pageRows, monthSummaries])
  const filteredTotal = rows.length
  const pageIndex = table.getState().pagination.pageIndex
  const pageSize = table.getState().pagination.pageSize
  const rowsOnPage = pageRows.length
  const rangeFrom =
    filteredTotal === 0 || rowsOnPage === 0 ? 0 : pageIndex * pageSize + 1
  const rangeTo =
    filteredTotal === 0 || rowsOnPage === 0
      ? 0
      : pageIndex * pageSize + rowsOnPage

  function handleImport(imported: Record<string, string>[]) {
    onImport(imported)
  }

  function exportPeriodLabel() {
    if (exportRange.mode === "month") {
      const from = formatTimelineMonthLabel(
        exportRange.monthFrom || exportBounds.minMonth,
        locale
      )
      const to = formatTimelineMonthLabel(
        exportRange.monthTo || exportBounds.maxMonth,
        locale
      )
      return from === to ? from : `${from} – ${to}`
    }
    if (exportRange.mode === "date") {
      const from = formatDate(exportRange.dateFrom || exportBounds.minDate)
      const to = formatDate(exportRange.dateTo || exportBounds.maxDate)
      return from === to ? from : `${from} – ${to}`
    }
    return t("timeline.exportRange.all")
  }

  function timelineExportLabels(): TimelineExportLabels {
    return {
      title: t("timeline.report.title"),
      customer: t("timeline.report.customer"),
      phone: t("timeline.report.phone"),
      period: t("timeline.report.period"),
      generated: t("timeline.report.generated"),
      date: t("timeline.columns.date"),
      type: t("timeline.columns.type"),
      document: t("timeline.columns.document"),
      details: t("timeline.columns.details"),
      reference: t("timeline.columns.reference"),
      amount: t("timeline.columns.amount"),
      paid: t("timeline.columns.paid"),
      due: t("timeline.columns.balance"),
      running: t("timeline.columns.running"),
      status: t("timeline.columns.status"),
      invoice: t("timeline.typeInvoice"),
      returnLabel: t("timeline.typeReturn"),
      item: t("timeline.report.item"),
      qty: t("timeline.report.qty"),
      rate: t("timeline.report.rate"),
      lineAmount: t("timeline.report.lineAmount"),
      total: t("timeline.summary.total"),
      credit: t("timeline.summary.credit"),
      remaining: t("timeline.summary.remaining"),
      balance: t("timeline.summary.balance"),
      openingBalance: t("columns.openingBalance"),
      statusOf: (status: string) => tc(`status.${status}`),
      month: t("timeline.columns.month"),
      items: t("timeline.columns.items"),
      monthsHeading: t("timeline.exportRange.months"),
      ledger: t("timeline.export.ledger"),
    }
  }

  async function handleTimelineExport(format: string) {
    const labels = timelineExportLabels()
    const company = loadCompanySettings()
    const periodLabel = exportPeriodLabel()
    const generatedAt = new Intl.DateTimeFormat(locale, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date())
    const formatTitle =
      format === "pdf"
        ? t("timeline.report.pdf")
        : format === "xlsx"
          ? t("timeline.export.xlsx")
          : format === "json"
            ? t("timeline.export.json")
            : t("timeline.export.csv")

    if (format === "pdf") {
      await downloadCustomerTimelinePdf({
        customer: party,
        rows: exportRows,
        company,
        periodLabel,
        generatedAt,
        locale,
        labels,
        filename: `${exportFilename}.pdf`,
      })
    } else if (format === "xlsx") {
      await downloadCustomerTimelineExcel({
        customer: party,
        rows: exportRows,
        company,
        periodLabel,
        generatedAt,
        locale,
        labels,
        filename: `${exportFilename}.xlsx`,
      })
    } else if (format === "json") {
      downloadCustomerTimelineJson(
        exportRows,
        labels,
        locale,
        `${exportFilename}.json`
      )
    } else {
      downloadCustomerTimelineCsv(
        exportRows,
        labels,
        locale,
        `${exportFilename}.csv`
      )
    }

    toast.success(
      tc("exportDialog.toastDownloaded", {
        count: exportRows.length,
        format: formatTitle,
      })
    )
  }

  return (
    <div className="w-full flex-col justify-start gap-6">
      <div className="mb-3 flex items-center gap-3">
        <Button asChild variant="outline" size="icon" className="size-9 shrink-0">
          <Link href={backHref} aria-label={t("timeline.back")}>
            <IconArrowLeft className="size-4 rtl:rotate-180" />
          </Link>
        </Button>
        <div className="min-w-0">
          <h2 className="text-foreground truncate text-lg font-semibold">
            {party.name}
          </h2>
          <p className="text-muted-foreground text-sm">{t("timeline.title")}</p>
        </div>
      </div>

      <div className="mb-3 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:items-center sm:gap-3">
          <div className="flex min-w-0 flex-1 items-center gap-2 sm:max-w-md">
            <SearchInput
              placeholder={t("timeline.search")}
              value={search}
              onChange={(event) => {
                setSearch(event.target.value)
                setPagination((current) => ({ ...current, pageIndex: 0 }))
              }}
              icon={<IconSearch className="size-4" />}
              className="min-w-0 flex-1 rounded-full shadow-sm focus-visible:ring-0 focus-visible:ring-offset-0 hover:ring-0 focus:ring-0 focus:outline-none"
            />
            <TimelineFiltersButton
              status={status}
              month={month}
              months={months}
              locale={locale}
              i18nNs={i18nNs}
              onStatusChange={(value) => {
                setStatus(value)
                setPagination((current) => ({ ...current, pageIndex: 0 }))
              }}
              onMonthChange={(value) => {
                setMonth(value)
                setPagination((current) => ({ ...current, pageIndex: 0 }))
              }}
            />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 lg:shrink-0">
          <Button
            type="button"
            variant="outline"
            className="h-9 rounded-full px-7 shadow-sm"
            onClick={() => setImportOpen(true)}
          >
            <IconCloudUpload />
            <span className="hidden sm:inline">{tc("table.import")}</span>
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-9 rounded-full px-7 shadow-sm"
            onClick={() => setExportOpen(true)}
          >
            <IconCloudDownload />
            <span className="hidden sm:inline">{tc("table.export")}</span>
          </Button>
        </div>
      </div>

      <div className="border-border mb-4 flex w-full min-w-0 flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b px-3 sm:px-4">
        <Tabs
          value={kind}
          onValueChange={(value) => {
            setKind(value)
            setPagination((current) => ({ ...current, pageIndex: 0 }))
          }}
          className="inline-flex w-fit max-w-full min-w-0 flex-col"
        >
          <TabsList className="text-muted-foreground -mb-px inline-flex h-auto w-fit max-w-full min-w-0 flex-wrap justify-start gap-x-1 gap-y-1 rounded-none border-0 bg-transparent p-0 px-1 shadow-none sm:px-2">
            {tabs.map((tab) => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className="text-muted-foreground hover:text-foreground data-[state=active]:text-primary relative z-10 h-auto flex-none shrink-0 rounded-none border-0 border-b-2 border-transparent bg-transparent px-3 py-2.5 text-sm font-medium shadow-none transition-colors data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:font-semibold data-[state=active]:shadow-none"
              >
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      {pageGroups.length === 0 ? (
        <TimelineMonthTable
          table={table}
          rows={[]}
          i18nNs={i18nNs}
          emptyLabel={
            allRows.length === 0 ? t("timeline.empty") : t("timeline.emptyFiltered")
          }
        />
      ) : (
        <div className="flex flex-col gap-8">
          {pageGroups.map((group) => (
            <MonthTable
              key={group.month}
              month={group.month}
              summary={group.summary}
              rows={group.rows}
              table={table}
              locale={locale}
              i18nNs={i18nNs}
            />
          ))}
        </div>
      )}
      <TimelinePagination
        table={table}
        rangeFrom={rangeFrom}
        rangeTo={rangeTo}
        filteredTotal={filteredTotal}
      />

      <DataTableImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        sampleFilename={importSampleFilename}
        sampleCsvContent={buildSampleCsv(
          [...TIMELINE_IMPORT_COLUMNS],
          importSampleRow
        )}
        columns={[...TIMELINE_IMPORT_COLUMNS]}
        selectColumns={{
          type: importKinds,
          status: [...TIMELINE_STATUS_OPTIONS],
        }}
        requiredSelectColumns={[]}
        onComplete={handleImport}
      />
      <DataTableExportDialog
        open={exportOpen}
        onOpenChange={setExportOpen}
        rowCount={exportRows.length}
        filename={exportFilename}
        title={t("timeline.export.title")}
        description={t("timeline.export.description")}
        defaultFormat="pdf"
        builtInFormats={[]}
        extra={
          <TimelineExportRangeFields
            range={exportRange}
            bounds={exportBounds}
            rowCount={exportRows.length}
            monthCount={exportMonthCount}
            periodLabel={exportPeriodLabel()}
            i18nNs={i18nNs}
            onChange={setExportRange}
          />
        }
        customFormats={[
          {
            id: "pdf",
            title: t("timeline.report.pdf"),
            description: t("timeline.report.pdfDesc"),
            actionLabel: tc("exportDialog.download", {
              format: t("timeline.report.pdf"),
            }),
            Icon: FileDown,
          },
          {
            id: "xlsx",
            title: t("timeline.export.xlsx"),
            description: t("timeline.export.xlsxDesc"),
            actionLabel: tc("exportDialog.download", {
              format: t("timeline.export.xlsx"),
            }),
            Icon: FileSpreadsheet,
          },
          {
            id: "csv",
            title: t("timeline.export.csv"),
            description: t("timeline.export.csvDesc"),
            actionLabel: tc("exportDialog.download", {
              format: t("timeline.export.csv"),
            }),
            Icon: FileText,
          },
          {
            id: "json",
            title: t("timeline.export.json"),
            description: t("timeline.export.jsonDesc"),
            actionLabel: tc("exportDialog.download", {
              format: t("timeline.export.json"),
            }),
            Icon: FileJson,
          },
        ]}
        onCustomDownload={handleTimelineExport}
      />
    </div>
  )
}

export function CustomerTimelinePage({ customer }: { customer: CustomerRow }) {
  const { t } = useTranslation("customers")
  const { t: tc } = useTranslation()
  const { orders, setOrders } = useOrders()
  const { returns, setReturns } = useReturns()
  const allRows = useMemo(
    () => buildCustomerTimelineRows(customer, orders, returns),
    [customer, orders, returns]
  )

  function handleImport(imported: Record<string, string>[]) {
    if (imported.length === 0) {
      toast.error(tc("toast.noRowsToImport"))
      return
    }
    const result = applyImportedTimelineRows(
      imported,
      customer.name,
      orders,
      returns
    )
    if (result.added === 0) {
      toast.message(tc("toast.noRowsAdded"))
      return
    }
    setOrders(result.orders)
    setReturns(result.returns)
    if (result.failed > 0) {
      toast.error(
        t("toasts.importPartial", { added: result.added, failed: result.failed })
      )
      return
    }
    toast.success(tc("toast.importedRows", { count: result.added }))
  }

  return (
    <StatementTimelinePage
      party={customer}
      allRows={allRows}
      backHref="/customers"
      i18nNs="customers"
      documentKind="invoice"
      importKinds={["invoice", "return"]}
      importSampleFilename="customer-timeline-sample.csv"
      importSampleRow={TIMELINE_IMPORT_SAMPLE_ROW}
      onImport={handleImport}
    />
  )
}

function MonthTable({
  month,
  summary,
  rows,
  table,
  locale,
  i18nNs,
}: {
  month: string
  summary?: TimelineMonthGroup
  rows: Row<CustomerTimelineRow>[]
  table: TanStackTable<CustomerTimelineRow>
  locale: string
  i18nNs: "customers" | "vendors"
}) {
  return (
    <section className="flex flex-col gap-3">
      <h3 className="text-foreground px-1 text-base font-semibold tracking-tight">
        {formatTimelineMonthLabel(month, locale)}
      </h3>
      <TimelineMonthTable
        table={table}
        rows={rows}
        summary={summary}
        i18nNs={i18nNs}
      />
    </section>
  )
}

function MonthSummaryRows({
  summary,
  t,
}: {
  summary: TimelineMonthGroup
  t: TFunction
}) {
  const lines = [
    {
      key: "total",
      label: t("timeline.summary.total"),
      value: summary.total,
      className: "text-foreground",
    },
    {
      key: "credit",
      label: t("timeline.summary.credit"),
      value: summary.credit,
      className: "text-emerald-700 dark:text-emerald-400",
    },
    {
      key: "remaining",
      label: t("timeline.summary.remaining"),
      value: summary.remaining,
      className:
        Number(summary.remaining) > 0
          ? "text-amber-700 dark:text-amber-400"
          : "text-foreground",
    },
    {
      key: "balance",
      label: t("timeline.summary.balance"),
      value: summary.balance,
      className:
        Number(summary.balance) > 0
          ? "text-amber-700 dark:text-amber-400"
          : "text-foreground",
    },
  ]

  return (
    <div className="border-border/70 bg-white border-t dark:bg-white">
      <dl className="w-full px-4 py-2 sm:px-5">
        {lines.map((line) => (
          <div
            key={line.key}
            className="flex w-full items-center gap-3 py-2.5"
          >
            <dt className="text-muted-foreground shrink-0 text-sm font-medium whitespace-nowrap">
              {line.label}
            </dt>
            <span
              className="border-muted-foreground/40 min-w-4 flex-1 border-b border-dotted"
              aria-hidden
            />
            <dd
              className={cn(
                "shrink-0 text-base font-semibold tracking-tight whitespace-nowrap tabular-nums",
                line.className
              )}
            >
              {formatMoney(line.value)}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  )
}

function TimelineMonthTable({
  table,
  rows,
  summary,
  emptyLabel,
  i18nNs = "customers",
}: {
  table: TanStackTable<CustomerTimelineRow>
  rows: Row<CustomerTimelineRow>[]
  summary?: TimelineMonthGroup
  emptyLabel?: string
  i18nNs?: "customers" | "vendors"
}) {
  const { t } = useTranslation()
  const { t: summaryT } = useTranslation(i18nNs)
  const allSelected =
    rows.length > 0 && rows.every((row) => row.getIsSelected())
  const someSelected = rows.some((row) => row.getIsSelected())
  const columnCount = table.getVisibleLeafColumns().length

  return (
    <div className="overflow-hidden rounded-md border">
      <Table>
        <TableHeader className="bg-primary/10 sticky top-0 z-10 [&_tr]:border-primary/25">
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => {
                const meta = header.column.columnDef.meta as
                  | { headerClassName?: string }
                  | undefined
                return (
                  <TableHead
                    key={header.id}
                    colSpan={header.colSpan}
                    className={cn("px-4", meta?.headerClassName)}
                  >
                    {header.column.id === "select" ? (
                      <div className="flex items-center justify-center">
                        <Checkbox
                          checked={
                            allSelected
                              ? true
                              : someSelected
                                ? "indeterminate"
                                : false
                          }
                          disabled={rows.length === 0}
                          onCheckedChange={(value) => {
                            for (const row of rows) row.toggleSelected(!!value)
                          }}
                          aria-label={t("table.selectAll")}
                        />
                      </div>
                    ) : header.isPlaceholder ? null : (
                      flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )
                    )}
                  </TableHead>
                )
              })}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody className="**:data-[slot=table-cell]:first:w-8">
          {rows.length ? (
            rows.map((row) => (
              <TableRow
                key={row.id}
                data-state={row.getIsSelected() && "selected"}
              >
                {row.getVisibleCells().map((cell) => {
                  const meta = cell.column.columnDef.meta as
                    | { cellClassName?: string }
                    | undefined
                  return (
                    <TableCell
                      key={cell.id}
                      className={cn("px-4 py-3.5", meta?.cellClassName)}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  )
                })}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell
                colSpan={columnCount}
                className="h-24 text-center"
              >
                {emptyLabel ?? t("empty.noResults")}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      {summary ? <MonthSummaryRows summary={summary} t={summaryT} /> : null}
    </div>
  )
}

function TimelinePagination({
  table,
  rangeFrom,
  rangeTo,
  filteredTotal,
}: {
  table: TanStackTable<CustomerTimelineRow>
  rangeFrom: number
  rangeTo: number
  filteredTotal: number
}) {
  const { t } = useTranslation()
  return (
    <div className="mt-4 flex items-center justify-between">
      <div className="text-muted-foreground flex min-w-0 flex-1 text-sm">
        {t("table.showingRecords", {
          from: rangeFrom,
          to: rangeTo,
          total: filteredTotal,
        })}
      </div>
      <div className="flex w-full items-center gap-4 lg:w-fit lg:gap-8">
        <div className="flex w-fit items-center justify-center text-sm font-medium">
          {t("table.pageOf", {
            page: table.getState().pagination.pageIndex + 1,
            pageCount: Math.max(table.getPageCount(), 1),
          })}
        </div>
        <div className="hidden md:block">
          <select
            aria-label={t("table.rowsPerPage")}
            value={table.getState().pagination.pageSize}
            onChange={(event) => table.setPageSize(Number(event.target.value))}
            className="border-input/80 bg-background h-8 w-[4.25rem] rounded-md border px-2 text-sm shadow-none outline-none focus-visible:ring-ring/50 focus-visible:ring-[3px]"
          >
            {[10, 20, 30, 40, 50].map((pageSize) => (
              <option key={pageSize} value={pageSize}>
                {pageSize}
              </option>
            ))}
          </select>
        </div>
        <div className="ms-auto flex items-center gap-2 lg:ms-0">
          <Button
            variant="outline"
            className="hidden h-8 w-8 p-0 lg:flex"
            onClick={() => table.setPageIndex(0)}
            disabled={!table.getCanPreviousPage()}
          >
            <span className="sr-only">{t("table.goToFirstPage")}</span>
            <IconChevronsLeft />
          </Button>
          <Button
            variant="outline"
            className="size-8"
            size="icon"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            <span className="sr-only">{t("table.goToPreviousPage")}</span>
            <IconChevronLeft />
          </Button>
          <Button
            variant="outline"
            className="size-8"
            size="icon"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            <span className="sr-only">{t("table.goToNextPage")}</span>
            <IconChevronRight />
          </Button>
          <Button
            variant="outline"
            className="hidden size-8 lg:flex"
            size="icon"
            onClick={() => table.setPageIndex(table.getPageCount() - 1)}
            disabled={!table.getCanNextPage()}
          >
            <span className="sr-only">{t("table.goToLastPage")}</span>
            <IconChevronsRight />
          </Button>
        </div>
      </div>
    </div>
  )
}
