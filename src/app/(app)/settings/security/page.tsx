"use client"

import { ActiveSessions } from "@/components/settings/active-sessions"

export default function SecuritySettingsPage() {
  return (
    <div className="w-full max-w-2xl space-y-6">
      <ActiveSessions />
    </div>
  )
}
