"use client"

import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"

import { SettingsSection } from "@/components/settings/settings-section"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  apiListSessions,
  apiRevokeOtherSessions,
  apiRevokeSession,
  type AuthSessionRow,
} from "@/lib/api/auth"

type ConfirmState =
  | { kind: "one"; id: string; label: string }
  | { kind: "others" }
  | null

function formatWhen(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString()
}

export function ActiveSessions() {
  const { t } = useTranslation("settings")
  const [sessions, setSessions] = useState<AuthSessionRow[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)
  const [confirm, setConfirm] = useState<ConfirmState>(null)

  async function reload() {
    setLoading(true)
    setLoadError(false)
    try {
      const data = await apiListSessions()
      setSessions(data.sessions)
    } catch (err) {
      setSessions([])
      setLoadError(true)
      toast.error(err instanceof Error ? err.message : t("sessions.error"))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void reload()
  }, [])

  async function confirmRevoke() {
    if (!confirm) return
    const action = confirm
    setConfirm(null)
    if (action.kind === "one") {
      setBusy(action.id)
      try {
        await apiRevokeSession(action.id)
        toast.success(t("sessions.revoked"))
        await reload()
      } catch (err) {
        toast.error(err instanceof Error ? err.message : t("sessions.error"))
      } finally {
        setBusy(null)
      }
      return
    }

    setBusy("others")
    try {
      await apiRevokeOtherSessions()
      toast.success(t("sessions.revokedOthers"))
      await reload()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("sessions.error"))
    } finally {
      setBusy(null)
    }
  }

  const otherCount = sessions.filter((session) => !session.current).length

  return (
    <SettingsSection
      title={t("sessions.title")}
      description={t("sessions.description")}
      footer={
        <Button
          type="button"
          variant="outline"
          disabled={busy !== null || otherCount === 0}
          onClick={() => setConfirm({ kind: "others" })}
        >
          {busy === "others" ? t("sessions.working") : t("sessions.revokeOthers")}
        </Button>
      }
    >
      {loading ? (
        <p className="text-muted-foreground text-sm">{t("sessions.loading")}</p>
      ) : loadError ? (
        <div className="space-y-2">
          <p className="text-destructive text-sm">{t("sessions.loadError")}</p>
          <Button type="button" variant="outline" size="sm" onClick={() => void reload()}>
            {t("sessions.retry")}
          </Button>
        </div>
      ) : sessions.length === 0 ? (
        <p className="text-muted-foreground text-sm">{t("sessions.empty")}</p>
      ) : (
        <ul className="divide-border divide-y">
          {sessions.map((session) => (
            <li
              key={session.id}
              className="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0"
            >
              <div className="min-w-0 space-y-0.5">
                <p className="text-sm font-medium">
                  {session.device?.label ?? t("sessions.unknownDevice")}
                  {session.current ? (
                    <span className="text-primary ml-2 text-xs font-normal">
                      {t("sessions.current")}
                    </span>
                  ) : null}
                </p>
                <p className="text-muted-foreground text-xs">
                  {t("sessions.created", { time: formatWhen(session.createdAt) })}
                </p>
                <p className="text-muted-foreground text-xs">
                  {t("sessions.lastActive", { time: formatWhen(session.lastUsedAt) })}
                </p>
                <p className="text-muted-foreground text-xs">
                  {t("sessions.expires", { time: formatWhen(session.expiresAt) })}
                </p>
                {session.ip ? (
                  <p className="text-muted-foreground text-xs">
                    {t("sessions.network", { ip: session.ip })}
                  </p>
                ) : null}
              </div>
              {!session.current ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={busy !== null}
                  onClick={() =>
                    setConfirm({
                      kind: "one",
                      id: session.id,
                      label: session.device?.label ?? t("sessions.unknownDevice"),
                    })
                  }
                >
                  {busy === session.id ? t("sessions.working") : t("sessions.revoke")}
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      <Dialog open={confirm !== null} onOpenChange={(open) => !open && setConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {confirm?.kind === "others"
                ? t("sessions.confirmOthersTitle")
                : t("sessions.confirmRevokeTitle")}
            </DialogTitle>
            <DialogDescription>
              {confirm?.kind === "others"
                ? t("sessions.confirmOthersBody")
                : t("sessions.confirmRevokeBody", {
                    device: confirm?.kind === "one" ? confirm.label : "",
                  })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setConfirm(null)}>
              {t("sessions.cancel")}
            </Button>
            <Button type="button" onClick={() => void confirmRevoke()}>
              {t("sessions.confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SettingsSection>
  )
}
