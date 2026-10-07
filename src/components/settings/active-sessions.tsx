"use client"

import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"

import { SettingsSection } from "@/components/settings/settings-section"
import { Button } from "@/components/ui/button"
import {
  apiListSessions,
  apiRevokeOtherSessions,
  apiRevokeSession,
  type AuthSessionRow,
} from "@/lib/api/auth"

function summarizeAgent(ua: string | null) {
  if (!ua) return "Unknown device"
  if (/Edg\//i.test(ua)) return "Edge"
  if (/Chrome\//i.test(ua)) return "Chrome"
  if (/Firefox\//i.test(ua)) return "Firefox"
  if (/Safari\//i.test(ua)) return "Safari"
  return "Browser"
}

export function ActiveSessions() {
  const { t } = useTranslation("settings")
  const [sessions, setSessions] = useState<AuthSessionRow[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)

  async function reload() {
    setLoading(true)
    try {
      const data = await apiListSessions()
      setSessions(data.sessions)
    } catch {
      setSessions([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void reload()
  }, [])

  async function revoke(id: string) {
    setBusy(id)
    try {
      await apiRevokeSession(id)
      toast.success(t("sessions.revoked"))
      await reload()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("sessions.error"))
    } finally {
      setBusy(null)
    }
  }

  async function revokeOthers() {
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

  return (
    <SettingsSection
      title={t("sessions.title")}
      description={t("sessions.description")}
      footer={
        <Button
          type="button"
          variant="outline"
          disabled={busy !== null || sessions.filter((s) => !s.current).length === 0}
          onClick={() => void revokeOthers()}
        >
          {busy === "others" ? t("sessions.working") : t("sessions.revokeOthers")}
        </Button>
      }
    >
      {loading ? (
        <p className="text-muted-foreground text-sm">{t("sessions.loading")}</p>
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
                  {summarizeAgent(session.userAgent)}
                  {session.current ? (
                    <span className="text-primary ml-2 text-xs font-normal">
                      {t("sessions.current")}
                    </span>
                  ) : null}
                </p>
                <p className="text-muted-foreground text-xs">
                  {session.ip ? `${session.ip} · ` : ""}
                  {t("sessions.lastActive", {
                    time: new Date(session.lastUsedAt).toLocaleString(),
                  })}
                </p>
              </div>
              {!session.current ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={busy !== null}
                  onClick={() => void revoke(session.id)}
                >
                  {busy === session.id ? t("sessions.working") : t("sessions.revoke")}
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </SettingsSection>
  )
}
