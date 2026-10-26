"use client"

import { useTranslation } from "react-i18next"

import { useMoneyFormatSettings } from "@/hooks/use-money-format-settings"
import { cn } from "@/lib/utils"
import {
  MONEY_FORMAT_VARIANTS,
  moneyFormatSample,
  type MoneyFormatVariant,
} from "@/lib/money-format-settings"

const VARIANT_LABEL_KEYS: Record<MoneyFormatVariant, string> = {
  us: "language.priceFormatUs",
  pakistani: "language.priceFormatPakistani",
  indian: "language.priceFormatIndian",
  uk: "language.priceFormatUk",
}

const VARIANT_HINT_KEYS: Record<MoneyFormatVariant, string> = {
  us: "language.priceFormatUsHint",
  pakistani: "language.priceFormatPakistaniHint",
  indian: "language.priceFormatIndianHint",
  uk: "language.priceFormatUkHint",
}

export function MoneyFormatSettings({ embedded = false }: { embedded?: boolean }) {
  const { t } = useTranslation("settings")
  const { settings, setVariant } = useMoneyFormatSettings()

  if (embedded) {
    return (
      <div className="space-y-1.5">
        <p className="text-xs font-medium">{t("language.priceFormat")}</p>
        <div className="grid grid-cols-2 gap-2">
          {MONEY_FORMAT_VARIANTS.map((variant) => {
            const selected = settings.variant === variant
            return (
              <button
                key={variant}
                type="button"
                aria-pressed={selected}
                onClick={() => setVariant(variant)}
                className={cn(
                  "rounded-lg border px-3 py-2.5 text-start",
                  selected
                    ? "border-primary bg-primary/5"
                    : "border-border bg-background hover:border-primary/40"
                )}
              >
                <span className="block font-mono text-sm tabular-nums">
                  {moneyFormatSample(variant)}
                </span>
                <span className="text-muted-foreground mt-0.5 block text-xs">
                  {t(VARIANT_LABEL_KEYS[variant])}
                </span>
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <section className="flex flex-col gap-4 pt-8">
      <div>
        <h2 className="text-base font-semibold">{t("language.priceFormat")}</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          {t("language.priceFormatDescription")}
        </p>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {MONEY_FORMAT_VARIANTS.map((variant) => {
          const selected = settings.variant === variant
          return (
            <button
              key={variant}
              type="button"
              aria-pressed={selected}
              onClick={() => setVariant(variant)}
              className={cn(
                "flex cursor-pointer flex-col rounded-xl border p-4 text-start transition-colors",
                selected
                  ? "border-primary bg-primary/5 ring-primary/30 ring-2"
                  : "border-border hover:border-primary/40 bg-card"
              )}
            >
              <span className="text-sm font-semibold">
                {t(VARIANT_LABEL_KEYS[variant])}
              </span>
              <span className="text-foreground mt-2 font-mono text-sm tabular-nums">
                {moneyFormatSample(variant)}
              </span>
              <span className="text-muted-foreground mt-1 text-xs leading-snug">
                {t(VARIANT_HINT_KEYS[variant])}
              </span>
            </button>
          )
        })}
      </div>
      <p className="text-muted-foreground text-xs">
        {t("language.priceFormatPersistHint")}
      </p>
    </section>
  )
}
