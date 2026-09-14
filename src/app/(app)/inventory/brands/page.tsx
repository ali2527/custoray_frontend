"use client"

import { useMemo, useState } from "react"
import { ColumnDef } from "@tanstack/react-table"
import { IconArchive, IconTrash } from "@tabler/icons-react"
import { toast } from "sonner"
import { useTranslation } from "react-i18next"
import type { TFunction } from "i18next"

import { DataTableColumnHeader } from "@/components/data-table-column-header"
import { DataTable, type DataTableTab } from "@/components/data-table"
import { LookupFormSheet } from "@/components/inventory/lookup-form-sheet"
import i18n from "@/i18n"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"

type BrandRow = {
  srNo: number
  name: string
  description: string
  products: number
  status: "active" | "inactive"
  lifecycle: "active" | "inactive" | "archived"
}

const brandsData: BrandRow[] = [
  { srNo: 1, name: "Voltara", description: "Premium laptops and storage products", products: 18, status: "active", lifecycle: "active" },
  { srNo: 2, name: "NomadKey", description: "Computer accessories and peripherals", products: 11, status: "active", lifecycle: "active" },
  { srNo: 3, name: "LinkWave", description: "Connectivity gear and cable solutions", products: 9, status: "active", lifecycle: "active" },
  { srNo: 4, name: "PulseAudio", description: "Wireless audio and speaker lineup", products: 7, status: "inactive", lifecycle: "inactive" },
  { srNo: 5, name: "CarryAll", description: "Bags, sleeves, and carry products", products: 6, status: "active", lifecycle: "active" },
  { srNo: 6, name: "PixelView", description: "Monitors and visual display equipment", products: 5, status: "inactive", lifecycle: "archived" },
]

const brandTabsValues = ["all", "active", "archived"] as const

function brandTabFilter(row: BrandRow, tab: string) {
  if (tab === "all") return true
  if (tab === "archived") return row.lifecycle === "archived"
  return row.lifecycle === "active"
}

function mapImportedBrand(
  row: Record<string, string>,
  existing: BrandRow[]
): BrandRow | null {
  const maxSr = existing.reduce((m, x) => Math.max(m, x.srNo), 0)
  const srNo = Number(row.srNo)
  const finalSr = Number.isFinite(srNo) && srNo > 0 ? srNo : maxSr + 1
  const name = (row.name ?? "").trim()
  if (!name) return null
  const lifecycleRaw = (row.lifecycle ?? "active").toLowerCase()
  const lifecycle =
    lifecycleRaw === "inactive" || lifecycleRaw === "archived"
      ? lifecycleRaw
      : "active"
  const statusRaw = (row.status ?? "active").toLowerCase()
  const status = statusRaw === "inactive" ? "inactive" : "active"

  return {
    srNo: finalSr,
    name,
    description: (row.description ?? "").trim() || i18n.t("noDescription", { ns: "inventory" }),
    products: Number(row.products) || 0,
    status,
    lifecycle,
  }
}

const brandColumnsBase = (t: TFunction<"inventory">): ColumnDef<BrandRow>[] => [
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
    accessorKey: "srNo",
    header: ({ column }) => <DataTableColumnHeader column={column} title={t("columns.id")} />,
    cell: ({ row }) => (
      <div className="flex h-9 min-w-14 items-center text-left tabular-nums">
        {row.original.srNo}
      </div>
    ),
    meta: { dataTableFilter: false },
  },
  {
    accessorKey: "name",
    header: ({ column }) => <DataTableColumnHeader column={column} title={t("columns.brand")} />,
    cell: ({ row }) => (
      <div className="flex h-9 min-w-32 items-center">
        <span className="text-foreground font-medium">{row.original.name}</span>
      </div>
    ),
    enableHiding: false,
  },
  {
    accessorKey: "description",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title={t("columns.description")} />
    ),
    cell: ({ row }) => (
      <div className="flex h-9 min-w-52 items-center">
        <span className="text-muted-foreground truncate">
          {row.original.description}
        </span>
      </div>
    ),
    meta: { dataTableFilter: false },
  },
  {
    accessorKey: "products",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title={t("columns.products")} />
    ),
    cell: ({ row }) => (
      <div className="flex h-9 min-w-20 items-center">
        <span className="block tabular-nums">{row.original.products}</span>
      </div>
    ),
  },
  {
    accessorKey: "status",
    header: ({ column }) => <DataTableColumnHeader column={column} title={t("columns.status")} />,
    cell: ({ row }) => (
      <div className="flex h-9 min-w-24 items-center">
        <Badge
          variant="outline"
          className={
            row.original.status === "active"
              ? "border-emerald-500/30 px-1.5 text-emerald-700 dark:text-emerald-400"
              : "border-amber-500/30 px-1.5 text-amber-700 dark:text-amber-400"
          }
        >
          {row.original.status === "active"
            ? t("tabs.active")
            : t("tabs.inactive")}
        </Badge>
      </div>
    ),
    meta: { dataTableFilter: false },
  },
]

export default function BrandsPage() {
  const { t } = useTranslation("inventory")
  const [lookupOpen, setLookupOpen] = useState(false)
  const brandColumns = useMemo(() => brandColumnsBase(t), [t])
  const brandTabs: DataTableTab[] = useMemo(
    () =>
      brandTabsValues.map((value) => ({
        value,
        label: t(`tabs.${value}`),
      })),
    [t]
  )

  return (
    <div data-tour="welcome-brands-page">
      <DataTable
        data={brandsData}
        columns={brandColumns}
        addButtonLabel={t("brandPage.addButton")}
        searchPlaceholder={t("brandPage.search")}
        importRowMapper={mapImportedBrand}
        importSampleFilename="brands-sample.csv"
        exportFilename="brands-export.csv"
        onAddClick={() => setLookupOpen(true)}
        bulkActions={[
          {
            id: "archive",
            label: t("actions.moveToArchive"),
            icon: <IconArchive className="size-4" />,
            onClick: (selected) => {
              toast.message(t("toasts.archivedBrands", { count: selected.length }))
            },
          },
          {
            id: "delete",
            label: t("actions.deleteSelected"),
            icon: <IconTrash className="size-4" />,
            variant: "destructive",
            onClick: (selected) => {
              toast.message(t("toasts.wouldDeleteBrands", { count: selected.length }))
            },
          },
        ]}
        tabs={brandTabs}
        defaultTab="all"
        tabFilter={brandTabFilter}
      />
      <LookupFormSheet
        open={lookupOpen}
        onOpenChange={setLookupOpen}
        type="brand"
        existingValues={brandsData.map((b) => b.name)}
      />
    </div>
  )
}
