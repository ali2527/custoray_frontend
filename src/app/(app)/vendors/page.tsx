"use client"

import { useCallback, useMemo, useState, type FormEvent } from "react"
import { useRouter } from "next/navigation"
import { ColumnDef } from "@tanstack/react-table"
import {
  IconBan,
  IconCircleCheck,
  IconCopy,
  IconDotsVertical,
  IconEye,
  IconHistory,
  IconPencil,
  IconTrash,
} from "@tabler/icons-react"
import { toast } from "sonner"
import { useTranslation } from "react-i18next"
import type { TFunction } from "i18next"

import { VendorDetail } from "@/components/vendors/vendor-detail"
import { VendorForm } from "@/components/vendors/vendor-form"
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
import { PageLoader } from "@/components/ui/page-loader"
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { useVendors } from "@/context/vendors-context"
import {
  confirmDeleteAction,
  confirmDuplicateAction,
} from "@/lib/confirm-action"
import { buildSampleCsv } from "@/lib/csv"
import {
  computeBalance,
  EMPTY_VENDOR,
  formatMoney,
  mapImportedVendorWrite,
  vendorErrorMessage,
  vendorFromFormData,
  vendorTabFilter,
  vendorTimelineHref,
  VENDOR_IMPORT_COLUMNS,
  VENDOR_IMPORT_SAMPLE_ROW,
  VENDOR_STATUS_OPTIONS,
  type VendorRow,
  type VendorStatus,
} from "@/lib/vendors"

type VendorSidebarState =
  | { mode: "view"; vendor: VendorRow }
  | { mode: "edit"; vendor: VendorRow }
  | { mode: "add" }
  | null

function getVendorColumns(
  t: TFunction<"vendors">,
  openVendorSidebar: (row: VendorRow, mode: "view" | "edit") => void,
  onDelete: (row: VendorRow) => void,
  onDuplicate: (row: VendorRow) => void,
  onViewTimeline: (row: VendorRow) => void
): ColumnDef<VendorRow>[] {
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
          onClick={() => openVendorSidebar(row.original, "view")}
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
          {row.original.description || "—"}
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
      accessorKey: "totalPurchases",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("columns.totalPurchases")} />
      ),
      cell: ({ row }) => (
        <span className="text-foreground tabular-nums">
          {formatMoney(row.original.totalPurchases)}
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
        <span className="text-muted-foreground tabular-nums text-xs">
          {row.original.phone || "—"}
        </span>
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
            <DropdownMenuItem onClick={() => openVendorSidebar(row.original, "view")}>
              <IconEye />
              {t("actions.view")}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onViewTimeline(row.original)}>
              <IconHistory />
              {t("actions.viewTimeline")}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => openVendorSidebar(row.original, "edit")}>
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

