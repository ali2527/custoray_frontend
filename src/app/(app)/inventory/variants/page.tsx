"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
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
import { useTranslation } from "react-i18next"
import type { TFunction } from "i18next"

import { CatalogTablePageGuard } from "@/components/inventory/catalog-field-table-settings"
import { DataTableColumnHeader } from "@/components/data-table-column-header"
import { DataTable, type DataTableTab } from "@/components/data-table"
import { LookupFormSheet } from "@/components/inventory/lookup-form-sheet"
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
import { confirmDeleteAction } from "@/lib/confirm-action"
import { buildSampleCsv } from "@/lib/csv"
import {
  CATALOG_IMPORT_COLUMNS,
  CATALOG_STATUS_OPTIONS,
  VARIANT_IMPORT_SAMPLE_ROW,
  catalogErrorMessage,
  catalogTabFilter,
  catalogTabValues,
  mapImportedCatalogWrite,
  type CatalogRow,
} from "@/lib/inventory-catalog-rows"
import { useInventoryVariants } from "@/hooks/use-inventory-catalog"

function getVariantColumns(
  t: TFunction<"inventory">,
  openVariantSidebar: (row: CatalogRow, mode: "view" | "edit") => void,
  onDelete: (row: CatalogRow) => void,
  onDuplicate: (row: CatalogRow) => void
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
    },
    {
      accessorKey: "srNo",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("columns.id")} />
      ),
      cell: ({ row }) => (
        <span className="text-left tabular-nums">{row.original.srNo}</span>
      ),
    },
    {
      accessorKey: "name",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("columns.variant")} />
      ),
      cell: ({ row }) => (
        <span className="text-foreground font-medium">{row.original.name}</span>
      ),
      meta: { dataTableFilter: false },
    },
    {
      accessorKey: "description",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("columns.description")} />
      ),
      cell: ({ row }) => (
        <span className="text-muted-foreground truncate">
          {row.original.description || t("noDescription")}
        </span>
      ),
      meta: { dataTableFilter: false },
    },
    {
      accessorKey: "products",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("columns.products")} />
      ),
      cell: ({ row }) => (
        <span className="text-foreground tabular-nums">{row.original.products}</span>
      ),
      meta: { dataTableFilter: false },
    },
    {
      accessorKey: "status",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("columns.status")} />
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
          {t(`tabs.${row.original.status}`)}
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
              <span className="sr-only">{t("actions.openMenu")}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem onClick={() => openVariantSidebar(row.original, "view")}>
              <IconEye />
              {t("actions.view")}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => openVariantSidebar(row.original, "edit")}>
              <IconPencil />
              {t("actions.edit")}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onDuplicate(row.original)}>
              <IconCopy />
              {t("actions.duplicate")}
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

export default function VariantsPage() {
  return (
    <CatalogTablePageGuard table="variant">
      <VariantsPageContent />
    </CatalogTablePageGuard>
  )
}

