"use client"

import { useCallback, useMemo, useState } from "react"
import { ColumnDef } from "@tanstack/react-table"
import {
  IconCopy,
  IconDotsVertical,
  IconEye,
  IconPencil,
  IconTrash,
} from "@tabler/icons-react"
import { z } from "zod"
import { toast } from "sonner"

import { DataTableColumnHeader } from "@/components/data-table-column-header"
import { DataTable } from "@/components/data-table"
import { LookupFormSheet } from "@/components/inventory/lookup-form-sheet"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"

const variantSchema = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string(),
  products: z.number(),
})

type VariantRow = z.infer<typeof variantSchema>

const variantData: VariantRow[] = [
  { id: 1, name: "Genuine", description: "Original branded product", products: 24 },
  { id: 2, name: "1st Copy", description: "High quality copy version", products: 16 },
  { id: 3, name: "2nd Copy", description: "Budget copy version", products: 9 },
  { id: 4, name: "Others", description: "Other custom variant types", products: 5 },
]

function getVariantColumns(
  openVariantSidebar: (row: VariantRow, mode: "view" | "edit") => void,
  onDelete: (row: VariantRow) => void
): ColumnDef<VariantRow>[] {
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
    cell: ({ row }) => (
      <span className="text-left tabular-nums">{row.original.id}</span>
    ),
  },
  {
    accessorKey: "name",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Variant" />
    ),
    cell: ({ row }) => (
      <span className="text-foreground font-medium">{row.original.name}</span>
    ),
  },
  {
    accessorKey: "description",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Description" />
    ),
    cell: ({ row }) => (
      <span className="text-muted-foreground truncate">{row.original.description}</span>
    ),
    meta: { dataTableFilter: false },
  },
  {
    accessorKey: "products",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Products" />
    ),
    cell: ({ row }) => (
      <span className="text-foreground tabular-nums">{row.original.products}</span>
    ),
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
            <span className="sr-only">Open menu</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-40">
          <DropdownMenuItem onClick={() => openVariantSidebar(row.original, "view")}>
            <IconEye />
            View
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => openVariantSidebar(row.original, "edit")}>
            <IconPencil />
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => toast.message(`Duplicated ${row.original.name} (demo).`)}
          >
            <IconCopy />
            Duplicate
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            onClick={() => onDelete(row.original)}
          >
            <IconTrash />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    ),
  },
]
}

export default function VariantsPage() {
  const [lookupOpen, setLookupOpen] = useState(false)
  const [rows, setRows] = useState<VariantRow[]>(() => [...variantData])
  const [sidebar, setSidebar] = useState<
    { mode: "view" | "edit"; variant: VariantRow } | null
  >(null)
  const closeSidebar = () => setSidebar(null)

  const handleDeleteVariant = useCallback((variant: VariantRow) => {
    setRows((prev) => prev.filter((r) => r.id !== variant.id))
    setSidebar((current) =>
      current?.variant.id === variant.id ? null : current
    )
    toast.message(`Deleted ${variant.name} (demo).`)
  }, [])

  const columns = useMemo(
    () =>
      getVariantColumns(
        (variant, mode) => setSidebar({ variant, mode }),
        handleDeleteVariant
      ),
    [handleDeleteVariant]
  )

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
          className="flex w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-md"
        >
          {sidebar ? (
            <>
              <SheetHeader className="border-border/60 space-y-1 border-b px-6 py-5 text-left">
                <SheetTitle className="text-lg leading-tight">
                  {sidebar.mode === "edit" ? "Edit variant" : "Variant details"}
                </SheetTitle>
                <SheetDescription>
                  {sidebar.variant.name} · {sidebar.variant.products} products
                </SheetDescription>
              </SheetHeader>
              <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
                {sidebar.mode === "view" ? (
                  <dl className="space-y-3 text-sm">
                    <div className="grid grid-cols-[7rem_1fr] gap-2">
                      <dt className="text-muted-foreground">ID</dt>
                      <dd className="font-medium">{sidebar.variant.id}</dd>
                    </div>
                    <div className="grid grid-cols-[7rem_1fr] gap-2">
                      <dt className="text-muted-foreground">Variant</dt>
                      <dd className="font-medium">{sidebar.variant.name}</dd>
                    </div>
                    <div className="grid grid-cols-[7rem_1fr] gap-2">
                      <dt className="text-muted-foreground">Description</dt>
                      <dd>{sidebar.variant.description}</dd>
                    </div>
                    <div className="grid grid-cols-[7rem_1fr] gap-2">
                      <dt className="text-muted-foreground">Products</dt>
                      <dd className="font-medium tabular-nums">
                        {sidebar.variant.products}
                      </dd>
                    </div>
                  </dl>
                ) : (
                  <form
                    id="variant-edit-form"
                    className="flex flex-col gap-4 text-sm"
                    onSubmit={(e) => {
                      e.preventDefault()
                      toast.success(`Saved ${sidebar.variant.name} (demo).`)
                      closeSidebar()
                    }}
                  >
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="variant-name">Variant</Label>
                      <Input id="variant-name" defaultValue={sidebar.variant.name} />
                    </div>
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="variant-description">Description</Label>
                      <Input
                        id="variant-description"
                        defaultValue={sidebar.variant.description}
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="variant-products">Products</Label>
                      <Input
                        id="variant-products"
                        type="number"
                        defaultValue={sidebar.variant.products}
                      />
                    </div>
                  </form>
                )}
              </div>
              <SheetFooter className="border-border/60 gap-2 border-t px-6 py-4 sm:flex-row sm:justify-end">
                {sidebar.mode === "view" ? (
                  <SheetClose asChild>
                    <Button variant="outline" className="w-full sm:w-auto">
                      Close
                    </Button>
                  </SheetClose>
                ) : (
                  <>
                    <SheetClose asChild>
                      <Button variant="outline" type="button">
                        Cancel
                      </Button>
                    </SheetClose>
                    <Button type="submit" form="variant-edit-form">
                      Save variant
                    </Button>
                  </>
                )}
              </SheetFooter>
            </>
          ) : null}
        </SheetContent>
      </Sheet>
      <DataTable
        data={rows}
        columns={columns}
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
        existingValues={rows.map((v) => v.name)}
      />
    </>
  )
}
