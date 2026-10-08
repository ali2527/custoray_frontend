"use client"

import Link from "next/link"
import { useEffect, useState, type FormEvent } from "react"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"

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
import { rememberPendingVerifyEmail } from "@/components/verifyEmailForm/pending-email"
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

export function VerifyEmailDialog({
  open,
  email,
  onOpenChange,
  pending = false,
  startCooldown = true,
}: {
  open: boolean
  email: string
  onOpenChange: (open: boolean) => void
  /** This address was already waiting, and a new link was just sent. */
  pending?: boolean
  /** Soft cooldown after a fresh signup send. */
  startCooldown?: boolean
}) {
  const { t } = useTranslation("auth")
  const [emailDraft, setEmailDraft] = useState(email)
  const [resending, setResending] = useState(false)
  const [cooldown, setCooldown] = useState(0)
  const inbox = inboxShortcut(email)

  useEffect(() => {
    if (!open) return
    setEmailDraft(email)
    if (email) rememberPendingVerifyEmail(email)
    if (startCooldown && email) setCooldown(RESEND_COOLDOWN_SEC)
  }, [open, email, startCooldown])

  useEffect(() => {
    if (cooldown <= 0) return
    const id = window.setInterval(() => {
      setCooldown((sec) => (sec <= 1 ? 0 : sec - 1))
    }, 1000)
    return () => window.clearInterval(id)
  }, [cooldown])

  async function resend(targetEmail: string) {
    const normalized = targetEmail.trim()
    if (!normalized) {
      toast.error(t("forgotPassword.toastEnterEmail"))
      return
    }
    if (cooldown > 0 || resending) return

    setResending(true)
    try {
      await apiResendVerification(normalized)
      rememberPendingVerifyEmail(normalized)
      setCooldown(RESEND_COOLDOWN_SEC)
      toast.success(t("verifyEmail.resent"))
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="w-full max-w-[34rem] gap-0 overflow-hidden rounded-2xl p-0 sm:max-w-[34rem]"
        showCloseButton
      >
        <DialogHeader className="items-center space-y-0 px-10 pt-10 pb-0 text-center sm:text-center">
          <img
            src="/assets/logo-2.png"
            alt="Custoray"
            width={140}
            height={40}
            className="mb-6 h-8 w-auto"
          />
          <DialogTitle className="text-xl font-semibold tracking-tight">
            {pending ? t("verifyEmail.alreadyWaiting") : t("verifyEmail.checkInbox")}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground mx-auto mt-2 max-w-sm text-sm leading-relaxed">
            {email
              ? t(pending ? "verifyEmail.resentTo" : "verifyEmail.sentTo")
              : t("verifyEmail.subtitleGeneric")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 px-10 pt-5 pb-8">
          {email ? (
            <p className="border-border bg-muted/40 text-foreground rounded-xl border px-4 py-3 text-center text-sm font-medium break-all">
              {email}
            </p>
          ) : (
            <form onSubmit={onResendSubmit}>
              <div className="grid gap-1.5 text-left">
                <Label htmlFor="verify-email-dialog">{t("verifyEmail.emailLabel")}</Label>
                <Input
                  id="verify-email-dialog"
                  type="email"
                  autoComplete="email"
                  required
                  value={emailDraft}
                  onChange={(e) => setEmailDraft(e.target.value)}
                  placeholder={t("forgotPassword.emailPlaceholder")}
                  className="h-11 rounded-xl"
                />
              </div>
            </form>
          )}

          <p className="text-muted-foreground text-center text-sm leading-relaxed">
            {t("verifyEmail.expiresNote")}
          </p>

          <div className="flex flex-col gap-2.5 sm:flex-row">
            {inbox ? (
              <Button asChild className="h-11 flex-1 rounded-xl text-sm font-medium shadow-none">
                <a href={inbox.href} target="_blank" rel="noreferrer">
                  {t(inbox.labelKey)}
                </a>
              </Button>
            ) : null}
            <Button
              type="button"
              variant={inbox ? "outline" : "default"}
              className="h-11 flex-1 rounded-xl text-sm font-medium shadow-none"
              disabled={resending || cooldown > 0 || (!email && !emailDraft.trim())}
              onClick={() => void resend(email || emailDraft)}
            >
              {resendLabel}
            </Button>
          </div>

          <p className="text-center text-sm">
            <Link
              href="/"
              className="text-muted-foreground hover:text-foreground"
              onClick={() => onOpenChange(false)}
            >
              {t("verifyEmail.signIn")}
            </Link>
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
