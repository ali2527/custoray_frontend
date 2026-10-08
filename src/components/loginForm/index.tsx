"use client"

import { Mail } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useRef, useState, type FormEvent } from "react"
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
  clearEmailVerifiedFlag,
  clearPendingVerifyEmail,
  hasEmailVerifiedFlag,
  readPendingVerifyEmail,
  rememberPendingVerifyEmail,
  VerifyEmailDialog,
} from "@/components/verifyEmailForm"
import { useAuth } from "@/context/auth-context"
import { isTwoFactorPending } from "@/lib/two-factor"

export function LoginForm({
  expiredNotice = false,
  openVerify = false,
  verifyPending = false,
  redirectTo,
}: {
  expiredNotice?: boolean
  openVerify?: boolean
  verifyPending?: boolean
  redirectTo?: string
}) {
  const { t } = useTranslation("auth")
  const router = useRouter()
  const { login, session, hydrated, access } = useAuth()
  const [submitting, setSubmitting] = useState(false)
  const [verifyOpen, setVerifyOpen] = useState(false)
  const [verifyEmail, setVerifyEmail] = useState("")
  const stayOnAuth = useRef(openVerify)

  function closeInboxAfterVerify() {
    clearPendingVerifyEmail()
    clearEmailVerifiedFlag()
    setVerifyOpen(false)
    stayOnAuth.current = true
    if (window.location.search.includes("verify=1")) {
      router.replace("/")
    }
  }

  useEffect(() => {
    if (hasEmailVerifiedFlag()) {
      closeInboxAfterVerify()
      return
    }
    if (!openVerify) return
    stayOnAuth.current = true
    const pending = readPendingVerifyEmail()
    if (!pending) return
    setVerifyEmail(pending)
    setVerifyOpen(true)
  }, [openVerify])

  useEffect(() => {
    function onVerifiedElsewhere(event: StorageEvent) {
      if (event.key === "custoray:email-verified" && event.newValue === "1") {
        closeInboxAfterVerify()
      }
    }
    function onFocus() {
      if (hasEmailVerifiedFlag()) closeInboxAfterVerify()
    }
    window.addEventListener("storage", onVerifiedElsewhere)
    window.addEventListener("focus", onFocus)
    return () => {
      window.removeEventListener("storage", onVerifiedElsewhere)
      window.removeEventListener("focus", onFocus)
    }
  }, [router])

  useEffect(() => {
    if (!hydrated || stayOnAuth.current) return
    if (isTwoFactorPending()) {
      router.replace("/2fa")
      return
    }
    if (!session) return
    if (access && !access.allowed) {
      router.replace("/trial-ended")
      return
    }
    if (!access || access.allowed) {
      router.replace(redirectTo || "/home")
    }
  }, [hydrated, session, access, router, redirectTo])

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const email = String(fd.get("email") ?? "")
    const password = String(fd.get("password") ?? "")

    setSubmitting(true)
    const result = await login(email, password)
    setSubmitting(false)

    if (!result.ok) {
      toast.error(result.error)
      return
    }

    if (result.requiresTwoFactor) {
      stayOnAuth.current = true
      router.replace("/2fa")
      return
    }

    if ("requiresEmailVerification" in result && result.requiresEmailVerification) {
      stayOnAuth.current = true
      rememberPendingVerifyEmail(result.email)
      setVerifyEmail(result.email)
      setVerifyOpen(true)
      return
    }

    stayOnAuth.current = true
    toast.success(
      result.accessAllowed ? t("login.toastWelcome") : t("login.toastTrialEnded")
    )
    window.location.assign(result.accessAllowed ? redirectTo || "/home" : "/trial-ended")
  }

  return (
    <AuthShell>
      <AuthHeading
        title={t("login.title")}
        accent="back"
        subtitle={
          expiredNotice
            ? t("login.subtitleExpired")
            : t("login.subtitle")
        }
      />
      <form className="space-y-3.5" onSubmit={handleSubmit}>
        <div className="grid gap-1.5">
          <Label htmlFor="email">{t("login.email")}</Label>
          <div className="relative">
            <Input
              id="email"
              name="email"
              type="email"
              placeholder={t("login.emailPlaceholder")}
              required
              autoComplete="email"
              className={`${AUTH_INPUT} pr-10`}
            />
            <Mail
              className="text-muted-foreground pointer-events-none absolute right-3 top-1/2 size-3.5 -translate-y-1/2"
              aria-hidden
            />
          </div>
        </div>
        <div className="grid gap-1.5">
          <div className="flex items-center justify-between gap-2">
            <Label htmlFor="password">{t("login.password")}</Label>
            <Link
              href="/forgetPassword"
              prefetch
              className="text-primary text-xs font-medium hover:underline"
              onClick={() => {
                stayOnAuth.current = true
              }}
            >
              {t("login.forgotPassword")}
            </Link>
          </div>
          <PasswordInput
            id="password"
            name="password"
            autoComplete="current-password"
            placeholder="••••••••"
            required
            className={AUTH_INPUT}
          />
        </div>
        <label className="flex items-center gap-2 text-xs">
          <Checkbox id="remember" name="remember" />
          <span>{t("login.rememberMe")}</span>
        </label>
        <Button type="submit" className={AUTH_BUTTON} disabled={submitting}>
          {submitting ? (
            <span className="flex items-center justify-center gap-2">
              <LoadingSpinner size="sm" />
              {t("login.signingIn")}
            </span>
          ) : (
            t("login.submit")
          )}
        </Button>
        <AuthSocialButtons
          mode="login"
          onNavigate={() => {
            stayOnAuth.current = true
          }}
        />
        <AuthSwitch
          prompt={t("login.noAccount")}
          href="/signup"
          label={t("login.signUp")}
          onNavigate={() => {
            stayOnAuth.current = true
          }}
        />
      </form>
      <VerifyEmailDialog
        open={verifyOpen}
        email={verifyEmail}
        onOpenChange={setVerifyOpen}
        pending={verifyPending}
        startCooldown={openVerify}
      />
    </AuthShell>
  )
}
