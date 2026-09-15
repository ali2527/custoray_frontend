"use client"

import { useCallback, useMemo, useState, type FormEvent } from "react"
import { useRouter } from "next/navigation"
import { ColumnDef } from "@tanstack/react-table"
import {
  IconCopy,
  IconDotsVertical,
  IconEye,
  IconFileText,
  IconHistory,
  IconPencil,
  IconTrash,
} from "@tabler/icons-react"
import { toast } from "sonner"
import { useTranslation } from "react-i18next"
import type { TFunction } from "i18next"

import { CustomerDetail } from "@/components/customers/customer-detail"
import { CustomerForm } from "@/components/customers/customer-form"
import { CustomerRecordDialog } from "@/components/customers/customer-record-dialog"
import { DataTableColumnHeader } from "@/components/data-table-column-header"
import { DataTable, type DataTableTab } from "@/components/data-table"
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
import { useCustomers } from "@/context/customers-context"
import {
  confirmDeleteAction,
  confirmDuplicateAction,
} from "@/lib/confirm-action"
import {
  computeBalance,
  customerFromFormData,
  EMPTY_CUSTOMER,
  formatMoney,
  mapImportedCustomer,
  type CustomerRow,
} from "@/lib/customers"

type CustomerSidebarState =
  | { mode: "view"; customer: CustomerRow }
  | { mode: "edit"; customer: CustomerRow }
  | { mode: "add" }
  | null

function customerTabFilter(row: CustomerRow, tab: string) {
  if (tab === "all") return true
  return row.status === tab
}

function getCustomerColumns(
  t: TFunction<"customers">,
  openCustomerSidebar: (row: CustomerRow, mode: "view" | "edit") => void,
  onDelete: (row: CustomerRow) => void,
  onDuplicate: (row: CustomerRow) => void,
  onViewRecord: (row: CustomerRow) => void,
  onViewTimeline: (row: CustomerRow) => void
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
      accessorKey: "id",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("columns.id")} />
      ),
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
        <DataTableColumnHeader column={column} title={t("columns.name")} />
      ),
      cell: ({ row }) => (
        <button
          type="button"
          className="text-foreground text-left font-medium hover:underline"
          onClick={() => openCustomerSidebar(row.original, "view")}
        >
          {row.original.name}
        </button>
      ),
      enableHiding: false,
      meta: { dataTableFilter: false },
    },
    {
      accessorKey: "description",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("columns.description")} />
      ),
      cell: ({ row }) => (
        <span className="text-muted-foreground text-sm leading-snug whitespace-normal">
          {row.original.description}
        </span>
      ),
      meta: { dataTableFilter: false, cellClassName: "whitespace-normal max-w-xs" },
    },
    {
      accessorKey: "openingBalance",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("columns.openingBalance")} />
      ),
      cell: ({ row }) => (
        <span className="text-foreground tabular-nums">
          {formatMoney(row.original.openingBalance)}
        </span>
      ),
      meta: { dataTableFilter: false },
    },
    {
      accessorKey: "totalSales",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("columns.totalSales")} />
      ),
      cell: ({ row }) => (
        <span className="text-foreground tabular-nums">
          {formatMoney(row.original.totalSales)}
        </span>
      ),
      meta: { dataTableFilter: false },
    },
    {
      accessorKey: "totalPayments",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("columns.totalPayments")} />
      ),
      cell: ({ row }) => (
        <span className="text-foreground tabular-nums">
          {formatMoney(row.original.totalPayments)}
        </span>
      ),
      meta: { dataTableFilter: false },
    },
    {
      id: "balance",
      accessorFn: (row) => Number(computeBalance(row)),
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("columns.balance")} />
      ),
      cell: ({ row }) => {
        const balance = computeBalance(row.original)
        return (
          <span
            className={
              Number(balance) > 0
                ? "text-orange-600 tabular-nums dark:text-orange-400"
                : "text-muted-foreground tabular-nums"
            }
          >
            {formatMoney(balance)}
          </span>
        )
      },
      meta: { dataTableFilter: false },
    },
    {
      accessorKey: "phone",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("columns.phone")} />
      ),
      cell: ({ row }) => (
        <span className="text-muted-foreground tabular-nums text-xs">{row.original.phone}</span>
      ),
      meta: { dataTableFilter: false },
    },
    {
      accessorKey: "status",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("columns.status")} />
      ),
      cell: ({ row }) => (
        <span className="text-muted-foreground text-sm">
          {t(`status.${row.original.status}`, { ns: "common" })}
        </span>
      ),
      meta: { dataTableFilter: false },
    },
    {
      id: "actions",
      enableSorting: false,
      enableHiding: false,
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="data-[state=open]:bg-muted text-muted-foreground flex size-8"
              size="icon"
            >
              <IconDotsVertical />
              <span className="sr-only">{t("actions.openMenu")}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={() => openCustomerSidebar(row.original, "view")}>
              <IconEye />
              {t("actions.view")}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onViewTimeline(row.original)}>
              <IconHistory />
              {t("actions.viewTimeline")}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onViewRecord(row.original)}>
              <IconFileText />
              {t("record")}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => openCustomerSidebar(row.original, "edit")}>
              <IconPencil />
              {t("actions.edit")}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onDuplicate(row.original)}>
              <IconCopy />
              {t("actions.duplicate")}
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

