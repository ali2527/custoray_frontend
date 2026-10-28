"use client"

import Link from "next/link"
import { useEffect, useRef, useState, type FormEvent } from "react"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"

import { AUTH_BUTTON, AUTH_INPUT, AuthHeading } from "@/components/auth/auth-shell"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  hasEmailVerifiedFlag,
  rememberPendingVerifyEmail,
} from "@/components/verifyEmailForm/pending-email"
import { apiResendVerification } from "@/lib/api/auth"

const RESEND_COOLDOWN_SEC = 60

function inboxShortcut(email: string) {
  const domain = email.split("@")[1]?.toLowerCase() ?? ""
  if (domain === "gmail.com" || domain === "googlemail.com") {
    return {
      href: "https://mail.google.com/mail/u/0/#search/Custoray",
      labelKey: "verifyEmail.openGmail" as const,
    }
  }
  if (
    domain === "outlook.com" ||
    domain === "hotmail.com" ||
    domain === "live.com" ||
    domain === "msn.com"
  ) {
    return {
      href: "https://outlook.live.com/mail/0/",
      labelKey: "verifyEmail.openOutlook" as const,
    }
  }
  return null
}

export function VerifyEmailStep({
  email,
  pending = false,
  startCooldown = true,
  onSignIn,
  onVerified,
  showHeading = true,
}: {
  email: string
  pending?: boolean
  startCooldown?: boolean
  onSignIn?: () => void
  onVerified?: () => void
  showHeading?: boolean
}) {
  const { t } = useTranslation("auth")
  const [emailDraft, setEmailDraft] = useState(email)
  const [resending, setResending] = useState(false)
  const [cooldown, setCooldown] = useState(0)
  const [verified, setVerified] = useState(false)
  const onVerifiedRef = useRef(onVerified)
  onVerifiedRef.current = onVerified
  const inbox = inboxShortcut(email || emailDraft)

  useEffect(() => {
    setEmailDraft(email)
    if (email) rememberPendingVerifyEmail(email)
    if (startCooldown && email) setCooldown(RESEND_COOLDOWN_SEC)
  }, [email, startCooldown])

  useEffect(() => {
    if (cooldown <= 0) return
    const id = window.setInterval(() => {
      setCooldown((sec) => (sec <= 1 ? 0 : sec - 1))
    }, 1000)
    return () => window.clearInterval(id)
  }, [cooldown])

  useEffect(() => {
    function markIfVerified() {
      if (!hasEmailVerifiedFlag()) return
      setVerified(true)
      onVerifiedRef.current?.()
    }
    markIfVerified()
    function onStorage(event: StorageEvent) {
      if (event.key === "custoray:email-verified" && event.newValue === "1") {
        setVerified(true)
        onVerifiedRef.current?.()
      }
    }
    window.addEventListener("focus", markIfVerified)
    window.addEventListener("storage", onStorage)
    return () => {
      window.removeEventListener("focus", markIfVerified)
      window.removeEventListener("storage", onStorage)
    }
  }, [])

  async function resend(targetEmail: string) {
    const normalized = targetEmail.trim()
    if (!normalized) {
      toast.error(t("forgotPassword.toastEnterEmail"))
      return
    }
    if (cooldown > 0 || resending) return

    setResending(true)
    try {
      const result = await apiResendVerification(normalized)
      rememberPendingVerifyEmail(normalized)
      if (result.verifyUrl) {
        console.info("[dev] verification link:", result.verifyUrl)
      }
      if (result.sent) {
        setCooldown(RESEND_COOLDOWN_SEC)
        toast.success(t("verifyEmail.resentToInbox"))
      } else if (result.reason === "already_verified") {
        toast.message(t("verifyEmail.alreadyVerifiedHint"))
      } else if (result.reason === "smtp_failed") {
        toast.error(t("verifyEmail.smtpFailed"))
        if (result.verifyUrl) {
          toast.message(t("verifyEmail.devLinkReady"))
        }
      } else {
        toast.error(t("verifyEmail.noAccount"))
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("signup.toastFailed"))
    } finally {
      setResending(false)
    }
  }

  function onResendSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    void resend(emailDraft)
  }

  const resendLabel = resending
    ? t("forgotPassword.sending")
    : cooldown > 0
      ? t("verifyEmail.resendIn", { seconds: cooldown })
      : t("verifyEmail.resend")

  if (verified) {
    return (
      <div className="space-y-4">
        {onSignIn ? (
          <Button type="button" className={AUTH_BUTTON} onClick={onSignIn}>
            {t("verifyEmail.signIn")}
          </Button>
        ) : (
          <Button asChild className={AUTH_BUTTON}>
            <Link href="/">{t("verifyEmail.continue")}</Link>
          </Button>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {showHeading ? (
        <AuthHeading
          title={pending ? t("verifyEmail.alreadyWaiting") : t("verifyEmail.checkInbox")}
          subtitle={pending ? t("verifyEmail.resentTo") : t("verifyEmail.sentTo")}
        />
      ) : null}
      {email ? (
        <p className="border-border bg-muted/40 text-foreground rounded-lg border px-3 py-2.5 text-center text-sm font-medium break-all">
          {email}
        </p>
      ) : (
        <form onSubmit={onResendSubmit}>
          <div className="grid gap-1.5 text-left">
            <Label htmlFor="verify-email-step">{t("verifyEmail.emailLabel")}</Label>
            <Input
              id="verify-email-step"
              type="email"
              autoComplete="email"
              required
              value={emailDraft}
              onChange={(e) => setEmailDraft(e.target.value)}
              placeholder={t("forgotPassword.emailPlaceholder")}
              className={AUTH_INPUT}
            />
          </div>
        </form>
      )}

      <p className="text-muted-foreground text-center text-xs leading-relaxed">
        {t("verifyEmail.expiresNote")}
      </p>

      <div className="flex flex-col gap-2">
        {inbox ? (
          <Button asChild className={AUTH_BUTTON}>
            <a href={inbox.href} target="_blank" rel="noreferrer">
              {t(inbox.labelKey)}
            </a>
          </Button>
        ) : null}
        <Button
          type="button"
          variant={inbox ? "outline" : "default"}
          className={AUTH_BUTTON}
          disabled={resending || cooldown > 0 || (!email && !emailDraft.trim())}
          onClick={() => void resend(email || emailDraft)}
        >
          {resendLabel}
        </Button>
      </div>

      {onSignIn ? (
        <button
          type="button"
          className="text-muted-foreground hover:text-foreground w-full text-center text-xs"
          onClick={onSignIn}
        >
          {t("verifyEmail.signIn")}
        </button>
      ) : (
        <p className="text-center text-xs">
          <Link href="/" className="text-muted-foreground hover:text-foreground">
            {t("verifyEmail.signIn")}
          </Link>
        </p>
      )}
    </div>
  )
}
