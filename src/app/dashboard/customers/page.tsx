"use client"

import {
  useCallback,
  useMemo,
  useState,
  type FormEvent,
  type ReactNode,
} from "react"
import { ColumnDef } from "@tanstack/react-table"
import {
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

const customerSchema = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string(),
  /** Stored as decimal string for demo */
  totalSales: z.string(),
  pendingOrders: z.number(),
  paymentDue: z.string(),
  phone: z.string(),
  status: z.enum(["active", "on_hold", "inactive"]),
})

type CustomerRow = z.infer<typeof customerSchema>

function formatMoney(value: string): string {
  const n = Number(value)
  if (!Number.isFinite(n)) return value
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(n)
}

const initialCustomers: CustomerRow[] = [
  {
    id: 1,
    name: "Acme Retail Co.",
    description: "Wholesale buyer — priority lane",
    totalSales: "124580.50",
    pendingOrders: 3,
    paymentDue: "4200.00",
    phone: "+1 555-0101",
    status: "active",
  },
  {
    id: 2,
    name: "Northwind Traders",
    description: "Seasonal peaks Q2–Q4",
    totalSales: "89220.00",
    pendingOrders: 7,
    paymentDue: "15200.75",
    phone: "+1 555-0102",
    status: "on_hold",
  },
  {
    id: 3,
    name: "Contoso Foods",
    description: "Cold chain — weekly invoicing",
    totalSales: "45600.25",
    pendingOrders: 0,
    paymentDue: "0.00",
    phone: "+1 555-0103",
    status: "active",
  },
  {
    id: 4,
    name: "Fabrikam Logistics",
    description: "Net 45 — collections watch",
    totalSales: "201340.00",
    pendingOrders: 12,
    paymentDue: "28990.00",
    phone: "+1 555-0104",
    status: "on_hold",
  },
  {
    id: 5,
    name: "Litware Inc.",
    description: "SMB — card on file",
    totalSales: "18750.00",
    pendingOrders: 1,
    paymentDue: "890.50",
    phone: "+1 555-0105",
    status: "inactive",
  },
]

const customerTabs: DataTableTab[] = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "on_hold", label: "On hold" },
  { value: "inactive", label: "Inactive" },
]

function customerTabFilter(row: CustomerRow, tab: string) {
  if (tab === "all") return true
  return row.status === tab
}

function mapImportedCustomer(
  row: Record<string, string>,
  existing: CustomerRow[]
): CustomerRow | null {
  const maxId = existing.reduce((m, x) => Math.max(m, x.id), 0)
  const id = Number(row.id)
  const finalId = Number.isFinite(id) && id > 0 ? id : maxId + 1
  const name = (row.name ?? "").trim()
  if (!name) return null
  const statusRaw = (row.status ?? "active").toLowerCase().replace(/\s+/g, "_")
  const status =
    statusRaw === "on_hold" || statusRaw === "on-hold"
      ? "on_hold"
      : statusRaw === "inactive"
        ? "inactive"
        : "active"

  return {
    id: finalId,
    name,
    description: (row.description ?? "").trim() || "—",
    totalSales: String(row.totalSales ?? row.total_sales ?? "0").trim() || "0",
    pendingOrders: Number(row.pendingOrders ?? row.pending_orders) || 0,
    paymentDue: String(row.paymentDue ?? row.payment_due ?? "0").trim() || "0",
    phone: (row.phone ?? "").trim() || "—",
    status,
  }
}

const EMPTY_CUSTOMER: CustomerRow = {
  id: 0,
  name: "",
  description: "",
  totalSales: "0",
  pendingOrders: 0,
  paymentDue: "0",
  phone: "",
  status: "active",
}

type CustomerSidebar =
  | { mode: "view"; customer: CustomerRow }
  | { mode: "edit"; customer: CustomerRow }
  | { mode: "add" }
  | null

