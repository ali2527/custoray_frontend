"use client"

import { Mail } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState, type FormEvent } from "react"
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
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { apiForgotPassword } from "@/lib/api/auth"

export function EmailForm() {
  const { t } = useTranslation("auth")
  const router = useRouter()
  const [sending, setSending] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const fd = new FormData(event.currentTarget)
    const email = String(fd.get("email") ?? "").trim()
    if (!email) {
      toast.error(t("forgotPassword.toastEnterEmail"))
      return
    }

    setSending(true)
    try {
      await apiForgotPassword(email)
      // Generic success — do not reveal whether the account exists.
      toast.success(t("forgotPassword.toastSent"))
      router.push("/")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("forgotPassword.toastError"))
    } finally {
      setSending(false)
    }
  }

  return (
    <AuthShell hero="reset_email">
      <AuthHeading
        title={t("forgotPassword.title")}
        accent="password"
        subtitle={t("forgotPassword.subtitle")}
      />
      <form className="space-y-3.5" onSubmit={handleSubmit}>
        <div className="grid gap-1.5">
          <Label htmlFor="email">{t("forgotPassword.email")}</Label>
          <div className="relative">
            <Input
              id="email"
              name="email"
              type="email"
              placeholder={t("forgotPassword.emailPlaceholder")}
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
        <Button type="submit" className={AUTH_BUTTON} disabled={sending}>
          {sending ? (
            <span className="flex items-center justify-center gap-2">
              <LoadingSpinner size="sm" />
              {t("forgotPassword.sending")}
            </span>
          ) : (
            t("forgotPassword.submit")
          )}
        </Button>
        <AuthSwitch
          prompt={t("forgotPassword.remembered")}
          href="/"
          label={t("forgotPassword.signIn")}
        />
      </form>
    </AuthShell>
  )
}
