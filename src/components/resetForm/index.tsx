"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { Suspense, useState, type FormEvent } from "react"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"

import { PasswordRequirements } from "@/components/auth/password-requirements"
import {
  AUTH_BUTTON,
  AUTH_INPUT,
  AuthHeading,
  AuthShell,
  AuthSwitch,
} from "@/components/auth/auth-shell"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { PasswordInput } from "@/components/ui/password-input"
import { apiResetPassword } from "@/lib/api/auth"
import { isPasswordStrong } from "@/lib/password"

function ResetFormInner() {
  const { t } = useTranslation("auth")
  const router = useRouter()
  const params = useSearchParams()
  const token = params.get("token")?.trim() || ""
  const [password, setPassword] = useState("")
  const [saving, setSaving] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!token) {
      toast.error(t("resetPassword.toastInvalid"))
      return
    }
    const fd = new FormData(event.currentTarget)
    const nextPassword = String(fd.get("password") ?? "")
    const confirm = String(fd.get("confirm") ?? "")
    if (!isPasswordStrong(nextPassword)) {
      toast.error(t("resetPassword.toastWeak"))
      return
    }
    if (nextPassword !== confirm) {
      toast.error(t("resetPassword.toastMismatch"))
      return
    }
    setSaving(true)
    try {
      await apiResetPassword(token, nextPassword)
      toast.success(t("resetPassword.toastSuccess"))
      router.replace("/")
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : t("resetPassword.toastInvalid")
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <AuthShell hero="reset_password">
      <AuthHeading
        title={t("resetPassword.title")}
        accent="password"
        subtitle={t("resetPassword.subtitle")}
      />
      {!token ? (
        <p className="text-destructive text-xs">{t("resetPassword.toastInvalid")}</p>
      ) : null}
      <form className="space-y-3.5" onSubmit={(e) => void handleSubmit(e)}>
        <div className="grid gap-1.5">
          <Label htmlFor="password">{t("resetPassword.newPassword")}</Label>
          <PasswordInput
            id="password"
            name="password"
            autoComplete="new-password"
            placeholder="••••••••"
            required
            minLength={8}
            maxLength={128}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={AUTH_INPUT}
          />
          <PasswordRequirements password={password} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="confirm">{t("resetPassword.confirmPassword")}</Label>
          <PasswordInput
            id="confirm"
            name="confirm"
            autoComplete="new-password"
            placeholder="••••••••"
            required
            minLength={8}
            maxLength={128}
            className={AUTH_INPUT}
          />
        </div>
        <Button type="submit" className={AUTH_BUTTON} disabled={saving || !token}>
          {saving ? t("forgotPassword.sending") : t("resetPassword.submit")}
        </Button>
        <AuthSwitch
          prompt={t("resetPassword.backTo")}
          href="/"
          label={t("resetPassword.signIn")}
        />
      </form>
    </AuthShell>
  )
}

export function ResetForm() {
  return (
    <Suspense fallback={null}>
      <ResetFormInner />
    </Suspense>
  )
}
