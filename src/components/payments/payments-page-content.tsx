"use client"

import { useCallback, useMemo, useState, type FormEvent } from "react"
import { ColumnDef } from "@tanstack/react-table"
import {
  IconCopy,
  IconDotsVertical,
  IconEye,
  IconFilter,
  IconPencil,
  IconTrash,
  IconX,
} from "@tabler/icons-react"
import { toast } from "sonner"
import { useTranslation } from "react-i18next"
import type { TFunction } from "i18next"

import { PaymentDetail } from "@/components/payments/payment-detail"
import { PaymentForm } from "@/components/payments/payment-form"
import { DataTableColumnHeader } from "@/components/data-table-column-header"
import { DataTable, type DataTableTab } from "@/components/data-table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
import { usePayments } from "@/context/payments-context"
import { useVendors } from "@/context/vendors-context"
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
  CUSTOMER_PAYMENT_IMPORT_SAMPLE_ROW,
  EMPTY_PAYMENT,
  PAYMENT_IMPORT_COLUMNS,
  PAYMENT_METHODS,
  PAYMENT_STATUSES,
  VENDOR_PAYMENT_IMPORT_SAMPLE_ROW,
  flattenPaymentForExport,
  formatDate,
  formatMoney,
  mapImportedPaymentWrite,
  paymentErrorMessage,
  paymentFromFormData,
  paymentStatusTabFilter,
  statusBadgeClass,
  type PaymentParty,
  type PaymentRow,
} from "@/lib/payments"

const statusTabValues = ["all", "pending", "completed", "voided"] as const

type PaymentSidebarState =
  | { mode: "view"; payment: PaymentRow }
  | { mode: "edit"; payment: PaymentRow }
  | { mode: "add" }
  | null

type PaymentsPageContentProps = {
  paymentType: PaymentRow["type"]
}

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

function selectColumn<T>(t: TFunction<"payments">): ColumnDef<T> {
  return {
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
  }
}

function srNoColumn<T>(t: TFunction<"payments">): ColumnDef<T> {
  return {
    id: "srNo",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title={t("columns.srNo")} />
    ),
    cell: ({ row, table }) => {
      const { pageIndex, pageSize } = table.getState().pagination
      const srNo = pageIndex * pageSize + row.index + 1
      return (
        <span className="text-muted-foreground font-mono tabular-nums">{srNo}</span>
      )
    },
    enableSorting: false,
    meta: { dataTableFilter: false },
  }
}

