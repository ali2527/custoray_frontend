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
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { PageLoader } from "@/components/ui/page-loader"
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
      meta: { dataTableFilter: false },
    },
    {
      accessorKey: "name",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("types.columns.name")} />
      ),
      cell: ({ row }) => (
        <button
          type="button"
          className="text-foreground font-medium hover:underline"
          onClick={() => onEdit(row.original)}
        >
          {row.original.name}
        </button>
      ),
      enableHiding: false,
    },
    {
      accessorKey: "description",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("types.columns.description")} />
      ),
      cell: ({ row }) => (
        <span className="text-muted-foreground max-w-[16rem] truncate">
          {row.original.description || "—"}
        </span>
      ),
    },
    {
      accessorKey: "expensesCount",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("types.columns.expenses")} />
      ),
      cell: ({ row }) => (
        <span className="tabular-nums">{row.original.expensesCount ?? 0}</span>
      ),
      meta: { dataTableFilterVariant: "range" as const },
    },
    {
      accessorKey: "status",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("types.columns.status")} />
      ),
      cell: ({ row }) => (
        <Badge
          variant="outline"
          className={
            row.original.status === "active"
              ? "border-emerald-500/30 px-1.5 text-emerald-700 dark:text-emerald-400"
              : "border-amber-500/30 px-1.5 text-amber-700 dark:text-amber-400"
          }
        >
          {t(`types.tabs.${row.original.status}`)}
        </Badge>
      ),
      meta: {
        dataTableFilterVariant: "select" as const,
        dataTableFilterSelectLabels: {
          active: t("types.tabs.active"),
          inactive: t("types.tabs.inactive"),
        },
      },
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
      try {
        await removeExpenseType(row.id)
        toast.success(t("types.toasts.removedNamed", { name: row.name }))
        if (sidebar?.mode === "edit" && sidebar.row.id === row.id) setSidebar(null)
      } catch (error) {
        toast.error(expenseTypeErrorMessage(error, t("types.toasts.saveFailed")))
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
      const res = await bulkCreate(payload)
      const added = res.added ?? res.items?.length ?? 0
      const failed = imported.length - payload.length + (res.errors?.length ?? 0)
      if (failed > 0) {
        toast.error(t("types.toasts.importPartial", { added, failed }))
      }
      return added
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

  if (loading) return <PageLoader />

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
                toast.error(
                  t("types.toasts.importPartial", {
                    added: result.updated,
                    failed: result.failed,
                  })
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
                toast.error(
                  t("types.toasts.importPartial", {
                    added: result.updated,
                    failed: result.failed,
                  })
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
              const result = await removeMany(ids)
              if (result.failed > 0) {
                toast.error(
                  t("types.toasts.importPartial", {
                    added: result.deleted,
                    failed: result.failed,
                  })
                )
                return
              }
              toast.success(t("types.toasts.removedCount", { count: result.deleted }))
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
