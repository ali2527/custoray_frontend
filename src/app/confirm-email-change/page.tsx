"use client"

import { Suspense, useEffect, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"

import {
  AUTH_BUTTON,
  AuthHeading,
  AuthShell,
  AuthSwitch,
} from "@/components/auth/auth-shell"
import { Button } from "@/components/ui/button"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { apiConfirmEmailChange } from "@/lib/api/auth"

function ConfirmEmailChangeInner() {
  const { t } = useTranslation("auth")
  const router = useRouter()
  const params = useSearchParams()
  const token = params.get("token")?.trim() || ""
  const [status, setStatus] = useState<"working" | "done" | "error">(
    token ? "working" : "error"
  )

  useEffect(() => {
    if (!token) return
    let cancelled = false
    ;(async () => {
      try {
        await apiConfirmEmailChange(token)
        if (cancelled) return
        setStatus("done")
        toast.success(t("confirmEmailChange.success"))
        router.replace("/settings/account")
      } catch {
        if (cancelled) return
        setStatus("error")
        toast.error(t("confirmEmailChange.failed"))
      }
    })()
    return () => {
      cancelled = true
    }
  }, [token, router, t])

  return (
    <AuthShell hero="reset_password">
      <AuthHeading
        title={t("confirmEmailChange.title")}
        subtitle={t("confirmEmailChange.subtitle")}
      />
      {status === "working" ? (
        <div className="text-muted-foreground flex items-center gap-2 text-xs">
          <LoadingSpinner size="sm" />
          {t("confirmEmailChange.verifying")}
        </div>
      ) : null}
      {status === "error" ? (
        <div className="space-y-3">
          <p className="text-destructive text-xs">{t("confirmEmailChange.failed")}</p>
          <AuthSwitch prompt="" href="/" label={t("confirmEmailChange.signIn")} />
        </div>
      ) : null}
      {status === "done" ? (
        <Button asChild className={AUTH_BUTTON}>
          <Link href="/settings/account">{t("confirmEmailChange.goToAccount")}</Link>
        </Button>
      ) : null}
    </AuthShell>
  )
}

export default function ConfirmEmailChangePage() {
  return (
    <Suspense fallback={null}>
      <ConfirmEmailChangeInner />
    </Suspense>
  )
}
