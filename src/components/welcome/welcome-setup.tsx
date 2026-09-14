"use client"

import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useFiscalTerms } from "@/context/fiscal-term-context"
import {
  DEFAULT_COMPANY_SETTINGS,
  loadCompanySettings,
  saveCompanySettings,
  type CompanySettings,
} from "@/lib/company-settings"
import { addMonthsIso, formatShortDate } from "@/lib/fiscal-terms"
import { cn } from "@/lib/utils"

export const WELCOME_SETUP_STEPS = 4

const TENURE_OPTIONS = [6, 12, 24] as const

export function WelcomeSetupBody({
  step,
}: {
  step: number
}) {
  const { t } = useTranslation("common")
  const { state, updateActiveTenure } = useFiscalTerms()
  const [tenure, setTenure] = useState(state.active.tenureMonths || 12)
  const [company, setCompany] = useState<CompanySettings>(DEFAULT_COMPANY_SETTINGS)

  useEffect(() => {
    setCompany(loadCompanySettings())
  }, [])

  useEffect(() => {
    setTenure(state.active.tenureMonths || 12)
  }, [state.active.tenureMonths])

  const plannedEnd = formatShortDate(
    addMonthsIso(state.active.startedAt, tenure)
  )

  if (step === 1) {
    return (
      <div className="space-y-4">
        <p className="text-foreground/80 text-[13px] leading-relaxed">
          {t("welcome.guide.termBody")}
        </p>
        <p className="text-muted-foreground text-[13px] leading-relaxed">
          {t("welcome.guide.termCurrent", { sequence: state.active.sequence })}
        </p>
        <div>
          <p className="text-[13px] font-medium">{t("welcome.guide.termLength")}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {TENURE_OPTIONS.map((months) => (
              <button
                key={months}
                type="button"
                onClick={() => {
                  setTenure(months)
                  updateActiveTenure(months)
                }}
                className={cn(
                  "h-8 rounded-full border px-3 text-[12.5px] font-medium transition-colors",
                  tenure === months
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background text-foreground hover:bg-muted/60"
                )}
              >
                {t("welcome.guide.termMonths", { months })}
              </button>
            ))}
          </div>
          <p className="text-muted-foreground mt-2 text-[12px]">
            {t("welcome.guide.termEnds", { date: plannedEnd })}
          </p>
          <p className="text-muted-foreground mt-1 text-[12px]">
            {t("welcome.guide.termHint")}
          </p>
        </div>
      </div>
    )
  }

  if (step === 2) {
    const update = (patch: Partial<CompanySettings>) => {
      setCompany((prev) => {
        const next = { ...prev, ...patch }
        saveCompanySettings(next)
        return next
      })
    }

    return (
      <div className="space-y-4">
        <p className="text-foreground/80 text-[13px] leading-relaxed">
          {t("welcome.guide.settingsBody")}
        </p>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="welcome-company-name" className="text-[12.5px]">
              {t("welcome.guide.companyName")}
            </Label>
            <Input
              id="welcome-company-name"
              value={company.name}
              onChange={(event) => update({ name: event.target.value })}
              className="h-9"
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="welcome-company-phone" className="text-[12.5px]">
                {t("welcome.guide.companyPhone")}
              </Label>
              <Input
                id="welcome-company-phone"
                value={company.phone}
                onChange={(event) => update({ phone: event.target.value })}
                className="h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="welcome-company-email" className="text-[12.5px]">
                {t("welcome.guide.companyEmail")}
              </Label>
              <Input
                id="welcome-company-email"
                type="email"
                value={company.email}
                onChange={(event) => update({ email: event.target.value })}
                className="h-9"
              />
            </div>
          </div>
        </div>
      </div>
    )
  }

  return null
}