function statusBadgeClass(status: CustomerRow["status"]) {
  if (status === "active")
    return "border-emerald-500/30 px-1.5 text-emerald-700 dark:text-emerald-400"
  if (status === "on_hold")
    return "border-amber-500/30 px-1.5 text-amber-700 dark:text-amber-400"
  return "border-border px-1.5 text-muted-foreground"
}

function statusLabel(status: CustomerRow["status"]) {
  if (status === "on_hold") return "On hold"
  return status.charAt(0).toUpperCase() + status.slice(1)
}

function getCustomerColumns(
  openSidebar: (row: CustomerRow, mode: "view" | "edit") => void,
  onDelete: (row: CustomerRow) => void,
  onDuplicate: (row: CustomerRow) => void
): ColumnDef<CustomerRow>[] {
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
        <DataTableColumnHeader column={column} title="Customer" />
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
        <span className="text-muted-foreground max-w-[12rem] truncate">
          {row.original.description}
        </span>
      ),
      meta: { dataTableFilter: false },
    },
    {
      accessorKey: "totalSales",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Total sales" align="center" />
      ),
      cell: ({ row }) => (
        <div className="flex justify-center">
          <span className="text-foreground tabular-nums">
            {formatMoney(row.original.totalSales)}
          </span>
        </div>
      ),
      meta: { dataTableFilter: false },
    },
    {
      accessorKey: "pendingOrders",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Pending orders" align="center" />
      ),
      cell: ({ row }) => (
        <div className="flex justify-center">
          <span className="text-foreground tabular-nums">{row.original.pendingOrders}</span>
        </div>
      ),
      meta: { dataTableFilter: false },
    },
    {
      accessorKey: "paymentDue",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Payment due" align="center" />
      ),
      cell: ({ row }) => (
        <div className="flex justify-center">
          <span
            className={
              Number(row.original.paymentDue) > 0
                ? "text-amber-700 tabular-nums dark:text-amber-400"
                : "text-muted-foreground tabular-nums"
            }
          >
            {formatMoney(row.original.paymentDue)}
          </span>
        </div>
      ),
      meta: { dataTableFilter: false },
    },
    {
      accessorKey: "phone",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Phone" />,
      cell: ({ row }) => (
        <span className="text-muted-foreground tabular-nums text-xs">{row.original.phone}</span>
      ),
      meta: { dataTableFilter: false },
    },
    {
      accessorKey: "status",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
      cell: ({ row }) => (
        <Badge variant="outline" className={statusBadgeClass(row.original.status)}>
          {statusLabel(row.original.status)}
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
            <DropdownMenuItem variant="destructive" onClick={() => onDelete(row.original)}>
              <IconTrash />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ]
}

