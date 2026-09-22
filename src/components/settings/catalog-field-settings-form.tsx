"use client"

import { Tags } from "lucide-react"
import { useTranslation } from "react-i18next"

import { CatalogTablesTableSettings } from "@/components/inventory/catalog-field-table-settings"
import { SettingsSection } from "@/components/settings/settings-section"

export function CatalogFieldSettingsForm() {
  const { t } = useTranslation("inventory")

  return (
    <SettingsSection
      icon={<Tags />}
      title={t("fieldNeeds.settingsTitle")}
      description={t("fieldNeeds.settingsHint")}
    >
      <CatalogTablesTableSettings />
    </SettingsSection>
  )
}
