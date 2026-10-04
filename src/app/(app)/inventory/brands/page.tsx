"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { ColumnDef } from "@tanstack/react-table"
import {
  IconArchive,
  IconBan,
  IconCircleCheck,
  IconDotsVertical,
  IconPencil,
  IconTrash,
} from "@tabler/icons-react"
import { toast } from "sonner"
import { useTranslation } from "react-i18next"
import type { TFunction } from "i18next"

import { DataTableColumnHeader } from "@/components/data-table-column-header"
import { DataTable, type DataTableTab } from "@/components/data-table"
import { LookupFormSheet } from "@/components/inventory/lookup-form-sheet"
import { CatalogTablePageGuard } from "@/components/inventory/catalog-field-table-settings"
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
import { cn } from "@/lib/utils"
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { reportImportFailure, toastFailure } from "@/lib/action-toast"
import { uniqueErrorMessages } from "@/lib/api/client"
import { confirmDeleteAction } from "@/lib/confirm-action"
import { buildSampleCsv } from "@/lib/csv"
import { runBatchedBulkCreate } from "@/lib/import-batch"
import {
  BRAND_IMPORT_SAMPLE_ROW,
  BRAND_STATUS_OPTIONS,
  CATALOG_IMPORT_COLUMNS,
  brandTabValues,
  catalogErrorMessage,
  catalogTabFilter,
  mapImportedCatalogWrite,
  type CatalogRow,
} from "@/lib/inventory-catalog-rows"
import { useInventoryBrands } from "@/hooks/use-inventory-catalog"

function getBrandColumns(
  t: TFunction<"inventory">,
  onEdit: (row: CatalogRow) => void,
  onDelete: (row: CatalogRow) => void
): ColumnDef<CatalogRow>[] {
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
      meta: { headerClassName: "w-8 px-2", cellClassName: "w-8 px-2" },
    },
    {
      accessorKey: "srNo",
      header: ({ column }) => <DataTableColumnHeader column={column} title={t("columns.id")} />,
      cell: ({ row }) => (
        <span className="text-muted-foreground text-xs tabular-nums">{row.original.srNo}</span>
      ),
      meta: { dataTableFilter: false, headerClassName: "w-20", cellClassName: "w-20" },
    },
    {
      accessorKey: "name",
      header: ({ column }) => <DataTableColumnHeader column={column} title={t("columns.brand")} />,
      cell: ({ row }) => (
        <span className="block truncate font-medium">{row.original.name}</span>
      ),
      enableHiding: false,
      meta: {
        dataTableFilter: false,
        headerClassName: "w-[22%]",
        cellClassName: "w-[22%] max-w-[22%] overflow-hidden",
      },
    },
    {
      accessorKey: "description",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("columns.description")} />
      ),
      cell: ({ row }) => (
        <span
          className={cn(
            "block truncate text-sm",
            row.original.description ? "text-muted-foreground" : "text-muted-foreground/60"
          )}
        >
          {row.original.description || t("noDescription")}
        </span>
      ),
      meta: {
        dataTableFilter: false,
        headerClassName: "w-[38%]",
        cellClassName: "w-[38%] overflow-hidden",
      },
    },
    {
      accessorKey: "products",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("columns.products")} />
      ),
      cell: ({ row }) => (
        <span className="bg-muted inline-flex min-w-8 justify-center rounded-md px-2 py-0.5 text-xs font-medium tabular-nums">
          {row.original.products}
        </span>
      ),
      meta: { dataTableFilter: false, headerClassName: "w-28", cellClassName: "w-28" },
    },
    {
      accessorKey: "status",
      header: ({ column }) => <DataTableColumnHeader column={column} title={t("columns.status")} />,
      cell: ({ row }) => {
        const status = row.original.status
        const active = status === "active"
        const archived = status === "archived"
        return (
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium",
              active
                ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                : archived
                  ? "bg-muted text-muted-foreground"
                  : "bg-amber-500/10 text-amber-700 dark:text-amber-400"
            )}
          >
            <span
              className={cn(
                "size-1.5 rounded-full",
                active ? "bg-emerald-500" : archived ? "bg-muted-foreground/45" : "bg-amber-500"
              )}
              aria-hidden
            />
            {t(`tabs.${status}`)}
          </span>
        )
      },
      meta: { dataTableFilter: false, headerClassName: "w-36", cellClassName: "w-36" },
    },
    {
      id: "actions",
      enableSorting: false,
      meta: { headerClassName: "w-14", cellClassName: "w-14 text-end" },
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
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem onClick={() => onEdit(row.original)}>
              <IconPencil />
              {t("actions.edit")}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              onClick={() => onDelete(row.original)}
            >
              <IconTrash />
              {t("actions.delete")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ]
}

