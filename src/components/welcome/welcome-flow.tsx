"use client"

import { useEffect, useRef, useState, type ReactNode } from "react"
import Image from "next/image"
import { usePathname, useRouter } from "next/navigation"
import { Check, ChevronLeft, ChevronRight, ImagePlus, Monitor, Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"

import { AUTH_INPUT } from "@/components/auth/auth-shell"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { persistWelcomeCompany, useWelcomeCompanyDraft } from "@/components/welcome/welcome-setup"
import { useAppearance } from "@/components/theme/appearance-provider"
import { useAuth } from "@/context/auth-context"
import { useFiscalTerms } from "@/context/fiscal-term-context"
import { useMoneyFormatSettings } from "@/hooks/use-money-format-settings"
import { apiBillingSummary, apiPatchOnboarding, type SessionPayload } from "@/lib/api/auth"
import { ACCENT_PRESETS, type AppLanguage } from "@/lib/appearance-prefs"
import { addMonthsIso, clampTenureMonths, formatShortDate } from "@/lib/fiscal-terms"
import type { MoneyFormatVariant } from "@/lib/money-format-settings"
import { CURRENCY_OPTIONS, regionalDefaultsForCountry } from "@/lib/onboarding-defaults"
import { SIGNUP_COUNTRIES } from "@/lib/countries"
import { SIGNUP_INDUSTRIES } from "@/lib/industries"
import { PLAN_BLURB, TRIAL_DAYS, formatPlanPrice } from "@/lib/plans"
import { markSetupMilestone } from "@/lib/setup-progress"
import { FALLBACK_PLANS, formatTrialEndDate } from "@/lib/subscription-access"
import {
  completeWelcomeFlow,
  isWelcomeFlowCompleted,
  isWelcomeFlowDismissed,
  isWelcomeFlowPending,
  pathMatches,
  queueWelcomeFlow,
  readWelcomeSetupStep,
  saveWelcomeSetupStep,
  toAppPath,
  WELCOME_OPEN_EVENT,
  type WelcomeSetupStep,
} from "@/lib/welcome-flow"
import { cn } from "@/lib/utils"

const TERM_OPTIONS = [
  { months: 6 as const, key: "termOption6", recommended: false },
  { months: 12 as const, key: "termOption12", recommended: true },
  { months: 24 as const, key: "termOption24", recommended: false },
]

const LANGUAGE_ANSWERS: { value: AppLanguage; label: string; hintKey: string }[] = [
  { value: "en", label: "English", hintKey: "languageEnHint" },
  { value: "ar", label: "العربية", hintKey: "languageArHint" },
  { value: "ur", label: "اردو", hintKey: "languageUrHint" },
]

function moneyVariantForCurrency(code: string): MoneyFormatVariant | null {
  if (code === "PKR") return "pakistani"
  if (code === "INR") return "indian"
  if (code === "GBP") return "uk"
  if (code === "USD") return "us"
  return null
}

function StepDots({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center justify-center gap-1.5" aria-hidden>
      {Array.from({ length: total }).map((_, index) => (
        <span
          key={index}
          className={cn(
            "size-1.5 rounded-full",
            index === current ? "bg-foreground" : "bg-foreground/20"
          )}
        />
      ))}
    </div>
  )
}

function TrialTimeline({
  progress,
  startDate,
  endDate,
  dayLabel,
  daysLabel,
  startedCaption,
  endsCaption,
}: {
  progress: number
  startDate: string
  endDate: string
  dayLabel: string
  daysLabel: string
  startedCaption: string
  endsCaption: string
}) {
  const pct = Math.min(100, Math.max(0, progress * 100))
  const showNow = pct > 6 && pct < 94
  return (
    <div className="mt-3.5">
      <div className="relative h-3">
        <div className="bg-primary/15 absolute inset-x-1 top-1/2 h-px -translate-y-1/2 rounded-full" />
        <div
          className="bg-primary absolute top-1/2 left-1 h-px -translate-y-1/2 rounded-full"
          style={{ width: pct <= 0 ? 0 : `max(2px, calc(${pct}% - 0.25rem))` }}
        />
        <span className="bg-primary absolute top-1/2 left-0 size-2 -translate-y-1/2 rounded-full" />
        {showNow ? (
          <span
            className="border-primary bg-background absolute top-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2"
            style={{ left: `${pct}%` }}
          />
        ) : null}
        <span className="border-foreground/20 bg-background absolute top-1/2 right-0 size-2 -translate-y-1/2 rounded-full border" />
      </div>
      <p className="mt-2 text-[11px] leading-snug">
        <span className="font-semibold">{dayLabel}</span>
        <span className="text-muted-foreground"> · {daysLabel}</span>
      </p>
      <div className="mt-1.5 flex items-start justify-between gap-3 text-[11px]">
        <div>
          <p className="font-semibold">{startDate}</p>
          <p className="text-muted-foreground mt-0.5">{startedCaption}</p>
        </div>
        <div className="text-end">
          <p className="font-semibold">{endDate}</p>
          <p className="text-muted-foreground mt-0.5">{endsCaption}</p>
        </div>
      </div>
    </div>
  )
}

function FieldRow({
  label,
  htmlFor,
  className,
  children,
}: {
  label: string
  htmlFor?: string
  className?: string
  children: ReactNode
}) {
  return (
    <div className={cn("grid gap-1.5", className)}>
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </div>
  )
}

function ChoiceCard({
  selected,
  title,
  hint,
  mark,
  onClick,
}: {
  selected: boolean
  title: string
  hint: string
  mark: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        "flex w-full items-center gap-3 rounded-2xl px-3.5 py-3 text-start transition-colors",
        selected ? "bg-primary/10" : "bg-muted/50 hover:bg-muted"
      )}
    >
      <span
        className={cn(
          "flex size-10 shrink-0 items-center justify-center rounded-xl text-[11px] font-semibold",
          selected ? "bg-primary/15 text-primary" : "bg-muted text-foreground"
        )}
      >
        {mark}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold tracking-tight">{title}</span>
        <span className="text-muted-foreground mt-0.5 block text-xs leading-snug">{hint}</span>
      </span>
      <span
        className={cn(
          "flex size-5 shrink-0 items-center justify-center rounded-full border",
          selected
            ? "border-primary bg-primary text-primary-foreground"
            : "border-muted-foreground/30"
        )}
      >
        {selected ? <Check className="size-3" strokeWidth={3} /> : null}
      </span>
    </button>
  )
}

