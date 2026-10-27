"use client"

import { useEffect, useRef, useState, type ReactNode } from "react"
import Image from "next/image"
import { usePathname, useRouter } from "next/navigation"
import {
  Building2,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ImagePlus,
  Info,
  Languages,
  Package,
  Receipt,
} from "lucide-react"
import { useTheme } from "next-themes"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"

import { AUTH_INPUT } from "@/components/auth/auth-shell"
import { PhoneCodeSelect } from "@/components/signup/phone-code-select"
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { persistWelcomeCompany, useWelcomeCompanyDraft } from "@/components/welcome/welcome-setup"
import { useAppearance } from "@/components/theme/appearance-provider"
import { AccentColorPicker } from "@/components/theme/accent-color-picker"
import { ThemeModePicker, type ThemeMode } from "@/components/theme/theme-mode-picker"
import { useAuth } from "@/context/auth-context"
import { useFiscalTerms } from "@/context/fiscal-term-context"
import { useMoneyFormatSettings } from "@/hooks/use-money-format-settings"
import { useDocumentNumberSettings } from "@/hooks/use-document-number-settings"
import { useProductSkuSettings } from "@/hooks/use-product-sku-settings"
import { apiBillingSummary, apiPatchOnboarding, type SessionPayload } from "@/lib/api/auth"
import { type AppLanguage } from "@/lib/appearance-prefs"
import {
  formatAutoDocumentNumber,
  loadDocumentNumberSettings,
  sanitizeNumberPrefixInput,
  type DocumentNumberMode,
} from "@/lib/document-number-settings"
import { clampTenureMonths, formatShortDate } from "@/lib/fiscal-terms"
import type { MoneyFormatVariant } from "@/lib/money-format-settings"
import { CURRENCY_OPTIONS, regionalDefaultsForCountry } from "@/lib/onboarding-defaults"
import { SIGNUP_COUNTRIES } from "@/lib/countries"
import { statesForCountry } from "@/lib/country-states"
import {
  formatAutoSku,
  sanitizeSkuPrefixInput,
  type ProductSkuMode,
} from "@/lib/product-sku-settings"
import { SIGNUP_INDUSTRIES } from "@/lib/industries"
import {
  formatInternationalNumber,
  formatNationalNumber,
  isPhoneCountry,
  phoneProfile,
  validateSignupPhone,
} from "@/lib/phone-mask"
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

const LANGUAGE_ANSWERS: {
  value: AppLanguage
  native: string
  english: string
  flagSrc: string
}[] = [
  { value: "en", native: "English", english: "English", flagSrc: "/assets/flags/gb.svg" },
  { value: "ar", native: "العربية", english: "Arabic", flagSrc: "/assets/flags/sa.svg" },
  { value: "ur", native: "اردو", english: "Urdu", flagSrc: "/assets/flags/pk.svg" },
]

const optionIdle =
  "border border-border bg-background text-foreground hover:bg-muted/40"
const optionSelected =
  "border border-blue-600 bg-blue-50 text-foreground hover:bg-blue-50 dark:border-blue-400 dark:bg-blue-950/40"

const CURRENCY_SYMBOL: Record<string, string> = {
  PKR: "₨",
  USD: "$",
  EUR: "€",
  GBP: "£",
  INR: "₹",
  AED: "د.إ",
  SAR: "﷼",
  CAD: "C$",
  AUD: "A$",
}

function toDateInput(iso: string) {
  return iso.slice(0, 10)
}

function monthsFromEnd(startValue: string, endValue: string) {
  const start = new Date(`${startValue}T00:00:00.000Z`)
  const end = new Date(`${endValue}T00:00:00.000Z`)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 12
  let months =
    (end.getUTCFullYear() - start.getUTCFullYear()) * 12 + (end.getUTCMonth() - start.getUTCMonth())
  if (end.getUTCDate() < start.getUTCDate()) months -= 1
  return clampTenureMonths(Math.max(1, months))
}

function defaultYearEnd(startValue: string) {
  const start = new Date(`${startValue}T00:00:00.000Z`)
  if (Number.isNaN(start.getTime())) return startValue
  start.setUTCMonth(start.getUTCMonth() + 1, 0)
  start.setUTCFullYear(start.getUTCFullYear() + 1)
  return start.toISOString().slice(0, 10)
}

function moneyVariantForCurrency(code: string): MoneyFormatVariant | null {
  if (code === "PKR") return "pakistani"
  if (code === "INR") return "indian"
  if (code === "GBP") return "uk"
  if (code === "USD") return "us"
  return null
}

