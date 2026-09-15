"use client"

import * as React from "react"
import { useTranslation } from "react-i18next"
import i18n from "@/i18n"
import {
  IconAdjustmentsHorizontal,
  IconChevronLeft,
  IconChevronRight,
  IconChevronsLeft,
  IconChevronsRight,
  IconCircleCheckFilled,
  IconCopy,
  IconDotsVertical,
  IconEye,
  IconLayoutGrid,
  IconLayoutList,
  IconLoader,
  IconPencil,
  IconPlus,
  IconSearch,
  IconCloudDownload,
  IconCloudUpload,
  IconTrendingUp,
} from "@tabler/icons-react"
import {
  type Column,
  type ColumnDef,
  ColumnFiltersState,
  type FilterFn,
  flexRender,
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  type Table as TanStackTable,
  useReactTable,
  VisibilityState,
} from "@tanstack/react-table"
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts"
import { toast } from "sonner"
import { z } from "zod"

import { DataTableColumnHeader } from "@/components/data-table-column-header"
import { DataTableExportDialog } from "@/components/data-table-export-dialog"
import { DataTableImportDialog } from "@/components/data-table-import-dialog"
import { useIsMobile } from "@/hooks/use-mobile"
import { buildSampleCsv } from "@/lib/csv"
import {
  confirmDuplicateAction,
} from "@/lib/confirm-action"
import { cn } from "@/lib/utils"

type DataTableColumnMeta = {
  dataTableFilter?: boolean
  headerClassName?: string
  cellClassName?: string
  dataTableFilterVariant?: "range" | "select" | "text"
  dataTableFilterLabel?: string
  dataTableFilterSelectLabels?: Record<string, string>
}

function getColumnMeta<TData>(column: Column<TData, unknown>) {
  return column.columnDef.meta as DataTableColumnMeta | undefined
}
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { SearchInput } from "@/components/ui/search-input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
} from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

export const schema = z.object({
  id: z.number(),
  header: z.string(),
  type: z.string(),
  status: z.string(),
  target: z.string(),
  limit: z.string(),
  reviewer: z.string(),
  lifecycle: z.enum(["active", "inactive", "archived"]).default("active"),
})

const DASHBOARD_TYPE_KEYS: Record<string, string> = {
  "Cover page": "dashboard.types.coverPage",
  "Cover Page": "dashboard.types.coverPage",
  "Table of contents": "dashboard.types.tableOfContents",
  "Table of Contents": "dashboard.types.tableOfContents",
  Narrative: "dashboard.types.narrative",
  "Technical content": "dashboard.types.technicalContent",
  "Plain language": "dashboard.types.plainLanguage",
  Legal: "dashboard.types.legal",
  Visual: "dashboard.types.visual",
  Financial: "dashboard.types.financial",
  Research: "dashboard.types.research",
  Planning: "dashboard.types.planning",
  "Executive Summary": "dashboard.types.executiveSummary",
  "Technical Approach": "dashboard.types.technicalApproach",
  Design: "dashboard.types.design",
  Capabilities: "dashboard.types.capabilities",
  "Focus Documents": "dashboard.types.focusDocuments",
}

const DASHBOARD_STATUS_KEYS: Record<string, string> = {
  Done: "dashboard.statuses.done",
  "In Process": "dashboard.statuses.inProcess",
  "In Progress": "dashboard.statuses.inProgress",
  "Not Started": "dashboard.statuses.notStarted",
}

function translateDashboardLabel(
  value: string,
  map: Record<string, string>,
  t: typeof i18n.t
) {
  const key = map[value]
  return key ? t(key) : value
}

