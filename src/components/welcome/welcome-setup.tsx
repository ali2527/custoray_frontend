"use client"

import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"

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
import {
  apiGetCompanySettings,
  apiPatchCompanySettings,
} from "@/lib/api/auth"
import {
  companySettingsFromRemote,
  DEFAULT_COMPANY_SETTINGS,
  saveCompanySettings,
  type CompanySettings,
} from "@/lib/company-settings"
import { industryLabel, SIGNUP_INDUSTRIES } from "@/lib/industries"
import {
  composeAddress,
  CURRENCY_OPTIONS,
  DATE_FORMAT_OPTIONS,
  detectBrowserTimezone,
  formatInvoicePreview,
  PAYMENT_TERM_PRESETS,
  regionalDefaultsForCountry,
  TIMEZONE_OPTIONS,
  type DateFormatOption,
} from "@/lib/onboarding-defaults"
import { LANGUAGES, type AppLanguage } from "@/lib/appearance-prefs"
import { cn } from "@/lib/utils"

/** Welcome(0) → Business(1) → Preferences(2) → Invoices(3) → Complete(4) */
export const WELCOME_SETUP_STEPS = 5

const fieldClass =
  "h-10 rounded-lg border bg-background text-sm shadow-none"
const labelClass = "text-xs font-medium"

export async function persistWelcomeCompany(settings: CompanySettings) {
  const next: CompanySettings = {
    ...settings,
    name: settings.name.trim(),
    industry: settings.industry.trim(),
    country: settings.country.trim(),
    addressLine1: settings.addressLine1.trim(),
    addressLine2: settings.addressLine2.trim(),
    city: settings.city.trim(),
    state: settings.state.trim(),
    postalCode: settings.postalCode.trim(),
    phone: settings.phone.trim(),
    email: settings.email.trim(),
    logoUrl: settings.logoUrl.trim(),
    invoicePrefix: settings.invoicePrefix.trim() || "INV",
    invoiceNote: settings.invoiceNote.trim(),
    paymentInstructions: settings.paymentInstructions.trim(),
  }
  const address = composeAddress({
    street: next.addressLine1,
    city: next.city,
    state: next.state,
    postalCode: next.postalCode,
    country: next.country,
  })
  await apiPatchCompanySettings({
    name: next.name,
    industry: next.industry,
    country: next.country,
    address,
    city: next.city,
    state: next.state,
    postalCode: next.postalCode,
    phone: next.phone,
    email: next.email,
    logoUrl: next.logoUrl || "",
    currency: next.currency,
    timezone: next.timezone,
    dateFormat: next.dateFormat,
    invoicePrefix: next.invoicePrefix,
    nextInvoiceNumber: next.nextInvoiceNumber,
    paymentTermsDays: next.paymentTermsDays,
    invoiceNote: next.invoiceNote,
    paymentInstructions: next.paymentInstructions,
  })
  // Keep local cache in sync so invoices/PDF/settings UI see welcome choices.
  saveCompanySettings(next)
}