function TrialTimeline({
  startDate,
  startedCaption,
  nowLabel,
  nowCaption,
  payLabel,
  payCaption,
}: {
  startDate: string
  startedCaption: string
  nowLabel: string
  nowCaption: string
  payLabel: string
  payCaption: string
}) {
  return (
    <div className="mt-4">
      <div className="relative h-3">
        <div className="bg-primary/15 absolute inset-x-1 top-1/2 h-px -translate-y-1/2 rounded-full" />
        <div className="bg-primary absolute top-1/2 left-1 h-px w-[calc(50%-0.25rem)] -translate-y-1/2 rounded-full" />
        <span className="bg-primary absolute top-1/2 left-0 size-2 -translate-y-1/2 rounded-full" />
        <span className="border-primary bg-background absolute top-1/2 left-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2" />
        <span className="border-foreground/25 bg-background absolute top-1/2 right-0 size-2 -translate-y-1/2 rounded-full border" />
      </div>
      <div className="mt-2.5 grid grid-cols-3 gap-1.5 text-[10px] sm:gap-2 sm:text-[11px]">
        <div className="min-w-0">
          <p className="truncate font-semibold">{startDate}</p>
          <p className="text-muted-foreground mt-0.5 leading-snug">{startedCaption}</p>
        </div>
        <div className="min-w-0 text-center">
          <p className="truncate font-semibold">{nowLabel}</p>
          <p className="text-muted-foreground mt-0.5 leading-snug">{nowCaption}</p>
        </div>
        <div className="min-w-0 text-end">
          <p className="truncate font-semibold">{payLabel}</p>
          <p className="text-muted-foreground mt-0.5 leading-snug">{payCaption}</p>
        </div>
      </div>
    </div>
  )
}

function FieldRow({
  label,
  htmlFor,
  className,
  required,
  optionalLabel,
  children,
}: {
  label: string
  htmlFor?: string
  className?: string
  required?: boolean
  optionalLabel?: string
  children: ReactNode
}) {
  return (
    <div className={cn("grid gap-2", className)}>
      <Label htmlFor={htmlFor} className="text-xs font-medium text-muted-foreground">
        {label}
        {required ? <span className="text-destructive"> *</span> : null}
        {optionalLabel ? (
          <span className="font-normal"> ({optionalLabel})</span>
        ) : null}
      </Label>
      {children}
    </div>
  )
}

