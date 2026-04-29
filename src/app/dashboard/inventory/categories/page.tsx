"use client"

import { useCallback, useMemo, useState, type FormEvent } from "react"
import { ColumnDef } from "@tanstack/react-table"
import {
  IconBan,
  IconCircleCheck,
  IconCopy,
  IconDotsVertical,
  IconEye,
  IconPencil,
  IconTrash,
} from "@tabler/icons-react"
import { toast } from "sonner"
import { z } from "zod"

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

const categorySchema = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string(),
  products: z.number(),
  status: z.enum(["active", "inactive"]),
})

type CategoryRow = z.infer<typeof categorySchema>

const initialCategories: CategoryRow[] = [
  {
    id: 1,
    name: "Electronics",
    description: "Devices and electronic goods",
    products: 42,
    status: "active",
  },
  {
    id: 2,
    name: "Accessories",
    description: "Daily-use add-ons and attachments",
    products: 28,
    status: "active",
  },
  {
    id: 3,
    name: "Furniture",
    description: "Desks, stands and office furniture",
    products: 11,
    status: "inactive",
  },
  {
    id: 4,
    name: "Office supplies",
    description: "Paper, pens, and consumables",
    products: 6,
    status: "inactive",
  },
]

const categoryTabs: DataTableTab[] = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
]

function categoryTabFilter(row: CategoryRow, tab: string) {
  if (tab === "all") return true
  if (tab === "active") return row.status === "active"
  if (tab === "inactive") return row.status === "inactive"
  return true
}

function mapImportedCategory(
  row: Record<string, string>,
  existing: CategoryRow[]
): CategoryRow | null {
  const maxId = existing.reduce((m, x) => Math.max(m, x.id), 0)
  const id = Number(row.id)
  const finalId = Number.isFinite(id) && id > 0 ? id : maxId + 1
  const name = (row.name ?? "").trim()
  if (!name) return null
  const statusRaw = (row.status ?? "active").toLowerCase()
  const status = statusRaw === "inactive" ? "inactive" : "active"

  return {
    id: finalId,
    name,
    description: (row.description ?? "").trim() || "No description",
    products: Number(row.products) || 0,
    status,
  }
}

const EMPTY_CATEGORY: CategoryRow = {
  id: 0,
  name: "",
  description: "",
  products: 0,
  status: "active",
}

type CategorySidebar =
  | { mode: "view"; category: CategoryRow }
  | { mode: "edit"; category: CategoryRow }
  | { mode: "add" }
  | null

function getCategoryColumns(
  openSidebar: (row: CategoryRow, mode: "view" | "edit") => void,
  onDelete: (row: CategoryRow) => void,
  onDuplicate: (row: CategoryRow) => void
): ColumnDef<CategoryRow>[] {
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
        <span className="text-muted-foreground font-mono tabular-nums">
          {row.original.id}
        </span>
      ),
      meta: { dataTableFilter: false },
    },
    {
      accessorKey: "name",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Category" />
      ),
      cell: ({ row }) => (
        <span className="text-foreground font-medium">{row.original.name}</span>
      ),
      enableHiding: false,
      meta: { dataTableFilter: false },
    },
    {
      accessorKey: "description",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Description" />
      ),
      cell: ({ row }) => (
        <span className="text-muted-foreground max-w-[14rem] truncate">
          {row.original.description}
        </span>
      ),
      meta: { dataTableFilter: false },
    },
    {
      accessorKey: "products",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Products" align="center" />
      ),
      cell: ({ row }) => (
        <div className="flex justify-center">
          <span className="text-foreground tabular-nums">{row.original.products}</span>
        </div>
      ),
      meta: { dataTableFilter: false },
    },
    {
      accessorKey: "status",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Status" />
      ),
      cell: ({ row }) => (
        <Badge
          variant="outline"
          className={
            row.original.status === "active"
              ? "border-emerald-500/30 px-1.5 text-emerald-700 dark:text-emerald-400"
              : "border-border px-1.5 text-muted-foreground"
          }
        >
          {row.original.status === "active" ? "Active" : "Inactive"}
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
              <span className="sr-only">Open menu</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem onClick={() => openSidebar(row.original, "view")}>
              <IconEye />
              View
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => openSidebar(row.original, "edit")}>
              <IconPencil />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onDuplicate(row.original)}>
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

