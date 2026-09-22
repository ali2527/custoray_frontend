"use client"

import * as React from "react"

import {
  DEFAULT_POS_SETTINGS,
  mergePosSettings,
  parsePersistedPosSettings,
  POS_SETTINGS_STORAGE_KEY,
  type PosSettings,
} from "@/lib/pos-settings"
import { useAuth } from "@/context/auth-context"
import {
  apiGetPosSettings,
  apiPatchPosSettings,
} from "@/lib/api/business"
import { resolveDefaultStoreId } from "@/lib/pos-api"
import { ApiClientError } from "@/lib/api/client"

type PosSettingsContextValue = {
  settings: PosSettings
  updateSettings: (patch: Partial<PosSettings>) => void
  resetSettings: () => void
  hydrated: boolean
  storeId: string | null
  syncing: boolean
}

const PosSettingsContext = React.createContext<PosSettingsContextValue | null>(null)

function settingsStorageKey(tenantId?: string | null, storeId?: string | null) {
  if (!tenantId) return POS_SETTINGS_STORAGE_KEY
  return storeId
    ? `${POS_SETTINGS_STORAGE_KEY}:${tenantId}:${storeId}`
    : `${POS_SETTINGS_STORAGE_KEY}:${tenantId}`
}

export function PosSettingsProvider({ children }: { children: React.ReactNode }) {
  const { session, hydrated: authHydrated } = useAuth()
  const tenantId = session?.tenantId
  const [settings, setSettings] = React.useState<PosSettings>(DEFAULT_POS_SETTINGS)
  const [hydrated, setHydrated] = React.useState(false)
  const [storeId, setStoreId] = React.useState<string | null>(null)
  const [syncing, setSyncing] = React.useState(false)
  const skipNextPersist = React.useRef(false)
  const settingsRef = React.useRef(settings)
  settingsRef.current = settings

  React.useEffect(() => {
    if (!authHydrated) return
    let cancelled = false

    async function hydrate() {
      let resolvedStoreId: string | null = null
      try {
        if (tenantId) {
          resolvedStoreId = await resolveDefaultStoreId()
        }
      } catch {
        resolvedStoreId = null
      }
      if (cancelled) return

      const key = settingsStorageKey(tenantId, resolvedStoreId)
      const saved =
        parsePersistedPosSettings(
          typeof window !== "undefined" ? window.localStorage.getItem(key) : null
        ) ??
        parsePersistedPosSettings(
          typeof window !== "undefined"
            ? window.localStorage.getItem(POS_SETTINGS_STORAGE_KEY)
            : null
        ) ??
        parsePersistedPosSettings(
          typeof window !== "undefined"
            ? window.localStorage.getItem("custoray-pos-settings-v1")
            : null
        )

      if (saved) {
        skipNextPersist.current = true
        setSettings(saved)
      }

      setStoreId(resolvedStoreId)
      setHydrated(true)

      if (!resolvedStoreId || !tenantId) return

      try {
        const remote = await apiGetPosSettings(resolvedStoreId)
        const raw = remote?.settings
        if (raw && typeof raw === "object" && Object.keys(raw).length > 0) {
          const remoteSettings = parsePersistedPosSettings(JSON.stringify(raw))
          if (remoteSettings && !cancelled) {
            skipNextPersist.current = true
            setSettings(remoteSettings)
          }
        }
      } catch (error) {
        if (
          error instanceof ApiClientError &&
          (error.status === 404 || error.code === "NOT_FOUND")
        ) {
          /* empty remote settings is fine */
        }
      }
    }

    void hydrate()
    return () => {
      cancelled = true
    }
  }, [authHydrated, tenantId])

  React.useEffect(() => {
    if (!hydrated || typeof window === "undefined") return
    if (skipNextPersist.current) {
      skipNextPersist.current = false
      return
    }
    window.localStorage.setItem(
      settingsStorageKey(tenantId, storeId),
      JSON.stringify(settings)
    )

    if (!storeId || !tenantId) return
    const handle = window.setTimeout(() => {
      setSyncing(true)
      void apiPatchPosSettings(storeId, settings)
        .catch(() => {
          /* keep local settings if sync fails */
        })
        .finally(() => setSyncing(false))
    }, 400)
    return () => window.clearTimeout(handle)
  }, [hydrated, settings, storeId, tenantId])

  const updateSettings = React.useCallback((patch: Partial<PosSettings>) => {
    setSettings((prev) => mergePosSettings(patch, prev))
  }, [])

  const resetSettings = React.useCallback(() => {
    setSettings(DEFAULT_POS_SETTINGS)
  }, [])

  const value = React.useMemo(
    () => ({
      settings,
      updateSettings,
      resetSettings,
      hydrated,
      storeId,
      syncing,
    }),
    [hydrated, resetSettings, settings, storeId, syncing, updateSettings]
  )

  return (
    <PosSettingsContext.Provider value={value}>{children}</PosSettingsContext.Provider>
  )
}

export function usePosSettings() {
  const context = React.useContext(PosSettingsContext)
  if (!context) {
    throw new Error("usePosSettings must be used within PosSettingsProvider")
  }
  return context
}
