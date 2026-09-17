"use client"

import { CatalogFieldSettingsForm } from "@/components/settings/catalog-field-settings-form"
import { ProductSkuSettingsForm } from "@/components/settings/product-sku-settings-form"

export default function ProductSettingsPage() {
  return (
    <div className="flex flex-col gap-6">
      <ProductSkuSettingsForm />
      <CatalogFieldSettingsForm />
    </div>
  )
}
