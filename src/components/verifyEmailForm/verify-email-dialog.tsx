"use client"

import { Inbox, Mail } from "lucide-react"
import Link from "next/link"
import { useEffect, useMemo, useState, type FormEvent } from "react"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"

import { AUTH_BUTTON, AUTH_INPUT } from "@/components/auth/auth-shell"
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

export function VerifyEmailDialog({
  open,
  email,
  onOpenChange,
  startCooldown = true,
}: {
  open: boolean
  email: string
  onOpenChange: (open: boolean) => void
  /** Soft cooldown after a fresh signup send. */
  startCooldown?: boolean
}) {
  const { t } = useTranslation("auth")
  const [emailDraft, setEmailDraft] = useState(email)
  const [resending, setResending] = useState(false)
  const [cooldown, setCooldown] = useState(0)

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

  const tips = useMemo(
    () => [
      t("verifyEmail.tipInbox"),
      t("verifyEmail.tipSpam"),
      t("verifyEmail.tipLink"),
    ],
    [t]
  )

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 p-0 sm:max-w-md" showCloseButton>
        <DialogHeader className="space-y-3 border-b border-border/60 px-6 py-5 text-left sm:text-left">
          <div className="bg-primary/10 text-primary flex size-11 items-center justify-center rounded-full">
            <Inbox className="size-5" aria-hidden />
          </div>
          <div className="space-y-1.5">
            <DialogTitle className="text-base font-semibold tracking-tight">
              {t("verifyEmail.title")}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground text-xs leading-relaxed">
              {email
                ? t("verifyEmail.subtitleModal")
                : t("verifyEmail.subtitleGeneric")}
            </DialogDescription>
          </div>
          {email ? (
            <p className="border-border/70 bg-muted/40 text-foreground inline-flex max-w-full items-center gap-1.5 self-start rounded-lg border px-2.5 py-1.5 text-xs font-medium break-all">
              <Mail className="size-3.5 shrink-0 opacity-70" aria-hidden />
              {email}
            </p>
          ) : null}
        </DialogHeader>

        <div className="space-y-5 px-6 py-5">
          <ol className="space-y-3">
            {tips.map((tip, index) => (
              <li key={tip} className="flex items-start gap-3">
                <span className="bg-primary mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold text-white shadow-sm">
                  {index + 1}
                </span>
                <span className="text-muted-foreground text-xs leading-5">
                  {tip}
                </span>
              </li>
            ))}
          </ol>

          <form className="space-y-3" onSubmit={onResendSubmit}>
            {!email ? (
              <div className="grid gap-1.5">
                <Label htmlFor="verify-email-dialog">
                  {t("verifyEmail.emailLabel")}
                </Label>
                <div className="relative">
                  <Input
                    id="verify-email-dialog"
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
            ) : null}

            <Button
              type="submit"
              variant="outline"
              className={AUTH_BUTTON}
              disabled={resending || cooldown > 0}
            >
              {resending
                ? t("forgotPassword.sending")
                : cooldown > 0
                  ? t("verifyEmail.resendIn", { seconds: cooldown })
                  : t("verifyEmail.resend")}
            </Button>
            <Button
              type="button"
              className={AUTH_BUTTON}
              onClick={() => onOpenChange(false)}
            >
              {t("verifyEmail.gotIt")}
            </Button>
          </form>

          <p className="text-muted-foreground text-center text-[11px] leading-relaxed">
            {t("verifyEmail.wrongEmail")}{" "}
            <Link
              href="/signup"
              className="text-primary font-medium hover:underline"
              onClick={() => onOpenChange(false)}
            >
              {t("verifyEmail.useDifferent")}
            </Link>
            {" · "}
            <Link
              href="/"
              className="text-primary font-medium hover:underline"
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
