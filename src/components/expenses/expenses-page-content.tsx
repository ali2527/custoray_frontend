"use client"

import { useCallback, useMemo, useState, type FormEvent } from "react"
import { ColumnDef } from "@tanstack/react-table"
import {
  IconCopy,
  IconDotsVertical,
  IconEye,
  IconPencil,
  IconTrash,
} from "@tabler/icons-react"
import { toast } from "sonner"
import { useTranslation } from "react-i18next"
import type { TFunction } from "i18next"

import { ExpenseDetail } from "@/components/expenses/expense-detail"
import { ExpenseForm } from "@/components/expenses/expense-form"
import { DataTableColumnHeader } from "@/components/data-table-column-header"
import { DataTable, type DataTableTab } from "@/components/data-table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
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
import { useExpenses } from "@/context/expenses-context"
import { useDocumentNumberSettings } from "@/hooks/use-document-number-settings"
import {
  confirmDeleteAction,
  confirmDuplicateAction,
} from "@/lib/confirm-action"
import { buildSampleCsv } from "@/lib/csv"
import {
  DEFAULT_DOCUMENT_NUMBER_SETTINGS,
  resolveDocumentNumber,
} from "@/lib/document-number-settings"
import {
  EMPTY_EXPENSE,
  EXPENSE_IMPORT_COLUMNS,
  EXPENSE_IMPORT_SAMPLE_ROW,
  EXPENSE_METHODS,
  EXPENSE_STATUSES,
  expenseErrorMessage,
  expenseFromFormData,
  expenseStatusTabFilter,
  flattenExpenseForExport,
  formatDate,
  formatMoney,
  mapImportedExpenseWrite,
  statusBadgeClass,
  toExpenseTypeRefs,
  type ExpenseRow,
} from "@/lib/expenses"

const statusTabValues = ["all", "pending", "paid", "voided"] as const

type ExpenseSidebarState =
  | { mode: "view"; expense: ExpenseRow }
  | { mode: "edit"; expense: ExpenseRow }
  | { mode: "add" }
  | null

function textFilterMeta(label: string) {
  return { dataTableFilterVariant: "text" as const, dataTableFilterLabel: label }
}

function rangeFilterMeta(label: string) {
  return { dataTableFilterVariant: "range" as const, dataTableFilterLabel: label }
}

function selectFilterMeta(
  label: string,
  selectLabels: Record<string, string>
) {
  return {
    dataTableFilterVariant: "select" as const,
    dataTableFilterLabel: label,
    dataTableFilterSelectLabels: selectLabels,
  }
}

function getExpenseColumns(
  t: TFunction<"expenses">,
  openSidebar: (row: ExpenseRow, mode: "view" | "edit") => void,
  onDelete: (row: ExpenseRow) => void,
  onDuplicate: (row: ExpenseRow) => void
): ColumnDef<ExpenseRow>[] {
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
        <DataTableColumnHeader column={column} title={t("columns.srNo")} />
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
      accessorKey: "expenseNumber",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("columns.expenseNumber")} />
      ),
      cell: ({ row }) => (
        <button
          type="button"
          className="text-foreground text-left font-medium hover:underline"
          onClick={() => openSidebar(row.original, "view")}
        >
          {row.original.expenseNumber}
        </button>
      ),
      enableHiding: false,
      meta: textFilterMeta(t("columns.expenseNumber")),
    },
    {
      accessorKey: "typeName",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("columns.type")} />
      ),
      cell: ({ row }) => (
        <span className="text-foreground max-w-[10rem] truncate font-medium">
          {row.original.typeName}
        </span>
      ),
      meta: textFilterMeta(t("columns.type")),
    },
    {
      accessorKey: "expenseDate",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("columns.date")} />
      ),
      cell: ({ row }) => (
        <span className="text-muted-foreground tabular-nums text-xs">
          {formatDate(row.original.expenseDate)}
        </span>
      ),
      meta: textFilterMeta(t("columns.date")),
    },
    {
      accessorKey: "amount",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("columns.amount")} align="center" />
      ),
      cell: ({ row }) => (
        <div className="flex justify-center">
          <span className="text-foreground tabular-nums">
            {formatMoney(row.original.amount)}
          </span>
        </div>
      ),
      meta: rangeFilterMeta(t("columns.amount")),
    },
    {
      accessorKey: "paymentMethod",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("columns.method")} />
      ),
      cell: ({ row }) => (
        <span className="text-muted-foreground text-xs">{row.original.paymentMethod}</span>
      ),
      meta: selectFilterMeta(
        t("columns.method"),
        Object.fromEntries(EXPENSE_METHODS.map((method) => [method, method]))
      ),
    },
    {
      accessorKey: "status",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("columns.status")} />
      ),
      cell: ({ row }) => (
        <Badge variant="outline" className={statusBadgeClass(row.original.status)}>
          {t(`tabs.${row.original.status}`)}
        </Badge>
      ),
      meta: selectFilterMeta(t("columns.status"), {
        pending: t("tabs.pending"),
        paid: t("tabs.paid"),
        voided: t("tabs.voided"),
      }),
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

