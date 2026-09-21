"use client"

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react"

import { CustomerQuickAddSheet } from "@/components/customers/customer-quick-add-sheet"
import { VendorQuickAddSheet } from "@/components/vendors/vendor-quick-add-sheet"
import { InfiniteScrollSelect } from "@/components/ui/infinite-scroll-select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useCustomers } from "@/context/customers-context"
import { useVendors } from "@/context/vendors-context"
import type { CustomerRow } from "@/lib/customers"
import type { VendorRow } from "@/lib/vendors"
import {
  PAYMENT_METHODS,
  findPartyBySelectValue,
  partySelectValue,
  type PaymentRow,
} from "@/lib/payments"
import { useTranslation } from "react-i18next"

type PaymentFormProps = {
  formId: string
  payment: PaymentRow
  onSubmit: (e: FormEvent<HTMLFormElement>) => void
  lockType?: PaymentRow["type"]
}

function resolvePartySelectValue(
  parties: { id: number; apiId?: string; name: string }[],
  payment: PaymentRow
) {
  if (payment.partyId) {
    const byId = findPartyBySelectValue(parties, payment.partyId)
    if (byId) return partySelectValue(byId)
  }
  const normalized = payment.partyName.trim()
  if (!normalized) return ""
  const match = parties.find((party) => party.name === normalized)
  return match ? partySelectValue(match) : ""
}