function VariantsPageContent() {
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
  } = useInventoryVariants()
  const [lookupOpen, setLookupOpen] = useState(false)
  const [sidebar, setSidebar] = useState<
    { mode: "view" | "edit"; variant: CatalogRow } | null
  >(null)
  const closeSidebar = () => setSidebar(null)

  useEffect(() => {
    if (isError) {
      toast.error(catalogErrorMessage(error, t("toasts.loadFailed")))
    }
  }, [error, errorUpdatedAt, isError, t])

  const handleDeleteVariant = useCallback(
    async (variant: CatalogRow) => {
      const ok = await confirmDeleteAction({ itemName: variant.name })
      if (!ok) return
      try {
        const result = await removeMany([variant.id])
        if (result.failed > 0) {
          toast.error(t("toasts.saveFailed"))
          return
        }
        setSidebar((current) =>
          current?.variant.id === variant.id ? null : current
        )
        toast.success(t("toasts.deletedNamed", { name: variant.name }))
      } catch (error) {
        toast.error(catalogErrorMessage(error, t("toasts.saveFailed")))
      }
    },
    [removeMany, t]
  )

  const handleDuplicate = useCallback(
    async (variant: CatalogRow) => {
      try {
        await create({
          name: `${variant.name} (copy)`,
          description: variant.description,
          status: "active",
        })
        toast.success(t("toasts.duplicatedNamed", { name: variant.name }))
      } catch (error) {
        toast.error(catalogErrorMessage(error, t("toasts.saveFailed")))
      }
    },
    [create, t]
  )

  const columns = useMemo(
    () =>
      getVariantColumns(
        t,
        (variant, mode) => setSidebar({ variant, mode }),
        (row) => void handleDeleteVariant(row),
        (row) => void handleDuplicate(row)
      ),
    [t, handleDeleteVariant, handleDuplicate]
  )

  const variantTabs: DataTableTab[] = catalogTabValues.map((value) => ({
    value,
    label: t(`tabs.${value}`),
  }))

  async function handleImportRows(imported: Record<string, string>[]) {
    const payload = imported
      .map((row) => mapImportedCatalogWrite(row, CATALOG_STATUS_OPTIONS))
      .filter((row): row is NonNullable<typeof row> => row != null)
      .slice(0, 100)
    if (payload.length === 0) return 0
    const res = await bulkCreate(payload)
    const added = res.added ?? res.items?.length ?? 0
    const failed =
      imported.length - payload.length + (res.errors?.length ?? 0)
    if (failed > 0) {
      toast.error(t("toasts.importPartial", { added, failed }))
    }
    return added
  }

  if (isLoading) return <PageLoader />

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
                  {sidebar.mode === "edit"
                    ? t("variantPage.edit")
                    : t("variantPage.details")}
                </SheetTitle>
                <SheetDescription>
                  {t("variantPage.productsCount", {
                    name: sidebar.variant.name,
                    count: sidebar.variant.products,
                  })}
                </SheetDescription>
              </SheetHeader>
              <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
                {sidebar.mode === "view" ? (
                  <dl className="space-y-3 text-sm">
                    <div className="grid grid-cols-[7rem_1fr] gap-2">
                      <dt className="text-muted-foreground">{t("fields.id")}</dt>
                      <dd className="font-medium">{sidebar.variant.srNo}</dd>
                    </div>
                    <div className="grid grid-cols-[7rem_1fr] gap-2">
                      <dt className="text-muted-foreground">{t("fields.variant")}</dt>
                      <dd className="font-medium">{sidebar.variant.name}</dd>
                    </div>
                    <div className="grid grid-cols-[7rem_1fr] gap-2">
                      <dt className="text-muted-foreground">{t("fields.description")}</dt>
                      <dd>{sidebar.variant.description || t("noDescription")}</dd>
                    </div>
                    <div className="grid grid-cols-[7rem_1fr] gap-2">
                      <dt className="text-muted-foreground">{t("fields.products")}</dt>
                      <dd className="font-medium tabular-nums">
                        {sidebar.variant.products}
                      </dd>
                    </div>
                    <div className="grid grid-cols-[7rem_1fr] gap-2">
                      <dt className="text-muted-foreground">{t("fields.status")}</dt>
                      <dd>{t(`tabs.${sidebar.variant.status}`)}</dd>
                    </div>
                  </dl>
                ) : (
                  <form
                    id="variant-edit-form"
                    className="flex flex-col gap-4 text-sm"
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
                          id: sidebar.variant.id,
                          data: {
                            name,
                            description: String(fd.get("description") ?? "").trim(),
                            status:
                              String(fd.get("status") ?? "active") === "inactive"
                                ? "inactive"
                                : "active",
                          },
                        })
                        toast.success(t("toasts.variantSaved", { name }))
                        closeSidebar()
                      } catch (error) {
                        toast.error(catalogErrorMessage(error, t("toasts.saveFailed")))
                      }
                    }}
                  >
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="variant-name">{t("fields.variant")}</Label>
                      <Input
                        id="variant-name"
                        name="name"
                        defaultValue={sidebar.variant.name}
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="variant-description">{t("fields.description")}</Label>
                      <Input
                        id="variant-description"
                        name="description"
                        defaultValue={sidebar.variant.description}
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="variant-status">{t("fields.status")}</Label>
                      <select
                        id="variant-status"
                        name="status"
                        defaultValue={sidebar.variant.status}
                        className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm shadow-xs outline-none focus-visible:ring-ring/50 focus-visible:ring-[3px]"
                      >
                        <option value="active">{t("tabs.active")}</option>
                        <option value="inactive">{t("tabs.inactive")}</option>
                      </select>
                    </div>
                  </form>
                )}
              </div>
              <SheetFooter className="border-border/60 gap-2 border-t px-6 py-4 sm:flex-row sm:justify-end">
                {sidebar.mode === "view" ? (
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
                    <Button type="submit" form="variant-edit-form">
                      {t("variantPage.save")}
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
        settingsKey="inventory-variants"
        showColumnFilters={false}
        addButtonLabel={t("variantPage.addButton")}
        searchPlaceholder={t("variantPage.search")}
        importSampleFilename="variants-sample.csv"
        importSampleCsvContent={buildSampleCsv(
          [...CATALOG_IMPORT_COLUMNS],
          VARIANT_IMPORT_SAMPLE_ROW
        )}
        importColumns={[...CATALOG_IMPORT_COLUMNS]}
        importSelectColumns={{
          status: [...CATALOG_STATUS_OPTIONS],
        }}
        exportFilename="variants-export.csv"
        onAddClick={() => setLookupOpen(true)}
        onImportRows={handleImportRows}
        tabs={variantTabs}
        defaultTab="all"
        tabFilter={catalogTabFilter}
        bulkActions={[
          {
            id: "active",
            label: t("actions.setActive"),
            icon: <IconCircleCheck className="size-4" />,
            onClick: (selected) => {
              void (async () => {
                const result = await setStatus({
                  ids: selected.map((row) => row.id),
                  status: "active",
                })
                if (result.failed > 0) {
                  toast.error(
                    t("toasts.importPartial", {
                      added: result.updated,
                      failed: result.failed,
                    })
                  )
                  return
                }
                toast.success(t("toasts.setActiveCount", { count: selected.length }))
              })()
            },
          },
          {
            id: "inactive",
            label: t("actions.setInactive"),
            icon: <IconBan className="size-4" />,
            onClick: (selected) => {
              void (async () => {
                const result = await setStatus({
                  ids: selected.map((row) => row.id),
                  status: "inactive",
                })
                if (result.failed > 0) {
                  toast.error(
                    t("toasts.importPartial", {
                      added: result.updated,
                      failed: result.failed,
                    })
                  )
                  return
                }
                toast.success(t("toasts.setInactiveCount", { count: selected.length }))
              })()
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
                const result = await removeMany(selected.map((row) => row.id))
                if (result.failed > 0) {
                  toast.error(
                    t("toasts.importPartial", {
                      added: result.deleted,
                      failed: result.failed,
                    })
                  )
                  return
                }
                toast.success(t("toasts.deletedCount", { count: selected.length }))
              })()
            },
          },
        ]}
      />
      <LookupFormSheet
        open={lookupOpen}
        onOpenChange={setLookupOpen}
        type="variant"
        existingValues={rows.map((v) => v.name)}
        onCreate={async (value, meta) => {
          await create({
            name: value,
            description: meta?.description,
            status: meta?.status,
          })
        }}
      />
    </>
  )
}