export function getDefaultColumns(): ColumnDef<z.infer<typeof schema>>[] {
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
          aria-label={i18n.t("table.selectAll")}
        />
      </div>
    ),
    cell: ({ row }) => (
      <div className="flex items-center justify-center">
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label={i18n.t("table.selectRow")}
        />
      </div>
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "header",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title={i18n.t("dashboard.header")} />
    ),
    cell: ({ row }) => {
      return <TableCellViewer item={row.original} />
    },
    enableHiding: false,
  },
  {
    accessorKey: "type",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title={i18n.t("dashboard.sectionType")} />
    ),
    cell: ({ row }) => (
      <div className="w-32">
        <Badge variant="outline" className="text-muted-foreground px-1.5">
          {translateDashboardLabel(row.original.type, DASHBOARD_TYPE_KEYS, i18n.t)}
        </Badge>
      </div>
    ),
  },
  {
    accessorKey: "status",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title={i18n.t("dashboard.status")} />
    ),
    cell: ({ row }) => (
      <Badge variant="outline" className="text-muted-foreground px-1.5">
        {row.original.status === "Done" ? (
          <IconCircleCheckFilled className="fill-green-500 dark:fill-green-400" />
        ) : (
          <IconLoader />
        )}
        {translateDashboardLabel(row.original.status, DASHBOARD_STATUS_KEYS, i18n.t)}
      </Badge>
    ),
  },
  {
    accessorKey: "target",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title={i18n.t("dashboard.target")} align="end" />
    ),
    sortingFn: (rowA, rowB, columnId) => {
      const a = Number(rowA.getValue(columnId))
      const b = Number(rowB.getValue(columnId))
      return Number.isNaN(a) || Number.isNaN(b)
        ? String(rowA.getValue(columnId)).localeCompare(
            String(rowB.getValue(columnId))
          )
        : a === b
          ? 0
          : a > b
            ? 1
            : -1
    },
    cell: ({ row }) => (
      <form
        onSubmit={(e) => {
          e.preventDefault()
          toast.promise(new Promise((resolve) => setTimeout(resolve, 1000)), {
            loading: i18n.t("toast.savingNamed", { name: row.original.header }),
            success: i18n.t("toast.done"),
            error: i18n.t("error.generic"),
          })
        }}
      >
        <Label htmlFor={`${row.original.id}-target`} className="sr-only">
          {i18n.t("dashboard.target")}
        </Label>
        <Input
          className="hover:bg-input/30 focus-visible:bg-background dark:hover:bg-input/30 dark:focus-visible:bg-input/30 h-8 w-16 border-transparent bg-transparent text-right shadow-none focus-visible:border dark:bg-transparent"
          defaultValue={row.original.target}
          id={`${row.original.id}-target`}
        />
      </form>
    ),
  },
  {
    accessorKey: "limit",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title={i18n.t("dashboard.limit")} align="end" />
    ),
    sortingFn: (rowA, rowB, columnId) => {
      const a = Number(rowA.getValue(columnId))
      const b = Number(rowB.getValue(columnId))
      return Number.isNaN(a) || Number.isNaN(b)
        ? String(rowA.getValue(columnId)).localeCompare(
            String(rowB.getValue(columnId))
          )
        : a === b
          ? 0
          : a > b
            ? 1
            : -1
    },
    cell: ({ row }) => (
      <form
        onSubmit={(e) => {
          e.preventDefault()
          toast.promise(new Promise((resolve) => setTimeout(resolve, 1000)), {
            loading: i18n.t("toast.savingNamed", { name: row.original.header }),
            success: i18n.t("toast.done"),
            error: i18n.t("error.generic"),
          })
        }}
      >
        <Label htmlFor={`${row.original.id}-limit`} className="sr-only">
          {i18n.t("dashboard.limit")}
        </Label>
        <Input
          className="hover:bg-input/30 focus-visible:bg-background dark:hover:bg-input/30 dark:focus-visible:bg-input/30 h-8 w-16 border-transparent bg-transparent text-right shadow-none focus-visible:border dark:bg-transparent"
          defaultValue={row.original.limit}
          id={`${row.original.id}-limit`}
        />
      </form>
    ),
  },
  {
    accessorKey: "reviewer",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title={i18n.t("dashboard.reviewer")} />
    ),
    cell: ({ row }) => {
      const isAssigned = row.original.reviewer !== "Assign reviewer"

      if (isAssigned) {
        return row.original.reviewer
      }

      return (
        <>
          <Label htmlFor={`${row.original.id}-reviewer`} className="sr-only">
            {i18n.t("dashboard.reviewer")}
          </Label>
          <Select>
            <SelectTrigger
              className="w-38 **:data-[slot=select-value]:block **:data-[slot=select-value]:truncate"
              size="sm"
              id={`${row.original.id}-reviewer`}
            >
              <SelectValue placeholder={i18n.t("dashboard.assignReviewer")} />
            </SelectTrigger>
            <SelectContent align="end">
              <SelectItem value="Eddie Lake">Eddie Lake</SelectItem>
              <SelectItem value="Jamik Tashpulatov">
                Jamik Tashpulatov
              </SelectItem>
            </SelectContent>
          </Select>
        </>
      )
    },
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
            <span className="sr-only">{i18n.t("actions.openMenu")}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-40">
          <DropdownMenuItem>
            <IconEye />
            {i18n.t("actions.view")}
          </DropdownMenuItem>
          <DropdownMenuItem>
            <IconPencil />
            {i18n.t("actions.edit")}
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() =>
              void (async () => {
                if (
                  !(await confirmDuplicateAction({
                    itemName: row.original.header,
                    entityLabel: i18n.t("entity.section"),
                  }))
                ) {
                  return
                }
                toast.message(i18n.t("toast.duplicatedNamed", { name: row.original.header }))
              })()
            }
          >
            <IconCopy />
            {i18n.t("actions.duplicate")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    ),
  },
]
}

const FILTER_ANY = "__data_table_any__"

const rangeNumberFilter: FilterFn<unknown> = (row, columnId, filterValue) => {
  if (filterValue == null) return true
  const pair = filterValue as [string, string]
  if (!Array.isArray(pair)) return true
  const [minS, maxS] = pair
  const raw = row.getValue(columnId)
  const n = typeof raw === "number" ? raw : Number(raw)
  if (Number.isNaN(n)) return false
  if (minS !== "" && minS != null && n < Number(minS)) return false
  if (maxS !== "" && maxS != null && n > Number(maxS)) return false
  return true
}

const exactStringFilter: FilterFn<unknown> = (row, columnId, filterValue) => {
  if (filterValue == null || filterValue === "") return true
  return String(row.getValue(columnId) ?? "") === String(filterValue)
}

const includesTextFilter: FilterFn<unknown> = (row, columnId, filterValue) => {
  if (filterValue == null || filterValue === "") return true
  const q = String(filterValue).toLowerCase()
  return String(row.getValue(columnId) ?? "").toLowerCase().includes(q)
}

function mergeColumnFilters<TData>(
  columns: ColumnDef<TData>[],
  rows: Record<string, unknown>[]
): ColumnDef<TData>[] {
  return columns.map((col) => {
    const id = col.id
    if (id === "select" || id === "actions") {
      return { ...col, enableColumnFilter: false }
    }
    const key =
      "accessorKey" in col && col.accessorKey != null
        ? String(col.accessorKey)
        : undefined
    if (!key) return col

    const meta = col.meta as DataTableColumnMeta | undefined
    if (meta?.dataTableFilter === false) {
      return { ...col, enableColumnFilter: false }
    }

    const sample = rows[0]?.[key]
    const metaVariant = meta?.dataTableFilterVariant
    const isNumber =
      metaVariant === "range" ||
      (typeof sample === "number" && !Number.isNaN(sample))

    if (isNumber) {
      return {
        ...col,
        filterFn: rangeNumberFilter,
        enableColumnFilter: true,
        meta: { ...col.meta, dataTableFilterVariant: "range" } as ColumnDef<TData>["meta"],
      }
    }

    const stringVals = rows
      .map((r) => r[key])
      .filter((v) => v != null && v !== "")
    const unique = new Set(stringVals.map((v) => String(v)))
    const useSelect =
      metaVariant === "select" ||
      (metaVariant !== "text" && unique.size > 0 && unique.size <= 16)

    if (useSelect) {
      return {
        ...col,
        filterFn: exactStringFilter,
        enableColumnFilter: true,
        meta: { ...col.meta, dataTableFilterVariant: "select" } as ColumnDef<TData>["meta"],
      }
    }

    return {
      ...col,
      filterFn: includesTextFilter,
      enableColumnFilter: true,
      meta: { ...col.meta, dataTableFilterVariant: "text" } as ColumnDef<TData>["meta"],
    }
  }) as ColumnDef<TData>[]
}