export function WelcomeFlow() {
  const { t } = useTranslation("common")
  const { t: tBilling } = useTranslation("settings")
  const { hydrated, isAuthenticated, activeCompany, access, user } = useAuth()
  const pathname = usePathname()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [setupStep, setSetupStep] = useState<WelcomeSetupStep>(0)
  const [placed, setPlaced] = useState(false)
  const [saving, setSaving] = useState(false)
  const [termMonths, setTermMonths] = useState(12)
  const [termCustom, setTermCustom] = useState(false)
  const [customMonths, setCustomMonths] = useState("18")
  const [shown, setShown] = useState(true)
  const [logoPreview, setLogoPreview] = useState("")
  const stepTimer = useRef<number | null>(null)
  const { state: fiscalState, updateActiveTenure } = useFiscalTerms()
  const { setVariant } = useMoneyFormatSettings()
  const { prefs, update: updateAppearance } = useAppearance()
  const { theme, setTheme } = useTheme()
  const [themeReady, setThemeReady] = useState(false)
  const { companyDraft, updateCompany, hydrated: draftHydrated } =
    useWelcomeCompanyDraft()
  const [planDetail, setPlanDetail] = useState<SessionPayload["plan"] | null>(null)
  const [trialEndsAt, setTrialEndsAt] = useState<string | null>(null)
  const appearanceMode = themeReady ? (theme ?? "system") : "system"

  useEffect(() => {
    setThemeReady(true)
  }, [])

  useEffect(() => {
    if (!open) return
    let cancelled = false
    apiBillingSummary()
      .then((data) => {
        if (cancelled) return
        setPlanDetail(data.plan)
        setTrialEndsAt(data.subscription?.trialEndsAt ?? null)
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [open])

  useEffect(() => {
    function onOpenRequest() {
      if (isWelcomeFlowCompleted()) return
      setSetupStep(readWelcomeSetupStep())
      setOpen(true)
    }
    window.addEventListener(WELCOME_OPEN_EVENT, onOpenRequest)
    return () => window.removeEventListener(WELCOME_OPEN_EVENT, onOpenRequest)
  }, [])

  useEffect(() => {
    if (!hydrated || !isAuthenticated) return
    if (open) return
    const fromUrl =
      typeof window !== "undefined" &&
      new URLSearchParams(window.location.search).get("welcome") === "1"
    if (fromUrl) queueWelcomeFlow()
    else if (isWelcomeFlowCompleted() || isWelcomeFlowDismissed()) return
    if (isWelcomeFlowPending()) {
      setSetupStep(readWelcomeSetupStep())
      setOpen(true)
    }
  }, [hydrated, isAuthenticated, open])

  function clearWelcomeQuery() {
    if (typeof window === "undefined") return
    const url = new URL(window.location.href)
    if (!url.searchParams.has("welcome")) return
    url.searchParams.delete("welcome")
    router.replace(`${url.pathname}${url.search}${url.hash}`)
  }

  function handleLogoFile(file: File | undefined) {
    if (!file?.type.startsWith("image/")) return
    const preview = URL.createObjectURL(file)
    setLogoPreview((current) => {
      if (current.startsWith("blob:")) URL.revokeObjectURL(current)
      return preview
    })
    const image = new Image()
    image.onload = () => {
      const max = 512
      const scale = Math.min(1, max / Math.max(image.width, image.height))
      const canvas = document.createElement("canvas")
      canvas.width = Math.max(1, Math.round(image.width * scale))
      canvas.height = Math.max(1, Math.round(image.height * scale))
      const ctx = canvas.getContext("2d")
      if (!ctx) return
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height)
      const keepPng = file.type === "image/png" || file.type === "image/webp"
      updateCompany({
        logoUrl: canvas.toDataURL(keepPng ? "image/png" : "image/jpeg", 0.86),
      })
    }
    image.src = preview
  }

  function goToStep(step: WelcomeSetupStep) {
    if (step === setupStep || stepTimer.current !== null) return
    setShown(false)
    stepTimer.current = window.setTimeout(() => {
      setSetupStep(step)
      saveWelcomeSetupStep(step)
      setShown(true)
      stepTimer.current = null
    }, 180)
  }

  useEffect(() => {
    return () => {
      if (stepTimer.current !== null) window.clearTimeout(stepTimer.current)
    }
  }, [])

  const businessKnown =
    draftHydrated &&
    companyDraft.name.trim().length >= 2 &&
    companyDraft.industry.trim().length >= 2 &&
    companyDraft.phone.trim().length > 0

  useEffect(() => {
    if (!open) {
      setPlaced(false)
      return
    }
    if (!draftHydrated || placed) return
    const saved = readWelcomeSetupStep()
    const next: WelcomeSetupStep =
      saved === 6
        ? 6
        : saved >= 1 && saved <= 5
          ? saved
          : 0
    setSetupStep(next)
    saveWelcomeSetupStep(next)
    setPlaced(true)
  }, [open, draftHydrated, placed, businessKnown])

  function finishSetup() {
    completeWelcomeFlow()
    setOpen(false)
    clearWelcomeQuery()
    if (!pathMatches(pathname, "/home")) {
      router.push(toAppPath("/home"))
    }
  }

  async function handleContinue() {
    if (setupStep === 0) {
      goToStep(1)
      return
    }

    if (setupStep === 1) {
      const name = companyDraft.name.trim()
      if (name.length < 2) {
        toast.error(t("welcome.onboarding.businessNameRequired"))
        return
      }
      if (companyDraft.industry.trim().length < 2) {
        toast.error(t("welcome.onboarding.industryRequired"))
        return
      }
      if (!companyDraft.phone.trim()) {
        toast.error(t("welcome.onboarding.phoneRequired"))
        return
      }
      setSaving(true)
      try {
        await persistWelcomeCompany({
          ...companyDraft,
          name,
          email: user?.email?.trim() || companyDraft.email,
        })
        void apiPatchOnboarding({ business: true }).catch(() => undefined)
        goToStep(2)
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : t("welcome.onboarding.saveFailed")
        )
      } finally {
        setSaving(false)
      }
      return
    }

    if (setupStep === 2 || setupStep === 3) {
      goToStep((setupStep + 1) as WelcomeSetupStep)
      return
    }

    if (setupStep === 4) {
      if (!companyDraft.currency.trim()) {
        toast.error(t("welcome.onboarding.currencyRequired"))
        return
      }
      setSaving(true)
      try {
        await persistWelcomeCompany({
          ...companyDraft,
          email: user?.email?.trim() || companyDraft.email,
        })
        const variant = moneyVariantForCurrency(companyDraft.currency)
        if (variant) setVariant(variant)
        void apiPatchOnboarding({ business: true, preferences: true }).catch(() => undefined)
        goToStep(5)
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : t("welcome.onboarding.saveFailed")
        )
      } finally {
        setSaving(false)
      }
      return
    }

    if (setupStep === 5) {
      updateActiveTenure(termMonths)
      void apiPatchOnboarding(
        { business: true, preferences: true, invoices: true },
        true
      ).catch(() => undefined)
      markSetupMilestone("settings")
      goToStep(6)
      return
    }

    finishSetup()
  }

  function previousStep(step: WelcomeSetupStep): WelcomeSetupStep {
    return (step - 1) as WelcomeSetupStep
  }

  const businessName =
    companyDraft.name.trim() || activeCompany?.name?.trim() || "your business"
  const firstName = user?.name?.trim().split(/\s+/)[0]

  const title =
    setupStep === 0
      ? firstName
        ? t("welcome.onboarding.welcomeTitleNamed", { name: firstName })
        : t("welcome.onboarding.welcomeTitle")
      : setupStep === 1
        ? t("welcome.onboarding.profileQuestion")
        : setupStep === 2
          ? t("welcome.onboarding.colorQuestion")
          : setupStep === 3
            ? t("welcome.onboarding.languageQuestion")
            : setupStep === 4
              ? t("welcome.onboarding.currencyQuestion")
              : setupStep === 5
                ? t("welcome.onboarding.termQuestion")
                : t("welcome.onboarding.completeTitle")

  const description =
    setupStep === 0
      ? t("welcome.onboarding.welcomeTrial", { business: businessName })
      : setupStep === 1
        ? t("welcome.onboarding.profileQuestionLead")
        : setupStep === 2
          ? t("welcome.onboarding.colorQuestionLead")
          : setupStep === 3
            ? t("welcome.onboarding.languageQuestionLead")
            : setupStep === 4
              ? t("welcome.onboarding.currencyQuestionLead")
              : setupStep === 5
                ? t("welcome.onboarding.termQuestionLead")
                : t("welcome.onboarding.completeSubtitle")

  const primaryLabel =
    setupStep === 0
      ? t("welcome.continue")
      : setupStep === 6
        ? t("welcome.onboarding.goDashboard")
        : t("welcome.continue")

  const fallbackPlan = FALLBACK_PLANS.find((plan) => plan.code === access?.planCode)
  const planName = planDetail?.displayName || access?.planName || fallbackPlan?.displayName || "—"
  const planStatusKey =
    access?.status === "TRIAL"
      ? "trial"
      : access?.status === "ACTIVE"
        ? "active"
        : access?.status === "PAST_DUE"
          ? "pastDue"
          : access?.status === "CANCELLED"
            ? "cancelled"
            : access?.status === "EXPIRED"
              ? "expired"
              : null
  const planStatus = planStatusKey
    ? tBilling(`billing.statuses.${planStatusKey}`)
    : access?.status || tBilling("billing.freeTrial")
  const monthly = planDetail?.priceMonthly ?? fallbackPlan?.priceMonthly
  const planPrice = monthly != null ? formatPlanPrice(monthly) : null
  const endsAt = trialEndsAt ?? access?.trialEndsAt ?? null
  const dayMs = 24 * 60 * 60 * 1000
  const endMs = endsAt ? new Date(endsAt).getTime() : null
  const onTrial = access?.status === "TRIAL" && endMs != null
  const daysUntilEnd = endMs ? Math.max(0, Math.ceil((endMs - Date.now()) / dayMs)) : 0
  const spanDays = Math.max(TRIAL_DAYS, daysUntilEnd || TRIAL_DAYS)
  const startMs = endMs != null ? endMs - spanDays * dayMs : null
  const elapsedMs =
    startMs != null && endMs != null ? Math.min(Math.max(Date.now() - startMs, 0), endMs - startMs) : 0
  const trialProgress =
    startMs != null && endMs != null && endMs > startMs ? elapsedMs / (endMs - startMs) : 0
  const elapsedDays = Math.min(spanDays, Math.floor(elapsedMs / dayMs))
  const trialDay = Math.min(spanDays, elapsedDays + 1)
  const daysRemaining = Math.max(0, spanDays - elapsedDays)
  const daysLabel =
    daysRemaining <= 0
      ? t("welcome.onboarding.trialEndsToday")
      : daysRemaining === 1
        ? t("welcome.onboarding.dayLeft")
        : t("welcome.onboarding.daysLeft", { count: daysRemaining })
  const trialDayLabel = t("welcome.onboarding.trialDayOf", { day: trialDay, total: spanDays })
  const planCode = planDetail?.code || access?.planCode || fallbackPlan?.code || ""
  const planBlurb =
    PLAN_BLURB[planCode] ||
    (planCode === "enterprise" ? "The full workspace, with room to grow." : "")

  const showBack = placed && setupStep > 0
  const flowSteps = [0, 1, 2, 3, 4, 5] as const
  const flowIndex = flowSteps.indexOf(setupStep as (typeof flowSteps)[number])
  const progressCurrent = flowIndex === -1 ? flowSteps.length : flowIndex + 1
  const progressTotal = flowSteps.length

  const logo = (
    <>
      <Image
        src="/assets/logo-2.png"
        alt="Custoray"
        width={168}
        height={48}
        className="h-full w-auto object-contain dark:hidden"
        priority
      />
      <Image
        src="/assets/logo-3.png"
        alt=""
        width={168}
        height={48}
        className="hidden h-full w-auto object-contain dark:block"
        priority
      />
    </>
  )

  return (
    <Dialog open={open}>
      <DialogContent
        showCloseButton={false}
        className={cn(
          "bg-background text-foreground flex max-h-[92vh] w-full max-w-[calc(100%-1.5rem)] flex-col gap-0 rounded-[1.75rem] border-0 p-0 shadow-[0_24px_80px_rgba(15,23,42,0.14)] ring-0 outline-none [font-family:var(--font-poppins),ui-sans-serif,system-ui,sans-serif] focus:ring-0 focus-visible:ring-0 sm:max-w-[42rem]",
          setupStep === 1 ? "h-auto overflow-y-auto" : setupStep === 0 || setupStep === 6 ? "h-auto overflow-hidden" : "h-[36rem] overflow-hidden",
        )}
        onPointerDownOutside={(event) => event.preventDefault()}
        onEscapeKeyDown={(event) => event.preventDefault()}
        onInteractOutside={(event) => event.preventDefault()}
      >
        <div className={cn("flex flex-col px-8 py-8 sm:px-12", setupStep === 0 || setupStep === 1 || setupStep === 6 ? "" : "min-h-0 flex-1")}>
          <div className="flex h-8 shrink-0">{logo}</div>
          <div className={cn("pt-8", setupStep === 0 || setupStep === 1 || setupStep === 6 ? "" : "hide-scrollbar min-h-0 flex-1 overflow-y-auto")}>
            <div
              className={cn(
                "transition duration-200 ease-out",
                shown ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-1 opacity-0"
              )}
            >
              <DialogHeader className="gap-0 text-left sm:text-left">
                <DialogTitle
                  className={cn(
                    "leading-tight tracking-tight",
                    setupStep === 0 || setupStep === 6 ? "text-foreground/80 text-[2.05rem] font-bold" : "text-[1.7rem] font-semibold"
                  )}
                >
                  {placed ? title : t("welcome.onboarding.welcomeTitle")}
                </DialogTitle>
                <DialogDescription
                  className={cn(
                    "text-muted-foreground leading-relaxed",
                    setupStep === 0 || setupStep === 6 ? "mt-4 max-w-none text-[0.95rem]" : "mt-2 max-w-xl text-sm"
                  )}
                >
                  {placed ? description : "\u00a0"}
                </DialogDescription>
              </DialogHeader>

              {placed && setupStep === 0 ? (
                <div className="mt-6 rounded-xl bg-primary/[0.05] px-3.5 py-3">
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-semibold tracking-tight">{planName}</p>
                    <span className="bg-primary/10 text-primary rounded-full px-1.5 py-px text-[10px] font-medium">
                      {planStatus}
                    </span>
                  </div>
                  {planPrice ? (
                    <p className="mt-1 text-[13px] font-medium tracking-tight">
                      {planPrice}
                      <span className="text-muted-foreground font-normal">{tBilling("billing.perMonth")}</span>
                    </p>
                  ) : null}
                  {planBlurb ? (
                    <p className="text-muted-foreground mt-0.5 text-xs leading-snug">{planBlurb}</p>
                  ) : null}
                  {onTrial && startMs != null && endsAt ? (
                    <TrialTimeline
                      progress={trialProgress}
                      startDate={formatTrialEndDate(new Date(startMs).toISOString())}
                      endDate={formatTrialEndDate(endsAt)}
                      dayLabel={trialDayLabel}
                      daysLabel={daysLabel}
                      startedCaption={t("welcome.onboarding.trialStarted")}
                      endsCaption={t("welcome.onboarding.trialEndsMark")}
                    />
                  ) : null}
                </div>
              ) : null}

              {placed && setupStep === 1 ? (
                <div className="mt-5 grid items-start gap-5 sm:grid-cols-[10.5rem_minmax(0,1fr)]">
                  <div className="mx-auto w-36 sm:mx-0 sm:w-full">
                    <label className="bg-muted/40 relative flex aspect-square w-full cursor-pointer items-center justify-center overflow-hidden rounded-2xl">
                      {logoPreview || companyDraft.logoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={logoPreview || companyDraft.logoUrl}
                          alt=""
                          className="size-full object-contain p-3"
                        />
                      ) : (
                        <span className="text-muted-foreground flex flex-col items-center gap-2 px-3 text-center">
                          <ImagePlus className="size-5" strokeWidth={1.75} />
                          <span className="text-xs font-medium">{t("welcome.onboarding.uploadLogo")}</span>
                        </span>
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        className="sr-only"
                        onChange={(event) => {
                          handleLogoFile(event.target.files?.[0])
                          event.target.value = ""
                        }}
                      />
                    </label>
                    <p className="text-muted-foreground mt-2 text-center text-[11px] leading-snug">
                      {t("welcome.onboarding.logoSpecs")}
                    </p>
                  </div>
                  <div className="grid grid-cols-1 content-start gap-3 sm:grid-cols-2">
                    <FieldRow label={t("welcome.onboarding.businessName")} htmlFor="ob-name">
                      <Input
                        id="ob-name"
                        value={companyDraft.name}
                        onChange={(event) => updateCompany({ name: event.target.value })}
                        className={AUTH_INPUT}
                      />
                    </FieldRow>
                    <FieldRow label={t("welcome.onboarding.phone")} htmlFor="ob-phone">
                      <Input
                        id="ob-phone"
                        value={companyDraft.phone}
                        onChange={(event) => updateCompany({ phone: event.target.value })}
                        className={AUTH_INPUT}
                      />
                    </FieldRow>
                    {companyDraft.industry.trim().length >= 2 ? null : (
                      <FieldRow label={t("welcome.onboarding.industry")} className="sm:col-span-2">
                        <Select
                          value={companyDraft.industry || undefined}
                          onValueChange={(value) => updateCompany({ industry: value })}
                        >
                          <SelectTrigger className={cn(AUTH_INPUT, "w-full justify-between px-3 font-normal shadow-none data-[size=default]:h-10")}>
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
                      </FieldRow>
                    )}
                    <FieldRow label={t("welcome.onboarding.tagline")} htmlFor="ob-tagline">
                      <Input
                        id="ob-tagline"
                        value={companyDraft.tagline}
                        onChange={(event) => updateCompany({ tagline: event.target.value })}
                        className={AUTH_INPUT}
                      />
                    </FieldRow>
                    <FieldRow label={t("welcome.onboarding.website")} htmlFor="ob-website">
                      <Input
                        id="ob-website"
                        value={companyDraft.website}
                        onChange={(event) => updateCompany({ website: event.target.value })}
                        className={AUTH_INPUT}
                      />
                    </FieldRow>
                    <FieldRow label={t("welcome.onboarding.street")} htmlFor="ob-street" className="sm:col-span-2">
                      <Input
                        id="ob-street"
                        value={companyDraft.addressLine1}
                        onChange={(event) => updateCompany({ addressLine1: event.target.value })}
                        className={AUTH_INPUT}
                      />
                    </FieldRow>
                    <FieldRow label={t("welcome.onboarding.country")}>
                      <Select
                        value={companyDraft.country || undefined}
                        onValueChange={(value) => {
                          const defaults = regionalDefaultsForCountry(value)
                          updateCompany({
                            country: value,
                            currency: defaults.currency,
                            timezone: defaults.timezone,
                            dateFormat: defaults.dateFormat,
                          })
                        }}
                      >
                        <SelectTrigger className={cn(AUTH_INPUT, "w-full justify-between px-3 font-normal shadow-none data-[size=default]:h-10")}>
                          <SelectValue placeholder={t("welcome.onboarding.country")} />
                        </SelectTrigger>
                        <SelectContent>
                          {SIGNUP_COUNTRIES.map((country) => (
                            <SelectItem key={country} value={country} className="text-xs">
                              {country}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FieldRow>
                    <FieldRow label={t("welcome.onboarding.state")} htmlFor="ob-state">
                      <Input
                        id="ob-state"
                        value={companyDraft.state}
                        onChange={(event) => updateCompany({ state: event.target.value })}
                        className={AUTH_INPUT}
                      />
                    </FieldRow>
                    <FieldRow label={t("welcome.onboarding.city")} htmlFor="ob-city">
                      <Input
                        id="ob-city"
                        value={companyDraft.city}
                        onChange={(event) => updateCompany({ city: event.target.value })}
                        className={AUTH_INPUT}
                      />
                    </FieldRow>
                    <FieldRow label={t("welcome.onboarding.postal")} htmlFor="ob-postal">
                      <Input
                        id="ob-postal"
                        value={companyDraft.postalCode}
                        onChange={(event) => updateCompany({ postalCode: event.target.value })}
                        className={AUTH_INPUT}
                      />
                    </FieldRow>
                  </div>
                </div>
              ) : null}

              {placed && setupStep === 2 ? (
                <div className="mt-6 space-y-6">
                  <div>
                    <p className="text-sm font-medium">{t("welcome.onboarding.themeLabel")}</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {(
                        [
                          { id: "light", label: t("welcome.onboarding.themeLight"), icon: Sun },
                          { id: "dark", label: t("welcome.onboarding.themeDark"), icon: Moon },
                          { id: "system", label: t("welcome.onboarding.themeSystem"), icon: Monitor },
                        ] as const
                      ).map((item) => {
                        const Icon = item.icon
                        const selected = appearanceMode === item.id
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => setTheme(item.id)}
                            className={cn(
                              "inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm",
                              selected ? "bg-primary/10 font-medium" : "bg-muted/50"
                            )}
                          >
                            <Icon className="size-4" strokeWidth={1.75} />
                            {item.label}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-medium">{t("welcome.onboarding.colorLabel")}</p>
                    <div className="mt-3 flex flex-wrap gap-3">
                      {ACCENT_PRESETS.map((item) => {
                        const selected = prefs.colorTheme === item.id
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => updateAppearance({ colorTheme: item.id, customColor: item.color })}
                            className={cn(
                              "flex w-16 flex-col items-center gap-2 rounded-2xl px-2 py-2.5 text-xs",
                              selected ? "bg-primary/10 font-medium" : "bg-muted/50"
                            )}
                          >
                            <span
                              className={cn(
                                "size-9 rounded-full",
                                selected && "ring-2 ring-foreground/20 ring-offset-2 ring-offset-background"
                              )}
                              style={{ backgroundColor: item.color }}
                            />
                            {item.label}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </div>
              ) : null}

              {placed && setupStep === 3 ? (
                <div className="mt-6 flex gap-2">
                  {LANGUAGE_ANSWERS.map((answer) => {
                    const selected = prefs.language === answer.value
                    return (
                      <button
                        key={answer.value}
                        type="button"
                        onClick={() => updateAppearance({ language: answer.value })}
                        className={cn(
                          "inline-flex h-10 min-w-0 flex-1 items-center justify-center rounded-full px-3 text-sm",
                          selected ? "bg-primary/10 font-medium" : "bg-muted/50"
                        )}
                      >
                        {answer.label}
                      </button>
                    )
                  })}
                </div>
              ) : null}

              {placed && setupStep === 4 ? (
                <div className="mt-6 flex flex-col gap-2">
                  {CURRENCY_OPTIONS.map((item) => {
                    const name = item.label.split(" — ")[1] ?? item.label
                    return (
                      <ChoiceCard
                        key={item.code}
                        selected={companyDraft.currency === item.code}
                        title={name}
                        hint={item.code}
                        mark={item.code}
                        onClick={() => {
                          updateCompany({ currency: item.code })
                          const variant = moneyVariantForCurrency(item.code)
                          if (variant) setVariant(variant)
                        }}
                      />
                    )
                  })}
                </div>
              ) : null}

              {placed && setupStep === 5 ? (
                <div className="mt-6">
                  <div className="flex flex-wrap gap-2">
                    {TERM_OPTIONS.map((option) => {
                      const selected = !termCustom && termMonths === option.months
                      return (
                        <button
                          key={option.months}
                          type="button"
                          onClick={() => {
                            setTermCustom(false)
                            setTermMonths(option.months)
                          }}
                          className={cn(
                            "inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm",
                            selected ? "bg-primary/10" : "bg-muted/50"
                          )}
                        >
                          {t("welcome.guide.termMonths", { months: option.months })}
                          {option.recommended ? (
                            <span className="text-primary text-xs font-medium">
                              {t("welcome.guide.termRecommended")}
                            </span>
                          ) : null}
                        </button>
                      )
                    })}
                    <button
                      type="button"
                      onClick={() => {
                        setTermCustom(true)
                        const n = clampTenureMonths(Number(customMonths))
                        setTermMonths(n)
                      }}
                      className={cn(
                        "inline-flex items-center rounded-full px-3 py-2 text-sm",
                        termCustom ? "bg-primary/10 font-semibold" : "bg-muted/50"
                      )}
                    >
                      {t("welcome.onboarding.termCustom")}
                    </button>
                  </div>
                  {termCustom ? (
                    <div className="mt-4 flex items-center gap-3">
                      <Label htmlFor="ob-term-months" className="text-sm">
                        {t("welcome.onboarding.termCustomMonths")}
                      </Label>
                      <Input
                        id="ob-term-months"
                        type="number"
                        min={1}
                        max={120}
                        value={customMonths}
                        onChange={(event) => {
                          const raw = event.target.value
                          setCustomMonths(raw)
                          const n = Number(raw)
                          if (Number.isFinite(n) && n >= 1) setTermMonths(clampTenureMonths(n))
                        }}
                        className={cn(AUTH_INPUT, "w-24")}
                      />
                    </div>
                  ) : null}
                  <p className="text-muted-foreground mt-3 text-xs">{t("welcome.onboarding.termCustomHint")}</p>
                  <div className="bg-primary/[0.05] mt-4 rounded-xl px-3.5 py-3">
                    <p className="text-sm font-semibold">
                      {t("welcome.guide.termMonths", { months: termMonths })}
                    </p>
                    <p className="text-muted-foreground mt-1 text-xs">
                      {t("welcome.guide.termSummary", {
                        start: formatShortDate(fiscalState.active.startedAt),
                        end: formatShortDate(addMonthsIso(fiscalState.active.startedAt, termMonths)),
                      })}
                    </p>
                  </div>
                </div>
              ) : null}

              {placed && setupStep === 6 ? (
                <div className="bg-primary/[0.05] mt-6 rounded-xl px-3.5 py-3">
                  <p className="text-sm font-semibold">{businessName}</p>
                  <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
                    {t("welcome.guide.termMonths", { months: termMonths })}
                    {" · "}
                    {t("welcome.guide.termSummary", {
                      start: formatShortDate(fiscalState.active.startedAt),
                      end: formatShortDate(addMonthsIso(fiscalState.active.startedAt, termMonths)),
                    })}
                  </p>
                </div>
              ) : null}
            </div>
          </div>

          {setupStep === 0 ? (
            <div className="flex shrink-0 justify-end pt-8">
              <Button
                type="button"
                className="h-11 rounded-lg px-6 text-sm font-medium shadow-none"
                onClick={() => void handleContinue()}
                disabled={!placed || saving || !shown}
              >
                {t("welcome.continue")}
              </Button>
            </div>
          ) : (
          <div className="flex w-full shrink-0 flex-col gap-5 pt-6">
            <StepDots current={Math.max(0, progressCurrent - 1)} total={progressTotal} />
            <div className={cn("flex items-center gap-3", showBack ? "w-full justify-between" : "justify-center")}>
              {showBack ? (
                <Button
                  type="button"
                  variant="ghost"
                  className="text-foreground h-10 rounded-lg bg-muted px-5 text-sm font-medium shadow-none hover:bg-muted/80"
                  onClick={() => goToStep(previousStep(setupStep))}
                  disabled={saving || !shown}
                >
                  <ChevronLeft className="size-4" />
                  {t("welcome.back")}
                </Button>
              ) : null}
              <Button
                type="button"
                className="h-10 rounded-lg px-5 text-sm font-medium shadow-none"
                onClick={() => void handleContinue()}
                disabled={!placed || saving || !shown}
              >
                {primaryLabel}
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
