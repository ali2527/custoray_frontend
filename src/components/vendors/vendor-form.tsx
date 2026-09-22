"use client"

import type { FormEvent } from "react"
import { useTranslation } from "react-i18next"

import { VendorImageField } from "@/components/vendors/vendor-image-field"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { VENDOR_STATUS_OPTIONS, type VendorRow } from "@/lib/vendors"

type VendorFormProps = {
  formId: string
  vendor: VendorRow
  onSubmit: (e: FormEvent<HTMLFormElement>) => void
}

export function VendorForm({ formId, vendor, onSubmit }: VendorFormProps) {
  const { t } = useTranslation("vendors")
  return (
    <form id={formId} className="flex flex-col gap-4 text-sm" onSubmit={onSubmit}>
      <VendorImageField
        id={`${formId}-image`}
        name={vendor.name || t("entity.vendor")}
        initialUrl={vendor.imageUrl}
      />
      <div className="flex flex-col gap-2">
        <Label htmlFor={`${formId}-name`}>{t("fields.name")}</Label>
        <Input
          id={`${formId}-name`}
          name="name"
          required
          defaultValue={vendor.name}
          placeholder={t("fields.namePlaceholder")}
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor={`${formId}-description`}>{t("fields.description")}</Label>
        <Input
          id={`${formId}-description`}
          name="description"
          defaultValue={vendor.description === "—" ? "" : vendor.description}
          placeholder={t("fields.descriptionPlaceholder")}
        />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor={`${formId}-openingBalance`}>{t("fields.openingBalance")}</Label>
          <Input
            id={`${formId}-openingBalance`}
            name="openingBalance"
            defaultValue={vendor.openingBalance}
            placeholder="0.00"
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor={`${formId}-phone`}>{t("fields.phone")}</Label>
          <Input
            id={`${formId}-phone`}
            name="phone"
            defaultValue={vendor.phone === "—" ? "" : vendor.phone}
            placeholder={t("fields.phonePlaceholder")}
          />
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor={`${formId}-status`}>{t("fields.status")}</Label>
        <select
          id={`${formId}-status`}
          name="status"
          defaultValue={vendor.status}
          className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm shadow-xs outline-none focus-visible:ring-ring/50 focus-visible:ring-[3px]"
        >
          {VENDOR_STATUS_OPTIONS.map((status) => (
            <option key={status} value={status}>
              {t(`tabs.${status}`)}
            </option>
          ))}
        </select>
      </div>
    </form>
  )
}
