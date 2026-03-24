"use client"

import * as React from "react"
import Link from "next/link"
import { ColumnDef } from "@tanstack/react-table"
import {
  IconAlertTriangleFilled,
  IconCircleCheckFilled,
  IconCircleXFilled,
  IconDotsVertical,
  IconRefresh,
  IconTrash,
} from "@tabler/icons-react"
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
import { DataTable, type DataTableTab } from "@/components/data-table"
import { toast } from "sonner"
import { useFiscalTerms } from "@/context/fiscal-term-context"
import { formatShortDate } from "@/lib/fiscal-terms"
import data from "./data.json"
import { z } from "zod"

export const inventorySchema = z.object({
  srNo: z.number(),
  sku: z.string(),
  name: z.string(),
  category: z.string(),
  status: z.string(),
  stock: z.number(),
  orders: z.number(),
  lifecycle: z.enum(["active", "inactive", "archived"]).default("active"),
})

type InventoryItem = z.infer<typeof inventorySchema>

const inventoryTabs: DataTableTab[] = [
  { value: "active", label: "Active" },
  { value: "archived", label: "Archived" },
]

function inventoryTabFilter(row: InventoryItem, tab: string) {
  if (tab === "archived") return row.lifecycle === "archived"
  return row.lifecycle !== "archived"
}

function mapImportedInventoryItem(
  row: Record<string, string>,
  existing: InventoryItem[]
): InventoryItem | null {
  const maxSr = existing.reduce((m, x) => Math.max(m, x.srNo), 0)
  const srNo = Number(row.srNo)
  const finalSr = Number.isFinite(srNo) && srNo > 0 ? srNo : maxSr + 1
  if (!(row.sku ?? "").trim() && !(row.name ?? "").trim()) return null
  const lc = (row.lifecycle ?? "active").toLowerCase()
  const lifecycle =
    lc === "inactive" || lc === "archived" ? lc : "active"
  return {
    srNo: finalSr,
    sku: row.sku ?? "",
    name: row.name ?? "",
    category: row.category ?? "",
    status: row.status ?? "In Stock",
    stock: Number(row.stock) || 0,
    orders: Number(row.orders) || 0,
    lifecycle,
  }
}

const inventoryColumns: ColumnDef<InventoryItem>[] = [
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
          aria-label="Select all"
        />
      </div>
    ),
    cell: ({ row }) => (
      <div className="flex items-center justify-center">
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
        />
      </div>
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "srNo",
    header: "Sr. No",
    cell: ({ row }) => <div>{row.original.srNo}</div>,
  },
  {
    accessorKey: "sku",
    header: "SKU",
    cell: ({ row }) => (
      <div className="font-medium">{row.original.sku}</div>
    ),
  },
  {
    accessorKey: "name",
    header: "Name",
    cell: ({ row }) => <div>{row.original.name}</div>,
  },
  {
    accessorKey: "category",
    header: "Category",
    cell: ({ row }) => (
      <Badge variant="outline" className="text-muted-foreground px-1.5">
        {row.original.category}
      </Badge>
    ),
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const status = row.original.status
      const isInStock = status === "In Stock"
      const isLowStock = status === "Low Stock"
      const isOutOfStock = status === "Out of Stock"

      return (
        <Badge variant="outline" className="text-muted-foreground px-1.5">
          {isInStock ? (
            <IconCircleCheckFilled className="mr-1 fill-green-500 dark:fill-green-400" />
          ) : isLowStock ? (
            <IconAlertTriangleFilled className="mr-1 fill-amber-500 dark:fill-amber-400" />
          ) : isOutOfStock ? (
            <IconCircleXFilled className="mr-1 fill-red-500 dark:fill-red-400" />
          ) : null}
          {status}
        </Badge>
      )
    },
  },
  {
    accessorKey: "stock",
    header: () => (
      <div className="flex w-full justify-center text-center">Stock</div>
    ),
    cell: ({ row }) => (
      <div className="text-center font-medium">{row.original.stock}</div>
    ),
  },
  {
    accessorKey: "orders",
    header: () => (
      <div className="flex w-full justify-center text-center">Orders</div>
    ),
    cell: ({ row }) => (
      <div className="text-center font-medium">{row.original.orders}</div>
    ),
  },
  {
    id: "actions",
    cell: () => (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="data-[state=open]:bg-muted text-muted-foreground flex size-8"
            size="icon"
          >
            <IconDotsVertical />
            <span className="sr-only">Open menu</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-32">
          <DropdownMenuItem>Edit</DropdownMenuItem>
          <DropdownMenuItem>View Details</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive">Delete</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    ),
  },
]

export default function Inventory() {
  const { state, viewing } = useFiscalTerms()
  const closed =
    viewing && !viewing.isActive
      ? state.closed.find((c) => c.id === viewing.id)
      : undefined

  return (
    <div className="flex flex-col gap-4">
      {viewing && !viewing.isActive && (
        <div
          className="bg-muted/50 text-muted-foreground rounded-lg border px-4 py-3 text-sm"
          role="status"
        >
          <p className="font-medium text-foreground">Viewing closed term</p>
          <p className="mt-1">{viewing.label}</p>
          {closed?.snapshot ? (
            <p className="mt-2">
              Recorded at close: {closed.snapshot.totalLineItems} line items,{" "}
              {closed.snapshot.totalStockUnits} stock units (as of{" "}
              {formatShortDate(closed.snapshot.capturedAt)}).
            </p>
          ) : (
            <p className="mt-2">
              No inventory snapshot was stored for this term. Live product data below is
              not historical.
            </p>
          )}
          <Button variant="link" className="mt-2 h-auto p-0" asChild>
            <Link href="/dashboard/inventory/year-closing">Year closing settings</Link>
          </Button>
        </div>
      )}
      <DataTable
        data={data as InventoryItem[]}
        columns={inventoryColumns}
        addButtonLabel="Add item"
        searchPlaceholder="Search inventory..."
        importRowMapper={mapImportedInventoryItem}
        importSampleFilename="inventory-sample.csv"
        exportFilename="inventory-export.csv"
        bulkActions={[
          {
            id: "reorder",
            label: "Flag for reorder",
            icon: <IconRefresh className="size-4" />,
            onClick: (selected) => {
              toast.message(`Flagged ${selected.length} item(s) for reorder (demo).`)
            },
          },
          {
            id: "delete",
            label: "Delete selected",
            icon: <IconTrash className="size-4" />,
            variant: "destructive",
            onClick: (selected) => {
              toast.message(`Would delete ${selected.length} item(s).`)
            },
          },
        ]}
        tabs={inventoryTabs}
        defaultTab="active"
        tabFilter={inventoryTabFilter}
      />
    </div>
  )
}