export default function BrandsPage() {
  return (
    <CatalogTablePageGuard table="brand">
      <BrandsPageContent />
    </CatalogTablePageGuard>
  )
}

function BrandsPageContent() {
  const { t } = useTranslation("inventory")
  const {
    rows,
    isLoading,
    isError,
    error,
    errorUpdatedAt,
    create,
    update,
    removeMany,
    setStatus,
    bulkCreate,
  } = useInventoryBrands()
  const [lookupOpen, setLookupOpen] = useState(false)
  const [editing, setEditing] = useState<CatalogRow | null>(null)
  const [isMutating, setIsMutating] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    if (isError) {
      toast.error(catalogErrorMessage(error, t("toasts.loadFailed")))
    }
  }, [error, errorUpdatedAt, isError, t])

  const handleDelete = useCallback(
    async (brand: CatalogRow) => {
      const ok = await confirmDeleteAction({ itemName: brand.name })
      if (!ok) return
      setDeletingId(brand.id)
      try {
        const result = await removeMany([brand.id])
        if (result.failed > 0) {
          toastFailure(
            t("toasts.deletePartial", {
              deleted: result.deleted,
              failed: result.failed,
            }),
            result.message
          )
          return
        }
        toast.success(t("toasts.deletedNamed", { name: brand.name }))
      } catch (error) {
        toast.error(catalogErrorMessage(error, t("toasts.saveFailed")))
      } finally {
        setDeletingId(null)
      }
    },
    [removeMany, t]
  )

  const columns = useMemo(
    () => getBrandColumns(t, setEditing, (row) => void handleDelete(row)),
    [handleDelete, t]
  )
  const brandTabs: DataTableTab[] = useMemo(
    () =>
      brandTabValues.map((value) => ({
        value,
        label: t(`tabs.${value}`),
      })),
    [t]
  )

  async function handleImportRows(imported: Record<string, string>[]) {
    const payload = imported
      .map((row) => mapImportedCatalogWrite(row, BRAND_STATUS_OPTIONS))
      .filter((row): row is NonNullable<typeof row> => row != null)
    if (payload.length === 0) return 0
    setIsMutating(true)
    try {
      const res = await runBatchedBulkCreate(payload, (batch) => bulkCreate(batch))
      const added = res.added
      const failed = imported.length - payload.length + res.errors.length
      reportImportFailure(
        added,
        failed,
        t("toasts.importPartial", { added, failed }),
        uniqueErrorMessages(res.errors)
      )
      return added
    } finally {
      setIsMutating(false)
    }
  }

  async function handleBulkStatus(
    selected: CatalogRow[],
    status: (typeof BRAND_STATUS_OPTIONS)[number],
    successMessage: string
  ) {
    const result = await setStatus({
      ids: selected.map((row) => row.id),
      status,
    })
    if (result.failed > 0) {
      toastFailure(
        t("toasts.updatePartial", {
          updated: result.updated,
          failed: result.failed,
        }),
        result.message
      )
      return
    }
    toast.success(successMessage)
  }

  return (
    <div>
      <DataTable
        data={rows}
        columns={columns}
        tableClassName="table-fixed"
        settingsKey="inventory-brands"
        showColumnFilters={false}
        addButtonLabel={t("brandPage.addButton")}
        searchPlaceholder={t("brandPage.search")}
        importSampleFilename="brands-sample.csv"
        importSampleCsvContent={buildSampleCsv(
          [...CATALOG_IMPORT_COLUMNS],
          BRAND_IMPORT_SAMPLE_ROW
        )}
        importColumns={[...CATALOG_IMPORT_COLUMNS]}
        importSelectColumns={{
          status: [...BRAND_STATUS_OPTIONS],
        }}
        importRequiredSelectColumns={[]}
        exportFilename="brands-export.csv"
        onAddClick={() => setLookupOpen(true)}
        onImportRows={handleImportRows}
        isLoading={isLoading || isMutating}
        pendingRowIds={deletingId ? [deletingId] : undefined}
        emptyTitle={t("brandPage.emptyTitle")}
        emptyDescription={t("brandPage.emptyDescription")}
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
            id: "archive",
            label: t("actions.moveToArchive"),
            icon: <IconArchive className="size-4" />,
            onClick: (selected) => {
              void handleBulkStatus(
                selected,
                "archived",
                t("toasts.archivedBrands", { count: selected.length })
              )
            },
          },
          {
            id: "delete",
            label: t("actions.deleteSelected"),
            icon: <IconTrash className="size-4" />,
            variant: "destructive",
            onClick: (selected) => {
              void (async () => {
                const ok = await confirmDeleteAction({ count: selected.length })
                if (!ok) return
                const ids = selected.map((row) => row.id).filter(Boolean)
                setIsMutating(true)
                try {
                  const result = await removeMany(ids)
                  const failed = result.failed + (selected.length - ids.length)
                  if (failed > 0) {
                    toastFailure(
                      t("toasts.deletePartial", {
                        deleted: result.deleted,
                        failed,
                      }),
                      result.message
                    )
                    return
                  }
                  toast.success(t("toasts.deletedCount", { count: selected.length }))
                } finally {
                  setIsMutating(false)
                }
              })()
            },
          },
        ]}
        tabs={brandTabs}
        defaultTab="all"
        tabFilter={catalogTabFilter}
      />
      <LookupFormSheet
        open={lookupOpen}
        onOpenChange={setLookupOpen}
        type="brand"
        existingValues={rows.map((b) => b.name)}
        onCreate={async (value, meta) => {
          await create({
            name: value,
            description: meta?.description,
            status: meta?.status,
          })
        }}
      />
      <Sheet open={editing !== null} onOpenChange={(open) => !open && setEditing(null)}>
        <SheetContent
          side="right"
          className="flex w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-md"
        >
          {editing ? (
            <>
              <SheetHeader className="border-border/60 space-y-1 border-b px-6 py-5 text-left">
                <SheetTitle className="text-lg leading-tight">
                  {t("brandPage.edit")}
                </SheetTitle>
                <SheetDescription>{editing.name}</SheetDescription>
              </SheetHeader>
              <form
                id="brand-edit-form"
                className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-6 py-5 text-sm"
                onSubmit={async (e) => {
                  e.preventDefault()
                  const fd = new FormData(e.currentTarget)
                  const name = String(fd.get("name") ?? "").trim()
                  if (!name) {
                    toast.error(t("toasts.categoryNameRequired"))
                    return
                  }
                  try {
                    await update({
                      id: editing.id,
                      data: {
                        name,
                        description: String(fd.get("description") ?? "").trim(),
                        status: String(fd.get("status") ?? editing.status),
                      },
                    })
                    toast.success(t("toasts.brandSaved"))
                    setEditing(null)
                  } catch (error) {
                    toast.error(catalogErrorMessage(error, t("toasts.saveFailed")))
                  }
                }}
              >
                <div className="flex flex-col gap-2">
                  <Label htmlFor="brand-edit-name">{t("fields.name")}</Label>
                  <Input id="brand-edit-name" name="name" defaultValue={editing.name} />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="brand-edit-description">{t("fields.description")}</Label>
                  <Input
                    id="brand-edit-description"
                    name="description"
                    defaultValue={editing.description}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="brand-edit-status">{t("fields.status")}</Label>
                  <select
                    id="brand-edit-status"
                    name="status"
                    defaultValue={editing.status}
                    className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm shadow-xs outline-none focus-visible:ring-ring/50 focus-visible:ring-[3px]"
                  >
                    {BRAND_STATUS_OPTIONS.map((status) => (
                      <option key={status} value={status}>
                        {t(`tabs.${status}`)}
                      </option>
                    ))}
                  </select>
                </div>
              </form>
              <SheetFooter className="border-border/60 gap-2 border-t px-6 py-4 sm:flex-row sm:justify-end">
                <SheetClose asChild>
                  <Button variant="outline" type="button">
                    {t("actions.cancel", { ns: "common" })}
                  </Button>
                </SheetClose>
                <Button type="submit" form="brand-edit-form">
                  {t("brandPage.save")}
                </Button>
              </SheetFooter>
            </>
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  )
}
