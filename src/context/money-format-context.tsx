"use client"

import * as React from "react"

import {
  DEFAULT_MONEY_FORMAT_SETTINGS,
  MONEY_FORMAT_EVENT,
  formatMoneyWithSettings,
  loadMoneyFormatSettings,
  saveMoneyFormatSettings,
  type MoneyFormatSettings,
  type MoneyFormatVariant,
} from "@/lib/money-format-settings"

type MoneyFormatContextValue = {
  settings: MoneyFormatSettings
  persist: (next: MoneyFormatSettings) => void
  setVariant: (variant: MoneyFormatVariant) => void
  /** Bound to current settings so consumers re-render when the variant changes. */
  formatMoney: (value: string | number) => string
}

const MoneyFormatContext = React.createContext<MoneyFormatContextValue | null>(
  null
)

export function MoneyFormatProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const [settings, setSettings] = React.useState<MoneyFormatSettings>(
    DEFAULT_MONEY_FORMAT_SETTINGS
  )

  React.useEffect(() => {
    const sync = () => setSettings(loadMoneyFormatSettings())
    sync()
    window.addEventListener(MONEY_FORMAT_EVENT, sync)
    window.addEventListener("storage", sync)
    return () => {
      window.removeEventListener(MONEY_FORMAT_EVENT, sync)
      window.removeEventListener("storage", sync)
    }
  }, [])

  const persist = React.useCallback((next: MoneyFormatSettings) => {
    setSettings(next)
    saveMoneyFormatSettings(next)
  }, [])

  const setVariant = React.useCallback(
    (variant: MoneyFormatVariant) => {
      persist({ variant })
    },
    [persist]
  )

  const formatMoney = React.useCallback(
    (value: string | number) => formatMoneyWithSettings(value, settings),
    [settings]
  )

  const value = React.useMemo(
    () => ({ settings, persist, setVariant, formatMoney }),
    [settings, persist, setVariant, formatMoney]
  )

  return (
    <MoneyFormatContext.Provider value={value}>
      {children}
    </MoneyFormatContext.Provider>
  )
}

/** Subscribe to price-format settings; re-renders when MONEY_FORMAT_EVENT fires. */
export function useMoneyFormat() {
  const ctx = React.useContext(MoneyFormatContext)
  if (!ctx) {
    throw new Error("useMoneyFormat must be used within MoneyFormatProvider")
  }
  return ctx
}
