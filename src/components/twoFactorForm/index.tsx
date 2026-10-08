"use client"

import { useEffect, useState, type FormEvent } from "react"
import { useRouter } from "next/navigation"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"

import { AuthCodeInput } from "@/components/auth/auth-code-input"
import {
  AUTH_BUTTON,
  AuthHeading,
  AuthShell,
} from "@/components/auth/auth-shell"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { useAuth } from "@/context/auth-context"
import { clearTwoFactorChallenge, isTwoFactorPending } from "@/lib/two-factor"

export function TwoFactorForm() {
  const { t } = useTranslation("auth")
  const router = useRouter()
  const { completeTwoFactor, session, hydrated } = useAuth()
  const [code, setCode] = useState("")
  const [verifying, setVerifying] = useState(false)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (!hydrated) return
    if (isTwoFactorPending()) {
      setReady(true)
      return
    }
    if (session) {
      router.replace("/home")
      return
    }
    toast.error(t("twoFactor.toastSignInFirst"))
    router.replace("/")
  }, [hydrated, session, router, t])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (code.length !== 6) {
      toast.error(t("twoFactor.toastEnterCode"))
      return
    }

    setVerifying(true)
    const result = await completeTwoFactor(code)
    setVerifying(false)

    if (!result.ok) {
      toast.error(result.error)
      return
    }

    toast.success(
      result.accessAllowed ? t("login.toastWelcome") : t("login.toastTrialEnded")
    )
    window.location.assign(result.accessAllowed ? "/home" : "/trial-ended")
  }

  if (!ready) return null

  return (
    <AuthShell hero="twofa">
      <AuthHeading
        title={t("twoFactor.title")}
        accent="code"
        subtitle={t("twoFactor.subtitle")}
      />
      <form className="space-y-3" onSubmit={handleSubmit}>
        <div className="grid gap-2">
          <Label htmlFor="otp">{t("twoFactor.label")}</Label>
          <AuthCodeInput id="otp" value={code} onChange={setCode} />
        </div>
        <Button
          type="submit"
          className={AUTH_BUTTON}
          disabled={code.length !== 6 || verifying}
        >
          {verifying ? (
            <span className="flex items-center justify-center gap-2">
              <LoadingSpinner size="sm" />
              {t("twoFactor.verifying")}
            </span>
          ) : (
            t("twoFactor.verify")
          )}
        </Button>
        <p className="text-muted-foreground pt-1 text-center text-xs">
          {t("twoFactor.differentAccount")}{" "}
          <button
            type="button"
            className="text-primary font-medium hover:underline"
            onClick={() => {
              clearTwoFactorChallenge()
              router.replace("/")
            }}
          >
            {t("twoFactor.backToSignIn")}
          </button>
        </p>
      </form>
    </AuthShell>
  )
}
