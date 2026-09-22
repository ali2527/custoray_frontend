"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useTranslation } from "react-i18next"

import { Label } from "@/components/ui/label"
import { PageLoader } from "@/components/ui/page-loader"
import { Switch } from "@/components/ui/switch"
import { useCatalogFieldSettings } from "@/hooks/use-catalog-field-settings"
import {
  CATALOG_LINKS,
  type CatalogLink,
} from "@/lib/catalog-field-settings"

export function CatalogTablesTableSettings() {
  const { t } = useTranslation("inventory")
  const { settings, setTable } = useCatalogFieldSettings()

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <Label className="text-muted-foreground block text-[11px] font-semibold tracking-wide uppercase">
          {t("fieldNeeds.tablesTitle")}
        </Label>
        <p className="text-muted-foreground text-[11px] leading-relaxed">
          {t("fieldNeeds.tablesHint")}
        </p>
      </div>
      <div className="space-y-2">
        {CATALOG_LINKS.map((link) => (
          <label
            key={link}
            className="flex items-center justify-between gap-3 rounded-md border px-3 py-2"
          >
            <span className="text-sm font-medium">{t(`fields.${link}`)}</span>
            <Switch
              checked={settings[link]}
              onCheckedChange={(enabled) => setTable(link, enabled)}
              aria-label={t(`fields.${link}`)}
            />
          </label>
        ))}
      </div>
    </div>
  )
}

export function CatalogTablePageGuard({
  table,
  children,
}: {
  table: CatalogLink
  children: React.ReactNode
}) {
  const router = useRouter()
  const { settings } = useCatalogFieldSettings()
  const enabled = settings[table]

  useEffect(() => {
    if (!enabled) router.replace("/inventory/products")
  }, [enabled, router])

  if (!enabled) return <PageLoader />
  return children
}
