"use client"

import { useEffect, useRef, useState, type FormEvent } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowRight, Building2, ChevronLeft, Mail, Phone, User } from "lucide-react"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"

import { AuthSocialButtons } from "@/components/auth/auth-social"
import {
  AUTH_BUTTON,
  AUTH_INPUT,
  AuthHeading,
  AuthShell,
  AuthSwitch,
} from "@/components/auth/auth-shell"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { PasswordInput } from "@/components/ui/password-input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useAuth } from "@/context/auth-context"
import { PhoneCodeSelect } from "@/components/signup/phone-code-select"
import { SIGNUP_COUNTRIES } from "@/lib/countries"
import { SIGNUP_INDUSTRIES } from "@/lib/industries"
import {
  formatInternationalNumber,
  formatNationalNumber,
  isPhoneCountry,
  phoneProfile,
  validateSignupPhone,
} from "@/lib/phone-mask"
import { queueWelcomeFlow } from "@/lib/welcome-flow"
import { FALLBACK_PLANS } from "@/lib/subscription-access"
import { cn } from "@/lib/utils"

const SELECT_TRIGGER = cn(
  AUTH_INPUT,
  "w-full justify-between px-3 font-normal shadow-none data-[size=default]:h-10"
)

type FieldErrors = Partial<
  Record<"ownerName" | "email" | "password" | "businessName" | "industry" | "country" | "phone" | "terms", string>
>

function planFromUrl(code: string | null | undefined) {
  const match = FALLBACK_PLANS.find((plan) => plan.code === code)
  return match ?? FALLBACK_PLANS[0]
}

function StepBar({
  step,
  onBack,
}: {
  step: 1 | 2
  onBack: () => void
}) {
  const { t } = useTranslation("auth")
  return (
    <div className="-mt-2 mb-4">
      <div className="grid grid-cols-2 gap-1.5">
        <button
          type="button"
          aria-label={t("signup.ariaAccount")}
          className="h-0.5 rounded-full bg-primary"
          onClick={step === 2 ? onBack : undefined}
          disabled={step === 1}
        />
        <span
          className={cn(
            "h-0.5 rounded-full",
            step === 2 ? "bg-primary" : "bg-border"
          )}
        />
      </div>
      <p className="text-muted-foreground mt-1.5 text-right text-[11px]">
        {t("signup.stepOf", { step })}
      </p>
    </div>
  )
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return <p className="text-destructive text-[11px] leading-none">{message}</p>
}