function filterableLeafColumns<TData>(table: TanStackTable<TData>) {
  return table.getAllLeafColumns().filter((c) => {
    const def = c.columnDef
    if (def.id === "select" || def.id === "actions") return false
    if (!("accessorKey" in def) || def.accessorKey == null) return false
    if ((def.meta as DataTableColumnMeta | undefined)?.dataTableFilter === false)
      return false
    return c.getCanFilter()
  })
}

function activeColumnFilterCount(filters: ColumnFiltersState): number {
  let n = 0
  for (const f of filters) {
    const v = f.value
    if (v == null || v === "") continue
    if (Array.isArray(v)) {
      const [a, b] = v as [string, string]
      if ((a !== "" && a != null) || (b !== "" && b != null)) n++
    } else {
      n++
    }
  }
  return n
}

function hideableLeafColumns<TData>(table: TanStackTable<TData>) {
  return table.getAllLeafColumns().filter((c) => c.getCanHide())
}

function DataTableFiltersPopover<TData>({
  table,
  enableLayoutToggle,
  layoutView,
  onLayoutViewChange,
  tableOptionsExtra,
}: {
  table: TanStackTable<TData>
  enableLayoutToggle?: boolean
  layoutView?: "list" | "grid"
  onLayoutViewChange?: (view: "list" | "grid") => void
  tableOptionsExtra?: React.ReactNode
}) {
  const { t } = useTranslation()
  const columns = filterableLeafColumns(table)
  const hideableColumns = hideableLeafColumns(table)
  const filterCount = activeColumnFilterCount(table.getState().columnFilters)
  const showFilters = columns.length > 0
  const showLayoutToggle =
    enableLayoutToggle === true &&
    layoutView != null &&
    onLayoutViewChange != null
  const showColumns = hideableColumns.length > 0
  const visibleHideableCount = hideableColumns.filter((c) =>
    c.getIsVisible()
  ).length
  const allHideableVisible =
    hideableColumns.length > 0 &&
    hideableColumns.every((c) => c.getIsVisible())

  return (
    <Popover modal={false}>
      <div className="border-border/70 bg-background inline-flex h-9 shrink-0 items-center overflow-visible rounded-full border shadow-sm">
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={cn(
              "text-muted-foreground hover:bg-muted/50 hover:text-foreground relative size-9 border-0 shadow-none",
              showLayoutToggle ? "rounded-l-full rounded-r-none" : "rounded-full",
              filterCount > 0 && "bg-primary/5 text-foreground"
            )}
            aria-label={t("table.openFilters")}
          >
            <IconAdjustmentsHorizontal className="size-4 opacity-90" />
            {filterCount > 0 ? (
              <span className="bg-primary text-primary-foreground border-background pointer-events-none absolute top-0 right-0 z-10 flex size-5 translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 text-[10px] font-semibold tabular-nums leading-none shadow-sm">
                {filterCount > 9 ? "9+" : filterCount}
              </span>
            ) : null}
          </Button>
        </PopoverTrigger>
        {showLayoutToggle ? (
          <>
            <div className="bg-border/70 h-5 w-px" aria-hidden />
            <Button
              type="button"
              variant="ghost"
              size="icon"
            className="text-muted-foreground hover:bg-muted/50 hover:text-foreground size-9 rounded-r-full rounded-l-none border-0 shadow-none"
              aria-label={t("table.toggleLayout")}
              onClick={() =>
                onLayoutViewChange(layoutView === "list" ? "grid" : "list")
              }
            >
              {layoutView === "list" ? (
                <IconLayoutList className="size-4 opacity-90" />
              ) : (
                <IconLayoutGrid className="size-4 opacity-90" />
              )}
            </Button>
          </>
        ) : null}
      </div>
      <PopoverContent
        align="start"
        sideOffset={6}
        className="border-border/70 text-popover-foreground w-[min(100vw-1.5rem,22rem)] max-w-[22rem] overflow-hidden rounded-xl border bg-popover p-0 shadow-xl"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <div className="from-muted/50 border-border/60 bg-gradient-to-b to-popover border-b px-4 py-3.5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 space-y-1">
              <h3 className="text-foreground text-sm font-semibold tracking-tight">
                {t("table.tableOptions")}
              </h3>
              <p className="text-muted-foreground text-[11px] leading-relaxed">
                {t("table.tableOptionsHint")}
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="text-muted-foreground hover:text-foreground h-8 shrink-0 border-border/80 px-2.5 text-xs font-medium"
              disabled={filterCount === 0}
              onClick={() => table.resetColumnFilters()}
            >
              {t("table.resetFilters")}
            </Button>
          </div>
        </div>
        <div className="max-h-[min(70vh,28rem)] overflow-y-auto px-4">
          {tableOptionsExtra ? (
            <div className="border-border/80 border-b py-3">{tableOptionsExtra}</div>
          ) : null}
          {showColumns ? (
            <div className="border-border/80 space-y-2 border-b py-3">
              <div className="flex items-center justify-between gap-2">
                <Label className="text-muted-foreground block text-[11px] font-semibold tracking-wide uppercase">
                  {t("table.showColumns")}
                </Label>
                <button
                  type="button"
                  className="text-muted-foreground hover:text-foreground text-xs font-medium transition-colors disabled:opacity-50"
                  disabled={allHideableVisible}
                  onClick={() => {
                    for (const c of hideableColumns) {
                      if (!c.getIsVisible()) c.toggleVisibility(true)
                    }
                  }}
                >
                  {t("actions.reset")}
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <Button
                  type="button"
                  variant={allHideableVisible ? "default" : "outline"}
                  size="sm"
                  className="h-7 rounded-full px-2.5 text-xs"
                  onClick={() => {
                    for (const c of hideableColumns) c.toggleVisibility(true)
                  }}
                >
                  {t("table.all")}
                </Button>
                {hideableColumns.map((column) => {
                  const title = getColumnTitle(column)
                  const visible = column.getIsVisible()
                  return (
                    <Button
                      key={column.id}
                      type="button"
                      variant={visible ? "default" : "outline"}
                      size="sm"
                      className="h-7 rounded-full px-2.5 text-xs"
                      onClick={() => column.toggleVisibility(!visible)}
                    >
                      {title}
                    </Button>
                  )
                })}
              </div>
              <p className="text-muted-foreground text-[11px]">
                {t("table.showingOf", {
                  visible: visibleHideableCount,
                  total: hideableColumns.length,
                })}
              </p>
            </div>
          ) : null}
          {showFilters ? (
            <>
              <p className="text-muted-foreground border-border/80 border-b py-3 text-[11px] font-semibold tracking-wide uppercase">
                Column filters
              </p>
              <div className="divide-border/80 divide-y">
            {columns.map((column) => {
              const variant = (
                column.columnDef.meta as DataTableColumnMeta | undefined
              )?.dataTableFilterVariant
              const title = getColumnTitle(column)

              const fieldBlock = (children: React.ReactNode) => (
                <div className="space-y-2 py-3">
                  <Label className="text-muted-foreground block text-[11px] font-semibold tracking-wide uppercase">
                    {title}
                  </Label>
                  {children}
                </div>
              )

              if (variant === "range") {
                const raw = column.getFilterValue() as
                  | [string, string]
                  | undefined
                const minV = raw?.[0] ?? ""
                const maxV = raw?.[1] ?? ""
                return (
                  <div key={column.id}>
                    {fieldBlock(
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          inputMode="decimal"
                          placeholder={t("table.min")}
                          className="border-input/80 bg-background h-8 text-sm shadow-none"
                          value={minV}
                          onChange={(e) => {
                            const nextMin = e.target.value
                            const next: [string, string] = [nextMin, maxV]
                            if (nextMin === "" && maxV === "")
                              column.setFilterValue(undefined)
                            else column.setFilterValue(next)
                          }}
                        />
                        <span className="text-muted-foreground shrink-0 text-xs font-medium">
                          {t("table.to")}
                        </span>
                        <Input
                          type="number"
                          inputMode="decimal"
                          placeholder={t("table.max")}
                          className="border-input/80 bg-background h-8 text-sm shadow-none"
                          value={maxV}
                          onChange={(e) => {
                            const nextMax = e.target.value
                            const next: [string, string] = [minV, nextMax]
                            if (minV === "" && nextMax === "")
                              column.setFilterValue(undefined)
                            else column.setFilterValue(next)
                          }}
                        />
                      </div>
                    )}
                  </div>
                )
              }

              if (variant === "select") {
                const selectLabels = (
                  column.columnDef.meta as DataTableColumnMeta | undefined
                )?.dataTableFilterSelectLabels
                const opts = [...column.getFacetedUniqueValues().keys()]
                  .map(String)
                  .filter((v) => v !== "" && v !== "undefined")
                  .sort((a, b) => a.localeCompare(b))
                const cur =
                  (column.getFilterValue() as string | undefined) ?? ""
                return (
                  <div key={column.id}>
                    {fieldBlock(
                      <select
                        className="border-input/80 bg-background h-8 w-full rounded-md border px-2 text-sm shadow-none outline-none focus-visible:ring-ring/50 focus-visible:ring-[3px]"
                        value={cur === "" ? FILTER_ANY : cur}
                        onChange={(e) => {
                          const v = e.target.value
                          column.setFilterValue(
                            v === FILTER_ANY ? undefined : v
                          )
                        }}
                      >
                        <option value={FILTER_ANY}>{t("table.all")}</option>
                        {opts.map((opt) => (
                          <option key={opt} value={opt}>
                            {selectLabels?.[opt] ?? opt}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                )
              }

              const textVal =
                (column.getFilterValue() as string | undefined) ?? ""
              return (
                <div key={column.id}>
                  {fieldBlock(
                    <Input
                      placeholder={t("table.containsText")}
                      className="border-input/80 bg-background h-8 text-sm shadow-none"
                      value={textVal}
                      onChange={(e) =>
                        column.setFilterValue(
                          e.target.value === "" ? undefined : e.target.value
                        )
                      }
                    />
                  )}
                </div>
              )
            })}
              </div>
            </>
          ) : null}
        </div>
      </PopoverContent>
    </Popover>
  )
}

function getColumnTitle<TData>(column: Column<TData, unknown>): string {
  const def = column.columnDef
  const meta = def.meta as DataTableColumnMeta | undefined
  if (meta?.dataTableFilterLabel) return meta.dataTableFilterLabel
  if (typeof def.header === "string") return def.header
  if ("accessorKey" in def && def.accessorKey != null) {
    return String(def.accessorKey)
  }
  return column.id
}

function DataTableGridView<TData>({ table }: { table: TanStackTable<TData> }) {
  const { t } = useTranslation()
  const rows = table.getRowModel().rows
  if (rows.length === 0) {
    return (
      <div className="bg-muted/20 text-muted-foreground flex min-h-[14rem] flex-col items-center justify-center gap-2 rounded-xl border border-dashed px-6 text-center text-sm">
        <span className="text-foreground/80 font-medium">{t("empty.noResultsTitle")}</span>
        <span className="text-xs">{t("empty.noResultsHint")}</span>
      </div>
    )
  }
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
      {rows.map((row) => {
        const cells = row.getVisibleCells()
        const actionsCell = cells.find((c) => c.column.id === "actions")
        const dataCells = cells.filter(
          (c) => c.column.id !== "select" && c.column.id !== "actions"
        )
        const [primaryCell, ...restCells] = dataCells
        return (
          <Card
            key={row.id}
            className={cn(
              "group/card border-border/80 gap-0 overflow-hidden rounded-xl px-0 py-0 shadow-sm transition-all duration-200 sm:shadow-xs",
              "hover:border-primary/20 hover:shadow-md",
              row.getIsSelected() &&
                "border-primary/30 shadow-md ring-2 ring-primary/20 hover:border-primary/30"
            )}
            data-state={row.getIsSelected() ? "selected" : undefined}
          >
            <CardHeader className="bg-muted/30 flex flex-row items-center gap-3 space-y-0 border-b border-border/60 px-5 pb-4 pt-4 sm:px-6">
              <div className="flex shrink-0 items-center">
                <Checkbox
                  checked={row.getIsSelected()}
                  onCheckedChange={(v) => row.toggleSelected(!!v)}
                  aria-label={t("table.selectRow")}
                />
              </div>
              <div className="min-w-0 flex-1 pr-1 [&_button]:h-auto [&_button]:min-h-0 [&_button]:py-0 [&_button]:leading-snug">
                {primaryCell ? (
                  <div className="text-foreground text-[15px] leading-snug font-semibold tracking-tight [&_a]:font-semibold [&_a]:text-foreground [&_a]:no-underline hover:[&_a]:underline">
                    {flexRender(
                      primaryCell.column.columnDef.cell,
                      primaryCell.getContext()
                    )}
                  </div>
                ) : (
                  <span className="text-muted-foreground text-sm">Row</span>
                )}
              </div>
              {actionsCell ? (
                <CardAction className="shrink-0 self-center [&_button]:opacity-80 group-hover/card:[&_button]:opacity-100">
                  {flexRender(
                    actionsCell.column.columnDef.cell,
                    actionsCell.getContext()
                  )}
                </CardAction>
              ) : null}
            </CardHeader>
            {restCells.length > 0 ? (
              <CardContent className="flex flex-col gap-0 px-5 py-4 sm:px-6">
                {restCells.map((cell, idx) => (
                  <div
                    key={cell.id}
                    className={cn(
                      "flex flex-col gap-1 py-2.5 sm:flex-row sm:items-start sm:gap-4",
                      idx > 0 && "border-t border-border/50"
                    )}
                  >
                    <dt className="text-muted-foreground w-full shrink-0 text-xs font-medium sm:w-[7rem]">
                      {getColumnTitle(cell.column)}
                    </dt>
                    <dd className="text-foreground min-w-0 flex-1 text-sm leading-relaxed [&_a]:break-words [&_input]:h-8 [&_input]:max-w-full [&_input]:text-sm">
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </dd>
                  </div>
                ))}
              </CardContent>
            ) : null}
          </Card>
        )
      })}
    </div>
  )
}

export type DataTableBulkAction<TData> = {
  id: string
  label: string
  /** Shown before the label in the bulk toolbar (e.g. Tabler icon). */
  icon?: React.ReactNode
  onClick: (rows: TData[]) => void
  variant?: "default" | "destructive"
  disabled?: boolean | ((rows: TData[]) => boolean)
}

export type DataTableTab = { value: string; label: string }

export function DataTable<TData>({
  data: initialData,
  columns: columnsProp,
  addButtonLabel,
  searchPlaceholder,
  importRowMapper,
  importSampleFilename = "sample.csv",
  exportFilename = "export.csv",
  bulkActions,
  tabs,
  tab: tabProp,
  defaultTab,
  onTabChange,
  tabFilter,
  enableLayoutToggle = true,
  defaultColumnVisibility,
  onAddClick,
  onDataChange,
  showAddButton = true,
  showImportButton = true,
  showExportButton = true,
  showSearch = true,
  showFilters = true,
  toolbarExtra,
  toolbarActions,
  tableOptionsExtra,
  onImportRows,
  importSampleCsvContent,
}: {
  data: TData[]
  columns: ColumnDef<TData>[]
  addButtonLabel?: string
  searchPlaceholder?: string
  importRowMapper?: (row: Record<string, string>, existing: TData[]) => TData | null
  importSampleFilename?: string
  exportFilename?: string
  bulkActions?: DataTableBulkAction<TData>[]
  tabs?: DataTableTab[]
  tab?: string
  defaultTab?: string
  onTabChange?: (value: string) => void
  tabFilter?: (row: TData, tabValue: string) => boolean
  /** Pill toggle: list (table) vs grid (card layout). */
  enableLayoutToggle?: boolean
  /** Initial column visibility (`false` = hidden). */
  defaultColumnVisibility?: VisibilityState
  /** Primary add button (e.g. open create sheet). */
  onAddClick?: () => void
  /** Notified when table data changes (e.g. CSV import). */
  onDataChange?: (data: TData[]) => void
  showAddButton?: boolean
  showImportButton?: boolean
  showExportButton?: boolean
  showSearch?: boolean
  showFilters?: boolean
  /** Custom controls rendered visibly beside the table search. */
  toolbarExtra?: React.ReactNode
  /** Custom action buttons rendered between Export and Add. */
  toolbarActions?: React.ReactNode
  /** Custom controls rendered at the top of the table options popover. */
  tableOptionsExtra?: React.ReactNode
  /** Custom CSV import handler; return number of rows added. */
  onImportRows?: (rows: Record<string, string>[]) => number
  /** Override import sample CSV content (e.g. when table rows differ from import shape). */
  importSampleCsvContent?: string
}) {
  const { t } = useTranslation()
  const resolvedAddLabel = addButtonLabel ?? t("table.add")
  const resolvedSearchPlaceholder = searchPlaceholder ?? t("search.placeholder")
  const [data, setData] = React.useState(() => initialData)

  React.useEffect(() => {
    setData(initialData)
  }, [initialData])

  const updateData = React.useCallback(
    (updater: React.SetStateAction<TData[]>) => {
      setData((prev) => {
        const next = typeof updater === "function" ? updater(prev) : updater
        onDataChange?.(next)
        return next
      })
    },
    [onDataChange]
  )

  const [uncontrolledTab, setUncontrolledTab] = React.useState(
    () => defaultTab ?? tabs?.[0]?.value ?? "all"
  )

  const activeTab = tabProp ?? uncontrolledTab

  const handleTabChange = React.useCallback(
    (value: string) => {
      if (tabProp === undefined) setUncontrolledTab(value)
      onTabChange?.(value)
    },
    [tabProp, onTabChange]
  )
  const [rowSelection, setRowSelection] = React.useState({})
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>(() => defaultColumnVisibility ?? {})
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    []
  )
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [pagination, setPagination] = React.useState({
    pageIndex: 0,
    pageSize: 10,
  })
  const [globalFilter, setGlobalFilter] = React.useState("")

  const tableData = React.useMemo(() => {
    if (!tabs?.length || !tabFilter) return data
    return data.filter((row) => tabFilter(row, activeTab))
  }, [data, tabs, tabFilter, activeTab])

  const columnsWithFilter = React.useMemo(
    () =>
      mergeColumnFilters(
        columnsProp,
        tableData as Record<string, unknown>[]
      ),
    [columnsProp, tableData]
  )

  const table = useReactTable({
    data: tableData,
    columns: columnsWithFilter,
    state: {
      sorting,
      columnVisibility,
      rowSelection,
      columnFilters,
      pagination,
      globalFilter,
    },
    getRowId: (row) => {
      const record = row as { id?: string | number; srNo?: string | number }
      return String(record.id ?? record.srNo ?? Math.random())
    },
    enableRowSelection: true,
    enableGlobalFilter: true,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onPaginationChange: setPagination,
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn: (row, columnId, filterValue) => {
      const search = filterValue.toLowerCase()
      const record = row.original as Record<string, unknown>
      const rowValues = Object.values(record).join(" ").toLowerCase()
      return rowValues.includes(search)
    },
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
  })

  const showToolbarActions =
    showImportButton || showExportButton || showAddButton || Boolean(toolbarActions)
  const showToolbar =
    showSearch || showFilters || Boolean(toolbarExtra) || showToolbarActions
  const [importOpen, setImportOpen] = React.useState(false)
  const [exportOpen, setExportOpen] = React.useState(false)
  const [layoutView, setLayoutView] = React.useState<"list" | "grid">("list")

  const csvKeys = React.useMemo(() => {
    const row = data[0] as Record<string, unknown> | undefined
    if (!row || typeof row !== "object") return []
    return Object.keys(row)
  }, [data])

  const sampleCsvContent = React.useMemo(() => {
    if (importSampleCsvContent) return importSampleCsvContent
    const example = data[0] as Record<string, unknown> | undefined
    return buildSampleCsv(csvKeys, example)
  }, [csvKeys, data, importSampleCsvContent])

  const handleImportComplete = React.useCallback(
    (rows: Record<string, string>[]) => {
      if (rows.length === 0) {
        toast.error(t("toast.noRowsToImport"))
        return
      }
      if (onImportRows) {
        const added = onImportRows(rows)
        queueMicrotask(() => {
          if (added > 0) {
            toast.success(t("toast.importedRows", { count: added }))
          } else {
            toast.message(
              t("toast.noRowsAdded")
            )
          }
        })
        return
      }
      updateData((prev) => {
        let acc = [...prev]
        for (const r of rows) {
          const mapped = importRowMapper
            ? importRowMapper(r, acc)
            : ({ ...r } as unknown as TData)
          if (mapped != null) acc = [...acc, mapped]
        }
        const added = acc.length - prev.length
        queueMicrotask(() => {
          if (added > 0) {
            toast.success(t("toast.importedRows", { count: added }))
          } else {
            toast.message(
              t("toast.noRowsAdded")
            )
          }
        })
        return acc
      })
    },
    [importRowMapper, onImportRows, updateData]
  )

  const selectedRowCount = table.getFilteredSelectedRowModel().rows.length

  const filteredTotal = table.getFilteredRowModel().rows.length
  const pageIndex = table.getState().pagination.pageIndex
  const pageSize = table.getState().pagination.pageSize
  const rowsOnPage = table.getRowModel().rows.length
  const rangeFrom =
    filteredTotal === 0 || rowsOnPage === 0 ? 0 : pageIndex * pageSize + 1
  const rangeTo =
    filteredTotal === 0 || rowsOnPage === 0
      ? 0
      : pageIndex * pageSize + rowsOnPage

  const selectedRowsData = React.useMemo(
    () => table.getFilteredSelectedRowModel().rows.map((r) => r.original),
    [table, rowSelection]
  )

  const filteredRows = table.getFilteredRowModel().rows
  const allFilteredSelected =
    filteredRows.length > 0 && filteredRows.every((r) => r.getIsSelected())
  const someFilteredSelected = filteredRows.some((r) => r.getIsSelected())

  const selectAllFiltered = React.useCallback(() => {
    const rows = table.getFilteredRowModel().rows
    const next: Record<string, boolean> = {}
    for (const r of rows) next[r.id] = true
    table.setRowSelection(next)
  }, [table])

  const tableContent = (
    <div className="relative flex flex-col gap-4 overflow-auto">
        {layoutView === "list" || !enableLayoutToggle ? (
          <div className="overflow-hidden rounded-md border">
            <Table>
              <TableHeader className="bg-muted sticky top-0 z-10">
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => {
                      const meta = getColumnMeta(header.column)
                      return (
                        <TableHead
                          key={header.id}
                          colSpan={header.colSpan}
                          className={cn("px-4", meta?.headerClassName)}
                        >
                          {header.isPlaceholder
                            ? null
                            : flexRender(
                                header.column.columnDef.header,
                                header.getContext()
                              )}
                        </TableHead>
                      )
                    })}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody className="**:data-[slot=table-cell]:first:w-8">
                {table.getRowModel().rows?.length ? (
                  table.getRowModel().rows.map((row) => (
                    <TableRow
                      key={row.id}
                      data-state={row.getIsSelected() && "selected"}
                    >
                      {row.getVisibleCells().map((cell) => {
                        const meta = getColumnMeta(cell.column)
                        return (
                          <TableCell
                            key={cell.id}
                            className={cn("px-4 py-3.5", meta?.cellClassName)}
                          >
                            {flexRender(
                              cell.column.columnDef.cell,
                              cell.getContext()
                            )}
                          </TableCell>
                        )
                      })}
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={columnsProp.length}
                      className="h-24 text-center"
                    >
                      {t("empty.noResults")}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        ) : (
          <DataTableGridView table={table} />
        )}
        <div className="flex items-center justify-between">
          <div className="text-muted-foreground flex min-w-0 flex-1 text-sm">
            {t("table.showingRecords", { from: rangeFrom, to: rangeTo, total: filteredTotal })}
          </div>
          <div className="flex w-full items-center gap-4 lg:w-fit lg:gap-8">
            <div className="flex w-fit items-center justify-center text-sm font-medium">
              {t("table.pageOf", {
                page: table.getState().pagination.pageIndex + 1,
                pageCount: table.getPageCount(),
              })}
            </div>
            <div className="hidden md:block">
              <select
                aria-label={t("table.rowsPerPage")}
                value={table.getState().pagination.pageSize}
                onChange={(e) => table.setPageSize(Number(e.target.value))}
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
      </div>
    )

  return (
    <div className="w-full flex-col justify-start gap-6">
      <DataTableImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        sampleCsvContent={sampleCsvContent}
        sampleFilename={importSampleFilename}
        onComplete={handleImportComplete}
      />
      <DataTableExportDialog
        open={exportOpen}
        onOpenChange={setExportOpen}
        rowCount={table.getFilteredRowModel().rows.length}
        filename={exportFilename}
        getRows={() =>
          table
            .getFilteredRowModel()
            .rows.map((r) => ({ ...(r.original as Record<string, unknown>) }))
        }
      />
      {showToolbar ? (
      <div className="mb-3 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:items-center sm:gap-3">
          {showSearch || showFilters ? (
            <div className="flex min-w-0 flex-1 items-center gap-2 sm:max-w-md">
              {showSearch ? (
                <SearchInput
                  placeholder={resolvedSearchPlaceholder}
                  value={globalFilter}
                  onChange={(e) => setGlobalFilter(e.target.value)}
                  icon={<IconSearch className="size-4" />}
                  className="rounded-full shadow-sm focus-visible:ring-0 focus-visible:ring-offset-0 hover:ring-0 focus:ring-0 focus:outline-none min-w-0 flex-1"
                />
              ) : null}
              {showFilters ? (
                <DataTableFiltersPopover
                  table={table}
                  enableLayoutToggle={enableLayoutToggle}
                  layoutView={layoutView}
                  onLayoutViewChange={setLayoutView}
                  tableOptionsExtra={tableOptionsExtra}
                />
              ) : null}
            </div>
          ) : null}
          {toolbarExtra ? (
            <div className="flex flex-wrap items-end gap-2">{toolbarExtra}</div>
          ) : null}
        </div>
        {showToolbarActions ? (
        <div className="flex flex-wrap items-center gap-2 lg:shrink-0">
          {showImportButton ? (
            <Button
              type="button"
              variant="outline"
              className="h-9 rounded-full px-7 shadow-sm"
              onClick={() => setImportOpen(true)}
            >
              <IconCloudUpload />
              <span className="hidden sm:inline">{t("table.import")}</span>
            </Button>
          ) : null}
          {showExportButton ? (
            <Button
              type="button"
              variant="outline"
              className="h-9 rounded-full px-7 shadow-sm"
              onClick={() => setExportOpen(true)}
            >
              <IconCloudDownload />
              <span className="hidden sm:inline">{t("table.export")}</span>
            </Button>
          ) : null}
          {toolbarActions}
          {showAddButton ? (
            <Button
              variant="default"
              type="button"
              className="h-9 rounded-full px-5 shadow-sm has-[>svg]:px-5"
              onClick={() => onAddClick?.()}
            >
              <IconPlus className="size-4 shrink-0" />
              <span className="leading-none">{resolvedAddLabel}</span>
            </Button>
          ) : null}
        </div>
        ) : null}
      </div>
      ) : null}
      {(tabs && tabs.length > 0) || selectedRowCount > 0 ? (
        <div
          className="border-border mb-4 flex w-full min-w-0 flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b px-3 sm:px-4"
          role={selectedRowCount > 0 ? "region" : undefined}
          aria-label={selectedRowCount > 0 ? t("table.bulkSelection") : undefined}
        >
          {tabs && tabs.length > 0 ? (
            <div className="min-w-0 flex-1">
              <Tabs
                value={activeTab}
                onValueChange={(v) => {
                  handleTabChange(v)
                  table.setPageIndex(0)
                }}
                className="inline-flex w-fit max-w-full min-w-0 flex-col"
              >
                <TabsList className="bg-transparent text-muted-foreground -mb-px inline-flex h-auto w-fit max-w-full min-w-0 flex-wrap justify-start gap-x-1 gap-y-1 rounded-none border-0 p-0 px-1 shadow-none sm:px-2">
                  {tabs.map((t) => (
                    <TabsTrigger
                      key={t.value}
                      value={t.value}
                      className="text-muted-foreground hover:text-foreground data-[state=active]:text-primary relative z-10 shrink-0 rounded-none border-0 border-b-2 border-transparent bg-transparent px-3 py-2.5 text-sm font-medium shadow-none transition-colors data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:font-semibold data-[state=active]:shadow-none"
                    >
                      {t.label}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            </div>
          ) : (
            <div className="min-w-0 flex-1" />
          )}
          {selectedRowCount > 0 ? (
            <div className="flex min-w-0 shrink-0 flex-wrap items-center justify-end gap-x-4 gap-y-2 sm:gap-x-8">
              <div className="flex flex-wrap items-center gap-3 sm:gap-4">
                <div className="flex items-center gap-2.5">
                  <Checkbox
                    checked={
                      allFilteredSelected
                        ? true
                        : someFilteredSelected
                          ? "indeterminate"
                          : false
                    }
                    onCheckedChange={(value) => {
                      if (value) selectAllFiltered()
                      else table.resetRowSelection()
                    }}
                    aria-label={
                      allFilteredSelected
                        ? t("table.deselectAllFiltered")
                        : t("table.selectAllFiltered")
                    }
                  />
                  <span className="text-sm font-semibold tracking-tight">
                    {t("table.selectedCount", { count: selectedRowCount })}
                  </span>
                </div>
                <button
                  type="button"
                  className="text-muted-foreground hover:text-foreground text-sm font-normal transition-colors"
                  onClick={() =>
                    allFilteredSelected
                      ? table.resetRowSelection()
                      : selectAllFiltered()
                  }
                >
                  {allFilteredSelected ? t("actions.deselectAll") : t("actions.selectAll")}
                </button>
              </div>
              {bulkActions && bulkActions.length > 0 ? (
                <div className="flex flex-wrap items-center gap-0.5 sm:gap-1">
                  {bulkActions.map((action) => {
                    const rows = selectedRowsData
                    const disabled =
                      typeof action.disabled === "function"
                        ? action.disabled(rows)
                        : (action.disabled ?? false)
                    return (
                      <Button
                        key={action.id}
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={disabled}
                        className={cn(
                          "text-muted-foreground hover:text-foreground h-9 gap-2 px-2.5 font-normal sm:px-3",
                          action.variant === "destructive" &&
                            "text-destructive hover:bg-destructive/10 hover:text-destructive"
                        )}
                        onClick={() => action.onClick(rows)}
                      >
                        {action.icon ? (
                          <span
                            className={cn(
                              "[&_svg]:size-4 shrink-0 opacity-90",
                              action.variant === "destructive"
                                ? "text-destructive"
                                : "text-muted-foreground"
                            )}
                          >
                            {action.icon}
                          </span>
                        ) : null}
                        {action.label}
                      </Button>
                    )
                  })}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}
      {tableContent}
    </div>
  )
}

const chartData = [
  { month: "January", desktop: 186, mobile: 80 },
  { month: "February", desktop: 305, mobile: 200 },
  { month: "March", desktop: 237, mobile: 120 },
  { month: "April", desktop: 73, mobile: 190 },
  { month: "May", desktop: 209, mobile: 130 },
  { month: "June", desktop: 214, mobile: 140 },
]

const chartConfig = {
  desktop: {
    label: "Desktop",
    color: "var(--primary)",
  },
  mobile: {
    label: "Mobile",
    color: "var(--primary)",
  },
} satisfies ChartConfig

function TableCellViewer({ item }: { item: z.infer<typeof schema> }) {
  const isMobile = useIsMobile()
  const { t } = useTranslation("common")
  const localizedChartConfig = {
    desktop: { ...chartConfig.desktop, label: t("dashboard.desktop") },
    mobile: { ...chartConfig.mobile, label: t("dashboard.mobile") },
  }

  return (
    <Drawer direction={isMobile ? "bottom" : "right"}>
      <DrawerTrigger asChild>
        <Button variant="link" className="text-foreground w-fit px-0 text-start">
          {item.header}
        </Button>
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader className="gap-1">
          <DrawerTitle>{item.header}</DrawerTitle>
          <DrawerDescription>
            {t("dashboard.visitorsChartHint")}
          </DrawerDescription>
        </DrawerHeader>
        <div className="flex flex-col gap-4 overflow-y-auto px-4 text-sm">
          {!isMobile && (
            <>
              <ChartContainer config={localizedChartConfig}>
                <AreaChart
                  accessibilityLayer
                  data={chartData}
                  margin={{
                    left: 0,
                    right: 10,
                  }}
                >
                  <CartesianGrid vertical={false} />
                  <XAxis
                    dataKey="month"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    tickFormatter={(value) => value.slice(0, 3)}
                    hide
                  />
                  <ChartTooltip
                    cursor={false}
                    content={<ChartTooltipContent indicator="dot" />}
                  />
                  <Area
                    dataKey="mobile"
                    type="natural"
                    fill="var(--color-mobile)"
                    fillOpacity={0.6}
                    stroke="var(--color-mobile)"
                    stackId="a"
                  />
                  <Area
                    dataKey="desktop"
                    type="natural"
                    fill="var(--color-desktop)"
                    fillOpacity={0.4}
                    stroke="var(--color-desktop)"
                    stackId="a"
                  />
                </AreaChart>
              </ChartContainer>
              <Separator />
              <div className="grid gap-2">
                <div className="flex gap-2 leading-none font-medium">
                  {t("dashboard.trendingUpBy")}{" "}
                  <IconTrendingUp className="size-4" />
                </div>
                <div className="text-muted-foreground">
                  {t("dashboard.visitorsLayoutHint")}
                </div>
              </div>
              <Separator />
            </>
          )}
          <form className="flex flex-col gap-4">
            <div className="flex flex-col gap-3">
              <Label htmlFor="header">{t("dashboard.header")}</Label>
              <Input id="header" defaultValue={item.header} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-3">
                <Label htmlFor="type">{t("dashboard.type")}</Label>
                <Select defaultValue={item.type}>
                  <SelectTrigger id="type" className="w-full">
                    <SelectValue placeholder={t("dashboard.selectType")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Table of Contents">
                      {t("dashboard.types.tableOfContents")}
                    </SelectItem>
                    <SelectItem value="Executive Summary">
                      {t("dashboard.types.executiveSummary")}
                    </SelectItem>
                    <SelectItem value="Technical Approach">
                      {t("dashboard.types.technicalApproach")}
                    </SelectItem>
                    <SelectItem value="Design">{t("dashboard.types.design")}</SelectItem>
                    <SelectItem value="Capabilities">
                      {t("dashboard.types.capabilities")}
                    </SelectItem>
                    <SelectItem value="Focus Documents">
                      {t("dashboard.types.focusDocuments")}
                    </SelectItem>
                    <SelectItem value="Narrative">
                      {t("dashboard.types.narrative")}
                    </SelectItem>
                    <SelectItem value="Cover Page">
                      {t("dashboard.types.coverPage")}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-3">
                <Label htmlFor="status">{t("dashboard.status")}</Label>
                <Select defaultValue={item.status}>
                  <SelectTrigger id="status" className="w-full">
                    <SelectValue placeholder={t("dashboard.selectStatus")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Done">{t("dashboard.statuses.done")}</SelectItem>
                    <SelectItem value="In Progress">
                      {t("dashboard.statuses.inProgress")}
                    </SelectItem>
                    <SelectItem value="Not Started">
                      {t("dashboard.statuses.notStarted")}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-3">
                <Label htmlFor="target">{t("dashboard.target")}</Label>
                <Input id="target" defaultValue={item.target} />
              </div>
              <div className="flex flex-col gap-3">
                <Label htmlFor="limit">{t("dashboard.limit")}</Label>
                <Input id="limit" defaultValue={item.limit} />
              </div>
            </div>
            <div className="flex flex-col gap-3">
              <Label htmlFor="reviewer">{t("dashboard.reviewer")}</Label>
              <Select defaultValue={item.reviewer}>
                <SelectTrigger id="reviewer" className="w-full">
                  <SelectValue placeholder={t("dashboard.selectReviewer")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Eddie Lake">Eddie Lake</SelectItem>
                  <SelectItem value="Jamik Tashpulatov">
                    Jamik Tashpulatov
                  </SelectItem>
                  <SelectItem value="Emily Whalen">Emily Whalen</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </form>
        </div>
        <DrawerFooter>
          <Button>{t("actions.submit")}</Button>
          <DrawerClose asChild>
            <Button variant="outline">{t("actions.done")}</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}
