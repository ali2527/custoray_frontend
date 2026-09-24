"use client"

import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"

import { Building2, CalendarRange, Check, Monitor, Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useAppearance } from "@/components/theme/appearance-provider"
import { useAuth } from "@/context/auth-context"
import { useFiscalTerms } from "@/context/fiscal-term-context"
import {
  ACCENT_PRESETS,
  LANGUAGES,
  type AppLanguage,
  type FontSizeKey,
} from "@/lib/appearance-prefs"
import {
  apiGetCompanySettings,
  apiPatchCompanySettings,
} from "@/lib/api/auth"
import {
  DEFAULT_COMPANY_SETTINGS,
  loadCompanySettings,
  saveCompanySettings,
  type CompanySettings,
} from "@/lib/company-settings"
import { addMonthsIso, formatShortDate } from "@/lib/fiscal-terms"
import { cn } from "@/lib/utils"

/** Welcome → Business → Term → Look */
export const WELCOME_SETUP_STEPS = 4

const TENURE_OPTIONS = [6, 12, 24] as const
const FONT_OPTIONS: FontSizeKey[] = ["sm", "base", "lg", "xl"]
const PRESET_I18N_KEY: Record<string, "green" | "red" | "blue" | "purple" | "navy"> = {
  green: "green",
  red: "red",
  blue: "blue",
  purple: "purple",
  violet: "navy",
}

function toDateInputValue(iso: string): string {
  try {
    return new Date(iso).toISOString().slice(0, 10)
  } catch {
    return ""
  }
}

function splitAddress(address: string): { line1: string; line2: string } {
  const parts = address
    .split(/\n|,/)
    .map((part) => part.trim())
    .filter(Boolean)
  return {
    line1: parts[0] ?? "",
    line2: parts.slice(1).join(", "),
  }
}

export async function persistWelcomeCompany(settings: CompanySettings) {
  saveCompanySettings(settings)
  const address = [settings.addressLine1, settings.addressLine2]
    .map((part) => part.trim())
    .filter(Boolean)
    .join(", ")
  try {
    await apiPatchCompanySettings({
      name: settings.name.trim(),
      tagline: settings.tagline.trim(),
      phone: settings.phone.trim(),
      email: settings.email.trim(),
      address,
      logoUrl: settings.logoUrl.trim() || undefined,
    })
  } catch {
    /* local save still applies */
  }
}

