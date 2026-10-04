"use client"

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react"
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
  CATALOG_IMPORT_COLUMNS,
  CATEGORY_IMPORT_SAMPLE_ROW,
  CATALOG_STATUS_OPTIONS,
  catalogErrorMessage,
  catalogTabFilter,
  catalogTabValues,
  mapImportedCatalogWrite,
  type CatalogRow,
} from "@/lib/inventory-catalog-rows"
import { useInventoryCategories } from "@/hooks/use-inventory-catalog"

const EMPTY_CATEGORY: CatalogRow = {
  id: "",
  srNo: 0,
  name: "",
  description: "",
  products: 0,
  status: "active",
}

type CategorySidebar =
  | { mode: "view"; category: CatalogRow }
  | { mode: "edit"; category: CatalogRow }
  | { mode: "add" }
  | null

function getCategoryColumns(
  t: TFunction<"inventory">,
  openSidebar: (row: CatalogRow, mode: "view" | "edit") => void,
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
      meta: { headerClassName: "w-8 px-2", cellClassName: "w-8 px-2" },
    },
    {
      accessorKey: "srNo",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("columns.id")} />
      ),
      cell: ({ row }) => (
        <span className="text-muted-foreground text-xs tabular-nums">{row.original.srNo}</span>
      ),
      meta: { dataTableFilter: false, headerClassName: "w-20", cellClassName: "w-20" },
    },
    {
      accessorKey: "name",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("columns.category")} />
      ),
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
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("columns.status")} />
      ),
      cell: ({ row }) => {
        const active = row.original.status === "active"
        return (
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium",
              active
                ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                : "bg-muted text-muted-foreground"
            )}
          >
            <span
              className={cn(
                "size-1.5 rounded-full",
                active ? "bg-emerald-500" : "bg-muted-foreground/45"
              )}
              aria-hidden
            />
            {active ? t("tabs.active") : t("tabs.inactive")}
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
            <DropdownMenuItem onClick={() => openSidebar(row.original, "view")}>
              <IconEye />
              {t("actions.view")}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => openSidebar(row.original, "edit")}>
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

export default function CategoriesPage() {
  return (
    <CatalogTablePageGuard table="category">
      <CategoriesPageContent />
    </CatalogTablePageGuard>
  )
}