export default function CategoriesPage() {
  const [rows, setRows] = useState<CategoryRow[]>(() => [...initialCategories])
  const [sidebar, setSidebar] = useState<CategorySidebar>(null)
  const [formKey, setFormKey] = useState(0)

  const closeSidebar = () => setSidebar(null)

  const handleDelete = useCallback((category: CategoryRow) => {
    setRows((prev) => prev.filter((r) => r.id !== category.id))
    setSidebar((s) => (s && "category" in s && s.category.id === category.id ? null : s))
    toast.message(`Deleted ${category.name} (demo).`)
  }, [])

  const handleDuplicate = useCallback((category: CategoryRow) => {
    setRows((prev) => {
      const maxId = prev.reduce((m, x) => Math.max(m, x.id), 0)
      return [
        ...prev,
        {
          id: maxId + 1,
          name: `${category.name} (copy)`,
          description: category.description,
          products: 0,
          status: "active",
        },
      ]
    })
    toast.success(`Duplicated ${category.name} (demo).`)
  }, [])

  const openSidebar = useCallback((category: CategoryRow, mode: "view" | "edit") => {
    setSidebar({ mode, category })
  }, [])

  const columns = useMemo(
    () => getCategoryColumns(openSidebar, handleDelete, handleDuplicate),
    [openSidebar, handleDelete, handleDuplicate]
  )

  const sheetCategory =
    sidebar && sidebar.mode !== "add" ? sidebar.category : null
  const formCategory = sidebar?.mode === "add" ? EMPTY_CATEGORY : sheetCategory ?? EMPTY_CATEGORY
  const formId =
    sidebar?.mode === "add"
      ? "category-add-form"
      : sheetCategory
        ? `category-edit-${sheetCategory.id}`
        : "category-edit"

  const submitAdd = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const name = String(fd.get("name") ?? "").trim()
    if (!name) {
      toast.error("Name is required.")
      return
    }
    setRows((prev) => {
      const maxId = prev.reduce((m, x) => Math.max(m, x.id), 0)
      return [
        ...prev,
        {
          id: maxId + 1,
          name,
          description: String(fd.get("description") ?? "").trim() || "No description",
          products: 0,
          status: (fd.get("status") as string) === "inactive" ? "inactive" : "active",
        },
      ]
    })
    toast.success("Category created (demo).")
    closeSidebar()
    setFormKey((k) => k + 1)
  }

  const submitEdit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!sheetCategory) return
    const fd = new FormData(e.currentTarget)
    const name = String(fd.get("name") ?? "").trim()
    if (!name) {
      toast.error("Name is required.")
      return
    }
    setRows((prev) =>
      prev.map((r) =>
        r.id === sheetCategory.id
          ? {
              ...r,
              name,
              description: String(fd.get("description") ?? "").trim() || "No description",
              status: (fd.get("status") as string) === "inactive" ? "inactive" : "active",
            }
          : r
      )
    )
    toast.success("Category saved (demo).")
    closeSidebar()
  }

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
                  {sidebar.mode === "add"
                    ? "Add category"
                    : sidebar.mode === "edit"
                      ? "Edit category"
                      : "Category details"}
                </SheetTitle>
                <SheetDescription>
                  {sidebar.mode === "add"
                    ? "Create a new category. Product count is set automatically from inventory."
                    : sheetCategory ? (
                      <>
                        {sheetCategory.name}
                        <span className="text-muted-foreground">
                          {" "}
                          · ID {sheetCategory.id}
                        </span>
                      </>
                    ) : null}
                </SheetDescription>
              </SheetHeader>
              <div
                key={
                  sidebar.mode === "add"
                    ? `add-${formKey}`
                    : `${sheetCategory?.id}-${sidebar.mode}`
                }
                className="min-h-0 flex-1 overflow-y-auto px-6 py-5"
              >
                {sidebar.mode === "view" && sheetCategory ? (
                  <dl className="space-y-3 text-sm">
                    <div className="grid grid-cols-[7rem_1fr] gap-2">
                      <dt className="text-muted-foreground">ID</dt>
                      <dd className="font-medium">{sheetCategory.id}</dd>
                    </div>
                    <div className="grid grid-cols-[7rem_1fr] gap-2">
                      <dt className="text-muted-foreground">Category</dt>
                      <dd className="font-medium">{sheetCategory.name}</dd>
                    </div>
                    <div className="grid grid-cols-[7rem_1fr] gap-2">
                      <dt className="text-muted-foreground">Description</dt>
                      <dd>{sheetCategory.description}</dd>
                    </div>
                    <div className="grid grid-cols-[7rem_1fr] gap-2">
                      <dt className="text-muted-foreground">Products</dt>
                      <dd className="font-medium tabular-nums">{sheetCategory.products}</dd>
                    </div>
                    <div className="grid grid-cols-[7rem_1fr] gap-2">
                      <dt className="text-muted-foreground">Status</dt>
                      <dd className="capitalize">{sheetCategory.status}</dd>
                    </div>
                  </dl>
                ) : (
                  <form
                    id={formId}
                    className="flex flex-col gap-4 text-sm"
                    onSubmit={sidebar.mode === "add" ? submitAdd : submitEdit}
                  >
                    <div className="flex flex-col gap-2">
                      <Label htmlFor={`${formId}-name`}>Name</Label>
                      <Input
                        id={`${formId}-name`}
                        name="name"
                        required
                        defaultValue={formCategory.name}
                        placeholder="Category name"
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <Label htmlFor={`${formId}-description`}>Description</Label>
                      <Input
                        id={`${formId}-description`}
                        name="description"
                        defaultValue={formCategory.description}
                        placeholder="Short description"
                      />
                    </div>
                    {sidebar.mode === "edit" ? (
                      <p className="text-muted-foreground text-xs">
                        Product count ({sheetCategory?.products ?? 0}) updates automatically from
                        inventory.
                      </p>
                    ) : null}
                    <div className="flex flex-col gap-2">
                      <Label htmlFor={`${formId}-status`}>Status</Label>
                      <select
                        id={`${formId}-status`}
                        name="status"
                        defaultValue={formCategory.status}
                        className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm shadow-xs outline-none focus-visible:ring-ring/50 focus-visible:ring-[3px]"
                      >
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                      </select>
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
                    <Button type="submit" form={formId}>
                      {sidebar.mode === "add" ? "Create category" : "Save category"}
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
        addButtonLabel="Add category"
        searchPlaceholder="Search categories..."
        importRowMapper={mapImportedCategory}
        importSampleFilename="categories-sample.csv"
        exportFilename="categories-export.csv"
        onAddClick={() => {
          setFormKey((k) => k + 1)
          setSidebar({ mode: "add" })
        }}
        bulkActions={[
          {
            id: "active",
            label: "Set active",
            icon: <IconCircleCheck className="size-4" />,
            onClick: (selected) => {
              const ids = new Set(selected.map((c) => c.id))
              setRows((prev) =>
                prev.map((r) => (ids.has(r.id) ? { ...r, status: "active" as const } : r))
              )
              toast.message(`Set ${selected.length} categor${selected.length === 1 ? "y" : "ies"} to active (demo).`)
            },
          },
          {
            id: "inactive",
            label: "Set inactive",
            icon: <IconBan className="size-4" />,
            onClick: (selected) => {
              const ids = new Set(selected.map((c) => c.id))
              setRows((prev) =>
                prev.map((r) => (ids.has(r.id) ? { ...r, status: "inactive" as const } : r))
              )
              toast.message(`Set ${selected.length} categor${selected.length === 1 ? "y" : "ies"} to inactive (demo).`)
            },
          },
          {
            id: "delete",
            label: "Delete selected",
            icon: <IconTrash className="size-4" />,
            variant: "destructive",
            onClick: (selected) => {
              const ids = new Set(selected.map((c) => c.id))
              setRows((prev) => prev.filter((r) => !ids.has(r.id)))
              toast.message(`Deleted ${selected.length} categor${selected.length === 1 ? "y" : "ies"} (demo).`)
            },
          },
        ]}
        tabs={categoryTabs}
        defaultTab="all"
        tabFilter={categoryTabFilter}
      />
    </>
  )
}
