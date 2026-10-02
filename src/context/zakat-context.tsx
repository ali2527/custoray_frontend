"use client"

import * as React from "react"

import { useCustomers } from "@/context/customers-context"
import { useProducts } from "@/context/products-context"
import { useVendors } from "@/context/vendors-context"
import {
  computeBusinessZakat,
  createHistoryRecord,
  DEFAULT_ZAKAT_SETTINGS,
  type FinalizeZakatInput,
  parseZakatSettings,
  type ZakatCalculation,
  type ZakatHistoryRecord,
  type ZakatSettings,
  ZAKAT_SETTINGS_STORAGE_KEY,
} from "@/lib/zakat"

type ZakatContextValue = {
  settings: ZakatSettings
  calculation: ZakatCalculation
  history: ZakatHistoryRecord[]
  updateSettings: (patch: Partial<ZakatSettings>) => void
  resetSettings: () => void
  refreshCalculation: () => void
  finalizeZakat: (payment: FinalizeZakatInput) => ZakatHistoryRecord
}

const ZakatContext = React.createContext<ZakatContextValue | null>(null)

export function ZakatProvider({ children }: { children: React.ReactNode }) {
  const { customers } = useCustomers()
  const { products } = useProducts()
  const { vendors } = useVendors()
  const [settings, setSettings] = React.useState<ZakatSettings>(
    DEFAULT_ZAKAT_SETTINGS
  )
  const [history, setHistory] = React.useState<ZakatHistoryRecord[]>([])
  const [calculatedAt, setCalculatedAt] = React.useState(() =>
    new Date().toISOString()
  )
  const [hydrated, setHydrated] = React.useState(false)

  React.useEffect(() => {
    const savedSettings = parseZakatSettings(
      window.localStorage.getItem(ZAKAT_SETTINGS_STORAGE_KEY)
    )
    if (savedSettings) setSettings(savedSettings)
    setHydrated(true)
  }, [])

  React.useEffect(() => {
    if (!hydrated) return
    window.localStorage.setItem(
      ZAKAT_SETTINGS_STORAGE_KEY,
      JSON.stringify(settings)
    )
  }, [hydrated, settings])

  const calculation = React.useMemo(
    () =>
      computeBusinessZakat({
        products,
        customers,
        vendors,
        settings,
        calculatedAt,
      }),
    [calculatedAt, customers, products, settings, vendors]
  )

  const updateSettings = React.useCallback(
    (patch: Partial<ZakatSettings>) => {
      setSettings((previous) => ({ ...previous, ...patch }))
      setCalculatedAt(new Date().toISOString())
    },
    []
  )

  const resetSettings = React.useCallback(() => {
    setSettings(DEFAULT_ZAKAT_SETTINGS)
    setCalculatedAt(new Date().toISOString())
  }, [])

  const refreshCalculation = React.useCallback(() => {
    setCalculatedAt(new Date().toISOString())
  }, [])

  const finalizeZakat = React.useCallback(
    (payment: FinalizeZakatInput) => {
      const nextId =
        history.reduce((max, record) => Math.max(max, record.id), 0) + 1
      const record = createHistoryRecord(
        nextId,
        calculation,
        settings,
        payment
      )
      setHistory((previous) => [record, ...previous])
      setSettings((previous) => ({
        ...previous,
        lastPaidDate: payment.paymentDate,
      }))
      setCalculatedAt(new Date().toISOString())
      return record
    },
    [calculation, history, settings]
  )

  const value = React.useMemo(
    () => ({
      settings,
      calculation,
      history,
      updateSettings,
      resetSettings,
      refreshCalculation,
      finalizeZakat,
    }),
    [
      settings,
      calculation,
      history,
      updateSettings,
      resetSettings,
      refreshCalculation,
      finalizeZakat,
    ]
  )

  return <ZakatContext.Provider value={value}>{children}</ZakatContext.Provider>
}

export function useZakat() {
  const context = React.useContext(ZakatContext)
  if (!context) {
    throw new Error("useZakat must be used within ZakatProvider")
  }
  return context
}
