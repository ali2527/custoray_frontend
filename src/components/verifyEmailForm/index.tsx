"use client"

import { Loader2, Mail, ShieldCheck } from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"
import { Suspense, useEffect, useRef, useState, type FormEvent } from "react"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"

import {
  AUTH_BUTTON,
  AUTH_INPUT,
  AuthHeading,
  AuthShell,
  AuthSwitch,
} from "@/components/auth/auth-shell"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { apiResendVerification, apiVerifyEmail } from "@/lib/api/auth"
import {
  clearPendingVerifyEmail,
  markEmailVerified,
  readPendingVerifyEmail,
  rememberPendingVerifyEmail,
} from "@/components/verifyEmailForm/pending-email"

/** One request per token. A second call consumes the link and looks expired. */
const verifyInflight = new Map<string, Promise<void>>()

function verifyEmailOnce(token: string) {
  const existing = verifyInflight.get(token)
  if (existing) return existing
  const pending = apiVerifyEmail(token)
    .then(() => undefined)
    .catch((error: unknown) => {
      verifyInflight.delete(token)
      throw error
    })
  verifyInflight.set(token, pending)
  return pending
}

export {
  clearEmailVerifiedFlag,
  clearPendingVerifyEmail,
  hasEmailVerifiedFlag,
  markEmailVerified,
  readPendingVerifyEmail,
  rememberPendingVerifyEmail,
} from "@/components/verifyEmailForm/pending-email"
export { VerifyEmailStep } from "@/components/verifyEmailForm/verify-email-dialog"

/**
 * Landing page for email verification links only.
 * Verifies automatically when the link is opened.
 */
function VerifyEmailInner() {
  const { t } = useTranslation("auth")
  const router = useRouter()
  const params = useSearchParams()
  const token = params.get("token")?.trim() || ""
  const emailFromQuery = params.get("email")?.trim() || ""

  const [emailDraft, setEmailDraft] = useState(
    () => emailFromQuery || readPendingVerifyEmail()
  )
  const [status, setStatus] = useState<"working" | "error" | "missing">(
    token ? "working" : "missing"
  )
  const [resending, setResending] = useState(false)
  const announcedToken = useRef<string | null>(null)

  useEffect(() => {
    if (emailFromQuery) rememberPendingVerifyEmail(emailFromQuery)
    const pending = readPendingVerifyEmail()
    if (pending && !emailDraft) setEmailDraft(pending)
  }, [emailFromQuery, emailDraft])

  useEffect(() => {
    if (!token) {
      if (emailFromQuery) rememberPendingVerifyEmail(emailFromQuery)
      router.replace("/")
      return
    }

    let cancelled = false
    ;(async () => {
      try {
        await verifyEmailOnce(token)
        // Always mark after a successful API call — even if this effect was
        // cleaned up (React Strict Mode). Skipping here left login thinking
        // the user was verified while the server still had a pending token.
        markEmailVerified()
        clearPendingVerifyEmail()
        if (cancelled) return
        if (announcedToken.current !== token) {
          announcedToken.current = token
          toast.success(t("verifyEmail.success"))
        }
        router.replace("/")
      } catch {
        if (cancelled) return
        setStatus("error")
      }
    })()
    return () => {
      cancelled = true
    }
  }, [token, emailFromQuery, router, t])

  async function onResendSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const normalized = emailDraft.trim()
    if (!normalized) {
      toast.error(t("forgotPassword.toastEnterEmail"))
      return
    }
    setResending(true)
    try {
      const result = await apiResendVerification(normalized)
      rememberPendingVerifyEmail(normalized)
      if (result.verifyUrl) {
        console.info("[dev] verification link:", result.verifyUrl)
      }
      if (result.sent) {
        toast.success(t("verifyEmail.resentToInbox"))
      } else if (result.reason === "already_verified") {
        toast.message(t("verifyEmail.alreadyVerifiedHint"))
      } else if (result.reason === "smtp_failed") {
        toast.error(t("verifyEmail.smtpFailed"))
        if (result.verifyUrl) toast.message(t("verifyEmail.devLinkReady"))
      } else {
        toast.error(t("verifyEmail.noAccount"))
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("signup.toastFailed"))
    } finally {
      setResending(false)
    }
  }

  if (status === "missing") {
    return (
      <AuthShell hero="reset_email">
        <AuthHeading
          title={t("verifyEmail.title")}
          accent={t("verifyEmail.accent")}
          subtitle={t("verifyEmail.subtitleGeneric")}
        />
        <AuthSwitch prompt="" href="/" label={t("verifyEmail.signIn")} />
      </AuthShell>
    )
  }

  return (
    <AuthShell hero="reset_email">
      <AuthHeading
        title={t("verifyEmail.title")}
        accent={t("verifyEmail.accent")}
        subtitle={
          status === "error"
            ? t("verifyEmail.subtitleError")
            : t("verifyEmail.subtitleWorking")
        }
      />

      {status === "working" ? (
        <div className="flex flex-col items-center gap-4 py-6 text-center">
          <div className="bg-primary/10 text-primary flex size-14 items-center justify-center rounded-full">
            <Loader2 className="size-6 animate-spin" aria-hidden />
          </div>
          <p className="text-muted-foreground text-xs leading-relaxed">
            {t("verifyEmail.verifying")}
          </p>
        </div>
      ) : null}

      {status === "error" ? (
        <div className="space-y-4">
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="bg-destructive/10 text-destructive flex size-12 items-center justify-center rounded-full">
              <ShieldCheck className="size-5" aria-hidden />
            </div>
            <p className="text-destructive text-xs leading-relaxed">
              {t("verifyEmail.failed")}
            </p>
          </div>
          <form className="space-y-3" onSubmit={(e) => void onResendSubmit(e)}>
            <div className="grid gap-1.5">
              <Label htmlFor="verify-email">{t("verifyEmail.emailLabel")}</Label>
              <div className="relative">
                <Input
                  id="verify-email"
                  type="email"
                  autoComplete="email"
                  required
                  value={emailDraft}
                  onChange={(e) => setEmailDraft(e.target.value)}
                  placeholder={t("forgotPassword.emailPlaceholder")}
                  className={`${AUTH_INPUT} pr-10`}
                />
                <Mail
                  className="text-muted-foreground pointer-events-none absolute right-3 top-1/2 size-3.5 -translate-y-1/2"
                  aria-hidden
                />
              </div>
            </div>
            <Button type="submit" className={AUTH_BUTTON} disabled={resending}>
              {resending
                ? t("forgotPassword.sending")
                : t("verifyEmail.resend")}
            </Button>
          </form>
          <AuthSwitch prompt="" href="/" label={t("verifyEmail.signIn")} />
        </div>
      ) : null}
    </AuthShell>
  )
}

export function VerifyEmailForm() {
  return (
    <Suspense fallback={null}>
      <VerifyEmailInner />
    </Suspense>
  )
}
