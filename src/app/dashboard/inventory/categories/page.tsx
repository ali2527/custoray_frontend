"use client"

import { useState } from "react"
import { ColumnDef } from "@tanstack/react-table"
import { z } from "zod"

import { DataTableColumnHeader } from "@/components/data-table-column-header"
import { DataTable } from "@/components/data-table"
import { LookupFormSheet } from "@/components/inventory/lookup-form-sheet"
import { Checkbox } from "@/components/ui/checkbox"

const categorySchema = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string(),
})

type CategoryRow = z.infer<typeof categorySchema>

const categoryData: CategoryRow[] = [
  { id: 1, name: "Electronics", description: "Devices and electronic goods" },
  { id: 2, name: "Accessories", description: "Daily-use add-ons and attachments" },
  { id: 3, name: "Furniture", description: "Desks, stands and office furniture" },
]

const categoryColumns: ColumnDef<CategoryRow>[] = [
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
    accessorKey: "id",
    header: ({ column }) => <DataTableColumnHeader column={column} title="ID" />,
  },
  {
    accessorKey: "name",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Category" />
    ),
  },
  {
    accessorKey: "description",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Description" />
    ),
    meta: { dataTableFilter: false },
  },
]

export default function CategoriesPage() {
  const [lookupOpen, setLookupOpen] = useState(false)
  return (
    <>
      <DataTable
        data={categoryData}
        columns={categoryColumns}
        addButtonLabel="Add category"
        searchPlaceholder="Search categories..."
        importSampleFilename="categories-sample.csv"
        exportFilename="categories-export.csv"
        onAddClick={() => setLookupOpen(true)}
      />
      <LookupFormSheet
        open={lookupOpen}
        onOpenChange={setLookupOpen}
        type="category"
        existingValues={categoryData.map((c) => c.name)}
      />
    </>
  )
}
