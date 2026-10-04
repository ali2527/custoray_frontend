"use client"

import { Lock } from "lucide-react"
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
  const isCustom = settings.mode === "custom"

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
          className="h-8 gap-1 px-2.5 text-xs"
          onClick={() => setMode("auto")}
        >
          {!isCustom ? <Lock className="size-3" aria-hidden /> : null}
          {t("products.autoTitle")}
        </Button>
        <Button
          type="button"
          variant={isCustom ? "default" : "outline"}
          size="sm"
          className="h-8 gap-1 px-2.5 text-xs"
          onClick={() => setMode("custom")}
        >
          {isCustom ? <Lock className="size-3" aria-hidden /> : null}
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
        <div className="border-primary/20 bg-primary/5 rounded-lg border px-2.5 py-2">
          <p className="text-foreground flex items-center gap-1.5 text-[11px] font-medium">
            <Lock className="text-primary size-3" />
            {t("products.customLockedTitle")}
          </p>
          <p className="text-muted-foreground mt-1 text-[11px] leading-relaxed">
            {t("products.customHint")}
          </p>
        </div>
      )}
    </div>
  )
}