export default function CustomersPage() {
  const { t } = useTranslation("customers")
  const router = useRouter()
  const {
    customers,
    setCustomers,
    addCustomer,
    updateCustomer,
    removeCustomer,
    duplicateCustomer,
  } = useCustomers()
  const [sidebar, setSidebar] = useState<CustomerSidebarState>(null)
  const [recordCustomer, setRecordCustomer] = useState<CustomerRow | null>(null)

  const closeSidebar = () => setSidebar(null)

  const handleDelete = useCallback(
    async (customer: CustomerRow) => {
      if (
        !(await confirmDeleteAction({
          itemName: customer.name,
          entityLabel: t("entity.customer"),
        }))
      ) {
        return
      }
      removeCustomer(customer.id)
      if (sidebar?.mode !== "add" && sidebar?.customer.id === customer.id) {
        closeSidebar()
      }
      toast.message(t("toasts.removedNamed", { name: customer.name }))
    },
    [removeCustomer, sidebar]
  )

  const handleDuplicate = useCallback(
    async (customer: CustomerRow) => {
      if (
        !(await confirmDuplicateAction({
          itemName: customer.name,
          entityLabel: t("entity.customer"),
        }))
      ) {
        return
      }
      const copy = duplicateCustomer(customer.id)
      if (copy) toast.success(t("toasts.duplicatedNamed", { name: customer.name }))
    },
    [duplicateCustomer]
  )

  const handleSubmit = useCallback(
    (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault()
      const fd = new FormData(e.currentTarget)
      const name = String(fd.get("name") ?? "").trim()
      if (!name) {
        toast.error(t("toasts.nameRequired"))
        return
      }

      if (sidebar?.mode === "add") {
        addCustomer(customerFromFormData(fd, 0))
        toast.success(t("toasts.created"))
        closeSidebar()
        return
      }

      if (sidebar?.mode === "edit" && sidebar.customer) {
        updateCustomer(
          sidebar.customer.id,
          customerFromFormData(fd, sidebar.customer.id)
        )
        toast.success(t("toasts.saved"))
        closeSidebar()
      }
    },
    [sidebar, addCustomer, updateCustomer]
  )

  const columns = useMemo(
    () =>
      getCustomerColumns(
        t,
        (row, mode) => setSidebar({ customer: row, mode }),
        handleDelete,
        handleDuplicate,
        (row) => setRecordCustomer(row),
        (row) => router.push(`/customers/${row.id}/timeline`)
      ),
    [t, handleDelete, handleDuplicate, router]
  )

  const customerTabs: DataTableTab[] = [
    { value: "all", label: t("tabs.all") },
    { value: "active", label: t("tabs.active") },
    { value: "inactive", label: t("tabs.inactive") },
  ]

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
          className={`flex w-full flex-col gap-0 overflow-hidden p-0 ${
            sidebar?.mode === "view" ? "sm:max-w-lg" : "sm:max-w-md"
          }`}
        >
          {sidebar ? (
            <>
              <SheetHeader className="border-border/60 space-y-1 border-b px-6 py-5 text-left">
                <SheetTitle className="text-lg leading-tight">
                  {sidebar.mode === "add"
                    ? t("sheet.add")
                    : sidebar.mode === "edit"
                      ? t("sheet.edit")
                      : sheetCustomer?.name}
                </SheetTitle>
                <SheetDescription>
                  {sidebar.mode === "add" ? (
                    t("sheet.addDescription")
                  ) : sidebar.mode === "edit" && sheetCustomer ? (
                    <>
                      {sheetCustomer.name}
                      <span className="text-muted-foreground"> · ID {sheetCustomer.id}</span>
                    </>
                  ) : sheetCustomer ? (
                    <>
                      ID {sheetCustomer.id}
                      {sheetCustomer.phone ? ` · ${sheetCustomer.phone}` : ""}
                    </>
                  ) : null}
                </SheetDescription>
              </SheetHeader>
              <div
                key={
                  sidebar.mode === "add"
                    ? "add"
                    : `${sheetCustomer?.id}-${sidebar.mode}`
                }
                className="min-h-0 flex-1 overflow-y-auto px-6 py-5"
              >
                {sidebar.mode === "view" && sheetCustomer ? (
                  <CustomerDetail customer={sheetCustomer} />
                ) : sidebar.mode === "edit" || sidebar.mode === "add" ? (
                  <CustomerForm
                    formId={formId}
                    customer={formCustomer}
                    onSubmit={handleSubmit}
                  />
                ) : null}
              </div>
              <SheetFooter className="border-border/60 gap-2 border-t px-6 py-4 sm:flex-row sm:justify-end">
                {sidebar.mode === "view" ? (
                  <>
                    <Button
                      variant="outline"
                      className="w-full sm:w-auto"
                      onClick={() =>
                        sheetCustomer &&
                        router.push(`/customers/${sheetCustomer.id}/timeline`)
                      }
                    >
                      {t("actions.viewTimeline")}
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full sm:w-auto"
                      onClick={() => sheetCustomer && setRecordCustomer(sheetCustomer)}
                    >
                      {t("actions.viewRecord")}
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full sm:w-auto"
                      onClick={() =>
                        sheetCustomer &&
                        setSidebar({ mode: "edit", customer: sheetCustomer })
                      }
                    >
                      {t("actions.edit")}
                    </Button>
                    <SheetClose asChild>
                      <Button className="w-full sm:w-auto">{t("actions.close", { ns: "common" })}</Button>
                    </SheetClose>
                  </>
                ) : (
                  <>
                    <SheetClose asChild>
                      <Button variant="outline" type="button">
                        {t("actions.cancel", { ns: "common" })}
                      </Button>
                    </SheetClose>
                    <Button type="submit" form={formId}>
                      {sidebar.mode === "add" ? t("sheet.create") : t("sheet.save")}
                    </Button>
                  </>
                )}
              </SheetFooter>
            </>
          ) : null}
        </SheetContent>
      </Sheet>

      <CustomerRecordDialog
        customer={recordCustomer}
        open={recordCustomer !== null}
        onOpenChange={(next) => {
          if (!next) setRecordCustomer(null)
        }}
      />

      <DataTable
        data={customers}
        columns={columns}
        addButtonLabel={t("addButton")}
        searchPlaceholder={t("search")}
        importRowMapper={mapImportedCustomer}
        importSampleFilename="customers-sample.csv"
        exportFilename="customers-export.csv"
        onDataChange={setCustomers}
        onAddClick={() => setSidebar({ mode: "add" })}
        defaultColumnVisibility={{ status: false }}
        bulkActions={[
          {
            id: "delete",
            label: t("actions.deleteSelected"),
            icon: <IconTrash className="size-4" />,
            variant: "destructive",
            onClick: async (selected) => {
              if (
                !(await confirmDeleteAction({
                  count: selected.length,
                  entityLabel: t("entity.customer"),
                }))
              ) {
                return
              }
              const ids = new Set(selected.map((c) => c.id))
              setCustomers((prev) => prev.filter((r) => !ids.has(r.id)))
              toast.message(t("toasts.removedCount", { count: selected.length }))
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
