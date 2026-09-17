"use client"

import type { FormEvent } from "react"
import { useTranslation } from "react-i18next"

import { CustomerImageField } from "@/components/customers/customer-image-field"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { CustomerRow } from "@/lib/customers"

type CustomerFormProps = {
  formId: string
  customer: CustomerRow
  onSubmit: (e: FormEvent<HTMLFormElement>) => void
}

export function CustomerForm({ formId, customer, onSubmit }: CustomerFormProps) {
  const { t } = useTranslation("customers")
  return (
    <form id={formId} className="flex flex-col gap-4 text-sm" onSubmit={onSubmit}>
      <CustomerImageField
        id={`${formId}-image`}
        name={customer.name || t("entity.customer")}
        initialUrl={customer.imageUrl}
      />
      <div className="flex flex-col gap-2">
        <Label htmlFor={`${formId}-name`}>{t("fields.name")}</Label>
        <Input
          id={`${formId}-name`}
          name="name"
          required
          defaultValue={customer.name}
          placeholder={t("fields.namePlaceholder")}
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor={`${formId}-description`}>{t("fields.description")}</Label>
        <Input
          id={`${formId}-description`}
          name="description"
          defaultValue={customer.description === "—" ? "" : customer.description}
          placeholder={t("fields.descriptionPlaceholder")}
        />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor={`${formId}-openingBalance`}>{t("fields.openingBalance")}</Label>
          <Input
            id={`${formId}-openingBalance`}
            name="openingBalance"
            defaultValue={customer.openingBalance}
            placeholder="0.00"
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor={`${formId}-phone`}>{t("fields.phone")}</Label>
          <Input
            id={`${formId}-phone`}
            name="phone"
            defaultValue={customer.phone === "—" ? "" : customer.phone}
            placeholder={t("fields.phonePlaceholder")}
          />
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor={`${formId}-status`}>{t("fields.status")}</Label>
        <select
          id={`${formId}-status`}
          name="status"
          defaultValue={customer.status}
          className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm shadow-xs outline-none focus-visible:ring-ring/50 focus-visible:ring-[3px]"
        >
          <option value="active">{t("tabs.active")}</option>
          <option value="inactive">{t("tabs.inactive")}</option>
        </select>
      </div>
    </form>
  )
}