export function WelcomeSetupBody({
  step,
  companyDraft,
  onCompanyChange,
}: {
  step: number
  companyDraft: CompanySettings
  onCompanyChange: (patch: Partial<CompanySettings>) => void
  accountEmail?: string
}) {
  const { t } = useTranslation("common")
  const { prefs, update: updateAppearance } = useAppearance()
  const [showMoreInvoice, setShowMoreInvoice] = useState(
    Boolean(companyDraft.invoiceNote || companyDraft.paymentInstructions)
  )
  const [customTerms, setCustomTerms] = useState(
    !PAYMENT_TERM_PRESETS.some((p) => p.days === companyDraft.paymentTermsDays)
  )

  if (step === 1) {
    const hasName = companyDraft.name.trim().length >= 2
    const hasIndustry = companyDraft.industry.trim().length >= 2
    const hasPhone = companyDraft.phone.trim().length > 0
    return (
      <div className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-2">
          {hasName ? null : (
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="ob-name" className={labelClass}>
              {t("welcome.onboarding.businessName")}
            </Label>
            <Input
              id="ob-name"
              value={companyDraft.name}
              onChange={(e) => onCompanyChange({ name: e.target.value })}
              className={fieldClass}
              autoFocus
            />
            <p className="text-muted-foreground text-[11px] leading-relaxed">
              {t("welcome.onboarding.businessNameHint")}
            </p>
          </div>
          )}

          {hasIndustry ? null : (
          <div className="space-y-1.5">
            <Label className={labelClass}>{t("welcome.onboarding.industry")}</Label>
            <Select
              value={companyDraft.industry || undefined}
              onValueChange={(value) => onCompanyChange({ industry: value })}
            >
              <SelectTrigger className={cn(fieldClass, "w-full")}>
                <SelectValue placeholder={t("welcome.onboarding.industryPlaceholder")} />
              </SelectTrigger>
              <SelectContent>
                {SIGNUP_INDUSTRIES.map((industry) => (
                  <SelectItem key={industry.value} value={industry.value}>
                    {industry.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          )}

          {hasPhone ? null : (
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="ob-phone" className={labelClass}>
              {t("welcome.onboarding.phone")}
            </Label>
            <Input
              id="ob-phone"
              value={companyDraft.phone}
              onChange={(e) => onCompanyChange({ phone: e.target.value })}
              className={fieldClass}
            />
          </div>
          )}
        </div>
      </div>
    )
  }

  if (step === 2) {
    return (
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label className={labelClass}>{t("welcome.onboarding.currency")}</Label>
          <Select
            value={companyDraft.currency}
            onValueChange={(value) => onCompanyChange({ currency: value })}
          >
            <SelectTrigger className={cn(fieldClass, "w-full")}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CURRENCY_OPTIONS.map((item) => (
                <SelectItem key={item.code} value={item.code}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className={labelClass}>{t("welcome.onboarding.timezone")}</Label>
          <Select
            value={companyDraft.timezone}
            onValueChange={(value) => onCompanyChange({ timezone: value })}
          >
            <SelectTrigger className={cn(fieldClass, "w-full")}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TIMEZONE_OPTIONS.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className={labelClass}>{t("welcome.onboarding.language")}</Label>
          <Select
            value={prefs.language}
            onValueChange={(value) =>
              updateAppearance({ language: value as AppLanguage })
            }
          >
            <SelectTrigger className={cn(fieldClass, "w-full")}>
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
        <div className="space-y-1.5">
          <Label className={labelClass}>{t("welcome.onboarding.dateFormat")}</Label>
          <Select
            value={companyDraft.dateFormat}
            onValueChange={(value) =>
              onCompanyChange({ dateFormat: value as DateFormatOption })
            }
          >
            <SelectTrigger className={cn(fieldClass, "w-full")}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DATE_FORMAT_OPTIONS.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-muted-foreground text-[11px]">
            {t("welcome.onboarding.dateExample", {
              example:
                DATE_FORMAT_OPTIONS.find((d) => d.value === companyDraft.dateFormat)
                  ?.example ?? "09/10/2026",
            })}
          </p>
        </div>
        </div>
      </div>
    )
  }

  if (step === 3) {
    const preview = formatInvoicePreview(
      companyDraft.invoicePrefix,
      companyDraft.nextInvoiceNumber
    )
    const termsLabel = customTerms
      ? t("welcome.onboarding.customDays", { days: companyDraft.paymentTermsDays })
      : companyDraft.paymentTermsDays === 0
        ? t("welcome.onboarding.dueOnReceipt")
        : t(`welcome.onboarding.net${companyDraft.paymentTermsDays}` as "welcome.onboarding.net30")

    return (
      <div className="grid gap-6 lg:grid-cols-[1fr_0.9fr]">
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="ob-prefix" className={labelClass}>
                {t("welcome.onboarding.invoicePrefix")}
              </Label>
              <Input
                id="ob-prefix"
                value={companyDraft.invoicePrefix}
                onChange={(e) =>
                  onCompanyChange({
                    invoicePrefix: e.target.value.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 12),
                  })
                }
                className={fieldClass}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ob-next" className={labelClass}>
                {t("welcome.onboarding.nextNumber")}
              </Label>
              <Input
                id="ob-next"
                type="number"
                min={1}
                value={companyDraft.nextInvoiceNumber}
                onChange={(e) =>
                  onCompanyChange({
                    nextInvoiceNumber: Math.max(1, Number(e.target.value) || 1),
                  })
                }
                className={fieldClass}
              />
              <p className="text-muted-foreground text-[11px]">
                {t("welcome.onboarding.nextNumberHint")}
              </p>
            </div>
          </div>
          <p className="bg-muted/50 text-foreground rounded-xl px-3 py-2 text-sm">
            {t("welcome.onboarding.previewLabel")}:{" "}
            <span className="font-semibold tracking-wide">{preview}</span>
          </p>

          <div className="space-y-2">
            <Label className={labelClass}>{t("welcome.onboarding.paymentTerms")}</Label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {PAYMENT_TERM_PRESETS.map((preset) => {
                const selected =
                  !customTerms && companyDraft.paymentTermsDays === preset.days
                return (
                  <button
                    key={preset.days}
                    type="button"
                    onClick={() => {
                      setCustomTerms(false)
                      onCompanyChange({ paymentTermsDays: preset.days })
                    }}
                    className={cn(
                      "rounded-xl border px-3 py-2.5 text-start text-[12px] font-medium transition-colors",
                      selected
                        ? "border-primary bg-primary/8 ring-1 ring-primary/30"
                        : "border-border hover:bg-muted/40"
                    )}
                  >
                    {t(`welcome.onboarding.${preset.labelKey}`)}
                    {"recommended" in preset && preset.recommended ? (
                      <span className="text-primary mt-0.5 block text-[10px] font-medium">
                        {t("welcome.onboarding.recommended")}
                      </span>
                    ) : null}
                  </button>
                )
              })}
              <button
                type="button"
                onClick={() => {
                  setCustomTerms(true)
                  if (
                    PAYMENT_TERM_PRESETS.some(
                      (p) => p.days === companyDraft.paymentTermsDays
                    )
                  ) {
                    onCompanyChange({ paymentTermsDays: 45 })
                  }
                }}
                className={cn(
                  "rounded-xl border px-3 py-2.5 text-start text-[12px] font-medium transition-colors",
                  customTerms
                    ? "border-primary bg-primary/8 ring-1 ring-primary/30"
                    : "border-border hover:bg-muted/40"
                )}
              >
                {t("welcome.onboarding.custom")}
              </button>
            </div>
            {customTerms ? (
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground text-xs">
                  {t("welcome.onboarding.dueWithin")}
                </span>
                <Input
                  type="number"
                  min={1}
                  max={365}
                  value={companyDraft.paymentTermsDays || 45}
                  onChange={(e) =>
                    onCompanyChange({
                      paymentTermsDays: Math.max(1, Number(e.target.value) || 1),
                    })
                  }
                  className="h-9 w-20 rounded-lg"
                />
                <span className="text-muted-foreground text-xs">
                  {t("welcome.onboarding.days")}
                </span>
              </div>
            ) : null}
          </div>

          <button
            type="button"
            className="text-primary text-[12px] font-medium hover:underline"
            onClick={() => setShowMoreInvoice((v) => !v)}
          >
            {showMoreInvoice
              ? t("welcome.onboarding.hideMoreInvoice")
              : t("welcome.onboarding.addMoreInvoice")}
          </button>
          {showMoreInvoice ? (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label className={labelClass}>{t("welcome.onboarding.invoiceNote")}</Label>
                <textarea
                  value={companyDraft.invoiceNote}
                  onChange={(e) => onCompanyChange({ invoiceNote: e.target.value })}
                  placeholder={t("welcome.onboarding.invoiceNotePlaceholder")}
                  className="border-input bg-background min-h-20 w-full rounded-xl border px-3 py-2 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className={labelClass}>
                  {t("welcome.onboarding.paymentInstructions")}
                </Label>
                <textarea
                  value={companyDraft.paymentInstructions}
                  onChange={(e) =>
                    onCompanyChange({ paymentInstructions: e.target.value })
                  }
                  placeholder={t("welcome.onboarding.paymentInstructionsPlaceholder")}
                  className="border-input bg-background min-h-20 w-full rounded-xl border px-3 py-2 text-sm"
                />
              </div>
            </div>
          ) : null}
        </div>

        <div className="border-border bg-muted/30 hidden rounded-2xl border p-4 lg:block">
          <p className="text-muted-foreground mb-3 text-[10px] font-semibold tracking-[0.14em] uppercase">
            {t("welcome.onboarding.invoicePreview")}
          </p>
          <div className="bg-background rounded-xl border border-border/70 p-4 shadow-sm">
            {companyDraft.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={companyDraft.logoUrl}
                alt=""
                className="mb-3 h-8 w-auto object-contain"
              />
            ) : (
              <div className="bg-muted text-muted-foreground mb-3 inline-flex rounded-md px-2 py-1 text-[10px] font-medium">
                {t("welcome.onboarding.yourLogo")}
              </div>
            )}
            <div className="mb-4 flex items-start justify-between gap-2">
              <div>
                <p className="text-[10px] font-semibold tracking-wide text-muted-foreground">
                  INVOICE
                </p>
                <p className="text-sm font-semibold">{preview}</p>
              </div>
            </div>
            <p className="text-sm font-semibold">{companyDraft.name || "—"}</p>
            <p className="text-muted-foreground text-xs">
              {companyDraft.country || "—"}
            </p>
            <div className="border-border/70 mt-4 space-y-1 border-t pt-3 text-xs">
              <p>
                <span className="text-muted-foreground">
                  {t("welcome.onboarding.paymentTerms")}:
                </span>{" "}
                {termsLabel}
              </p>
              <p>
                <span className="text-muted-foreground">
                  {t("welcome.onboarding.currency")}:
                </span>{" "}
                {companyDraft.currency}
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (step === 4) {
    return (
      <div className="space-y-4">
        <div className="border-border bg-card rounded-xl border px-4 py-3">
          <p className="text-muted-foreground text-[10px] font-semibold tracking-[0.12em] uppercase">
            {t("welcome.onboarding.summaryBusiness")}
          </p>
          <p className="mt-1 text-sm font-semibold">{companyDraft.name}</p>
          <p className="text-muted-foreground text-xs">
            {[
              companyDraft.industry ? industryLabel(companyDraft.industry) : "",
              companyDraft.country,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
        <div className="border-border bg-card rounded-xl border px-4 py-3">
          <p className="text-muted-foreground text-[10px] font-semibold tracking-[0.12em] uppercase">
            {t("welcome.onboarding.summaryRegional")}
          </p>
          <p className="mt-1 text-sm font-medium">
            {companyDraft.currency} · {companyDraft.timezone} · {prefs.language.toUpperCase()}
          </p>
          <p className="text-muted-foreground text-xs">{companyDraft.dateFormat}</p>
        </div>
      </div>
    )
  }

  return null
}

export function useWelcomeCompanyDraft() {
  const { user, activeCompany } = useAuth()
  const { prefs, update: updateAppearance } = useAppearance()
  const [companyDraft, setCompanyDraft] = useState<CompanySettings>(DEFAULT_COMPANY_SETTINGS)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function hydrate() {
      try {
        const remote = await apiGetCompanySettings()
        if (cancelled) return
        if (remote) {
          const country = remote.country || ""
          const defaults = regionalDefaultsForCountry(country)
          const browserTz = detectBrowserTimezone()
          const timezone =
            remote.timezone ||
            (browserTz && TIMEZONE_OPTIONS.some((z) => z.value === browserTz)
              ? browserTz
              : defaults.timezone)

          const next = {
            ...companySettingsFromRemote(remote),
            name: remote.name || activeCompany?.name || "",
            email: user?.email || remote.email || "",
            currency: remote.currency || defaults.currency,
            timezone,
            dateFormat: (remote.dateFormat as DateFormatOption) || defaults.dateFormat,
          }
          setCompanyDraft(next)
          saveCompanySettings(next)

          if (!prefs.language || prefs.language === "en") {
            if (defaults.language !== "en") {
              updateAppearance({ language: defaults.language })
            }
          }
          setHydrated(true)
          return
        }
      } catch {
        /* seeded below */
      }

      if (!cancelled) {
        const defaults = regionalDefaultsForCountry(undefined)
        setCompanyDraft({
          ...DEFAULT_COMPANY_SETTINGS,
          name: activeCompany?.name || "",
          email: user?.email || "",
          ...defaults,
        })
        setHydrated(true)
      }
    }

    void hydrate()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- hydrate once per session identity
  }, [activeCompany?.name, user?.email])

  function updateCompany(patch: Partial<CompanySettings>) {
    setCompanyDraft((prev) => ({
      ...prev,
      ...patch,
      email: user?.email || prev.email,
    }))
  }

  return { companyDraft, updateCompany, hydrated }
}
