"use client"

import { useTranslation } from "react-i18next"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useAppearance } from "@/components/theme/appearance-provider"
import { MoneyFormatSettings } from "@/components/settings/money-format-settings"
import {
  FONT_SIZE_VALUES,
  LANGUAGES,
  isRtlLanguage,
  type AppLanguage,
  type FontSizeKey,
} from "@/lib/appearance-prefs"

export default function LanguageSettingsPage() {
  const { prefs, update } = useAppearance()
  const { t } = useTranslation("settings")

  const fontSizeLabels: Record<FontSizeKey, string> = {
    sm: t("language.fontSizeSm"),
    base: t("language.fontSizeBase"),
    lg: t("language.fontSizeLg"),
    xl: t("language.fontSizeXl"),
  }

  const languageLabels: Record<AppLanguage, string> = {
    en: t("language.english"),
    ar: t("language.arabic"),
    ur: t("language.urdu"),
  }

  return (
    <div className="divide-border max-w-2xl divide-y">
      <section className="flex flex-col gap-4 pb-8 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-base font-semibold">{t("language.title")}</h2>
          <p className="text-muted-foreground mt-1 text-sm">
            {t("language.description")}
          </p>
        </div>
        <div className="sm:w-64">
          <Select
            value={prefs.language}
            onValueChange={(language) =>
              update({ language: language as AppLanguage })
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LANGUAGES.map((lang) => (
                <SelectItem key={lang.value} value={lang.value}>
                  {languageLabels[lang.value]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-muted-foreground mt-2 text-xs">
            {isRtlLanguage(prefs.language)
              ? t("language.rtlEnabled")
              : t("language.ltrEnabled")}
          </p>
        </div>
      </section>

      <section className="flex flex-col gap-4 pt-8 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-base font-semibold">{t("language.fontSize")}</h2>
          <p className="text-muted-foreground mt-1 text-sm">
            {t("language.fontSizeDescription")}
          </p>
        </div>
        <div className="sm:w-64">
          <Select
            value={prefs.fontSize}
            onValueChange={(value) => update({ fontSize: value as FontSizeKey })}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(FONT_SIZE_VALUES) as FontSizeKey[]).map((key) => (
                <SelectItem key={key} value={key}>
                  {fontSizeLabels[key]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </section>

      <MoneyFormatSettings />
    </div>
  )
}