export default function VendorsPage() {
  const { t } = useTranslation("vendors")
  const router = useRouter()
  const {
    vendors,
    loading,
    addVendor,
    updateVendor,
    removeVendor,
    duplicateVendor,
    removeMany,
    setStatus,
    bulkCreate,
  } = useVendors()
  const [sidebar, setSidebar] = useState<VendorSidebarState>(null)

  const closeSidebar = () => setSidebar(null)

  const handleDelete = useCallback(
    async (vendor: VendorRow) => {
      if (
        !(await confirmDeleteAction({
          itemName: vendor.name,
          entityLabel: t("entity.vendor"),
        }))
      ) {
        return
      }
      try {
        await removeVendor(vendor.id)
        if (sidebar?.mode !== "add" && sidebar?.vendor.id === vendor.id) {
          closeSidebar()
        }
        toast.success(t("toasts.removedNamed", { name: vendor.name }))
      } catch (error) {
        toast.error(vendorErrorMessage(error, t("toasts.saveFailed")))
      }
    },
    [removeVendor, sidebar, t]
  )

  const handleDuplicate = useCallback(
    async (vendor: VendorRow) => {
      if (
        !(await confirmDuplicateAction({
          itemName: vendor.name,
          entityLabel: t("entity.vendor"),
        }))
      ) {
        return
      }
      try {
        const copy = await duplicateVendor(vendor.id)
        if (copy) toast.success(t("toasts.duplicatedNamed", { name: vendor.name }))
      } catch (error) {
        toast.error(vendorErrorMessage(error, t("toasts.saveFailed")))
      }
    },
    [duplicateVendor, t]
  )

  const handleSubmit = useCallback(
    async (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault()
      const fd = new FormData(e.currentTarget)
      const name = String(fd.get("name") ?? "").trim()
      if (!name) {
        toast.error(t("toasts.nameRequired"))
        return
      }

      try {
        if (sidebar?.mode === "add") {
          await addVendor(vendorFromFormData(fd, EMPTY_VENDOR))
          toast.success(t("toasts.created"))
          closeSidebar()
          return
        }

        if (sidebar?.mode === "edit" && sidebar.vendor) {
          await updateVendor(
            sidebar.vendor.id,
            vendorFromFormData(fd, sidebar.vendor)
          )
          toast.success(t("toasts.saved"))
          closeSidebar()
        }
      } catch (error) {
        toast.error(vendorErrorMessage(error, t("toasts.saveFailed")))
      }
    },
    [sidebar, addVendor, updateVendor, t]
  )

  const handleImportRows = useCallback(
    async (imported: Record<string, string>[]) => {
      const payload = imported
        .map((row) => mapImportedVendorWrite(row))
        .filter((row): row is NonNullable<typeof row> => row != null)
        .slice(0, 100)
      if (payload.length === 0) return 0
      const res = await bulkCreate(payload)
      const added = res.added ?? res.items?.length ?? 0
      const failed = imported.length - payload.length + (res.errors?.length ?? 0)
      if (failed > 0) {
        toast.error(t("toasts.importPartial", { added, failed }))
      }
      return added
    },
    [bulkCreate, t]
  )

  const handleBulkStatus = useCallback(
    async (selected: VendorRow[], status: VendorStatus, successMessage: string) => {
      const ids = selected.map((row) => row.apiId).filter(Boolean)
      if (ids.length === 0) return
      const result = await setStatus(ids, status)
      if (result.failed > 0) {
        toast.error(
          t("toasts.importPartial", {
            added: result.updated,
            failed: result.failed,
          })
        )
        return
      }
      toast.success(successMessage)
    },
    [setStatus, t]
  )

  const columns = useMemo(
    () =>
      getVendorColumns(
        t,
        (row, mode) => setSidebar({ vendor: row, mode }),
        handleDelete,
        handleDuplicate,
        (row) => router.push(vendorTimelineHref(row.apiId || row.id))
      ),
    [t, handleDelete, handleDuplicate, router]
  )

  const vendorTabs: DataTableTab[] = [
    { value: "all", label: t("tabs.all") },
    { value: "active", label: t("tabs.active") },
    { value: "inactive", label: t("tabs.inactive") },
  ]

  const sheetVendor =
    sidebar && sidebar.mode !== "add"
      ? (vendors.find((row) => row.id === sidebar.vendor.id) ?? sidebar.vendor)
      : null
  const formVendor =
    sidebar?.mode === "add" ? EMPTY_VENDOR : sheetVendor ?? EMPTY_VENDOR
  const formId =
    sidebar?.mode === "add"
      ? "vendor-add-form"
      : sheetVendor
        ? `vendor-edit-${sheetVendor.id}`
        : "vendor-edit"

  if (loading) return <PageLoader />

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
            sidebar?.mode === "view" ? "sm:max-w-xl" : "sm:max-w-md"
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
                      : sheetVendor?.name}
                </SheetTitle>
                <SheetDescription>
                  {sidebar.mode === "add" ? (
                    t("sheet.addDescription")
                  ) : sidebar.mode === "edit" && sheetVendor ? (
                    <>
                      {sheetVendor.name}
                      <span className="text-muted-foreground"> · ID {sheetVendor.id}</span>
                    </>
                  ) : sheetVendor ? (
                    <>
                      {t(`status.${sheetVendor.status}`, { ns: "common" })}
                      {sheetVendor.phone && sheetVendor.phone !== "—"
                        ? ` · ${sheetVendor.phone}`
                        : ""}
                    </>
                  ) : null}
                </SheetDescription>
              </SheetHeader>
              <div
                key={
                  sidebar.mode === "add"
                    ? "add"
                    : `${sheetVendor?.id}-${sidebar.mode}`
                }
                className="min-h-0 flex-1 overflow-y-auto px-6 py-5"
              >
                {sidebar.mode === "view" && sheetVendor ? (
                  <VendorDetail
                    vendor={sheetVendor}
                    onViewTimeline={() =>
                      router.push(vendorTimelineHref(sheetVendor.apiId || sheetVendor.id))
                    }
                  />
                ) : sidebar.mode === "edit" || sidebar.mode === "add" ? (
                  <VendorForm
                    formId={formId}
                    vendor={formVendor}
                    onSubmit={handleSubmit}
                  />
                ) : null}
              </div>
              <SheetFooter className="border-border/60 gap-2 border-t px-6 py-4 sm:flex-row sm:justify-end">
                {sidebar.mode === "view" && sheetVendor ? (
                  <>
                    <SheetClose asChild>
                      <Button variant="outline" className="w-full sm:w-auto">
                        {t("actions.close", { ns: "common" })}
                      </Button>
                    </SheetClose>
                    <Button
                      type="button"
                      className="w-full sm:w-auto"
                      onClick={() =>
                        setSidebar({ mode: "edit", vendor: sheetVendor })
                      }
                    >
                      {t("actions.edit")}
                    </Button>
                  </>
                ) : sidebar.mode === "view" ? (
                  <SheetClose asChild>
                    <Button variant="outline" className="w-full sm:w-auto">
                      {t("actions.close", { ns: "common" })}
                    </Button>
                  </SheetClose>
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

      <DataTable
        data={vendors}
        columns={columns}
        settingsKey="vendors"
        showColumnFilters={false}
        addButtonLabel={t("addButton")}
        searchPlaceholder={t("search")}
        importSampleFilename="vendors-sample.csv"
        importSampleCsvContent={buildSampleCsv(
          [...VENDOR_IMPORT_COLUMNS],
          VENDOR_IMPORT_SAMPLE_ROW
        )}
        importColumns={[...VENDOR_IMPORT_COLUMNS]}
        importSelectColumns={{
          status: [...VENDOR_STATUS_OPTIONS],
        }}
        importRequiredSelectColumns={[]}
        exportFilename="vendors-export.csv"
        onImportRows={handleImportRows}
        onAddClick={() => setSidebar({ mode: "add" })}
        defaultColumnVisibility={{ status: false }}
        bulkActions={[
          {
            id: "active",
            label: t("actions.setActive"),
            icon: <IconCircleCheck className="size-4" />,
            onClick: (selected) => {
              void handleBulkStatus(
                selected,
                "active",
                t("toasts.setActiveCount", { count: selected.length })
              )
            },
          },
          {
            id: "inactive",
            label: t("actions.setInactive"),
            icon: <IconBan className="size-4" />,
            onClick: (selected) => {
              void handleBulkStatus(
                selected,
                "inactive",
                t("toasts.setInactiveCount", { count: selected.length })
              )
            },
          },
          {
            id: "delete",
            label: t("actions.deleteSelected"),
            icon: <IconTrash className="size-4" />,
            variant: "destructive",
            onClick: async (selected) => {
              if (
                !(await confirmDeleteAction({
                  count: selected.length,
                  entityLabel: t("entity.vendor"),
                }))
              ) {
                return
              }
              const ids = selected.map((row) => row.apiId).filter(Boolean)
              const result = await removeMany(ids)
              if (result.failed > 0) {
                toast.error(
                  t("toasts.importPartial", {
                    added: result.deleted,
                    failed: result.failed,
                  })
                )
                return
              }
              toast.success(t("toasts.removedCount", { count: selected.length }))
            },
          },
        ]}
        tabs={vendorTabs}
        defaultTab="all"
        tabFilter={vendorTabFilter}
      />
    </>
  )
}
