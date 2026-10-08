"use client"

import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { ImagePlus, X } from "lucide-react"

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
  DEFAULT_COMPANY_SETTINGS,
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

const fieldClass = "h-10 rounded-xl"
const labelClass = "text-[12.5px] font-medium"

export async function persistWelcomeCompany(settings: CompanySettings) {
  const address = composeAddress({
    street: settings.addressLine1,
    city: settings.city,
    state: settings.state,
    postalCode: settings.postalCode,
    country: settings.country,
  })
  await apiPatchCompanySettings({
    name: settings.name.trim(),
    tagline: settings.tagline.trim(),
    industry: settings.industry.trim(),
    website: settings.website.trim(),
    country: settings.country.trim(),
    address,
    city: settings.city.trim(),
    state: settings.state.trim(),
    postalCode: settings.postalCode.trim(),
    phone: settings.phone.trim(),
    email: settings.email.trim(),
    logoUrl: settings.logoUrl.trim() || undefined,
    currency: settings.currency,
    timezone: settings.timezone,
    dateFormat: settings.dateFormat,
    invoicePrefix: settings.invoicePrefix.trim() || "INV",
    nextInvoiceNumber: settings.nextInvoiceNumber,
    paymentTermsDays: settings.paymentTermsDays,
    invoiceNote: settings.invoiceNote.trim(),
    paymentInstructions: settings.paymentInstructions.trim(),
  })
}