function getPaymentColumns(
  t: TFunction<"payments">,
  partyLabel: string,
  openPaymentSidebar: (row: PaymentRow, mode: "view" | "edit") => void,
  onDelete: (row: PaymentRow) => void,
  onDuplicate: (row: PaymentRow) => void
): ColumnDef<PaymentRow>[] {
  return [
    selectColumn<PaymentRow>(t),
    srNoColumn<PaymentRow>(t),
    {
      accessorKey: "paymentNumber",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("columns.paymentNumber")} />
      ),
      cell: ({ row }) => (
        <button
          type="button"
          className="text-foreground text-left font-medium hover:underline"
          onClick={() => openPaymentSidebar(row.original, "view")}
        >
          {row.original.paymentNumber}
        </button>
      ),
      enableHiding: false,
      meta: textFilterMeta(t("columns.paymentNumber")),
    },
    {
      accessorKey: "partyName",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={partyLabel} />
      ),
      cell: ({ row }) => (
        <span className="text-foreground max-w-[12rem] truncate font-medium">
          {row.original.partyName}
        </span>
      ),
      meta: textFilterMeta(partyLabel),
    },
    {
      accessorKey: "referenceNumber",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("columns.reference")} />
      ),
      cell: ({ row }) => (
        <span className="text-muted-foreground tabular-nums text-xs">
          {row.original.referenceNumber}
        </span>
      ),
      meta: textFilterMeta(t("columns.reference")),
    },
    {
      accessorKey: "paymentDate",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("columns.date")} />
      ),
      cell: ({ row }) => (
        <span className="text-muted-foreground tabular-nums text-xs">
          {formatDate(row.original.paymentDate)}
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
        Object.fromEntries(PAYMENT_METHODS.map((method) => [method, method]))
      ),
    },
    {
      accessorKey: "status",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("columns.status")} />
      ),
      cell: ({ row }) => (
        <Badge variant="outline" className={statusBadgeClass(row.original.status)}>
          {t(`status.${row.original.status}`, { ns: "common" })}
        </Badge>
      ),
      meta: selectFilterMeta(t("columns.status"), {
        pending: t("status.pending", { ns: "common" }),
        completed: t("status.completed", { ns: "common" }),
        voided: t("status.voided", { ns: "common" }),
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
            <DropdownMenuItem onClick={() => openPaymentSidebar(row.original, "view")}>
              <IconEye />
              {t("actions.view")}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => openPaymentSidebar(row.original, "edit")}>
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

export function PaymentsPageContent({ paymentType }: PaymentsPageContentProps) {
  const { t } = useTranslation("payments")
  const { settings: numberSettings } = useDocumentNumberSettings()
  const isCustomer = paymentType === "customer"
  const numberKey = isCustomer ? "customerPayments" : "vendorPayments"
  const partyLabel = isCustomer ? t("columns.customer") : t("columns.vendor")
  const addButtonLabel = isCustomer ? t("receive") : t("make")
  const searchPlaceholder = isCustomer
    ? t("searchCustomer")
    : t("searchVendor")
  const exportFilename = isCustomer
    ? "customer-payments-export.csv"
    : "vendor-payments-export.csv"
  const importSampleFilename = isCustomer
    ? "customer-payments-sample.csv"
    : "vendor-payments-sample.csv"

  const {
    addPayment,
    updatePayment,
    removePayment,
    duplicatePayment,
    removeMany,
    bulkCreate,
    payments,
  } = usePayments()
  const { customers } = useCustomers()
  const { vendors } = useVendors()
  const [sidebar, setSidebar] = useState<PaymentSidebarState>(null)
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [methodFilter, setMethodFilter] = useState("all")
  const [partyFilter, setPartyFilter] = useState("all")

  const typePayments = useMemo(
    () => payments.filter((row) => row.type === paymentType),
    [payments, paymentType]
  )
  const parties = useMemo(
    () =>
      [...new Set(typePayments.map((row) => row.partyName))]
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b)),
    [typePayments]
  )
  const importParties = useMemo<PaymentParty[]>(
    () =>
      (isCustomer ? customers : vendors)
        .map((party) => ({ name: party.name, apiId: party.apiId }))
        .filter((party) => party.apiId),
    [customers, vendors, isCustomer]
  )
  const filteredPayments = useMemo(
    () =>
      typePayments.filter((row) => {
        if (dateFrom && row.paymentDate < dateFrom) return false
        if (dateTo && row.paymentDate > dateTo) return false
        if (methodFilter !== "all" && row.paymentMethod !== methodFilter) {
          return false
        }
        if (partyFilter !== "all" && row.partyName !== partyFilter) return false
        return true
      }),
    [typePayments, dateFrom, dateTo, methodFilter, partyFilter]
  )
  const activeFilterCount =
    Number(Boolean(dateFrom)) +
    Number(Boolean(dateTo)) +
    Number(methodFilter !== "all") +
    Number(partyFilter !== "all")

  const importSampleCsv = useMemo(
    () =>
      buildSampleCsv(
        [...PAYMENT_IMPORT_COLUMNS],
        isCustomer
          ? CUSTOMER_PAYMENT_IMPORT_SAMPLE_ROW
          : VENDOR_PAYMENT_IMPORT_SAMPLE_ROW
      ),
    [isCustomer]
  )

  const closeSidebar = () => setSidebar(null)

  const handleDelete = useCallback(
    async (payment: PaymentRow) => {
      if (
        !(await confirmDeleteAction({
          itemName: payment.paymentNumber,
          entityLabel: t("entity.payment"),
        }))
      ) {
        return
      }
      try {
        await removePayment(payment.id)
        if (sidebar?.mode !== "add" && sidebar?.payment.id === payment.id) {
          closeSidebar()
        }
        toast.success(t("toasts.removedNamed", { name: payment.paymentNumber }))
      } catch (error) {
        toast.error(paymentErrorMessage(error, t("toasts.saveFailed")))
      }
    },
    [removePayment, sidebar, t]
  )

  const handleDuplicate = useCallback(
    async (payment: PaymentRow) => {
      if (
        !(await confirmDuplicateAction({
          itemName: payment.paymentNumber,
          entityLabel: t("entity.payment"),
        }))
      ) {
        return
      }
      try {
        const copy = await duplicatePayment(payment.id)
        if (copy) {
          toast.success(t("toasts.duplicatedNamed", { name: copy.paymentNumber }))
        }
      } catch (error) {
        toast.error(paymentErrorMessage(error, t("toasts.saveFailed")))
      }
    },
    [duplicatePayment, t]
  )

  const handleSubmit = useCallback(
    async (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault()
      const fd = new FormData(e.currentTarget)
      const partyName = String(fd.get("partyName") ?? "").trim()
      const partyId = String(fd.get("partyId") ?? "").trim()
      if (!partyName || !partyId) {
        toast.error(isCustomer ? t("toasts.selectCustomer") : t("toasts.selectVendor"))
        return
      }

      const amount = Number(String(fd.get("amount") ?? "0"))
      if (!Number.isFinite(amount) || amount <= 0) {
        toast.error(t("toasts.invalidAmount"))
        return
      }

      fd.set("type", paymentType)
      const isNew = sidebar?.mode === "add"
      const base = isNew
        ? { ...EMPTY_PAYMENT, type: paymentType }
        : sidebar?.payment ?? { ...EMPTY_PAYMENT, type: paymentType }
      const draft = paymentFromFormData(fd, base)
      const paymentNumber = resolveDocumentNumber({
        settings: numberSettings[numberKey],
        fallbackPrefix: DEFAULT_DOCUMENT_NUMBER_SETTINGS[numberKey].prefix,
        existing: typePayments.map((row) => row.paymentNumber),
        value: draft.paymentNumber,
        isNew: Boolean(isNew),
      })
      if (isNew && numberSettings[numberKey].mode === "custom" && !paymentNumber) {
        toast.error(t("toasts.numberRequired"))
        return
      }

      try {
        if (isNew) {
          await addPayment({ ...draft, paymentNumber })
          toast.success(isCustomer ? t("toasts.received") : t("toasts.recorded"))
          closeSidebar()
          return
        }

        if (sidebar?.mode === "edit" && sidebar.payment) {
          await updatePayment(sidebar.payment.id, {
            ...draft,
            paymentNumber: paymentNumber || sidebar.payment.paymentNumber,
          })
          toast.success(t("toasts.saved"))
          closeSidebar()
        }
      } catch (error) {
        toast.error(paymentErrorMessage(error, t("toasts.saveFailed")))
      }
    },
    [
      sidebar,
      addPayment,
      updatePayment,
      isCustomer,
      paymentType,
      numberKey,
      numberSettings,
      typePayments,
      t,
    ]
  )

  const columns = useMemo(
    () =>
      getPaymentColumns(
        t,
        partyLabel,
        (row, mode) => setSidebar({ payment: row, mode }),
        handleDelete,
        handleDuplicate
      ),
    [t, partyLabel, handleDelete, handleDuplicate]
  )

  const statusTabs: DataTableTab[] = statusTabValues.map((value) => ({
    value,
    label: t(`tabs.${value}`),
  }))

  const sheetPayment = sidebar && sidebar.mode !== "add" ? sidebar.payment : null
  const formPayment =
    sidebar?.mode === "add"
      ? { ...EMPTY_PAYMENT, type: paymentType }
      : sheetPayment ?? { ...EMPTY_PAYMENT, type: paymentType }
  const formId =
    sidebar?.mode === "add"
      ? `${paymentType}-payment-add-form`
      : sheetPayment
        ? `${paymentType}-payment-edit-${sheetPayment.id}`
        : `${paymentType}-payment-edit`

  const handleImportRows = useCallback(
    async (rows: Record<string, string>[]) => {
      const payload = rows
        .map((row) =>
          mapImportedPaymentWrite({ ...row, type: paymentType }, paymentType, importParties)
        )
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
        toast.error(paymentErrorMessage(error, t("toasts.saveFailed")))
        return 0
      }
    },
    [paymentType, importParties, bulkCreate, t]
  )

  const handleBulkDelete = useCallback(
    async (selected: PaymentRow[]) => {
      if (
        !(await confirmDeleteAction({
          count: selected.length,
          entityLabel: t("entity.payment"),
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
        toast.error(paymentErrorMessage(error, t("toasts.saveFailed")))
      }
    },
    [removeMany, t]
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
          className={`flex w-full flex-col gap-0 overflow-hidden p-0 ${
            sidebar?.mode === "view" ? "sm:max-w-lg" : "sm:max-w-md"
          }`}
        >
          {sidebar ? (
            <>
              <SheetHeader className="border-border/60 space-y-1 border-b px-6 py-5 text-left">
                <SheetTitle className="text-lg leading-tight">
                  {sidebar.mode === "add"
                    ? addButtonLabel
                    : sidebar.mode === "edit"
                      ? t("sheet.edit")
                      : sheetPayment?.paymentNumber}
                </SheetTitle>
                <SheetDescription>
                  {sidebar.mode === "add" ? (
                    isCustomer
                      ? t("sheet.addCustomerDescription")
                      : t("sheet.addVendorDescription")
                  ) : sidebar.mode === "edit" && sheetPayment ? (
                    <>
                      {sheetPayment.partyName}
                      <span className="text-muted-foreground">
                        {" "}
                        · {formatDate(sheetPayment.paymentDate)}
                      </span>
                    </>
                  ) : sheetPayment ? (
                    <>
                      {sheetPayment.partyName}
                      <span className="text-muted-foreground">
                        {" "}
                        · {formatDate(sheetPayment.paymentDate)}
                      </span>
                    </>
                  ) : null}
                </SheetDescription>
              </SheetHeader>
              <div
                key={
                  sidebar.mode === "add"
                    ? `${paymentType}-add`
                    : `${sheetPayment?.id}-${sidebar.mode}`
                }
                className="min-h-0 flex-1 overflow-y-auto px-6 py-5"
              >
                {sidebar.mode === "view" && sheetPayment ? (
                  <PaymentDetail payment={sheetPayment} />
                ) : sidebar.mode === "edit" || sidebar.mode === "add" ? (
                  <PaymentForm
                    formId={formId}
                    payment={formPayment}
                    isNew={sidebar.mode === "add"}
                    onSubmit={handleSubmit}
                    lockType={paymentType}
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
                        sheetPayment &&
                        setSidebar({ mode: "edit", payment: sheetPayment })
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
                      {sidebar.mode === "add" ? addButtonLabel : t("sheet.save")}
                    </Button>
                  </>
                )}
              </SheetFooter>
            </>
          ) : null}
        </SheetContent>
      </Sheet>

      <div className="mb-5 rounded-xl border border-border/60 bg-card p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <IconFilter className="text-muted-foreground size-4" />
            <div>
              <p className="text-sm font-semibold">{t("filters.title")}</p>
              <p className="text-muted-foreground text-xs">
                {isCustomer
                  ? t("filters.descriptionCustomer")
                  : t("filters.descriptionVendor")}
              </p>
            </div>
          </div>
          {activeFilterCount > 0 ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setDateFrom("")
                setDateTo("")
                setMethodFilter("all")
                setPartyFilter("all")
              }}
            >
              <IconX className="size-4" />
              {t("filters.clear", { count: activeFilterCount })}
            </Button>
          ) : null}
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="space-y-1.5">
            <Label htmlFor={`${paymentType}-payment-from`} className="text-xs">
              {t("filters.fromDate")}
            </Label>
            <Input
              id={`${paymentType}-payment-from`}
              type="date"
              value={dateFrom}
              max={dateTo || undefined}
              onChange={(event) => setDateFrom(event.target.value)}
              className="h-9"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`${paymentType}-payment-to`} className="text-xs">
              {t("filters.toDate")}
            </Label>
            <Input
              id={`${paymentType}-payment-to`}
              type="date"
              value={dateTo}
              min={dateFrom || undefined}
              onChange={(event) => setDateTo(event.target.value)}
              className="h-9"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`${paymentType}-payment-method`} className="text-xs">
              {t("filters.method")}
            </Label>
            <select
              id={`${paymentType}-payment-method`}
              value={methodFilter}
              onChange={(event) => setMethodFilter(event.target.value)}
              className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm shadow-xs"
            >
              <option value="all">{t("filters.allMethods")}</option>
              {PAYMENT_METHODS.map((method) => (
                <option key={method} value={method}>
                  {method}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`${paymentType}-payment-party`} className="text-xs">
              {partyLabel}
            </Label>
            <select
              id={`${paymentType}-payment-party`}
              value={partyFilter}
              onChange={(event) => setPartyFilter(event.target.value)}
              className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm shadow-xs"
            >
              <option value="all">
                {isCustomer ? t("filters.allCustomers") : t("filters.allVendors")}
              </option>
              {parties.map((party) => (
                <option key={party} value={party}>
                  {party}
                </option>
              ))}
            </select>
          </div>
        </div>

        <p className="text-muted-foreground mt-3 text-xs">
          {t("filters.showing", {
            filtered: filteredPayments.length,
            total: typePayments.length,
          })}
        </p>
      </div>

      <DataTable
        data={filteredPayments}
        columns={columns}
        settingsKey={isCustomer ? "customer-payments" : "vendor-payments"}
        addButtonLabel={addButtonLabel}
        searchPlaceholder={searchPlaceholder}
        importSampleFilename={importSampleFilename}
        importSampleCsvContent={importSampleCsv}
        importColumns={[...PAYMENT_IMPORT_COLUMNS]}
        importSelectColumns={{
          status: [...PAYMENT_STATUSES],
          paymentMethod: [...PAYMENT_METHODS],
        }}
        importRequiredSelectColumns={[]}
        exportFilename={exportFilename}
        exportRowTransform={flattenPaymentForExport}
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
        tabFilter={paymentStatusTabFilter}
      />
    </>
  )
}