export function PaymentForm({
  formId,
  payment,
  onSubmit,
  lockType,
}: PaymentFormProps) {
  const { t } = useTranslation("payments")
  const { customers } = useCustomers()
  const { vendors } = useVendors()

  const initialType = lockType ?? payment.type
  const [type, setType] = useState<PaymentRow["type"]>(initialType)
  const parties = type === "customer" ? customers : vendors
  const [partyId, setPartyId] = useState(() =>
    resolvePartySelectValue(parties, payment)
  )
  const [quickAdd, setQuickAdd] = useState<"customer" | "vendor" | null>(null)

  const customerQuickAddFormId = `${formId}-customer-quick-add`
  const vendorQuickAddFormId = `${formId}-vendor-quick-add`

  const handleCustomerCreated = useCallback((created: CustomerRow) => {
    setPartyId(partySelectValue(created))
    setQuickAdd(null)
  }, [])

  const handleVendorCreated = useCallback((created: VendorRow) => {
    setPartyId(partySelectValue(created))
    setQuickAdd(null)
  }, [])

  useEffect(() => {
    if (lockType) setType(lockType)
  }, [lockType])

  useEffect(() => {
    const nextParties = type === "customer" ? customers : vendors
    setPartyId(resolvePartySelectValue(nextParties, payment))
  }, [type, customers, vendors, payment.partyId, payment.partyName, payment.id])

  const partyOptions = useMemo(
    () =>
      parties.map((party) => ({
        value: partySelectValue(party),
        label: party.name,
        description: party.description !== "—" ? party.description : party.phone,
      })),
    [parties]
  )

  const partyName = useMemo(() => {
    if (!partyId) return payment.partyName
    const party = findPartyBySelectValue(parties, partyId)
    return party?.name ?? payment.partyName
  }, [partyId, parties, payment.partyName])

  const resolvedPartyId = useMemo(() => {
    const party = findPartyBySelectValue(parties, partyId)
    return party?.apiId?.trim() || payment.partyId || ""
  }, [parties, partyId, payment.partyId])

  const referenceLabel =
    type === "customer" ? t("form.invoiceReference") : t("form.purchaseReference")

  return (
    <>
    <form id={formId} className="flex flex-col gap-4 text-sm" onSubmit={onSubmit}>
      <input type="hidden" name="type" value={type} />
      <input type="hidden" name="partyName" value={partyName} />
      <input type="hidden" name="partyId" value={resolvedPartyId} />

      {!lockType ? (
        <div className="flex flex-col gap-2">
          <Label htmlFor={`${formId}-type`}>{t("form.type")}</Label>
          <select
            id={`${formId}-type`}
            value={type}
            onChange={(e) => {
              setType(e.target.value as PaymentRow["type"])
              setPartyId("")
            }}
            className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm shadow-xs outline-none focus-visible:ring-ring/50 focus-visible:ring-[3px]"
          >
            <option value="customer">{t("form.customerPayment")}</option>
            <option value="vendor">{t("form.vendorPayment")}</option>
          </select>
        </div>
      ) : null}

      <div className="flex flex-col gap-2">
        <Label>{type === "customer" ? t("columns.customer") : t("columns.vendor")}</Label>
        <InfiniteScrollSelect
          id={`${formId}-party`}
          value={partyId}
          onValueChange={setPartyId}
          options={partyOptions}
          placeholder={
            type === "customer" ? t("form.selectCustomer") : t("form.selectVendor")
          }
          searchPlaceholder={t("form.search")}
          emptyMessage={
            type === "customer" ? t("form.noCustomers") : t("form.noVendors")
          }
          pageSize={10}
          onAddNew={
            type === "customer"
              ? () => setQuickAdd("customer")
              : () => setQuickAdd("vendor")
          }
          addNewLabel={
            type === "customer" ? t("form.addCustomer") : t("form.addVendor")
          }
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor={`${formId}-paymentNumber`}>{t("form.paymentNumber")}</Label>
          <Input
            id={`${formId}-paymentNumber`}
            name="paymentNumber"
            defaultValue={payment.paymentNumber}
            placeholder={t("form.autoGenerated")}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor={`${formId}-paymentDate`}>{t("form.paymentDate")}</Label>
          <Input
            id={`${formId}-paymentDate`}
            name="paymentDate"
            type="date"
            required
            defaultValue={payment.paymentDate}
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor={`${formId}-referenceNumber`}>{referenceLabel}</Label>
        <Input
          id={`${formId}-referenceNumber`}
          name="referenceNumber"
          defaultValue={payment.referenceNumber === "—" ? "" : payment.referenceNumber}
          placeholder={type === "customer" ? "INV-1001" : "PO-2001"}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor={`${formId}-amount`}>{t("form.amount")}</Label>
          <Input
            id={`${formId}-amount`}
            name="amount"
            required
            defaultValue={payment.amount}
            placeholder="0.00"
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor={`${formId}-paymentMethod`}>{t("form.paymentMethod")}</Label>
          <select
            id={`${formId}-paymentMethod`}
            name="paymentMethod"
            defaultValue={payment.paymentMethod}
            className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm shadow-xs outline-none focus-visible:ring-ring/50 focus-visible:ring-[3px]"
          >
            {PAYMENT_METHODS.map((method) => (
              <option key={method} value={method}>
                {method}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor={`${formId}-status`}>{t("form.status")}</Label>
        <select
          id={`${formId}-status`}
          name="status"
          defaultValue={payment.status}
          className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm shadow-xs outline-none focus-visible:ring-ring/50 focus-visible:ring-[3px]"
        >
          <option value="pending">{t("status.pending", { ns: "common" })}</option>
          <option value="completed">{t("status.completed", { ns: "common" })}</option>
          <option value="voided">{t("status.voided", { ns: "common" })}</option>
        </select>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor={`${formId}-notes`}>{t("form.notes")}</Label>
        <Input
          id={`${formId}-notes`}
          name="notes"
          defaultValue={payment.notes === "—" ? "" : payment.notes}
          placeholder={t("form.optionalNotes")}
        />
      </div>
    </form>

    <CustomerQuickAddSheet
      open={quickAdd === "customer"}
      onOpenChange={(open) => {
        if (!open) setQuickAdd(null)
      }}
      formId={customerQuickAddFormId}
      onCreated={handleCustomerCreated}
    />

    <VendorQuickAddSheet
      open={quickAdd === "vendor"}
      onOpenChange={(open) => {
        if (!open) setQuickAdd(null)
      }}
      formId={vendorQuickAddFormId}
      onCreated={handleVendorCreated}
    />
  </>
  )
}
