"use client"

import { Lock, Package } from "lucide-react"
import { useTranslation } from "react-i18next"

import { SettingsSection } from "@/components/settings/settings-section"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useProductSkuSettings } from "@/hooks/use-product-sku-settings"
import { cn } from "@/lib/utils"
import {
  formatAutoSku,
  sanitizeSkuPrefixInput,
} from "@/lib/product-sku-settings"

function ModeCard({
  selected,
  title,
  description,
  onClick,
  locked,
  lockedLabel,
}: {
  selected: boolean
  title: string
  description: string
  onClick: () => void
  locked?: boolean
  lockedLabel: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        "flex cursor-pointer flex-col rounded-xl border p-4 text-start transition-colors",
        selected
          ? "border-primary bg-primary/5 ring-primary/30 ring-2"
          : "border-border hover:border-primary/40 bg-card"
      )}
    >
      <span className="flex items-center gap-2 text-sm font-semibold">
        {title}
        {selected && locked ? (
          <span className="text-primary inline-flex items-center gap-1 text-[11px] font-medium">
            <Lock className="size-3" aria-hidden />
            {lockedLabel}
          </span>
        ) : null}
      </span>
      <span className="text-muted-foreground mt-1 text-sm leading-snug">
        {description}
      </span>
    </button>
  )
}

export function ProductSkuSettingsForm() {
  const { t } = useTranslation("settings")
  const { settings, persist, setMode } = useProductSkuSettings()
  const isCustom = settings.mode === "custom"

  return (
    <SettingsSection
      icon={<Package />}
      title={t("products.title")}
      description={t("products.description")}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <ModeCard
          selected={settings.mode === "auto"}
          title={t("products.autoTitle")}
          description={t("products.autoDescription")}
          onClick={() => setMode("auto")}
          locked={!isCustom}
          lockedLabel={t("products.modeActive")}
        />
        <ModeCard
          selected={isCustom}
          title={t("products.customTitle")}
          description={t("products.customDescription")}
          onClick={() => setMode("custom")}
          locked={isCustom}
          lockedLabel={t("products.modeActive")}
        />
      </div>
      {settings.mode === "auto" ? (
        <div className="flex flex-col gap-2">
          <Label htmlFor="product-sku-prefix">{t("products.prefix")}</Label>
          <Input
            id="product-sku-prefix"
            value={settings.prefix}
            onChange={(event) =>
              persist({
                ...settings,
                prefix: sanitizeSkuPrefixInput(event.target.value),
              })
            }
            placeholder={t("products.prefixPlaceholder")}
            autoComplete="off"
          />
          <p className="text-muted-foreground text-sm">
            {t("products.prefixHint", {
              first: formatAutoSku(settings.prefix, 1),
              second: formatAutoSku(settings.prefix, 2),
            })}
          </p>
        </div>
      ) : (
        <div className="border-primary/20 bg-primary/5 rounded-xl border px-4 py-3">
          <p className="text-foreground flex items-center gap-2 text-sm font-medium">
            <Lock className="text-primary size-3.5" />
            {t("products.customLockedTitle")}
          </p>
          <p className="text-muted-foreground mt-1 text-sm">
            {t("products.customHint")}
          </p>
        </div>
      )}
      <p className="text-muted-foreground text-sm">{t("products.tableHint")}</p>
    </SettingsSection>
  )
}
