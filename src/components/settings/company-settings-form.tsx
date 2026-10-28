"use client"

import { useEffect, useState } from "react"
import { IconCamera, IconX } from "@tabler/icons-react"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"

import { SettingsSection } from "@/components/settings/settings-section"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { apiGetCompanySettings, apiPatchCompanySettings } from "@/lib/api/auth"
import {
  companySettingsFromRemote,
  DEFAULT_COMPANY_SETTINGS,
  loadCompanySettings,
  saveCompanySettings,
  type CompanySettings,
} from "@/lib/company-settings"
import { composeAddress } from "@/lib/onboarding-defaults"

export function CompanySettingsForm() {
  const { t } = useTranslation("settings")
  const [settings, setSettings] = useState<CompanySettings>(() =>
    typeof window === "undefined" ? DEFAULT_COMPANY_SETTINGS : loadCompanySettings()
  )

  useEffect(() => {
    let cancelled = false
    apiGetCompanySettings()
      .then((remote) => {
        if (cancelled || !remote) return
        const next = companySettingsFromRemote(remote)
        setSettings(next)
        saveCompanySettings(next)
      })
      .catch(() => {
        if (!cancelled) setSettings(loadCompanySettings())
      })
    return () => {
      cancelled = true
    }
  }, [])

  const update = (patch: Partial<CompanySettings>) => {
    setSettings((prev) => ({ ...prev, ...patch }))
  }

  const addLogo = (file: File | undefined) => {
    if (!file?.type.startsWith("image/")) return
    const reader = new FileReader()
    reader.onload = () => update({ logoUrl: String(reader.result) })
    reader.readAsDataURL(file)
  }

  const handleSave = () => {
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
      street: [next.addressLine1, next.addressLine2].filter(Boolean).join(", "),
      city: next.city,
      state: next.state,
      postalCode: next.postalCode,
      country: next.country,
    })
    void apiPatchCompanySettings({
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
      .then(() => {
        setSettings(next)
        saveCompanySettings(next)
        toast.success(t("company.toastSaved"))
      })
      .catch((error: unknown) => {
        toast.error(error instanceof Error ? error.message : "Could not save company settings")
      })
  }

  const logoPreview = settings.logoUrl.trim() || "/assets/logo-2.png"

  return (
    <SettingsSection
      title={t("company.title")}
      description={t("company.description")}
      footer={
        <Button type="button" onClick={handleSave}>
          {t("company.save")}
        </Button>
      }
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
        <div className="relative shrink-0">
          <label
            htmlFor="company-logo"
            className="group border-border bg-muted/40 relative flex size-28 cursor-pointer items-center justify-center overflow-hidden rounded-2xl border ring-1 ring-border/30"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={logoPreview}
              alt={t("company.logoAlt")}
              className="max-h-full max-w-full object-contain p-3"
            />
            <span className="absolute inset-0 flex items-center justify-center bg-black/45 opacity-0 transition-opacity group-hover:opacity-100">
              <IconCamera className="size-7 text-white" />
            </span>
          </label>
          {settings.logoUrl ? (
            <button
              type="button"
              className="bg-background text-muted-foreground hover:bg-destructive/10 hover:text-destructive absolute -top-1 -end-1 flex size-7 items-center justify-center rounded-full border shadow-sm"
              aria-label={t("company.removeLogo")}
              onClick={() => update({ logoUrl: "" })}
            >
              <IconX className="size-3.5" />
            </button>
          ) : null}
          <Input
            id="company-logo"
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={(e) => {
              addLogo(e.target.files?.[0])
              e.target.value = ""
            }}
          />
        </div>

        <div className="text-muted-foreground min-w-0 flex-1 space-y-1 text-sm lg:pt-2">
          <p className="text-foreground font-medium">{t("company.logoTitle")}</p>
          <p>{t("company.logoHint")}</p>
          <p>{t("company.logoDefaultHint")}</p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="company-name">{t("company.name")}</Label>
          <Input
            id="company-name"
            value={settings.name}
            onChange={(e) => update({ name: e.target.value })}
          />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="company-address-1">{t("company.addressLine1")}</Label>
          <Input
            id="company-address-1"
            value={settings.addressLine1}
            onChange={(e) => update({ addressLine1: e.target.value })}
          />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="company-address-2">{t("company.addressLine2")}</Label>
          <Input
            id="company-address-2"
            value={settings.addressLine2}
            onChange={(e) => update({ addressLine2: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="company-city">{t("company.city")}</Label>
          <Input
            id="company-city"
            value={settings.city}
            onChange={(e) => update({ city: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="company-state">{t("company.state")}</Label>
          <Input
            id="company-state"
            value={settings.state}
            onChange={(e) => update({ state: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="company-postal">{t("company.postalCode")}</Label>
          <Input
            id="company-postal"
            value={settings.postalCode}
            onChange={(e) => update({ postalCode: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="company-country">{t("company.country")}</Label>
          <Input
            id="company-country"
            value={settings.country}
            onChange={(e) => update({ country: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="company-phone">{t("company.phone")}</Label>
          <Input
            id="company-phone"
            value={settings.phone}
            onChange={(e) => update({ phone: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="company-email">{t("company.email")}</Label>
          <Input
            id="company-email"
            type="email"
            value={settings.email}
            onChange={(e) => update({ email: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="company-currency">{t("company.currency")}</Label>
          <Input
            id="company-currency"
            value={settings.currency}
            onChange={(e) => update({ currency: e.target.value.toUpperCase() })}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="company-timezone">{t("company.timezone")}</Label>
          <Input
            id="company-timezone"
            value={settings.timezone}
            onChange={(e) => update({ timezone: e.target.value })}
          />
        </div>
      </div>
    </SettingsSection>
  )
}
