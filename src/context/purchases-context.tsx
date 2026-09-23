"use client"

import * as React from "react"
import {
  type PurchaseRow,
  PURCHASES_STORAGE_KEY,
  initialPurchases,
  nextPurchaseNumber,
  parsePersistedPurchases,
} from "@/lib/purchases"

type PurchasesContextValue = {
  purchases: PurchaseRow[]
  hydrated: boolean
  setPurchases: React.Dispatch<React.SetStateAction<PurchaseRow[]>>
  getPurchase: (id: number) => PurchaseRow | undefined
  addPurchase: (purchase: Omit<PurchaseRow, "id">) => PurchaseRow
  updatePurchase: (id: number, patch: Partial<PurchaseRow>) => void
  removePurchase: (id: number) => void
  duplicatePurchase: (id: number) => PurchaseRow | null
}

const PurchasesContext = React.createContext<PurchasesContextValue | null>(null)

export function PurchasesProvider({ children }: { children: React.ReactNode }) {
  const [purchases, setPurchases] = React.useState<PurchaseRow[]>(() => [
    ...initialPurchases,
  ])
  const [hydrated, setHydrated] = React.useState(false)

  React.useEffect(() => {
    const saved = parsePersistedPurchases(
      typeof window !== "undefined"
        ? window.localStorage.getItem(PURCHASES_STORAGE_KEY)
        : null
    )
    if (saved) setPurchases(saved)
    setHydrated(true)
  }, [])

  React.useEffect(() => {
    if (!hydrated || typeof window === "undefined") return
    window.localStorage.setItem(PURCHASES_STORAGE_KEY, JSON.stringify(purchases))
  }, [purchases, hydrated])

  const getPurchase = React.useCallback(
    (id: number) => purchases.find((p) => p.id === id),
    [purchases]
  )

  const addPurchase = React.useCallback((purchase: Omit<PurchaseRow, "id">) => {
    let created = { ...purchase, id: 0 } as PurchaseRow
    setPurchases((prev) => {
      const maxId = prev.reduce((m, x) => Math.max(m, x.id), 0)
      const lineMaxId = purchase.lines.reduce((m, l) => Math.max(m, l.id), 0)
      created = {
        ...purchase,
        id: maxId + 1,
        purchaseNumber:
          purchase.purchaseNumber.trim() || nextPurchaseNumber(prev),
        lines: purchase.lines.map((line, i) => ({
          ...line,
          id: line.id > 0 ? line.id : lineMaxId + i + 1,
        })),
      }
      return [...prev, created]
    })
    return created
  }, [])

  const updatePurchase = React.useCallback(
    (id: number, patch: Partial<PurchaseRow>) => {
      setPurchases((prev) =>
        prev.map((p) => (p.id === id ? { ...p, ...patch, id: p.id } : p))
      )
    },
    []
  )

  const removePurchase = React.useCallback((id: number) => {
    setPurchases((prev) => prev.filter((p) => p.id !== id))
  }, [])

  const duplicatePurchase = React.useCallback((id: number) => {
    let copy: PurchaseRow | null = null
    setPurchases((prev) => {
      const source = prev.find((p) => p.id === id)
      if (!source) return prev
      const maxId = prev.reduce((m, x) => Math.max(m, x.id), 0)
      copy = {
        ...source,
        id: maxId + 1,
        purchaseNumber: nextPurchaseNumber(prev),
        paidAmount: "0",
        status: "pending",
        lines: source.lines.map((line, i) => ({ ...line, id: i + 1 })),
      }
      return [...prev, copy]
    })
    return copy
  }, [])

  const value = React.useMemo(
    () => ({
      purchases,
      hydrated,
      setPurchases,
      getPurchase,
      addPurchase,
      updatePurchase,
      removePurchase,
      duplicatePurchase,
    }),
    [
      purchases,
      hydrated,
      getPurchase,
      addPurchase,
      updatePurchase,
      removePurchase,
      duplicatePurchase,
    ]
  )

  return (
    <PurchasesContext.Provider value={value}>{children}</PurchasesContext.Provider>
  )
}

export function usePurchases() {
  const ctx = React.useContext(PurchasesContext)
  if (!ctx) {
    throw new Error("usePurchases must be used within PurchasesProvider")
  }
  return ctx
}