export function ExpensesPageContent() {
  const { t } = useTranslation("expenses")
  const {
    expenses,
    loading,
    addExpense,
    updateExpense,
    removeExpense,
    duplicateExpense,
    removeMany,
    bulkCreate,
  } = useExpenses()
  const { expenseTypes } = useExpenseTypes()
  const { settings: numberSettings } = useDocumentNumberSettings()
  const [sidebar, setSidebar] = useState<ExpenseSidebarState>(null)
  const importTypes = useMemo(() => toExpenseTypeRefs(expenseTypes), [expenseTypes])

  const closeSidebar = () => setSidebar(null)

  const expenseImportColumns = useMemo(() => {
    if (numberSettings.expenses.mode === "custom") {
      return [...EXPENSE_IMPORT_COLUMNS]
    }
    return EXPENSE_IMPORT_COLUMNS.filter((col) => col !== "expenseNumber")
  }, [numberSettings.expenses.mode])

  const handleDelete = useCallback(
    async (expense: ExpenseRow) => {
      if (
        !(await confirmDeleteAction({
          itemName: expense.expenseNumber,
          entityLabel: t("entity.expense"),
        }))
      ) {
        return
      }
      try {
        await removeExpense(expense.id)
        if (sidebar?.mode !== "add" && sidebar?.expense.id === expense.id) {
          closeSidebar()
        }
        toast.success(t("toasts.removedNamed", { name: expense.expenseNumber }))
      } catch (error) {
        toast.error(expenseErrorMessage(error, t("toasts.saveFailed")))
      }
    },
    [removeExpense, sidebar, t]
  )

  const handleDuplicate = useCallback(
    async (expense: ExpenseRow) => {
      if (
        !(await confirmDuplicateAction({
          itemName: expense.expenseNumber,
          entityLabel: t("entity.expense"),
        }))
      ) {
        return
      }
      try {
        const copy = await duplicateExpense(expense.id)
        if (copy) {
          toast.success(t("toasts.duplicatedNamed", { name: copy.expenseNumber }))
        }
      } catch (error) {
        toast.error(expenseErrorMessage(error, t("toasts.saveFailed")))
      }
    },
    [duplicateExpense, t]
  )

  const handleSubmit = useCallback(
    async (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault()
      const fd = new FormData(e.currentTarget)
      const typeId = String(fd.get("typeId") ?? "").trim()
      if (!typeId) {
        toast.error(t("toasts.selectType"))
        return
      }
      const amount = Number(String(fd.get("amount") ?? "0"))
      if (!Number.isFinite(amount) || amount <= 0) {
        toast.error(t("toasts.invalidAmount"))
        return
      }

      const isNew = sidebar?.mode === "add"
      const base = isNew ? EMPTY_EXPENSE : sidebar?.expense ?? EMPTY_EXPENSE
      const draft = expenseFromFormData(fd, base)
      const expenseNumber = resolveDocumentNumber({
        settings: numberSettings.expenses,
        fallbackPrefix: DEFAULT_DOCUMENT_NUMBER_SETTINGS.expenses.prefix,
        existing: expenses.map((row) => row.expenseNumber),
        value: draft.expenseNumber,
        isNew: Boolean(isNew),
      })
      if (isNew && numberSettings.expenses.mode === "custom" && !expenseNumber) {
        toast.error(t("toasts.numberRequired"))
        return
      }

      try {
        if (isNew) {
          await addExpense({ ...draft, expenseNumber })
          toast.success(t("toasts.created"))
          closeSidebar()
          return
        }
        if (sidebar?.mode === "edit" && sidebar.expense) {
          await updateExpense(sidebar.expense.id, {
            ...draft,
            expenseNumber: expenseNumber || sidebar.expense.expenseNumber,
          })
          toast.success(t("toasts.saved"))
          closeSidebar()
        }
      } catch (error) {
        toast.error(expenseErrorMessage(error, t("toasts.saveFailed")))
      }
    },
    [sidebar, addExpense, updateExpense, expenses, numberSettings.expenses, t]
  )

  const handleImportRows = useCallback(
    async (rows: Record<string, string>[]) => {
      const payload = rows
        .map((row, index) => {
          const write = mapImportedExpenseWrite(row, importTypes)
          if (!write) return null
          if (numberSettings.expenses.mode === "auto") {
            const existing = [
              ...expenses.map((item) => item.expenseNumber),
              ...rows.slice(0, index).map((item) => item.expenseNumber ?? ""),
            ]
            write.expenseNumber = resolveDocumentNumber({
              settings: numberSettings.expenses,
              fallbackPrefix: DEFAULT_DOCUMENT_NUMBER_SETTINGS.expenses.prefix,
              existing,
              value: "",
              isNew: true,
            })
          } else if (!write.expenseNumber?.trim()) {
            return null
          }
          return write
        })
        .filter((row): row is NonNullable<typeof row> => row != null)
        .slice(0, 100)
      if (payload.length === 0) return 0
      try {
        const res = await bulkCreate(payload)
        const added = res.added ?? res.items?.length ?? 0
        const failed = rows.length - payload.length + (res.errors?.length ?? 0)
        if (failed > 0) {
          toast.error(t("toasts.importPartial", { added, failed }))
        }
        return added
      } catch (error) {
        toast.error(expenseErrorMessage(error, t("toasts.saveFailed")))
        return 0
      }
    },
    [importTypes, bulkCreate, expenses, numberSettings.expenses, t]
  )

  const handleBulkDelete = useCallback(
    async (selected: ExpenseRow[]) => {
      if (
        !(await confirmDeleteAction({
          count: selected.length,
          entityLabel: t("entity.expense"),
        }))
      ) {
        return
      }
      const ids = selected.map((row) => row.apiId).filter(Boolean)
      if (ids.length === 0) return
      try {
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
        toast.success(t("toasts.removedCount", { count: result.deleted }))
      } catch (error) {
        toast.error(expenseErrorMessage(error, t("toasts.saveFailed")))
      }
    },
    [removeMany, t]
  )

  const columns = useMemo(
    () =>
      getExpenseColumns(
        t,
        (row, mode) => setSidebar({ expense: row, mode }),
        handleDelete,
        handleDuplicate
      ),
    [t, handleDelete, handleDuplicate]
  )

  const statusTabs: DataTableTab[] = statusTabValues.map((value) => ({
    value,
    label: t(`tabs.${value}`),
  }))

  const sheetExpense = sidebar && sidebar.mode !== "add" ? sidebar.expense : null
  const formExpense =
    sidebar?.mode === "add" ? EMPTY_EXPENSE : sheetExpense ?? EMPTY_EXPENSE
  const formId =
    sidebar?.mode === "add"
      ? "expense-add-form"
      : sheetExpense
        ? `expense-edit-${sheetExpense.id}`
        : "expense-edit"

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
            sidebar?.mode === "view" ? "sm:max-w-lg" : "sm:max-w-md"
          }`}
        >
          {sidebar ? (
            <>
              <SheetHeader className="border-border/60 space-y-1 border-b px-6 py-5 text-left">
                <SheetTitle className="text-lg leading-tight">
                  {sidebar.mode === "add"
                    ? t("add")
                    : sidebar.mode === "edit"
                      ? t("sheet.edit")
                      : sheetExpense?.expenseNumber}
                </SheetTitle>
                <SheetDescription>
                  {sidebar.mode === "add" ? (
                    t("sheet.addDescription")
                  ) : sheetExpense ? (
                    <>
                      {sheetExpense.typeName}
                      <span className="text-muted-foreground">
                        {" "}
                        · {formatDate(sheetExpense.expenseDate)}
                      </span>
                    </>
                  ) : null}
                </SheetDescription>
              </SheetHeader>
              <div
                key={
                  sidebar.mode === "add"
                    ? "expense-add"
                    : `${sheetExpense?.id}-${sidebar.mode}`
                }
                className="min-h-0 flex-1 overflow-y-auto px-6 py-5"
              >
                {sidebar.mode === "view" && sheetExpense ? (
                  <ExpenseDetail expense={sheetExpense} />
                ) : sidebar.mode === "edit" || sidebar.mode === "add" ? (
                  <ExpenseForm
                    formId={formId}
                    expense={formExpense}
                    isNew={sidebar.mode === "add"}
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
                        sheetExpense &&
                        setSidebar({ mode: "edit", expense: sheetExpense })
                      }
                    >
                      {t("actions.edit")}
                    </Button>
                    <SheetClose asChild>
                      <Button className="w-full sm:w-auto">
                        {t("actions.close", { ns: "common" })}
                      </Button>
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
                      {sidebar.mode === "add" ? t("add") : t("sheet.save")}
                    </Button>
                  </>
                )}
              </SheetFooter>
            </>
          ) : null}
        </SheetContent>
      </Sheet>

      <DataTable
        data={expenses}
        columns={columns}
        settingsKey="expenses"
        addButtonLabel={t("add")}
        searchPlaceholder={t("search")}
        importSampleFilename="expenses-sample.csv"
        importSampleCsvContent={buildSampleCsv(
          expenseImportColumns,
          Object.fromEntries(
            expenseImportColumns.map((col) => [
              col,
              EXPENSE_IMPORT_SAMPLE_ROW[col as keyof typeof EXPENSE_IMPORT_SAMPLE_ROW] ?? "",
            ])
          )
        )}
        importColumns={expenseImportColumns}
        importSelectColumns={{
          status: [...EXPENSE_STATUSES],
          paymentMethod: [...EXPENSE_METHODS],
        }}
        importRequiredSelectColumns={[]}
        exportFilename="expenses-export.csv"
        exportRowTransform={flattenExpenseForExport}
        onImportRows={handleImportRows}
        onAddClick={() => setSidebar({ mode: "add" })}
        bulkActions={[
          {
            id: "delete",
            label: t("actions.deleteSelected"),
            icon: <IconTrash className="size-4" />,
            variant: "destructive",
            onClick: (selected) => {
              void handleBulkDelete(selected)
            },
          },
        ]}
        tabs={statusTabs}
        defaultTab="all"
        tabFilter={expenseStatusTabFilter}
      />
    </>
  )
}
