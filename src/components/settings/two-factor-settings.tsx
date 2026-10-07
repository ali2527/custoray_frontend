"use client"

import { Check, Copy, ShieldCheck } from "lucide-react"
import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"

import { AuthCodeInput } from "@/components/auth/auth-code-input"
import { SettingsSection } from "@/components/settings/settings-section"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import {
  apiStepUp,
  apiTotpDisable,
  apiTotpEnable,
  apiTotpSetup,
  apiTotpStatus,
  type TotpSetup,
} from "@/lib/api/auth"
import { PasswordInput } from "@/components/ui/password-input"
import { formatTotpSecret } from "@/lib/two-factor"

export function TwoFactorSettings() {
  const { t } = useTranslation("settings")
  const [enabled, setEnabled] = useState(false)
  const [loading, setLoading] = useState(true)
  const [setup, setSetup] = useState<TotpSetup | null>(null)
  const [code, setCode] = useState("")
  const [currentPassword, setCurrentPassword] = useState("")
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    apiTotpStatus()
      .then((status) => setEnabled(status.enabled))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  async function startSetup() {
    setBusy(true)
    try {
      const next = await apiTotpSetup()
      setSetup(next)
      setCode("")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("twoFactor.toastCouldNotStart"))
    } finally {
      setBusy(false)
    }
  }

  async function enable() {
    if (code.length !== 6) {
      toast.error(t("twoFactor.toastEnterCode"))
      return
    }
    setBusy(true)
    try {
      await apiTotpEnable(code)
      setEnabled(true)
      setSetup(null)
      setCode("")
      toast.success(t("twoFactor.toastEnabled"))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("twoFactor.toastInvalid"))
    } finally {
      setBusy(false)
    }
  }

  async function disable() {
    if (!currentPassword) {
      toast.error(t("twoFactor.toastPasswordRequired"))
      return
    }
    if (code.length !== 6) {
      toast.error(t("twoFactor.toastEnterToDisable"))
      return
    }
    setBusy(true)
    try {
      await apiStepUp({ password: currentPassword, totpCode: code })
      await apiTotpDisable(code)
      setEnabled(false)
      setCode("")
      setCurrentPassword("")
      toast.success(t("twoFactor.toastDisabled"))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("twoFactor.toastInvalid"))
    } finally {
      setBusy(false)
    }
  }

  async function copySecret() {
    if (!setup?.secret) return
    try {
      await navigator.clipboard.writeText(setup.secret)
      setCopied(true)
      toast.success(t("twoFactor.toastSecretCopied"))
      window.setTimeout(() => setCopied(false), 1500)
    } catch {
      toast.error(t("twoFactor.toastCouldNotCopy"))
    }
  }

  return (
    <SettingsSection
      title={t("twoFactor.title")}
      description={t("twoFactor.description")}
      icon={<ShieldCheck />}
      compact
    >
      {loading ? (
        <div className="text-muted-foreground flex items-center gap-2 text-sm">
          <LoadingSpinner size="sm" />
          {t("twoFactor.loading")}
        </div>
      ) : enabled && !setup ? (
        <div className="space-y-3">
          <p className="text-sm">{t("twoFactor.onMessage")}</p>
          <div className="grid gap-2">
            <Label htmlFor="disable-password">{t("twoFactor.currentPassword")}</Label>
            <PasswordInput
              id="disable-password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="disable-otp">{t("twoFactor.authenticatorCode")}</Label>
            <AuthCodeInput id="disable-otp" value={code} onChange={setCode} />
          </div>
          <Button
            type="button"
            variant="outline"
            disabled={busy || code.length !== 6 || !currentPassword}
            onClick={() => void disable()}
          >
            {busy ? t("twoFactor.disabling") : t("twoFactor.disable")}
          </Button>
        </div>
      ) : setup ? (
        <div className="space-y-3">
          <p className="text-muted-foreground text-sm">
            {t("twoFactor.setupScan")}
          </p>
          <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
            <div className="rounded-xl border border-border/70 bg-white p-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={setup.qrDataUrl}
                alt={t("twoFactor.qrAlt")}
                width={160}
                height={160}
                className="size-40"
              />
            </div>
            <button
              type="button"
              onClick={() => void copySecret()}
              className="text-foreground inline-flex items-center gap-1.5 font-mono text-xs tracking-wide hover:text-primary"
            >
              {formatTotpSecret(setup.secret)}
              {copied ? (
                <Check className="size-3.5 text-primary" />
              ) : (
                <Copy className="size-3.5 text-muted-foreground" />
              )}
            </button>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="enable-otp">{t("twoFactor.authenticatorCode")}</Label>
            <AuthCodeInput id="enable-otp" value={code} onChange={setCode} />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" disabled={busy || code.length !== 6} onClick={() => void enable()}>
              {busy ? t("twoFactor.verifying") : t("twoFactor.enable")}
            </Button>
            <Button
              type="button"
              variant="ghost"
              disabled={busy}
              onClick={() => {
                setSetup(null)
                setCode("")
              }}
            >
              {t("twoFactor.cancel")}
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-muted-foreground text-sm">
            {t("twoFactor.intro")}
          </p>
          <Button type="button" disabled={busy} onClick={() => void startSetup()}>
            {busy ? t("twoFactor.preparing") : t("twoFactor.setUp")}
          </Button>
        </div>
      )}
    </SettingsSection>
  )
}