export function SignupWizard({ planCode }: { planCode?: string }) {
  const { t } = useTranslation("auth")
  const router = useRouter()
  const { signup, session, hydrated, access } = useAuth()
  const plan = planFromUrl(planCode)
  const stayOnSignup = useRef(false)
  const [step, setStep] = useState<1 | 2>(1)
  const [loading, setLoading] = useState(false)
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [values, setValues] = useState({
    ownerName: "",
    email: "",
    password: "",
    businessName: "",
    industry: "",
    country: "",
    phoneCountry: "",
    phone: "",
  })

  useEffect(() => {
    if (!hydrated || !session || stayOnSignup.current) return
    router.replace(access && !access.allowed ? "/trial-ended" : "/home")
  }, [hydrated, session, access, router])

  useEffect(() => {
    const id = step === 1 ? "ownerName" : "businessName"
    window.setTimeout(() => document.getElementById(id)?.focus(), 0)
  }, [step])

  function update<K extends keyof typeof values>(key: K, value: (typeof values)[K]) {
    setValues((prev) => ({ ...prev, [key]: value }))
    setErrors((prev) => ({ ...prev, [key]: undefined }))
  }

  function setCountry(country: string) {
    setValues((prev) => {
      const followCountry = !prev.phoneCountry || prev.phoneCountry === prev.country
      const phoneCountry = followCountry && isPhoneCountry(country) ? country : prev.phoneCountry
      return {
        ...prev,
        country,
        phoneCountry,
        phone: formatNationalNumber(phoneCountry, prev.phone),
      }
    })
    setErrors((prev) => ({ ...prev, country: undefined, phone: undefined }))
  }

  function setPhoneCountry(phoneCountry: string) {
    setValues((prev) => ({
      ...prev,
      phoneCountry,
      phone: formatNationalNumber(phoneCountry, prev.phone),
    }))
    setErrors((prev) => ({ ...prev, phone: undefined }))
  }

  function setPhone(raw: string) {
    setValues((prev) => ({
      ...prev,
      phone: formatNationalNumber(prev.phoneCountry || prev.country, raw),
    }))
    setErrors((prev) => ({ ...prev, phone: undefined }))
  }

  function goToCompany(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const next: FieldErrors = {}
    if (values.ownerName.trim().length < 2) next.ownerName = t("signup.errors.fullName")
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) {
      next.email = t("signup.errors.email")
    }
    if (values.password.length < 8) next.password = t("signup.errors.password")
    setErrors(next)
    if (Object.keys(next).length) return
    setStep(2)
  }

  async function createAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const next: FieldErrors = {}
    if (values.businessName.trim().length < 2) next.businessName = t("signup.errors.company")
    if (!values.industry) next.industry = t("signup.errors.industry")
    if (!values.country) next.country = t("signup.errors.country")
    const phoneCountry = values.phoneCountry || values.country
    const phoneError = validateSignupPhone(phoneCountry, values.phone)
    if (phoneError === "required") next.phone = t("signup.errors.phoneRequired")
    else if (phoneError === "invalid") next.phone = t("signup.errors.phone")
    if (!acceptedTerms) next.terms = t("signup.errors.terms")
    setErrors(next)
    if (Object.keys(next).length) return

    setLoading(true)
    stayOnSignup.current = true
    try {
      const result = await signup({
        ownerName: values.ownerName.trim(),
        email: values.email.trim(),
        phone: formatInternationalNumber(values.phoneCountry || values.country, values.phone),
        country: values.country,
        password: values.password,
        businessName: values.businessName.trim(),
        industry: values.industry,
        planCode: plan.code,
      })
      if (!result.ok) {
        stayOnSignup.current = false
        toast.error(result.error)
        return
      }
      queueWelcomeFlow()
      router.replace(result.accessAllowed ? "/home/?welcome=1" : "/trial-ended")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("signup.toastFailed"))
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell hero="signup">
      {step === 1 ? (
        <>
          <AuthHeading
            title={t("signup.titleAccount")}
            accent="account"
            subtitle={t("signup.subtitleAccount")}
          />
          <StepBar step={step} onBack={() => setStep(1)} />
          <form className="space-y-3" onSubmit={goToCompany}>
            <div className="grid gap-1.5">
              <Label htmlFor="ownerName">{t("signup.fullName")}</Label>
              <div className="relative">
                <Input
                  id="ownerName"
                  name="ownerName"
                  placeholder={t("signup.fullNamePlaceholder")}
                  autoComplete="name"
                  required
                  minLength={2}
                  value={values.ownerName}
                  onChange={(e) => update("ownerName", e.target.value)}
                  aria-invalid={Boolean(errors.ownerName)}
                  className={`${AUTH_INPUT} pr-10`}
                />
                <User
                  className="text-muted-foreground pointer-events-none absolute right-3 top-1/2 size-3.5 -translate-y-1/2"
                  aria-hidden
                />
              </div>
              <FieldError message={errors.ownerName} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="email">{t("signup.email")}</Label>
              <div className="relative">
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder={t("signup.emailPlaceholder")}
                  autoComplete="email"
                  required
                  value={values.email}
                  onChange={(e) => update("email", e.target.value)}
                  aria-invalid={Boolean(errors.email)}
                  className={`${AUTH_INPUT} pr-10`}
                />
                <Mail
                  className="text-muted-foreground pointer-events-none absolute right-3 top-1/2 size-3.5 -translate-y-1/2"
                  aria-hidden
                />
              </div>
              <FieldError message={errors.email} />
            </div>
            <div className="grid gap-1.5">
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="password">{t("signup.password")}</Label>
                <span
                  className={cn(
                    "text-[11px]",
                    values.password.length >= 8
                      ? "text-primary"
                      : "text-muted-foreground"
                  )}
                >
                  {t("signup.passwordHint")}
                </span>
              </div>
              <PasswordInput
                id="password"
                name="password"
                placeholder="••••••••"
                autoComplete="new-password"
                minLength={8}
                required
                value={values.password}
                onChange={(e) => update("password", e.target.value)}
                aria-invalid={Boolean(errors.password)}
                className={AUTH_INPUT}
              />
              <FieldError message={errors.password} />
            </div>
            <Button type="submit" className={AUTH_BUTTON}>
              {t("signup.continue")}
              <ArrowRight className="size-3.5" />
            </Button>
            <AuthSocialButtons
              onNavigate={() => {
                stayOnSignup.current = true
              }}
            />
            <AuthSwitch prompt={t("signup.haveAccount")} href="/" label={t("signup.signIn")} />
          </form>
        </>
      ) : (
        <>
          <AuthHeading
            title={t("signup.titleCompany")}
            accent="company"
            subtitle={t("signup.subtitleCompany")}
          />
          <StepBar step={step} onBack={() => setStep(1)} />
          <p className="text-muted-foreground -mt-1 mb-3 truncate text-[11px]">
            {values.email}
            {" · "}
            <button
              type="button"
              className="text-primary font-medium hover:underline"
              onClick={() => setStep(1)}
            >
              {t("signup.change")}
            </button>
          </p>
          <form className="space-y-3" onSubmit={(e) => void createAccount(e)}>
            <div className="grid gap-1.5">
              <Label htmlFor="businessName">{t("signup.companyName")}</Label>
              <div className="relative">
                <Input
                  id="businessName"
                  name="businessName"
                  placeholder={t("signup.companyPlaceholder")}
                  required
                  minLength={2}
                  value={values.businessName}
                  onChange={(e) => update("businessName", e.target.value)}
                  aria-invalid={Boolean(errors.businessName)}
                  className={`${AUTH_INPUT} pr-10`}
                />
                <Building2
                  className="text-muted-foreground pointer-events-none absolute right-3 top-1/2 size-3.5 -translate-y-1/2"
                  aria-hidden
                />
              </div>
              <FieldError message={errors.businessName} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="industry">{t("signup.industry")}</Label>
              <Select
                value={values.industry || undefined}
                onValueChange={(value) => update("industry", value)}
              >
                <SelectTrigger
                  id="industry"
                  aria-invalid={Boolean(errors.industry)}
                  className={SELECT_TRIGGER}
                >
                  <SelectValue placeholder={t("signup.industryPlaceholder")} />
                </SelectTrigger>
                <SelectContent>
                  {SIGNUP_INDUSTRIES.map((industry) => (
                    <SelectItem
                      key={industry.value}
                      value={industry.value}
                      className="text-xs"
                    >
                      {industry.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldError message={errors.industry} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="country">{t("signup.country")}</Label>
              <Select value={values.country || undefined} onValueChange={setCountry}>
                <SelectTrigger id="country" className={SELECT_TRIGGER}>
                  <SelectValue placeholder={t("signup.countryPlaceholder")} />
                </SelectTrigger>
                <SelectContent>
                  {SIGNUP_COUNTRIES.map((country) => (
                    <SelectItem key={country} value={country} className="text-xs">
                      {country}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldError message={errors.country} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="phone">
                {t("signup.phone")}
                <span className="text-destructive"> *</span>
              </Label>
              <div
                className={cn(
                  AUTH_INPUT,
                  "relative flex items-center overflow-hidden px-0",
                  errors.phone && "border-destructive"
                )}
              >
                <PhoneCodeSelect
                  value={values.phoneCountry}
                  onValueChange={setPhoneCountry}
                  invalid={Boolean(errors.phone)}
                />
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel-national"
                  required
                  placeholder={phoneProfile(values.phoneCountry || values.country).placeholder}
                  value={values.phone}
                  onChange={(e) => setPhone(e.target.value)}
                  aria-invalid={Boolean(errors.phone)}
                  aria-required="true"
                  className="h-full min-w-0 w-0 flex-1 rounded-none border-0 bg-transparent px-2 pr-9 text-xs shadow-none focus-visible:ring-0"
                />
                <Phone
                  className="text-muted-foreground pointer-events-none absolute right-3 top-1/2 size-3.5 -translate-y-1/2"
                  aria-hidden
                />
              </div>
              <FieldError message={errors.phone} />
            </div>
            <div className="grid gap-1">
              <label className="flex items-center gap-2 text-xs">
                <Checkbox
                  id="terms"
                  checked={acceptedTerms}
                  onCheckedChange={(checked) => {
                    setAcceptedTerms(checked === true)
                    setErrors((prev) => ({ ...prev, terms: undefined }))
                  }}
                />
                <span className="text-muted-foreground leading-none">
                  {t("signup.agreePrefix")}{" "}
                  <Link href="/legal/terms" className="text-primary font-medium hover:underline">
                    {t("signup.terms")}
                  </Link>{" "}
                  {t("signup.and")}{" "}
                  <Link href="/legal/privacy" className="text-primary font-medium hover:underline">
                    {t("signup.privacy")}
                  </Link>
                  .
                </span>
              </label>
              <FieldError message={errors.terms} />
            </div>
            <Button type="submit" className={AUTH_BUTTON} disabled={loading}>
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <LoadingSpinner size="sm" />
                  {t("signup.creating")}
                </span>
              ) : (
                t("signup.createAccount")
              )}
            </Button>
            <button
              type="button"
              className="text-muted-foreground hover:text-foreground inline-flex w-full items-center justify-center gap-1 text-xs"
              onClick={() => setStep(1)}
            >
              <ChevronLeft className="size-3.5" />
              {t("signup.backToAccount")}
            </button>
          </form>
        </>
      )}
    </AuthShell>
  )
}
