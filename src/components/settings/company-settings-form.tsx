"use client"

import { useEffect, useState } from "react"
import { IconCamera, IconX } from "@tabler/icons-react"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"

import { SettingsSection } from "@/components/settings/settings-section"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  DEFAULT_COMPANY_SETTINGS,
  loadCompanySettings,
  saveCompanySettings,
  type CompanySettings,
} from "@/lib/company-settings"

export function CompanySettingsForm() {
  const { t } = useTranslation("settings")
  const [settings, setSettings] = useState<CompanySettings>(DEFAULT_COMPANY_SETTINGS)

  useEffect(() => {
    setSettings(loadCompanySettings())
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
    saveCompanySettings(settings)
    toast.success(t("company.toastSaved"))
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
          <Label htmlFor="company-tagline">{t("company.tagline")}</Label>
          <Input
            id="company-tagline"
            value={settings.tagline}
            onChange={(e) => update({ tagline: e.target.value })}
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
      </div>
    </SettingsSection>
  )
}