function CurrencyRow({
  selected,
  symbol,
  code,
  name,
  onClick,
}: {
  selected: boolean
  symbol: string
  code: string
  name: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        "flex min-h-[4.25rem] w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-start transition-colors",
        selected ? optionSelected : optionIdle
      )}
    >
      <span className="text-muted-foreground w-7 shrink-0 text-center text-lg leading-none">{symbol}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold tracking-tight">{code}</span>
        <span className="text-muted-foreground mt-0.5 block text-xs">{name}</span>
      </span>
      <span
        className={cn(
          "flex size-5 shrink-0 items-center justify-center rounded-full border",
          selected ? "border-blue-600" : "border-muted-foreground/30"
        )}
      >
        {selected ? <span className="size-2.5 rounded-full bg-blue-600" /> : null}
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
  const [businessStarted, setBusinessStarted] = useState("")
  const [termStart, setTermStart] = useState("")
  const [termEnd, setTermEnd] = useState("")
  const [shown, setShown] = useState(true)
  const [logoPreview, setLogoPreview] = useState("")
  const [phoneCountry, setPhoneCountry] = useState("Pakistan")
  const logoInputRef = useRef<HTMLInputElement | null>(null)
  const logoEncodeRef = useRef<Promise<string | null> | null>(null)
  const stepTimer = useRef<number | null>(null)

  const PROFILE_INPUT =
    "h-11 w-full min-w-0 rounded-lg border border-border bg-background text-sm shadow-none focus-visible:ring-2 focus-visible:ring-primary/30"
  const { state: fiscalState, updateActiveTenure, updateActiveStart } = useFiscalTerms()
  const { setVariant } = useMoneyFormatSettings()
  const { settings: skuSettings, persist: persistSku, setMode: setSkuMode } =
    useProductSkuSettings()
  const {
    settings: numberSettings,
    persist: persistNumbers,
    updateEntry: updateNumberEntry,
    setMode: setNumberMode,
  } = useDocumentNumberSettings()
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
    if (!draftHydrated) return
    if (companyDraft.country && isPhoneCountry(companyDraft.country)) {
      setPhoneCountry(companyDraft.country)
    }
  }, [draftHydrated, companyDraft.country])

  useEffect(() => {
    if (!open || businessStarted) return
    const start = toDateInput(fiscalState.active.startedAt)
    const end = defaultYearEnd(start)
    setBusinessStarted(start)
    setTermStart(start)
    setTermEnd(end)
    setTermMonths(monthsFromEnd(start, end))
  }, [open, businessStarted, fiscalState.active.startedAt])

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
    if (!file) return
    const allowed = ["image/png", "image/jpeg", "image/jpg", "image/webp", "image/svg+xml"]
    if (!allowed.includes(file.type)) {
      toast.error(t("welcome.onboarding.logoTypeError"))
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error(t("welcome.onboarding.logoSizeError"))
      return
    }
    const preview = URL.createObjectURL(file)
    setLogoPreview((current) => {
      if (current.startsWith("blob:")) URL.revokeObjectURL(current)
      return preview
    })
    logoEncodeRef.current = new Promise((resolve) => {
      if (file.type === "image/svg+xml") {
        const reader = new FileReader()
        reader.onload = () => {
          const data = typeof reader.result === "string" ? reader.result : null
          if (data) updateCompany({ logoUrl: data })
          resolve(data)
        }
        reader.onerror = () => resolve(null)
        reader.readAsDataURL(file)
        return
      }
      const image = new Image()
      image.onload = () => {
        const max = 512
        const scale = Math.min(1, max / Math.max(image.width, image.height))
        const canvas = document.createElement("canvas")
        canvas.width = Math.max(1, Math.round(image.width * scale))
        canvas.height = Math.max(1, Math.round(image.height * scale))
        const ctx = canvas.getContext("2d")
        if (!ctx) {
          resolve(null)
          return
        }
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        ctx.drawImage(image, 0, 0, canvas.width, canvas.height)
        const keepPng = file.type === "image/png" || file.type === "image/webp"
        const data = canvas.toDataURL(keepPng ? "image/png" : "image/jpeg", 0.86)
        updateCompany({ logoUrl: data })
        resolve(data)
      }
      image.onerror = () => resolve(null)
      image.src = preview
    })
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
      const phoneIssue = validateSignupPhone(phoneCountry, companyDraft.phone)
      if (phoneIssue === "required") {
        toast.error(t("welcome.onboarding.phoneRequired"))
        return
      }
      if (phoneIssue === "invalid") {
        toast.error(t("welcome.onboarding.phoneRequired"))
        return
      }
      const phone = formatInternationalNumber(phoneCountry, companyDraft.phone)
      setSaving(true)
      try {
        // Wait for in-flight logo encode so Continue never drops a just-picked logo.
        const encodedLogo = logoEncodeRef.current
          ? await logoEncodeRef.current
          : null
        logoEncodeRef.current = null
        const logoUrl = encodedLogo?.trim() || companyDraft.logoUrl.trim()
        await persistWelcomeCompany({
          ...companyDraft,
          name,
          phone,
          logoUrl,
          email: user?.email?.trim() || companyDraft.email,
        })
        if (logoUrl) updateCompany({ logoUrl })
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

    if (setupStep === 2) {
      goToStep(3)
      return
    }

    if (setupStep === 3) {
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
        goToStep(4)
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : t("welcome.onboarding.saveFailed")
        )
      } finally {
        setSaving(false)
      }
      return
    }

    if (setupStep === 4) {
      setSaving(true)
      try {
        const skuMode = skuSettings.mode === "custom" ? "custom" : "auto"
        const skuPrefix = sanitizeSkuPrefixInput(skuSettings.prefix) || "SKU"
        persistSku({ mode: skuMode, prefix: skuPrefix })

        const numbers = loadDocumentNumberSettings()
        persistNumbers(numbers)

        const salesPrefix =
          sanitizeNumberPrefixInput(numbers.sales.prefix) ||
          companyDraft.invoicePrefix ||
          "INV"
        await persistWelcomeCompany({
          ...companyDraft,
          email: user?.email?.trim() || companyDraft.email,
          invoicePrefix: salesPrefix,
        })
        updateCompany({ invoicePrefix: salesPrefix })
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
      if (!businessStarted || !termStart || !termEnd) {
        toast.error(t("welcome.onboarding.accountingDatesRequired"))
        return
      }
      if (termEnd <= termStart) {
        toast.error(t("welcome.onboarding.accountingDatesOrder"))
        return
      }
      const months = monthsFromEnd(termStart, termEnd)
      // Apply start then tenure so both land in the same React batch.
      updateActiveStart(termStart)
      updateActiveTenure(months)
      setTermMonths(months)
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
            ? t("welcome.onboarding.regionalQuestion")
            : setupStep === 4
              ? t("welcome.onboarding.skuQuestion")
              : setupStep === 5
                ? t("welcome.onboarding.termQuestion")
                : firstName
                  ? t("welcome.onboarding.completeTitleNamed", { name: firstName })
                  : t("welcome.onboarding.completeTitle")

  const description =
    setupStep === 0
      ? t("welcome.onboarding.welcomeTrial", { business: businessName })
      : setupStep === 1
        ? t("welcome.onboarding.profileQuestionLead")
        : setupStep === 2
          ? t("welcome.onboarding.colorQuestionLead")
          : setupStep === 3
            ? t("welcome.onboarding.regionalQuestionLead")
            : setupStep === 4
              ? t("welcome.onboarding.skuQuestionLead")
              : setupStep === 5
                ? t("welcome.onboarding.termQuestionLead")
                : t("welcome.onboarding.completeSubtitle", { business: businessName })

  const readyLanguageLabel =
    LANGUAGE_ANSWERS.find((item) => item.value === prefs.language)?.native ??
    prefs.language
  const readyTermLabel =
    termStart && termEnd && termEnd > termStart
      ? `${formatShortDate(`${termStart}T00:00:00.000Z`)} → ${formatShortDate(`${termEnd}T00:00:00.000Z`)}`
      : t("welcome.guide.termMonths", { months: termMonths })

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
          "bg-background text-foreground flex h-[100dvh] max-h-[100dvh] w-full max-w-none flex-col gap-0 overflow-hidden rounded-none border-0 p-0 shadow-none ring-0 outline-none [font-family:var(--font-poppins),ui-sans-serif,system-ui,sans-serif] focus:ring-0 focus-visible:ring-0 sm:max-h-[92vh] sm:rounded-[1.75rem] sm:shadow-[0_24px_80px_rgba(15,23,42,0.14)] sm:transition-[max-width,height,padding] sm:duration-500 sm:ease-[cubic-bezier(0.22,1,0.36,1)]",
          setupStep === 0
            ? "sm:h-[min(36rem,90vh)] sm:max-w-[43rem]"
            : "sm:h-[min(40rem,92vh)] sm:max-w-[46rem]"
        )}
        onPointerDownOutside={(event) => event.preventDefault()}
        onEscapeKeyDown={(event) => event.preventDefault()}
        onInteractOutside={(event) => event.preventDefault()}
      >
        <div
          className={cn(
            "flex min-h-0 flex-1 flex-col px-5 pt-[max(1.25rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))] sm:transition-[padding] sm:duration-500 sm:ease-[cubic-bezier(0.22,1,0.36,1)]",
            setupStep === 0 ? "sm:px-10 sm:py-8" : "sm:px-12 sm:py-8"
          )}
        >
          <div className="flex h-7 shrink-0 justify-start sm:h-8">{logo}</div>
          <div
            className={cn(
              "hide-scrollbar min-h-0 flex-1 overscroll-contain",
              setupStep === 0
                ? "flex flex-col overflow-y-auto pt-3 sm:pt-4"
                : setupStep === 6
                  ? "flex flex-col overflow-hidden pt-2 sm:pt-3"
                : setupStep === 3
                  ? "flex flex-col overflow-hidden pt-5 sm:pt-8"
                  : "overflow-y-auto pt-5 sm:pt-8"
            )}
          >
            <div
              className={cn(
                "transition duration-200 ease-out",
                shown ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-1 opacity-0",
                setupStep === 0 && "my-auto w-full",
                setupStep === 6 && "my-auto flex min-h-0 w-full flex-col",
                setupStep === 3 && "flex min-h-0 flex-1 flex-col"
              )}
            >
              {setupStep !== 6 ? (
                <DialogHeader className="gap-0 text-left sm:text-left">
                  <DialogTitle className="text-foreground text-[1.35rem] leading-snug font-semibold tracking-tight sm:text-[1.6875rem]">
                    {placed ? title : t("welcome.onboarding.welcomeTitle")}
                  </DialogTitle>
                  <DialogDescription className="text-muted-foreground mt-2 max-w-none text-[13px] leading-relaxed sm:text-sm">
                    {placed ? description : "\u00a0"}
                  </DialogDescription>
                </DialogHeader>
              ) : (
                <DialogHeader className="sr-only">
                  <DialogTitle>{title}</DialogTitle>
                  <DialogDescription>{description}</DialogDescription>
                </DialogHeader>
              )}

              {placed && setupStep === 0 ? (
                <div className="mt-5 rounded-xl border border-border bg-primary/[0.04] px-3.5 py-3 sm:mt-7 sm:px-4 sm:py-3.5">
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
                      startDate={formatTrialEndDate(new Date(startMs).toISOString())}
                      startedCaption={t("welcome.onboarding.trialStarted")}
                      nowLabel={daysLabel}
                      nowCaption={trialDayLabel}
                      payLabel={
                        planPrice
                          ? `${planPrice}${tBilling("billing.perMonth")}`
                          : formatTrialEndDate(endsAt)
                      }
                      payCaption={
                        planPrice
                          ? t("welcome.onboarding.payFrom", { date: formatTrialEndDate(endsAt) })
                          : t("welcome.onboarding.trialEndsMark")
                      }
                    />
                  ) : null}
                </div>
              ) : null}

              {placed && setupStep === 1 ? (
                <div className="mt-5 grid items-start gap-5 sm:mt-7 sm:grid-cols-[10.5rem_minmax(0,1fr)] sm:gap-7">
                  <div className="mx-auto w-36 sm:mx-0 sm:w-full">
                    <div
                      className={cn(
                        "group relative flex aspect-square w-full flex-col items-center justify-center overflow-hidden rounded-2xl border border-dashed bg-muted/20 transition-colors",
                        "hover:border-[#92c720] hover:bg-[#92c720]/[0.06]"
                      )}
                    >
                      {logoPreview || companyDraft.logoUrl ? (
                        <>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={logoPreview || companyDraft.logoUrl}
                            alt=""
                            className="size-full object-contain p-4"
                          />
                          <button
                            type="button"
                            className="absolute inset-x-3 bottom-3 rounded-lg border border-border bg-background/95 px-2 py-1.5 text-[11px] font-medium shadow-sm"
                            onClick={() => logoInputRef.current?.click()}
                          >
                            {t("welcome.onboarding.changeLogo")}
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          aria-label={t("welcome.onboarding.uploadCompanyLogo")}
                          className="text-muted-foreground hover:text-foreground flex h-full w-full flex-col items-center justify-center gap-2 transition-colors"
                          onClick={() => logoInputRef.current?.click()}
                        >
                          <span className="bg-background flex size-14 items-center justify-center rounded-full border border-border shadow-sm">
                            <Building2 className="size-6" strokeWidth={1.5} />
                          </span>
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium">
                            <ImagePlus className="size-3.5" strokeWidth={2} />
                            {t("welcome.onboarding.uploadLogo")}
                          </span>
                        </button>
                      )}
                      <input
                        ref={logoInputRef}
                        type="file"
                        accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml"
                        className="sr-only"
                        onChange={(event) => {
                          handleLogoFile(event.target.files?.[0])
                          event.target.value = ""
                        }}
                      />
                    </div>
                    <p className="text-muted-foreground mt-2 text-center text-[11px] leading-snug">
                      {t("welcome.onboarding.logoSpecs")}
                    </p>
                  </div>
                  <div className="grid grid-cols-1 content-start gap-4 sm:grid-cols-2 sm:gap-5">
                    <FieldRow label={t("welcome.onboarding.businessName")} htmlFor="ob-name" required>
                      <Input
                        id="ob-name"
                        value={companyDraft.name}
                        onChange={(event) => updateCompany({ name: event.target.value })}
                        className={PROFILE_INPUT}
                      />
                    </FieldRow>
                    <FieldRow label={t("welcome.onboarding.phone")} htmlFor="ob-phone" required>
                      <div className={cn(PROFILE_INPUT, "flex items-center overflow-hidden px-0")}>
                        <PhoneCodeSelect
                          value={phoneCountry}
                          onValueChange={(value) => {
                            setPhoneCountry(value)
                            updateCompany({
                              phone: formatNationalNumber(value, companyDraft.phone),
                            })
                          }}
                        />
                        <Input
                          id="ob-phone"
                          type="tel"
                          inputMode="numeric"
                          value={formatNationalNumber(phoneCountry, companyDraft.phone)}
                          onChange={(event) =>
                            updateCompany({
                              phone: formatNationalNumber(phoneCountry, event.target.value),
                            })
                          }
                          placeholder={phoneProfile(phoneCountry).placeholder}
                          className="h-full min-w-0 flex-1 rounded-none border-0 bg-transparent px-3 text-sm shadow-none focus-visible:ring-0"
                        />
                      </div>
                    </FieldRow>
                    {companyDraft.industry.trim().length >= 2 ? null : (
                      <FieldRow label={t("welcome.onboarding.industry")} className="sm:col-span-2" required>
                        <Select
                          value={companyDraft.industry || undefined}
                          onValueChange={(value) => updateCompany({ industry: value })}
                        >
                          <SelectTrigger className={cn(PROFILE_INPUT, "w-full justify-between px-3 font-normal data-[size=default]:h-11")}>
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
                    <FieldRow label={t("welcome.onboarding.street")} htmlFor="ob-street" className="sm:col-span-2">
                      <Input
                        id="ob-street"
                        value={companyDraft.addressLine1}
                        onChange={(event) => updateCompany({ addressLine1: event.target.value })}
                        className={PROFILE_INPUT}
                      />
                    </FieldRow>
                    <FieldRow label={t("welcome.onboarding.country")} required>
                      <Select
                        value={companyDraft.country || undefined}
                        onValueChange={(value) => {
                          const defaults = regionalDefaultsForCountry(value)
                          const nextStates = statesForCountry(value)
                          updateCompany({
                            country: value,
                            state: nextStates.includes(companyDraft.state) ? companyDraft.state : "",
                            currency: defaults.currency,
                            timezone: defaults.timezone,
                            dateFormat: defaults.dateFormat,
                          })
                          if (isPhoneCountry(value)) setPhoneCountry(value)
                        }}
                      >
                        <SelectTrigger className={cn(PROFILE_INPUT, "w-full justify-between px-3 font-normal data-[size=default]:h-11")}>
                          <SelectValue placeholder={t("welcome.onboarding.country")} />
                        </SelectTrigger>
                        <SelectContent>
                          {SIGNUP_COUNTRIES.map((country) => (
                            <SelectItem key={country} value={country} className="text-sm">
                              {country}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FieldRow>
                    <FieldRow label={t("welcome.onboarding.state")} htmlFor="ob-state">
                      {statesForCountry(companyDraft.country).length > 0 ? (
                        <Select
                          value={companyDraft.state || undefined}
                          onValueChange={(value) => updateCompany({ state: value })}
                        >
                          <SelectTrigger className={cn(PROFILE_INPUT, "w-full justify-between px-3 font-normal data-[size=default]:h-11")}>
                            <SelectValue placeholder={t("welcome.onboarding.statePlaceholder")} />
                          </SelectTrigger>
                          <SelectContent>
                            {statesForCountry(companyDraft.country).map((state) => (
                              <SelectItem key={state} value={state} className="text-sm">
                                {state}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Input
                          id="ob-state"
                          value={companyDraft.state}
                          onChange={(event) => updateCompany({ state: event.target.value })}
                          className={PROFILE_INPUT}
                        />
                      )}
                    </FieldRow>
                    <FieldRow label={t("welcome.onboarding.city")} htmlFor="ob-city">
                      <Input
                        id="ob-city"
                        value={companyDraft.city}
                        onChange={(event) => updateCompany({ city: event.target.value })}
                        className={PROFILE_INPUT}
                      />
                    </FieldRow>
                    <FieldRow label={t("welcome.onboarding.postal")} htmlFor="ob-postal">
                      <Input
                        id="ob-postal"
                        value={companyDraft.postalCode}
                        onChange={(event) => updateCompany({ postalCode: event.target.value })}
                        className={PROFILE_INPUT}
                      />
                    </FieldRow>
                  </div>
                </div>
              ) : null}

              {placed && setupStep === 2 ? (
                <div className="mt-5 space-y-5 sm:mt-7 sm:space-y-7">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">{t("welcome.onboarding.themeLabel")}</p>
                    <ThemeModePicker
                      className="mt-3"
                      value={appearanceMode as ThemeMode}
                      onChange={(next) => setTheme(next)}
                      size="sm"
                      labels={{
                        light: t("welcome.onboarding.themeLight"),
                        dark: t("welcome.onboarding.themeDark"),
                        system: t("welcome.onboarding.themeSystem"),
                      }}
                    />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">{t("welcome.onboarding.colorLabel")}</p>
                    <AccentColorPicker
                      className="mt-3"
                      colorTheme={prefs.colorTheme}
                      customColor={prefs.customColor}
                      onChange={(next) => updateAppearance(next)}
                    />
                  </div>
                </div>
              ) : null}

              {placed && setupStep === 3 ? (
                <div className="mt-5 flex min-h-0 flex-1 flex-col gap-5 sm:mt-7 sm:gap-6">
                  <div className="shrink-0">
                    <p className="text-xs font-medium text-muted-foreground">
                      {t("welcome.onboarding.language")}
                    </p>
                    <div className="mt-2.5 grid grid-cols-3 gap-2 sm:gap-3">
                      {LANGUAGE_ANSWERS.map((answer) => {
                        const selected = prefs.language === answer.value
                        return (
                          <button
                            key={answer.value}
                            type="button"
                            onClick={() => updateAppearance({ language: answer.value })}
                            className={cn(
                              "rounded-xl px-3 py-3.5 text-start transition-colors sm:px-4 sm:py-4",
                              selected ? optionSelected : optionIdle
                            )}
                          >
                            <span className="flex items-center gap-2.5">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={answer.flagSrc}
                                alt=""
                                width={28}
                                height={20}
                                className="h-5 w-7 shrink-0 rounded-[3px] object-cover shadow-sm ring-1 ring-black/10"
                                aria-hidden
                              />
                              <span className="min-w-0">
                                <span className="block text-sm font-semibold leading-5 sm:text-[15px]">
                                  {answer.native}
                                </span>
                                <span className="text-muted-foreground mt-1 block text-xs leading-4 sm:text-[13px]">
                                  {answer.english}
                                </span>
                              </span>
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                  <div className="flex min-h-0 flex-1 flex-col">
                    <p className="shrink-0 text-xs font-medium text-muted-foreground">
                      {t("welcome.onboarding.currency")}
                    </p>
                    <div
                      className="hide-scrollbar mt-2.5 flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto overscroll-contain"
                      onWheel={(event) => event.stopPropagation()}
                      onTouchMove={(event) => event.stopPropagation()}
                    >
                      {CURRENCY_OPTIONS.map((item) => {
                        const name = item.label.split(" — ")[1] ?? item.label
                        return (
                          <CurrencyRow
                            key={item.code}
                            selected={companyDraft.currency === item.code}
                            symbol={CURRENCY_SYMBOL[item.code] ?? item.code}
                            code={item.code}
                            name={name}
                            onClick={() => {
                              updateCompany({ currency: item.code })
                              const variant = moneyVariantForCurrency(item.code)
                              if (variant) setVariant(variant)
                            }}
                          />
                        )
                      })}
                    </div>
                  </div>
                </div>
              ) : null}

              {placed && setupStep === 4 ? (
                <div className="mt-5 space-y-4 sm:mt-7 sm:space-y-5">
                  {(
                    [
                      {
                        id: "products" as const,
                        label: t("welcome.onboarding.idProducts"),
                        mode: skuSettings.mode,
                        prefix: skuSettings.prefix,
                        sample: (n: number) => formatAutoSku(skuSettings.prefix, n),
                        setMode: (mode: ProductSkuMode) => setSkuMode(mode),
                        setPrefix: (prefix: string) =>
                          persistSku({
                            ...skuSettings,
                            prefix: sanitizeSkuPrefixInput(prefix),
                          }),
                      },
                      {
                        id: "sales" as const,
                        label: t("welcome.onboarding.idSales"),
                        mode: numberSettings.sales.mode,
                        prefix: numberSettings.sales.prefix,
                        sample: (n: number) =>
                          formatAutoDocumentNumber(
                            numberSettings.sales.prefix,
                            n,
                            "INV"
                          ),
                        setMode: (mode: DocumentNumberMode) =>
                          setNumberMode("sales", mode),
                        setPrefix: (prefix: string) =>
                          updateNumberEntry("sales", {
                            prefix: sanitizeNumberPrefixInput(prefix),
                          }),
                      },
                      {
                        id: "customers" as const,
                        label: t("welcome.onboarding.idCustomers"),
                        mode: numberSettings.customerPayments.mode,
                        prefix: numberSettings.customerPayments.prefix,
                        sample: (n: number) =>
                          formatAutoDocumentNumber(
                            numberSettings.customerPayments.prefix,
                            n,
                            "CP"
                          ),
                        setMode: (mode: DocumentNumberMode) =>
                          setNumberMode("customerPayments", mode),
                        setPrefix: (prefix: string) =>
                          updateNumberEntry("customerPayments", {
                            prefix: sanitizeNumberPrefixInput(prefix),
                          }),
                      },
                      {
                        id: "purchases" as const,
                        label: t("welcome.onboarding.idPurchases"),
                        mode: numberSettings.purchases.mode,
                        prefix: numberSettings.purchases.prefix,
                        sample: (n: number) =>
                          formatAutoDocumentNumber(
                            numberSettings.purchases.prefix,
                            n,
                            "PO"
                          ),
                        setMode: (mode: DocumentNumberMode) =>
                          setNumberMode("purchases", mode),
                        setPrefix: (prefix: string) =>
                          updateNumberEntry("purchases", {
                            prefix: sanitizeNumberPrefixInput(prefix),
                          }),
                      },
                    ] as const
                  ).map((item) => {
                    const hint =
                      item.mode === "auto"
                        ? t("welcome.onboarding.skuPrefixHint", {
                            first: item.sample(1),
                            second: item.sample(2),
                          })
                        : t("welcome.onboarding.skuCustomHint")
                    return (
                      <div key={item.id}>
                        <div className="flex items-center gap-1.5">
                          <Label className="text-xs font-medium text-muted-foreground">
                            {item.label}
                          </Label>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                type="button"
                                className="text-muted-foreground hover:text-foreground inline-flex size-4 shrink-0 items-center justify-center rounded-full"
                                aria-label={hint}
                              >
                                <Info className="size-3.5" strokeWidth={2} />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent
                              side="top"
                              sideOffset={6}
                              className="max-w-[16rem] text-pretty"
                            >
                              {hint}
                            </TooltipContent>
                          </Tooltip>
                        </div>
                        <div className="mt-2 flex w-full items-center gap-2">
                          {(
                            [
                              {
                                mode: "auto" as const,
                                label: t("welcome.onboarding.skuAutoTitle"),
                              },
                              {
                                mode: "custom" as const,
                                label: t("welcome.onboarding.skuCustomTitle"),
                              },
                            ] as const
                          ).map((option) => {
                            const selected = item.mode === option.mode
                            return (
                              <button
                                key={option.mode}
                                type="button"
                                onClick={() => item.setMode(option.mode)}
                                aria-pressed={selected}
                                className={cn(
                                  "h-10 min-w-0 flex-1 rounded-lg px-3 text-center text-xs font-semibold transition-colors sm:text-[13px]",
                                  selected ? optionSelected : optionIdle
                                )}
                              >
                                {option.label}
                              </button>
                            )
                          })}
                          <Input
                            id={`ob-id-prefix-${item.id}`}
                            value={item.prefix}
                            onChange={(event) => item.setPrefix(event.target.value)}
                            disabled={item.mode === "auto"}
                            className={cn(AUTH_INPUT, "h-10 min-w-0 flex-1")}
                            autoComplete="off"
                            aria-label={t("welcome.onboarding.skuPrefix")}
                            placeholder={t("welcome.onboarding.skuPrefix")}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : null}

              {placed && setupStep === 5 ? (
                <div className="mt-5 space-y-5 sm:mt-7 sm:space-y-6">
                  {(
                    [
                      {
                        id: "ob-business-started",
                        label: t("welcome.onboarding.businessStartedLabel"),
                        hint: t("welcome.onboarding.businessStartedHint"),
                        value: businessStarted,
                        onChange: (value: string) => {
                          setBusinessStarted(value)
                          if (!value) return
                          const nextEnd = defaultYearEnd(value)
                          setTermStart(value)
                          setTermEnd(nextEnd)
                          setTermMonths(monthsFromEnd(value, nextEnd))
                        },
                      },
                      {
                        id: "ob-term-start",
                        label: t("welcome.onboarding.termStartLabel"),
                        hint: t("welcome.onboarding.termStartHint"),
                        value: termStart,
                        onChange: (value: string) => {
                          setTermStart(value)
                          if (!value) return
                          if (!termEnd || termEnd <= value) {
                            const nextEnd = defaultYearEnd(value)
                            setTermEnd(nextEnd)
                            setTermMonths(monthsFromEnd(value, nextEnd))
                            return
                          }
                          setTermMonths(monthsFromEnd(value, termEnd))
                        },
                      },
                      {
                        id: "ob-term-end",
                        label: t("welcome.onboarding.termEndLabel"),
                        hint: t("welcome.onboarding.termEndHint"),
                        value: termEnd,
                        onChange: (value: string) => {
                          setTermEnd(value)
                          if (value && termStart) setTermMonths(monthsFromEnd(termStart, value))
                        },
                      },
                    ] as const
                  ).map((field) => (
                    <div key={field.id}>
                      <Label htmlFor={field.id} className="text-xs font-medium text-muted-foreground">
                        {field.label}{" "}
                        <span className="text-destructive">*</span>
                      </Label>
                      <div className="relative mt-2">
                        <Input
                          id={field.id}
                          type="date"
                          required
                          value={field.value}
                          onChange={(event) => field.onChange(event.target.value)}
                          className={cn(AUTH_INPUT, "pe-10")}
                        />
                        <Calendar
                          className="pointer-events-none absolute end-3 top-1/2 size-4 -translate-y-1/2 text-blue-600"
                          strokeWidth={1.75}
                        />
                      </div>
                      <p className="text-muted-foreground mt-2 text-xs leading-relaxed">{field.hint}</p>
                    </div>
                  ))}
                  {termStart && termEnd && termEnd > termStart ? (
                    <p className="text-muted-foreground text-xs">
                      {formatShortDate(`${termStart}T00:00:00.000Z`)}
                      {" → "}
                      {formatShortDate(`${termEnd}T00:00:00.000Z`)}
                      {" · "}
                      {t("welcome.guide.termMonths", { months: termMonths })}
                    </p>
                  ) : null}
                </div>
              ) : null}

              {placed && setupStep === 6 ? (
                <div className="flex w-full flex-col items-center text-center">
                  <div className="relative flex size-[6.25rem] shrink-0 items-center justify-center sm:size-[6.75rem]">
                    <div className="welcome-ready-pop bg-primary/12 text-primary relative z-[1] flex size-14 items-center justify-center rounded-full sm:size-16">
                      <CheckCircle2 className="size-7 sm:size-8" strokeWidth={1.75} />
                    </div>
                    {(
                      [
                        {
                          Icon: Package,
                          className: "start-0 top-1",
                          delay: "0s",
                        },
                        {
                          Icon: Receipt,
                          className: "end-0 top-2",
                          delay: "0.35s",
                        },
                        {
                          Icon: Languages,
                          className: "bottom-0 start-1",
                          delay: "0.7s",
                        },
                        {
                          Icon: Calendar,
                          className: "bottom-1 end-0",
                          delay: "1.05s",
                        },
                      ] as const
                    ).map(({ Icon, className, delay }) => (
                      <span
                        key={className}
                        className={cn(
                          "welcome-ready-float border-border bg-background text-primary absolute flex size-8 items-center justify-center rounded-full border shadow-sm",
                          className
                        )}
                        style={{ animationDelay: delay }}
                      >
                        <Icon className="size-3.5" strokeWidth={1.75} />
                      </span>
                    ))}
                  </div>
                  <h2 className="welcome-ready-fade-up text-foreground mt-3 text-[1.25rem] leading-snug font-semibold tracking-tight sm:text-[1.5rem]">
                    {title}
                  </h2>
                  <p
                    className="welcome-ready-fade-up text-muted-foreground mt-1.5 max-w-md text-[13px] leading-snug sm:text-sm"
                    style={{ animationDelay: "0.08s" }}
                  >
                    {description}
                  </p>
                  <div
                    className="welcome-ready-fade-up mt-4 grid w-full max-w-md grid-cols-2 gap-2 text-start"
                    style={{ animationDelay: "0.16s" }}
                  >
                    {(
                      [
                        {
                          Icon: Building2,
                          label: t("welcome.onboarding.readyBusiness"),
                          value: businessName,
                        },
                        {
                          Icon: Languages,
                          label: t("welcome.onboarding.readyLanguage"),
                          value: readyLanguageLabel,
                        },
                        {
                          Icon: Receipt,
                          label: t("welcome.onboarding.readyCurrency"),
                          value: companyDraft.currency || "—",
                        },
                        {
                          Icon: Calendar,
                          label: t("welcome.onboarding.readyTerm"),
                          value: readyTermLabel,
                        },
                      ] as const
                    ).map((row) => (
                      <div
                        key={row.label}
                        className="rounded-xl border border-border bg-background px-2.5 py-2.5"
                      >
                        <span className="text-primary bg-primary/10 mb-1.5 inline-flex size-6 items-center justify-center rounded-full">
                          <row.Icon className="size-3" strokeWidth={1.75} />
                        </span>
                        <p className="text-muted-foreground text-[10px] leading-none">
                          {row.label}
                        </p>
                        <p className="mt-1 truncate text-xs font-medium tracking-tight sm:text-[13px]">
                          {row.value}
                        </p>
                      </div>
                    ))}
                  </div>
                  <p
                    className="welcome-ready-fade-up text-muted-foreground mt-3 max-w-md text-[11px] leading-snug sm:text-xs"
                    style={{ animationDelay: "0.24s" }}
                  >
                    {t("welcome.onboarding.readyNext")}
                  </p>
                </div>
              ) : null}
            </div>
          </div>

          <div
            className={cn(
              "flex w-full shrink-0 flex-col gap-3 border-t border-border/60 pt-4 sm:border-0",
              setupStep === 6 ? "sm:pt-5" : "sm:gap-5 sm:pt-7"
            )}
          >
            <div className="flex items-center justify-between gap-2 sm:gap-3">
              <Button
                type="button"
                variant="outline"
                className={cn(
                  "h-10 min-w-0 rounded-lg border-border bg-background px-3 text-[13px] font-semibold shadow-none sm:px-4",
                  (!showBack || setupStep === 6) && "invisible"
                )}
                onClick={() => goToStep(previousStep(setupStep))}
                disabled={saving || !showBack || !shown || setupStep === 6}
                tabIndex={showBack && setupStep !== 6 ? 0 : -1}
              >
                <ChevronLeft className="size-4 shrink-0 rtl:rotate-180" />
                <span className="truncate">{t("welcome.back")}</span>
              </Button>
              <Button
                type="button"
                className="h-10 min-w-0 rounded-lg px-3 text-[13px] font-semibold shadow-none sm:px-5"
                onClick={() => void handleContinue()}
                disabled={!placed || saving || !shown}
              >
                <span className="truncate">{setupStep === 0 ? t("welcome.continue") : primaryLabel}</span>
                <ChevronRight className="size-4 shrink-0 rtl:rotate-180" />
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
