"use client"

import { useState } from "react"
import { ColumnDef } from "@tanstack/react-table"
import { z } from "zod"

import { DataTableColumnHeader } from "@/components/data-table-column-header"
import { DataTable } from "@/components/data-table"
import { LookupFormSheet } from "@/components/inventory/lookup-form-sheet"
import { Checkbox } from "@/components/ui/checkbox"

const variantSchema = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string(),
})

type VariantRow = z.infer<typeof variantSchema>

const variantData: VariantRow[] = [
  { id: 1, name: "Genuine", description: "Original branded product" },
  { id: 2, name: "1st Copy", description: "High quality copy version" },
  { id: 3, name: "2nd Copy", description: "Budget copy version" },
  { id: 4, name: "Others", description: "Other custom variant types" },
]

const variantColumns: ColumnDef<VariantRow>[] = [
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
      <DataTableColumnHeader column={column} title="Variant" />
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

export default function VariantsPage() {
  const [lookupOpen, setLookupOpen] = useState(false)
  return (
    <>
      <DataTable
        data={variantData}
        columns={variantColumns}
        addButtonLabel="Add variant"
        searchPlaceholder="Search variants..."
        importSampleFilename="variants-sample.csv"
        exportFilename="variants-export.csv"
        onAddClick={() => setLookupOpen(true)}
      />
      <LookupFormSheet
        open={lookupOpen}
        onOpenChange={setLookupOpen}
        type="variant"
        existingValues={variantData.map((v) => v.name)}
      />
    </>
  )
}
