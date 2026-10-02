"use client"

import { useCallback, useMemo, useState, type FormEvent } from "react"
import { ColumnDef } from "@tanstack/react-table"
import {
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
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
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
import { useExpenseTypes } from "@/context/expense-types-context"
import { reportImportFailure, toastFailure } from "@/lib/action-toast"
import { uniqueErrorMessages } from "@/lib/api/client"
import { confirmDeleteAction } from "@/lib/confirm-action"
import { buildSampleCsv } from "@/lib/csv"
import {
  EMPTY_EXPENSE_TYPE,
  EXPENSE_TYPE_IMPORT_COLUMNS,
  EXPENSE_TYPE_IMPORT_SAMPLE_ROW,
  EXPENSE_TYPE_STATUS_OPTIONS,
  expenseTypeErrorMessage,
  expenseTypeFromFormData,
  expenseTypeTabFilter,
  mapImportedExpenseTypeWrite,
  type ExpenseTypeRow,
} from "@/lib/expense-types"

type SidebarState =
  | { mode: "add" }
  | { mode: "edit"; row: ExpenseTypeRow }
  | null

function getColumns(
  t: TFunction<"expenses">,
  onEdit: (row: ExpenseTypeRow) => void,
  onDelete: (row: ExpenseTypeRow) => void
): ColumnDef<ExpenseTypeRow>[] {
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
      id: "srNo",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("types.columns.srNo")} />
      ),
      cell: ({ row, table }) => {
        const { pageIndex, pageSize } = table.getState().pagination
        return (
          <span className="text-muted-foreground font-mono tabular-nums">
            {pageIndex * pageSize + row.index + 1}
          </span>
        )
      },
      enableSorting: false,
      meta: { dataTableFilter: false, headerClassName: "w-20", cellClassName: "w-20" },
    },
    {
      accessorKey: "name",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("types.columns.name")} />
      ),
      cell: ({ row }) => (
        <button
          type="button"
          className="block truncate text-start font-medium hover:underline"
          onClick={() => onEdit(row.original)}
        >
          {row.original.name}
        </button>
      ),
      enableHiding: false,
      meta: {
        headerClassName: "w-[28%]",
        cellClassName: "w-[28%] max-w-[28%] overflow-hidden",
      },
    },
    {
      accessorKey: "description",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("types.columns.description")} />
      ),
      cell: ({ row }) => (
        <span
          className={cn(
            "block truncate text-sm",
            row.original.description ? "text-muted-foreground" : "text-muted-foreground/60"
          )}
        >
          {row.original.description || "—"}
        </span>
      ),
      meta: {
        headerClassName: "w-[32%]",
        cellClassName: "w-[32%] overflow-hidden",
      },
    },
    {
      accessorKey: "expensesCount",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("types.columns.expenses")} />
      ),
      cell: ({ row }) => (
        <span className="bg-muted inline-flex min-w-8 justify-center rounded-md px-2 py-0.5 text-xs font-medium tabular-nums">
          {row.original.expensesCount ?? 0}
        </span>
      ),
      meta: {
        dataTableFilterVariant: "range" as const,
        headerClassName: "w-28",
        cellClassName: "w-28",
      },
    },
    {
      accessorKey: "status",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("types.columns.status")} />
      ),
      cell: ({ row }) => {
        const active = row.original.status === "active"
        return (
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium",
              active
                ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                : "bg-amber-500/10 text-amber-700 dark:text-amber-400"
            )}
          >
            <span
              className={cn("size-1.5 rounded-full", active ? "bg-emerald-500" : "bg-amber-500")}
              aria-hidden
            />
            {t(`types.tabs.${row.original.status}`)}
          </span>
        )
      },
      meta: {
        dataTableFilterVariant: "select" as const,
        dataTableFilterSelectLabels: {
          active: t("types.tabs.active"),
          inactive: t("types.tabs.inactive"),
        },
        headerClassName: "w-36",
        cellClassName: "w-36",
      },
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

