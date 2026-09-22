"use client"

import { Hash } from "lucide-react"
import { useTranslation } from "react-i18next"

import { SettingsSection } from "@/components/settings/settings-section"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useDocumentNumberSettings } from "@/hooks/use-document-number-settings"
import {
  DOCUMENT_NUMBER_KEYS,
  formatAutoDocumentNumber,
  sanitizeNumberPrefixInput,
  type DocumentNumberKey,
} from "@/lib/document-number-settings"
import { cn } from "@/lib/utils"

function ModeCard({
  selected,
  title,
  description,
  onClick,
}: {
  selected: boolean
  title: string
  description: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex cursor-pointer flex-col rounded-xl border p-4 text-start transition-colors",
        selected
          ? "border-primary bg-primary/5 ring-primary/30 ring-2"
          : "border-border hover:border-primary/40 bg-card"
      )}
    >
      <span className="text-sm font-semibold">{title}</span>
      <span className="text-muted-foreground mt-1 text-sm leading-snug">
        {description}
      </span>
    </button>
  )
}

const KEY_LABEL: Record<DocumentNumberKey, string> = {
  sales: "numbering.keys.sales",
  purchases: "numbering.keys.purchases",
  salesReturns: "numbering.keys.salesReturns",
  purchaseReturns: "numbering.keys.purchaseReturns",
  customerPayments: "numbering.keys.customerPayments",
  vendorPayments: "numbering.keys.vendorPayments",
  expenses: "numbering.keys.expenses",
}

export function DocumentNumberSettingsForm() {
  const { t } = useTranslation("settings")
  const { settings, updateEntry, setMode } = useDocumentNumberSettings()

  return (
    <SettingsSection
      icon={<Hash />}
      title={t("numbering.title")}
      description={t("numbering.description")}
    >
      <div className="flex flex-col gap-6">
        {DOCUMENT_NUMBER_KEYS.map((key) => {
          const entry = settings[key]
          const fallback = entry.prefix
          return (
            <div
              key={key}
              className="border-border/70 flex flex-col gap-3 rounded-xl border p-4"
            >
              <div>
                <p className="text-sm font-semibold">{t(KEY_LABEL[key])}</p>
                <p className="text-muted-foreground mt-0.5 text-xs">
                  {t("numbering.entryHint")}
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <ModeCard
                  selected={entry.mode === "auto"}
                  title={t("numbering.autoTitle")}
                  description={t("numbering.autoDescription")}
                  onClick={() => setMode(key, "auto")}
                />
                <ModeCard
                  selected={entry.mode === "custom"}
                  title={t("numbering.customTitle")}
                  description={t("numbering.customDescription")}
                  onClick={() => setMode(key, "custom")}
                />
              </div>
              {entry.mode === "auto" ? (
                <div className="flex flex-col gap-2">
                  <Label htmlFor={`doc-number-prefix-${key}`}>
                    {t("numbering.prefix")}
                  </Label>
                  <Input
                    id={`doc-number-prefix-${key}`}
                    value={entry.prefix}
                    onChange={(event) =>
                      updateEntry(key, {
                        prefix: sanitizeNumberPrefixInput(event.target.value),
                      })
                    }
                    placeholder={fallback}
                    autoComplete="off"
                  />
                  <p className="text-muted-foreground text-sm">
                    {t("numbering.prefixHint", {
                      first: formatAutoDocumentNumber(entry.prefix, 1, fallback),
                      second: formatAutoDocumentNumber(entry.prefix, 2, fallback),
                    })}
                  </p>
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">
                  {t("numbering.customHint")}
                </p>
              )}
            </div>
          )
        })}
      </div>
    </SettingsSection>
  )
}