export function WelcomeSetupBody({
  step,
  companyDraft,
  onCompanyChange,
}: {
  step: number
  companyDraft: CompanySettings
  onCompanyChange: (patch: Partial<CompanySettings>) => void
}) {
  const { t } = useTranslation("common")
  const { t: tSettings } = useTranslation("settings")
  const { state, updateActiveTenure, updateActiveStart } = useFiscalTerms()
  const { prefs, update: updateAppearance } = useAppearance()
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [tenure, setTenure] = useState(state.active.tenureMonths || 12)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    setTenure(state.active.tenureMonths || 12)
  }, [state.active.tenureMonths])

  const startValue = toDateInputValue(state.active.startedAt)
  const plannedEndIso = addMonthsIso(state.active.startedAt, tenure)
  const plannedEnd = formatShortDate(plannedEndIso)
  const startLabel = formatShortDate(state.active.startedAt)
  const fontLabels: Record<FontSizeKey, string> = {
    sm: tSettings("language.fontSizeSm"),
    base: tSettings("language.fontSizeBase"),
    lg: tSettings("language.fontSizeLg"),
    xl: tSettings("language.fontSizeXl"),
  }

  if (step === 1) {
    return (
      <div className="space-y-5">
        <div className="bg-primary/8 border-primary/20 flex items-start gap-3 rounded-xl border px-3.5 py-3">
          <Building2 className="text-primary mt-0.5 size-4 shrink-0" />
          <p className="text-muted-foreground text-[12.5px] leading-relaxed">
            {t("welcome.guide.companyBody")}
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="welcome-company-name" className="text-[12.5px]">
              {t("welcome.guide.companyName")}
            </Label>
            <Input
              id="welcome-company-name"
              value={companyDraft.name}
              onChange={(event) => onCompanyChange({ name: event.target.value })}
              placeholder={t("welcome.guide.companyNamePlaceholder")}
              className="h-10"
              autoFocus
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="welcome-company-tagline" className="text-[12.5px]">
              {t("welcome.guide.companyTagline")}
            </Label>
            <Input
              id="welcome-company-tagline"
              value={companyDraft.tagline}
              onChange={(event) => onCompanyChange({ tagline: event.target.value })}
              placeholder={t("welcome.guide.companyTaglinePlaceholder")}
              className="h-10"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="welcome-company-phone" className="text-[12.5px]">
              {t("welcome.guide.companyPhone")}
            </Label>
            <Input
              id="welcome-company-phone"
              value={companyDraft.phone}
              onChange={(event) => onCompanyChange({ phone: event.target.value })}
              className="h-10"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="welcome-company-email" className="text-[12.5px]">
              {t("welcome.guide.companyEmail")}
            </Label>
            <Input
              id="welcome-company-email"
              type="email"
              value={companyDraft.email}
              onChange={(event) => onCompanyChange({ email: event.target.value })}
              className="h-10"
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="welcome-company-address" className="text-[12.5px]">
              {t("welcome.guide.companyAddress")}
            </Label>
            <Input
              id="welcome-company-address"
              value={companyDraft.addressLine1}
              onChange={(event) =>
                onCompanyChange({
                  addressLine1: event.target.value,
                  addressLine2: "",
                })
              }
              placeholder={t("welcome.guide.companyAddressPlaceholder")}
              className="h-10"
            />
          </div>
        </div>
      </div>
    )
  }

  if (step === 2) {
    return (
      <div className="space-y-5">
        <p className="text-foreground/80 text-[13px] leading-relaxed">
          {t("welcome.guide.termBody")}
        </p>

        <div className="space-y-2">
          <p className="text-[13px] font-medium">{t("welcome.guide.termLength")}</p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {TENURE_OPTIONS.map((months) => {
              const selected = tenure === months
              const recommended = months === 12
              return (
                <button
                  key={months}
                  type="button"
                  onClick={() => {
                    setTenure(months)
                    updateActiveTenure(months)
                  }}
                  className={cn(
                    "relative rounded-xl border px-3 py-3 text-start transition-colors",
                    selected
                      ? "border-primary bg-primary/8 ring-1 ring-primary/40"
                      : "border-border bg-background hover:bg-muted/50"
                  )}
                >
                  {selected ? (
                    <span className="bg-primary text-primary-foreground absolute end-2.5 top-2.5 flex size-5 items-center justify-center rounded-full">
                      <Check className="size-3" strokeWidth={3} />
                    </span>
                  ) : null}
                  <p className="text-[13px] font-semibold">
                    {t("welcome.guide.termMonths", { months })}
                  </p>
                  <p className="text-muted-foreground mt-1 text-[12px] leading-snug">
                    {t(`welcome.guide.termOption${months}`)}
                  </p>
                  {recommended ? (
                    <p className="text-primary mt-2 text-[11px] font-medium">
                      {t("welcome.guide.termRecommended")}
                    </p>
                  ) : null}
                </button>
              )
            })}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="welcome-term-start" className="text-[12.5px]">
            {t("welcome.guide.termStart")}
          </Label>
          <Input
            id="welcome-term-start"
            type="date"
            value={startValue}
            onChange={(event) => {
              if (event.target.value) updateActiveStart(event.target.value)
            }}
            className="h-10"
          />
        </div>

        <div className="bg-primary/8 border-primary/20 flex items-start gap-3 rounded-xl border px-3.5 py-3">
          <CalendarRange className="text-primary mt-0.5 size-4 shrink-0" />
          <div>
            <p className="text-[13px] font-medium">{t("welcome.guide.termSummaryTitle")}</p>
            <p className="text-muted-foreground mt-0.5 text-[12.5px] leading-relaxed">
              {t("welcome.guide.termSummary", { start: startLabel, end: plannedEnd })}
            </p>
            <p className="text-muted-foreground mt-1 text-[12px]">
              {t("welcome.guide.termHint")}
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (step === 3) {
    const mode = mounted ? (theme ?? "system") : "system"
    const themeChoices = [
      { id: "light", label: tSettings("appearance.lightMode"), icon: Sun },
      { id: "dark", label: tSettings("appearance.darkMode"), icon: Moon },
      { id: "system", label: tSettings("appearance.systemPreferences"), icon: Monitor },
    ] as const

    return (
      <div className="space-y-5">
        <div className="space-y-2">
          <Label className="text-[12.5px]">{t("welcome.guide.themeModeLabel")}</Label>
          <div className="grid grid-cols-3 gap-2">
            {themeChoices.map((choice) => {
              const Icon = choice.icon
              const selected = mode === choice.id
              return (
                <button
                  key={choice.id}
                  type="button"
                  onClick={() => setTheme(choice.id)}
                  className={cn(
                    "flex flex-col items-center gap-1.5 rounded-xl border px-2 py-3 text-[12px] font-medium transition-colors",
                    selected
                      ? "border-primary bg-primary/8 text-foreground"
                      : "border-border bg-background text-muted-foreground hover:bg-muted/50"
                  )}
                >
                  <Icon className={cn("size-4", selected && "text-primary")} />
                  {choice.label}
                </button>
              )
            })}
          </div>
        </div>
        <div className="space-y-2">
          <Label className="text-[12.5px]">{t("welcome.guide.themeLabel")}</Label>
          <div className="flex flex-wrap items-center gap-3">
            {ACCENT_PRESETS.map((item) => {
              const selected = prefs.colorTheme === item.id
              const label = tSettings(
                `appearance.presets.${PRESET_I18N_KEY[item.id] ?? item.id}`
              )
              return (
                <button
                  key={item.id}
                  type="button"
                  title={label}
                  aria-label={label}
                  onClick={() =>
                    updateAppearance({ colorTheme: item.id, customColor: item.color })
                  }
                  className={cn(
                    "size-8 rounded-full ring-2 ring-offset-2 ring-offset-background transition-shadow",
                    selected ? "ring-primary" : "ring-transparent hover:ring-border"
                  )}
                  style={{ backgroundColor: item.color }}
                />
              )
            })}
          </div>
        </div>
        <div className="space-y-2">
          <Label className="text-[12.5px]">{t("welcome.guide.languageLabel")}</Label>
          <Select
            value={prefs.language}
            onValueChange={(value) =>
              updateAppearance({ language: value as AppLanguage })
            }
          >
            <SelectTrigger className="h-10 w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LANGUAGES.map((lang) => (
                <SelectItem key={lang.value} value={lang.value}>
                  {lang.nativeLabel}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label className="text-[12.5px]">{t("welcome.guide.fontLabel")}</Label>
          <Select
            value={prefs.fontSize}
            onValueChange={(value) =>
              updateAppearance({ fontSize: value as FontSizeKey })
            }
          >
            <SelectTrigger className="h-10 w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FONT_OPTIONS.map((size) => (
                <SelectItem key={size} value={size}>
                  {fontLabels[size]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    )
  }

  return null
}

export function useWelcomeCompanyDraft() {
  const { user, companies, activeCompanyId } = useAuth()
  const [companyDraft, setCompanyDraft] = useState<CompanySettings>(DEFAULT_COMPANY_SETTINGS)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function hydrate() {
      const local = loadCompanySettings()
      const active =
        companies.find((company) => company.id === activeCompanyId) ?? companies[0]
      const seeded: CompanySettings = {
        ...DEFAULT_COMPANY_SETTINGS,
        ...local,
        name:
          local.name && local.name !== DEFAULT_COMPANY_SETTINGS.name
            ? local.name
            : active?.name || local.name,
        email:
          local.email && local.email !== DEFAULT_COMPANY_SETTINGS.email
            ? local.email
            : user?.email || local.email,
      }

      try {
        const remote = await apiGetCompanySettings()
        if (!cancelled && remote) {
          const address = splitAddress(remote.address || "")
          setCompanyDraft({
            name: remote.name || seeded.name,
            tagline: remote.tagline || seeded.tagline,
            addressLine1: address.line1 || seeded.addressLine1,
            addressLine2: address.line2 || seeded.addressLine2,
            phone: remote.phone || seeded.phone,
            email: remote.email || seeded.email,
            logoUrl: remote.logoUrl || seeded.logoUrl,
          })
          setHydrated(true)
          return
        }
      } catch {
        /* use seeded */
      }

      if (!cancelled) {
        setCompanyDraft(seeded)
        setHydrated(true)
      }
    }

    void hydrate()
    return () => {
      cancelled = true
    }
  }, [activeCompanyId, companies, user?.email])

  function updateCompany(patch: Partial<CompanySettings>) {
    setCompanyDraft((prev) => ({ ...prev, ...patch }))
  }

  return { companyDraft, updateCompany, hydrated }
}