export default function ExpenseTypesPage() {
  const { t } = useTranslation("expenses")
  const {
    expenseTypes,
    loading,
    addExpenseType,
    updateExpenseType,
    removeExpenseType,
    removeMany,
    setStatus,
    bulkCreate,
  } = useExpenseTypes()
  const [sidebar, setSidebar] = useState<SidebarState>(null)
  const [isMutating, setIsMutating] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const handleDelete = useCallback(
    async (row: ExpenseTypeRow) => {
      if (
        !(await confirmDeleteAction({
          itemName: row.name,
          entityLabel: t("entity.type"),
        }))
      ) {
        return
      }
      setDeletingId(String(row.id))
      try {
        await removeExpenseType(row.id)
        toast.success(t("types.toasts.removedNamed", { name: row.name }))
        if (sidebar?.mode === "edit" && sidebar.row.id === row.id) setSidebar(null)
      } catch (error) {
        toast.error(expenseTypeErrorMessage(error, t("types.toasts.saveFailed")))
      } finally {
        setDeletingId(null)
      }
    },
    [removeExpenseType, sidebar, t]
  )

  const handleSubmit = useCallback(
    async (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault()
      const fd = new FormData(e.currentTarget)
      const name = String(fd.get("name") ?? "").trim()
      if (!name) {
        toast.error(t("types.toasts.nameRequired"))
        return
      }
      try {
        if (sidebar?.mode === "add") {
          await addExpenseType(expenseTypeFromFormData(fd, EMPTY_EXPENSE_TYPE))
          toast.success(t("types.toasts.created"))
          setSidebar(null)
          return
        }
        if (sidebar?.mode === "edit") {
          await updateExpenseType(
            sidebar.row.id,
            expenseTypeFromFormData(fd, sidebar.row)
          )
          toast.success(t("types.toasts.saved"))
          setSidebar(null)
        }
      } catch (error) {
        toast.error(expenseTypeErrorMessage(error, t("types.toasts.saveFailed")))
      }
    },
    [sidebar, addExpenseType, updateExpenseType, t]
  )

  const handleImportRows = useCallback(
    async (imported: Record<string, string>[]) => {
      const payload = imported
        .map((row) => mapImportedExpenseTypeWrite(row))
        .filter((row): row is NonNullable<typeof row> => row != null)
        .slice(0, 100)
      if (payload.length === 0) return 0
      setIsMutating(true)
      try {
        const res = await bulkCreate(payload)
        const added = res.added ?? res.items?.length ?? 0
        const failed = imported.length - payload.length + (res.errors?.length ?? 0)
        reportImportFailure(
          added,
          failed,
          t("types.toasts.importPartial", { added, failed }),
          uniqueErrorMessages(res.errors)
        )
        return added
      } finally {
        setIsMutating(false)
      }
    },
    [bulkCreate, t]
  )

  const columns = useMemo(
    () =>
      getColumns(
        t,
        (row) => setSidebar({ mode: "edit", row }),
        (row) => void handleDelete(row)
      ),
    [t, handleDelete]
  )

  const tabs: DataTableTab[] = [
    { value: "all", label: t("types.tabs.all") },
    { value: "active", label: t("types.tabs.active") },
    { value: "inactive", label: t("types.tabs.inactive") },
  ]

  const formRow =
    sidebar?.mode === "edit" ? sidebar.row : EMPTY_EXPENSE_TYPE
  const formId =
    sidebar?.mode === "edit"
      ? `expense-type-edit-${sidebar.row.id}`
      : "expense-type-add-form"

  return (
    <>
      <Sheet
        open={sidebar !== null}
        onOpenChange={(open) => {
          if (!open) setSidebar(null)
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
                  {sidebar.mode === "add" ? t("types.add") : t("types.edit")}
                </SheetTitle>
                <SheetDescription>
                  {sidebar.mode === "add"
                    ? t("types.addDescription")
                    : sidebar.row.name}
                </SheetDescription>
              </SheetHeader>
              <form
                id={formId}
                className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-6 py-5 text-sm"
                onSubmit={handleSubmit}
              >
                <div className="flex flex-col gap-2">
                  <Label htmlFor={`${formId}-name`}>{t("types.form.name")}</Label>
                  <Input
                    id={`${formId}-name`}
                    name="name"
                    required
                    defaultValue={formRow.name}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor={`${formId}-description`}>
                    {t("types.form.description")}
                  </Label>
                  <Input
                    id={`${formId}-description`}
                    name="description"
                    defaultValue={formRow.description}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor={`${formId}-status`}>{t("types.form.status")}</Label>
                  <select
                    id={`${formId}-status`}
                    name="status"
                    defaultValue={formRow.status}
                    className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm shadow-xs"
                  >
                    {EXPENSE_TYPE_STATUS_OPTIONS.map((status) => (
                      <option key={status} value={status}>
                        {t(`types.tabs.${status}`)}
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
                <Button type="submit" form={formId}>
                  {sidebar.mode === "add" ? t("types.add") : t("types.save")}
                </Button>
              </SheetFooter>
            </>
          ) : null}
        </SheetContent>
      </Sheet>

      <DataTable
        data={expenseTypes}
        columns={columns}
        tableClassName="table-fixed"
        settingsKey="expense-types"
        addButtonLabel={t("types.add")}
        searchPlaceholder={t("types.search")}
        importSampleFilename="expense-types-sample.csv"
        importSampleCsvContent={buildSampleCsv(
          [...EXPENSE_TYPE_IMPORT_COLUMNS],
          EXPENSE_TYPE_IMPORT_SAMPLE_ROW
        )}
        importColumns={[...EXPENSE_TYPE_IMPORT_COLUMNS]}
        importSelectColumns={{ status: [...EXPENSE_TYPE_STATUS_OPTIONS] }}
        importRequiredSelectColumns={[]}
        exportFilename="expense-types-export.csv"
        onImportRows={handleImportRows}
        isLoading={loading || isMutating}
        pendingRowIds={deletingId ? [deletingId] : undefined}
        emptyTitle={t("types.emptyTitle")}
        emptyDescription={t("types.emptyDescription")}
        onAddClick={() => setSidebar({ mode: "add" })}
        bulkActions={[
          {
            id: "active",
            label: t("actions.setActive", { ns: "common" }),
            icon: <IconCircleCheck className="size-4" />,
            onClick: async (selected) => {
              const ids = selected.map((row) => row.apiId).filter(Boolean)
              const result = await setStatus(ids, "active")
              if (result.failed > 0) {
                toastFailure(
                  t("types.toasts.updatePartial", {
                    updated: result.updated,
                    failed: result.failed,
                  }),
                  result.message
                )
                return
              }
              toast.success(t("types.toasts.setActiveCount", { count: result.updated }))
            },
          },
          {
            id: "inactive",
            label: t("actions.setInactive", { ns: "common" }),
            icon: <IconBan className="size-4" />,
            onClick: async (selected) => {
              const ids = selected.map((row) => row.apiId).filter(Boolean)
              const result = await setStatus(ids, "inactive")
              if (result.failed > 0) {
                toastFailure(
                  t("types.toasts.updatePartial", {
                    updated: result.updated,
                    failed: result.failed,
                  }),
                  result.message
                )
                return
              }
              toast.success(
                t("types.toasts.setInactiveCount", { count: result.updated })
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
                  entityLabel: t("entity.type"),
                }))
              ) {
                return
              }
              const ids = selected.map((row) => row.apiId).filter(Boolean)
              setIsMutating(true)
              try {
                const result = await removeMany(ids)
                const failed = result.failed + (selected.length - ids.length)
                if (failed > 0) {
                  toastFailure(
                    t("types.toasts.deletePartial", {
                      deleted: result.deleted,
                      failed,
                    }),
                    result.message
                  )
                  return
                }
                toast.success(t("types.toasts.removedCount", { count: result.deleted }))
              } finally {
                setIsMutating(false)
              }
            },
          },
        ]}
        tabs={tabs}
        defaultTab="all"
        tabFilter={expenseTypeTabFilter}
      />
    </>
  )
}