export default function CustomersPage() {
  const [rows, setRows] = useState<CustomerRow[]>(() => [...initialCustomers])
  const [sidebar, setSidebar] = useState<CustomerSidebar>(null)
  const [formKey, setFormKey] = useState(0)

  const closeSidebar = () => setSidebar(null)

  const handleDelete = useCallback((customer: CustomerRow) => {
    setRows((prev) => prev.filter((r) => r.id !== customer.id))
    setSidebar((s) =>
      s && "customer" in s && s.customer.id === customer.id ? null : s
    )
    toast.message(`Removed ${customer.name} (demo).`)
  }, [])

  const handleDuplicate = useCallback((customer: CustomerRow) => {
    setRows((prev) => {
      const maxId = prev.reduce((m, x) => Math.max(m, x.id), 0)
      return [
        ...prev,
        {
          ...customer,
          id: maxId + 1,
          name: `${customer.name} (copy)`,
          pendingOrders: 0,
          paymentDue: "0",
        },
      ]
    })
    toast.success(`Duplicated ${customer.name} (demo).`)
  }, [])

  const openSidebar = useCallback((customer: CustomerRow, mode: "view" | "edit") => {
    setSidebar({ mode, customer })
  }, [])

  const columns = useMemo(
    () => getCustomerColumns(openSidebar, handleDelete, handleDuplicate),
    [openSidebar, handleDelete, handleDuplicate]
  )

  const sheetCustomer =
    sidebar && sidebar.mode !== "add" ? sidebar.customer : null
  const formCustomer =
    sidebar?.mode === "add" ? EMPTY_CUSTOMER : sheetCustomer ?? EMPTY_CUSTOMER
  const formId =
    sidebar?.mode === "add"
      ? "customer-add-form"
      : sheetCustomer
        ? `customer-edit-${sheetCustomer.id}`
        : "customer-edit"

  const parseMoney = (raw: string) => {
    const t = raw.replace(/[^0-9.-]/g, "")
    const n = Number(t)
    return Number.isFinite(n) ? n.toFixed(2) : "0.00"
  }

  const submitAdd = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const name = String(fd.get("name") ?? "").trim()
    if (!name) {
      toast.error("Customer name is required.")
      return
    }
    setRows((prev) => {
      const maxId = prev.reduce((m, x) => Math.max(m, x.id), 0)
      const statusRaw = String(fd.get("status") ?? "active")
      const status: CustomerRow["status"] =
        statusRaw === "on_hold" ? "on_hold" : statusRaw === "inactive" ? "inactive" : "active"
      return [
        ...prev,
        {
          id: maxId + 1,
          name,
          description: String(fd.get("description") ?? "").trim() || "—",
          totalSales: parseMoney(String(fd.get("totalSales") ?? "0")),
          pendingOrders: Number(fd.get("pendingOrders")) || 0,
          paymentDue: parseMoney(String(fd.get("paymentDue") ?? "0")),
          phone: String(fd.get("phone") ?? "").trim() || "—",
          status,
        },
      ]
    })
    toast.success("Customer created (demo).")
    closeSidebar()
    setFormKey((k) => k + 1)
  }

  const submitEdit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!sheetCustomer) return
    const fd = new FormData(e.currentTarget)
    const name = String(fd.get("name") ?? "").trim()
    if (!name) {
      toast.error("Customer name is required.")
      return
    }
    const statusRaw = String(fd.get("status") ?? "active")
    const status: CustomerRow["status"] =
      statusRaw === "on_hold" ? "on_hold" : statusRaw === "inactive" ? "inactive" : "active"
    setRows((prev) =>
      prev.map((r) =>
        r.id === sheetCustomer.id
          ? {
              ...r,
              name,
              description: String(fd.get("description") ?? "").trim() || "—",
              totalSales: parseMoney(String(fd.get("totalSales") ?? r.totalSales)),
              pendingOrders: Number(fd.get("pendingOrders")) || 0,
              paymentDue: parseMoney(String(fd.get("paymentDue") ?? r.paymentDue)),
              phone: String(fd.get("phone") ?? "").trim() || "—",
              status,
            }
          : r
      )
    )
    toast.success("Customer saved (demo).")
    closeSidebar()
  }

  const detailRow = (label: string, value: ReactNode) => (
    <div className="grid grid-cols-[7.5rem_1fr] gap-2 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-foreground min-w-0 font-medium">{value}</dd>
    </div>
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
                  {sidebar.mode === "add"
                    ? "Add customer"
                    : sidebar.mode === "edit"
                      ? "Edit customer"
                      : "Customer details"}
                </SheetTitle>
                <SheetDescription>
                  {sidebar.mode === "add"
                    ? "Enter customer and account details. Saving is demo only."
                    : sheetCustomer ? (
                      <>
                        {sheetCustomer.name}
                        <span className="text-muted-foreground"> · ID {sheetCustomer.id}</span>
                      </>
                    ) : null}
                </SheetDescription>
              </SheetHeader>
              <div
                key={
                  sidebar.mode === "add"
                    ? `add-${formKey}`
                    : `${sheetCustomer?.id}-${sidebar.mode}`
                }
                className="min-h-0 flex-1 overflow-y-auto px-6 py-5"
              >
                {sidebar.mode === "view" && sheetCustomer ? (
                  <dl className="space-y-3">
                    {detailRow("Customer", sheetCustomer.name)}
                    {detailRow("Description", sheetCustomer.description)}
                    {detailRow("Total sales", formatMoney(sheetCustomer.totalSales))}
                    {detailRow("Pending orders", sheetCustomer.pendingOrders)}
                    {detailRow("Payment due", formatMoney(sheetCustomer.paymentDue))}
                    {detailRow("Phone", sheetCustomer.phone)}
                    {detailRow(
                      "Status",
                      <Badge variant="outline" className={statusBadgeClass(sheetCustomer.status)}>
                        {statusLabel(sheetCustomer.status)}
                      </Badge>
                    )}
                  </dl>
                ) : (
                  <form
                    id={formId}
                    className="flex flex-col gap-4 text-sm"
                    onSubmit={sidebar.mode === "add" ? submitAdd : submitEdit}
                  >
                    <div className="flex flex-col gap-2">
                      <Label htmlFor={`${formId}-name`}>Customer name</Label>
                      <Input
                        id={`${formId}-name`}
                        name="name"
                        required
                        defaultValue={formCustomer.name}
                        placeholder="Company or person"
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <Label htmlFor={`${formId}-description`}>Description</Label>
                      <Input
                        id={`${formId}-description`}
                        name="description"
                        defaultValue={formCustomer.description}
                        placeholder="Notes, terms, segment…"
                      />
                    </div>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div className="flex flex-col gap-2">
                        <Label htmlFor={`${formId}-totalSales`}>Total sales</Label>
                        <Input
                          id={`${formId}-totalSales`}
                          name="totalSales"
                          defaultValue={formCustomer.totalSales}
                          placeholder="0.00"
                        />
                      </div>
                      <div className="flex flex-col gap-2">
                        <Label htmlFor={`${formId}-pendingOrders`}>Pending orders</Label>
                        <Input
                          id={`${formId}-pendingOrders`}
                          name="pendingOrders"
                          type="number"
                          min={0}
                          defaultValue={formCustomer.pendingOrders}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div className="flex flex-col gap-2">
                        <Label htmlFor={`${formId}-paymentDue`}>Payment due</Label>
                        <Input
                          id={`${formId}-paymentDue`}
                          name="paymentDue"
                          defaultValue={formCustomer.paymentDue}
                          placeholder="0.00"
                        />
                      </div>
                      <div className="flex flex-col gap-2">
                        <Label htmlFor={`${formId}-phone`}>Phone</Label>
                        <Input
                          id={`${formId}-phone`}
                          name="phone"
                          defaultValue={formCustomer.phone === "—" ? "" : formCustomer.phone}
                        />
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <Label htmlFor={`${formId}-status`}>Status</Label>
                      <select
                        id={`${formId}-status`}
                        name="status"
                        defaultValue={formCustomer.status}
                        className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm shadow-xs outline-none focus-visible:ring-ring/50 focus-visible:ring-[3px]"
                      >
                        <option value="active">Active</option>
                        <option value="on_hold">On hold</option>
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
                      {sidebar.mode === "add" ? "Create customer" : "Save customer"}
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
        addButtonLabel="Add customer"
        searchPlaceholder="Search customers..."
        importRowMapper={mapImportedCustomer}
        importSampleFilename="customers-sample.csv"
        exportFilename="customers-export.csv"
        onAddClick={() => {
          setFormKey((k) => k + 1)
          setSidebar({ mode: "add" })
        }}
        bulkActions={[
          {
            id: "delete",
            label: "Delete selected",
            icon: <IconTrash className="size-4" />,
            variant: "destructive",
            onClick: (selected) => {
              const ids = new Set(selected.map((c) => c.id))
              setRows((prev) => prev.filter((r) => !ids.has(r.id)))
              toast.message(
                `Removed ${selected.length} customer${selected.length === 1 ? "" : "s"} (demo).`
              )
            },
          },
        ]}
        tabs={customerTabs}
        defaultTab="all"
        tabFilter={customerTabFilter}
      />
    </>
  )
}
