"use client"

import { useTranslation } from "react-i18next"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useProductSkuSettings } from "@/hooks/use-product-sku-settings"
import {
  formatAutoSku,
  sanitizeSkuPrefixInput,
} from "@/lib/product-sku-settings"

export function ProductSkuTableSettings() {
  const { t } = useTranslation("settings")
  const { settings, persist, setMode } = useProductSkuSettings()

  return (
    <div className="space-y-2">
      <Label className="text-muted-foreground block text-[11px] font-semibold tracking-wide uppercase">
        {t("products.title")}
      </Label>
      <div className="grid grid-cols-2 gap-1.5">
        <Button
          type="button"
          variant={settings.mode === "auto" ? "default" : "outline"}
          size="sm"
          className="h-8 px-2.5 text-xs"
          onClick={() => setMode("auto")}
        >
          {t("products.autoTitle")}
        </Button>
        <Button
          type="button"
          variant={settings.mode === "custom" ? "default" : "outline"}
          size="sm"
          className="h-8 px-2.5 text-xs"
          onClick={() => setMode("custom")}
        >
          {t("products.customTitle")}
        </Button>
      </div>
      {settings.mode === "auto" ? (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="table-sku-prefix" className="text-xs font-medium">
            {t("products.prefix")}
          </Label>
          <Input
            id="table-sku-prefix"
            value={settings.prefix}
            onChange={(event) =>
              persist({
                ...settings,
                prefix: sanitizeSkuPrefixInput(event.target.value),
              })
            }
            placeholder={t("products.prefixPlaceholder")}
            autoComplete="off"
            className="h-8 text-sm"
          />
          <p className="text-muted-foreground text-[11px] leading-relaxed">
            {t("products.prefixHint", {
              first: formatAutoSku(settings.prefix, 1),
              second: formatAutoSku(settings.prefix, 2),
            })}
          </p>
        </div>
      ) : (
        <p className="text-muted-foreground text-[11px] leading-relaxed">
          {t("products.customHint")}
        </p>
      )}
    </div>
  )
}
