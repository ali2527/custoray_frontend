"use client"

import { useEffect, useState, type FormEvent } from "react"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"

import { ActiveSessions } from "@/components/settings/active-sessions"
import { TwoFactorSettings } from "@/components/settings/two-factor-settings"
import { SettingsSection } from "@/components/settings/settings-section"
import { AuthCodeInput } from "@/components/auth/auth-code-input"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { PasswordRequirements } from "@/components/auth/password-requirements"
import { PasswordInput } from "@/components/ui/password-input"
import {
  apiMe,
  apiPatchAccount,
  apiRequestEmailChange,
  apiTotpStatus,
} from "@/lib/api/auth"
import { isPasswordStrong } from "@/lib/password"

export default function AccountSettingsPage() {
  const { t } = useTranslation("settings")
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [currentPassword, setCurrentPassword] = useState("")
  const [saving, setSaving] = useState(false)

  const [newEmail, setNewEmail] = useState("")
  const [emailCurrentPassword, setEmailCurrentPassword] = useState("")
  const [totpEnabled, setTotpEnabled] = useState(false)
  const [totpCode, setTotpCode] = useState("")
  const [pendingEmail, setPendingEmail] = useState<string | null>(null)
  const [emailSaving, setEmailSaving] = useState(false)

  useEffect(() => {
    apiMe()
      .then((s) => {
        setName(s.user.name)
        setEmail(s.user.email)
        setTotpEnabled(Boolean(s.user.totpEnabled))
      })
      .catch(() => {})
    apiTotpStatus()
      .then((s) => setTotpEnabled(s.enabled))
      .catch(() => {})
  }, [])

  async function handleSave(event: FormEvent) {
    event.preventDefault()
    if (password.length > 0 && !isPasswordStrong(password)) {
      toast.error(t("account.passwordWeak"))
      return
    }
    if (password.length > 0 && !currentPassword) {
      toast.error(t("account.currentPasswordRequired"))
      return
    }
    setSaving(true)
    try {
      const payload: {
        name?: string
        password?: string
        currentPassword?: string
      } = { name: name.trim() }
      if (password.length > 0) {
        payload.password = password
        payload.currentPassword = currentPassword
      }
      const updated = await apiPatchAccount(payload)
      setName(updated.name)
      setPassword("")
      setCurrentPassword("")
      toast.success(t("account.toastUpdated"))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("account.toastError"))
    } finally {
      setSaving(false)
    }
  }

  async function handleEmailChange(event: FormEvent) {
    event.preventDefault()
    if (!newEmail.trim() || !emailCurrentPassword) {
      toast.error(t("account.emailChangeIncomplete"))
      return
    }
    if (totpEnabled && totpCode.length !== 6) {
      toast.error(t("account.totpRequired"))
      return
    }
    setEmailSaving(true)
    try {
      const result = await apiRequestEmailChange({
        currentPassword: emailCurrentPassword,
        newEmail: newEmail.trim(),
        totpCode: totpEnabled ? totpCode : undefined,
      })
      setPendingEmail(result.pendingEmail)
      setNewEmail("")
      setEmailCurrentPassword("")
      setTotpCode("")
      toast.success(t("account.emailChangeSent"))
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : t("account.emailChangeError")
      )
    } finally {
      setEmailSaving(false)
    }
  }

  return (
    <div className="w-full max-w-2xl space-y-6">
      <form onSubmit={handleSave}>
        <SettingsSection
          title={t("account.profile")}
          description={t("account.profileDescription")}
          footer={
            <Button type="submit" disabled={saving || name.trim().length < 1}>
              {saving ? t("account.saving") : t("account.saveProfile")}
            </Button>
          }
        >
          <div className="grid gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">{t("account.name")}</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">{t("account.email")}</Label>
              <Input id="email" type="email" value={email} readOnly />
              <p className="text-muted-foreground text-xs">
                {t("account.emailHint")}
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="currentPassword">{t("account.currentPassword")}</Label>
              <PasswordInput
                id="currentPassword"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder={t("account.currentPasswordPlaceholder")}
                autoComplete="current-password"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">{t("account.newPassword")}</Label>
              <PasswordInput
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t("account.passwordPlaceholder")}
                minLength={8}
                maxLength={128}
                autoComplete="new-password"
              />
              <PasswordRequirements password={password} />
            </div>
          </div>
        </SettingsSection>
      </form>

      <form onSubmit={handleEmailChange}>
        <SettingsSection
          title={t("account.changeEmail")}
          description={t("account.changeEmailDescription")}
          footer={
            <Button
              type="submit"
              disabled={
                emailSaving ||
                !newEmail.trim() ||
                !emailCurrentPassword ||
                (totpEnabled && totpCode.length !== 6)
              }
            >
              {emailSaving ? t("account.saving") : t("account.requestEmailChange")}
            </Button>
          }
        >
          <div className="grid gap-4">
            {pendingEmail ? (
              <p className="text-muted-foreground text-sm">
                {t("account.pendingEmail", { email: pendingEmail })}
              </p>
            ) : null}
            <div className="space-y-1.5">
              <Label htmlFor="newEmail">{t("account.newEmail")}</Label>
              <Input
                id="newEmail"
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                autoComplete="email"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="emailCurrentPassword">
                {t("account.currentPassword")}
              </Label>
              <PasswordInput
                id="emailCurrentPassword"
                value={emailCurrentPassword}
                onChange={(e) => setEmailCurrentPassword(e.target.value)}
                autoComplete="current-password"
              />
            </div>
            {totpEnabled ? (
              <div className="space-y-1.5">
                <Label htmlFor="email-totp">{t("account.totpCode")}</Label>
                <AuthCodeInput
                  id="email-totp"
                  value={totpCode}
                  onChange={setTotpCode}
                />
              </div>
            ) : null}
          </div>
        </SettingsSection>
      </form>

      <TwoFactorSettings />
      <ActiveSessions />
    </div>
  )
}