export function WelcomeSetupBody({
  step,
  companyDraft,
  onCompanyChange,
  accountEmail,
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
    return (
      <div className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-2">
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

          <div className="space-y-1.5">
            <Label htmlFor="ob-email" className={labelClass}>
              {t("welcome.onboarding.businessEmail")}
            </Label>
            <Input
              id="ob-email"
              type="email"
              value={companyDraft.email}
              onChange={(e) => onCompanyChange({ email: e.target.value })}
              className={fieldClass}
            />
            {accountEmail ? (
              <button
                type="button"
                className="text-primary text-[11px] font-medium hover:underline"
                onClick={() => onCompanyChange({ email: accountEmail })}
              >
                {t("welcome.onboarding.useAccountEmail")}
              </button>
            ) : (
              <p className="text-muted-foreground text-[11px]">
                {t("welcome.onboarding.businessEmailHint")}
              </p>
            )}
          </div>

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
        </div>

        <div className="space-y-2">
          <Label className={labelClass}>{t("welcome.onboarding.logo")}</Label>
          <p className="text-muted-foreground text-[11px] leading-relaxed">
            {t("welcome.onboarding.logoHint")}
          </p>
          {companyDraft.logoUrl ? (
            <div className="border-border relative flex items-center gap-3 rounded-xl border p-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={companyDraft.logoUrl}
                alt=""
                className="size-14 rounded-lg object-contain"
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{t("welcome.onboarding.logoAdded")}</p>
                <p className="text-muted-foreground text-[11px]">
                  {t("welcome.onboarding.logoOptional")}
                </p>
              </div>
              <button
                type="button"
                className="text-muted-foreground hover:text-foreground rounded-full p-1"
                onClick={() => onCompanyChange({ logoUrl: "" })}
                aria-label={t("welcome.onboarding.removeLogo")}
              >
                <X className="size-4" />
              </button>
            </div>
          ) : (
            <label className="border-border hover:bg-muted/40 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed px-4 py-8 transition-colors">
              <ImagePlus className="text-muted-foreground size-6" />
              <span className="text-sm font-medium">{t("welcome.onboarding.uploadLogo")}</span>
              <span className="text-muted-foreground text-center text-[11px]">
                {t("welcome.onboarding.logoSpecs")}
              </span>
              <input
                type="file"
                accept="image/png,image/jpeg,image/svg+xml,image/webp"
                className="sr-only"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (!file?.type.startsWith("image/")) return
                  const reader = new FileReader()
                  reader.onload = () =>
                    onCompanyChange({ logoUrl: String(reader.result) })
                  reader.readAsDataURL(file)
                }}
              />
            </label>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="ob-website" className={labelClass}>
            {t("welcome.onboarding.website")}{" "}
            <span className="text-muted-foreground font-normal">
              ({t("welcome.onboarding.optional")})
            </span>
          </Label>
          <Input
            id="ob-website"
            value={companyDraft.website}
            onChange={(e) => onCompanyChange({ website: e.target.value })}
            placeholder="https://"
            className={fieldClass}
          />
        </div>

        <div className="space-y-3">
          <div>
            <Label className={labelClass}>{t("welcome.onboarding.address")}</Label>
            <p className="text-muted-foreground mt-0.5 text-[11px] leading-relaxed">
              {t("welcome.onboarding.addressHint")}
            </p>
          </div>
          <Input
            value={companyDraft.addressLine1}
            onChange={(e) => onCompanyChange({ addressLine1: e.target.value })}
            placeholder={t("welcome.onboarding.street")}
            className={fieldClass}
          />
          <div className="grid gap-3 sm:grid-cols-3">
            <Input
              value={companyDraft.city}
              onChange={(e) => onCompanyChange({ city: e.target.value })}
              placeholder={t("welcome.onboarding.city")}
              className={fieldClass}
            />
            <Input
              value={companyDraft.state}
              onChange={(e) => onCompanyChange({ state: e.target.value })}
              placeholder={t("welcome.onboarding.state")}
              className={fieldClass}
            />
            <Input
              value={companyDraft.postalCode}
              onChange={(e) => onCompanyChange({ postalCode: e.target.value })}
              placeholder={t("welcome.onboarding.postal")}
              className={fieldClass}
            />
          </div>
        </div>
      </div>
    )
  }

  if (step === 2) {
    return (
      <div className="space-y-4">
        <p className="text-muted-foreground text-[13px] leading-relaxed">
          {t("welcome.onboarding.regionalLead")}
        </p>
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
    const preview = formatInvoicePreview(
      companyDraft.invoicePrefix,
      companyDraft.nextInvoiceNumber
    )
    const terms =
      companyDraft.paymentTermsDays === 0
        ? t("welcome.onboarding.dueOnReceipt")
        : t("welcome.onboarding.customDays", {
            days: companyDraft.paymentTermsDays,
          })
    return (
      <div className="space-y-4">
        <div className="border-border rounded-xl border px-4 py-3">
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
        <div className="border-border rounded-xl border px-4 py-3">
          <p className="text-muted-foreground text-[10px] font-semibold tracking-[0.12em] uppercase">
            {t("welcome.onboarding.summaryRegional")}
          </p>
          <p className="mt-1 text-sm font-medium">
            {companyDraft.currency} · {companyDraft.timezone} · {prefs.language.toUpperCase()}
          </p>
          <p className="text-muted-foreground text-xs">{companyDraft.dateFormat}</p>
        </div>
        <div className="border-border rounded-xl border px-4 py-3">
          <p className="text-muted-foreground text-[10px] font-semibold tracking-[0.12em] uppercase">
            {t("welcome.onboarding.summaryInvoices")}
          </p>
          <p className="mt-1 text-sm font-medium">
            {preview} · {terms}
          </p>
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

          // Legacy: industry/country may still live in tagline/address from older signups.
          const industry = remote.industry || remote.tagline || ""
          const legacyCountry =
            remote.country ||
            (!remote.city && !remote.state ? remote.address : "") ||
            ""

          setCompanyDraft({
            ...DEFAULT_COMPANY_SETTINGS,
            name: remote.name || activeCompany?.name || "",
            tagline: remote.tagline && remote.tagline !== industry ? remote.tagline : "",
            industry,
            website: remote.website || "",
            country: legacyCountry,
            addressLine1:
              remote.city || remote.state || remote.postalCode
                ? remote.address?.split(",")[0]?.trim() || ""
                : remote.country
                  ? ""
                  : remote.address || "",
            addressLine2: "",
            city: remote.city || "",
            state: remote.state || "",
            postalCode: remote.postalCode || "",
            phone: remote.phone || "",
            email: remote.email || user?.email || "",
            logoUrl: remote.logoUrl || "",
            currency: remote.currency || defaults.currency,
            timezone,
            dateFormat: (remote.dateFormat as DateFormatOption) || defaults.dateFormat,
            invoicePrefix: remote.invoicePrefix || "INV",
            nextInvoiceNumber: remote.nextInvoiceNumber || 1,
            paymentTermsDays:
              typeof remote.paymentTermsDays === "number"
                ? remote.paymentTermsDays
                : 30,
            invoiceNote: remote.invoiceNote || "",
            paymentInstructions: remote.paymentInstructions || "",
          })

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
    setCompanyDraft((prev) => ({ ...prev, ...patch }))
  }

  return { companyDraft, updateCompany, hydrated }
}