function CategoriesPageContent() {
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
  } = useInventoryCategories()
  const [sidebar, setSidebar] = useState<CategorySidebar>(null)
  const [formKey, setFormKey] = useState(0)
  const [isMutating, setIsMutating] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    if (isError) {
      toast.error(catalogErrorMessage(error, t("toasts.loadFailed")))
    }
  }, [error, errorUpdatedAt, isError, t])

  const closeSidebar = () => setSidebar(null)

  const handleDelete = useCallback(
    async (category: CatalogRow) => {
      const ok = await confirmDeleteAction({ itemName: category.name })
      if (!ok) return
      setDeletingId(category.id)
      try {
        const result = await removeMany([category.id])
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
        setSidebar((s) =>
          s && "category" in s && s.category.id === category.id ? null : s
        )
        toast.success(t("toasts.deletedNamed", { name: category.name }))
      } catch (error) {
        toast.error(catalogErrorMessage(error, t("toasts.saveFailed")))
      } finally {
        setDeletingId(null)
      }
    },
    [removeMany, t]
  )

  const handleDuplicate = useCallback(
    async (category: CatalogRow) => {
      try {
        await create({
          name: `${category.name} (copy)`,
          description: category.description,
          status: "active",
        })
        toast.success(t("toasts.duplicatedNamed", { name: category.name }))
      } catch (error) {
        toast.error(catalogErrorMessage(error, t("toasts.saveFailed")))
      }
    },
    [create, t]
  )

  const openSidebar = useCallback((category: CatalogRow, mode: "view" | "edit") => {
    setSidebar({ mode, category })
  }, [])

  const columns = useMemo(
    () =>
      getCategoryColumns(
        t,
        openSidebar,
        (row) => void handleDelete(row),
        (row) => void handleDuplicate(row)
      ),
    [t, openSidebar, handleDelete, handleDuplicate]
  )

  const categoryTabs: DataTableTab[] = catalogTabValues.map((value) => ({
    value,
    label: t(`tabs.${value}`),
  }))

  const sheetCategory =
    sidebar && sidebar.mode !== "add" ? sidebar.category : null
  const formCategory = sidebar?.mode === "add" ? EMPTY_CATEGORY : sheetCategory ?? EMPTY_CATEGORY
  const formId =
    sidebar?.mode === "add"
      ? "category-add-form"
      : sheetCategory
        ? `category-edit-${sheetCategory.id}`
        : "category-edit"

  const submitAdd = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const name = String(fd.get("name") ?? "").trim()
    if (!name) {
      toast.error(t("toasts.categoryNameRequired"))
      return
    }
    try {
      await create({
        name,
        description: String(fd.get("description") ?? "").trim(),
        status: String(fd.get("status") ?? "active") === "inactive" ? "inactive" : "active",
      })
      toast.success(t("toasts.categoryCreated"))
      closeSidebar()
      setFormKey((k) => k + 1)
    } catch (error) {
      toast.error(catalogErrorMessage(error, t("toasts.saveFailed")))
    }
  }

  const submitEdit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!sheetCategory) return
    const fd = new FormData(e.currentTarget)
    const name = String(fd.get("name") ?? "").trim()
    if (!name) {
      toast.error(t("toasts.categoryNameRequired"))
      return
    }
    try {
      await update({
        id: sheetCategory.id,
        data: {
          name,
          description: String(fd.get("description") ?? "").trim(),
          status: String(fd.get("status") ?? "active") === "inactive" ? "inactive" : "active",
        },
      })
      toast.success(t("toasts.categorySaved"))
      closeSidebar()
    } catch (error) {
      toast.error(catalogErrorMessage(error, t("toasts.saveFailed")))
    }
  }

  async function handleImportRows(imported: Record<string, string>[]) {
    const payload = imported
      .map((row) => mapImportedCatalogWrite(row, CATALOG_STATUS_OPTIONS))
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
                    ? t("categoryPage.add")
                    : sidebar.mode === "edit"
                      ? t("categoryPage.edit")
                      : t("categoryPage.details")}
                </SheetTitle>
                <SheetDescription>
                  {sidebar.mode === "add"
                    ? t("categoryPage.addDescription")
                    : sheetCategory ? (
                      <>
                        {sheetCategory.name}
                        <span className="text-muted-foreground">
                          {" "}
                          · {t("categoryPage.idLine", { id: sheetCategory.srNo })}
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
                      <dt className="text-muted-foreground">{t("fields.id")}</dt>
                      <dd className="font-medium">{sheetCategory.srNo}</dd>
                    </div>
                    <div className="grid grid-cols-[7rem_1fr] gap-2">
                      <dt className="text-muted-foreground">{t("fields.category")}</dt>
                      <dd className="font-medium">{sheetCategory.name}</dd>
                    </div>
                    <div className="grid grid-cols-[7rem_1fr] gap-2">
                      <dt className="text-muted-foreground">{t("fields.description")}</dt>
                      <dd>{sheetCategory.description}</dd>
                    </div>
                    <div className="grid grid-cols-[7rem_1fr] gap-2">
                      <dt className="text-muted-foreground">{t("fields.products")}</dt>
                      <dd className="font-medium tabular-nums">{sheetCategory.products}</dd>
                    </div>
                    <div className="grid grid-cols-[7rem_1fr] gap-2">
                      <dt className="text-muted-foreground">{t("fields.status")}</dt>
                      <dd>{t(`tabs.${sheetCategory.status}`)}</dd>
                    </div>
                  </dl>
                ) : (
                  <form
                    id={formId}
                    className="flex flex-col gap-4 text-sm"
                    onSubmit={sidebar.mode === "add" ? submitAdd : submitEdit}
                  >
                    <div className="flex flex-col gap-2">
                      <Label htmlFor={`${formId}-name`}>{t("fields.name")}</Label>
                      <Input
                        id={`${formId}-name`}
                        name="name"
                        required
                        defaultValue={formCategory.name}
                        placeholder={t("categoryPage.namePlaceholder")}
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <Label htmlFor={`${formId}-description`}>{t("fields.description")}</Label>
                      <Input
                        id={`${formId}-description`}
                        name="description"
                        defaultValue={formCategory.description}
                        placeholder={t("categoryPage.descriptionPlaceholder")}
                      />
                    </div>
                    {sidebar.mode === "edit" ? (
                      <p className="text-muted-foreground text-xs">
                        {t("categoryPage.productCountHint", {
                          count: sheetCategory?.products ?? 0,
                        })}
                      </p>
                    ) : null}
                    <div className="flex flex-col gap-2">
                      <Label htmlFor={`${formId}-status`}>{t("fields.status")}</Label>
                      <select
                        id={`${formId}-status`}
                        name="status"
                        defaultValue={formCategory.status}
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
                    <Button type="submit" form={formId}>
                      {sidebar.mode === "add"
                        ? t("categoryPage.create")
                        : t("categoryPage.save")}
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
        tableClassName="table-fixed"
        settingsKey="inventory-categories"
        showColumnFilters={false}
        addButtonLabel={t("categoryPage.addButton")}
        searchPlaceholder={t("categoryPage.search")}
        importSampleFilename="categories-sample.csv"
        importSampleCsvContent={buildSampleCsv(
          [...CATALOG_IMPORT_COLUMNS],
          CATEGORY_IMPORT_SAMPLE_ROW
        )}
        importColumns={[...CATALOG_IMPORT_COLUMNS]}
        importSelectColumns={{
          status: [...CATALOG_STATUS_OPTIONS],
        }}
        importRequiredSelectColumns={[]}
        exportFilename="categories-export.csv"
        onImportRows={handleImportRows}
        isLoading={isLoading || isMutating}
        pendingRowIds={deletingId ? [deletingId] : undefined}
        emptyTitle={t("categoryPage.emptyTitle")}
        emptyDescription={t("categoryPage.emptyDescription")}
        onAddClick={() => {
          setFormKey((k) => k + 1)
          setSidebar({ mode: "add" })
        }}
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
                  toastFailure(
                    t("toasts.updatePartial", {
                      updated: result.updated,
                      failed: result.failed,
                    }),
                    result.message
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
                  toastFailure(
                    t("toasts.updatePartial", {
                      updated: result.updated,
                      failed: result.failed,
                    }),
                    result.message
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
                  toast.success(t("toasts.deletedCategories", { count: selected.length }))
                } finally {
                  setIsMutating(false)
                }
              })()
            },
          },
        ]}
        tabs={categoryTabs}
        defaultTab="all"
        tabFilter={catalogTabFilter}
      />
    </>
  )
}
