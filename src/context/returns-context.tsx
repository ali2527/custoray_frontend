"use client"

import * as React from "react"
import {
  applyReturnToOrder,
  applyReturnToPurchase,
  type ReturnRow,
  RETURNS_STORAGE_KEY,
  initialReturns,
  nextReturnNumber,
  parsePersistedReturns,
} from "@/lib/returns"
import type { OrderRow } from "@/lib/orders"
import type { PurchaseRow } from "@/lib/purchases"

type ReturnsContextValue = {
  returns: ReturnRow[]
  hydrated: boolean
  setReturns: React.Dispatch<React.SetStateAction<ReturnRow[]>>
  getReturn: (id: number) => ReturnRow | undefined
  addReturn: (
    returnDoc: Omit<ReturnRow, "id">,
    options?: {
      onApplySales?: (orderId: number, patch: Partial<OrderRow>) => void
      onApplyPurchase?: (purchaseId: number, patch: Partial<PurchaseRow>) => void
      getOrder?: (id: number) => OrderRow | undefined
      getPurchase?: (id: number) => PurchaseRow | undefined
    }
  ) => ReturnRow
  removeReturn: (id: number) => void
}

const ReturnsContext = React.createContext<ReturnsContextValue | null>(null)

export function ReturnsProvider({ children }: { children: React.ReactNode }) {
  const [returns, setReturns] = React.useState<ReturnRow[]>(() => [...initialReturns])
  const [hydrated, setHydrated] = React.useState(false)

  React.useEffect(() => {
    const saved = parsePersistedReturns(
      typeof window !== "undefined"
        ? window.localStorage.getItem(RETURNS_STORAGE_KEY)
        : null
    )
    if (saved) setReturns(saved)
    setHydrated(true)
  }, [])

  React.useEffect(() => {
    if (!hydrated || typeof window === "undefined") return
    window.localStorage.setItem(RETURNS_STORAGE_KEY, JSON.stringify(returns))
  }, [returns, hydrated])

  const getReturn = React.useCallback(
    (id: number) => returns.find((row) => row.id === id),
    [returns]
  )

  const addReturn = React.useCallback(
    (
      returnDoc: Omit<ReturnRow, "id">,
      options?: {
        onApplySales?: (orderId: number, patch: Partial<OrderRow>) => void
        onApplyPurchase?: (purchaseId: number, patch: Partial<PurchaseRow>) => void
        getOrder?: (id: number) => OrderRow | undefined
        getPurchase?: (id: number) => PurchaseRow | undefined
      }
    ) => {
      let created = { ...returnDoc, id: 0 } as ReturnRow
      setReturns((prev) => {
        const maxId = prev.reduce((m, x) => Math.max(m, x.id), 0)
        created = {
          ...returnDoc,
          id: maxId + 1,
          returnNumber:
            returnDoc.returnNumber.trim() ||
            nextReturnNumber(prev, returnDoc.type),
        }
        return [...prev, created]
      })

      if (created.status === "completed") {
        if (created.type === "sales" && options?.getOrder && options?.onApplySales) {
          const order = options.getOrder(created.sourceId)
          if (order) {
            options.onApplySales(created.sourceId, applyReturnToOrder(order, created))
          }
        }
        if (
          created.type === "purchase" &&
          options?.getPurchase &&
          options?.onApplyPurchase
        ) {
          const purchase = options.getPurchase(created.sourceId)
          if (purchase) {
            options.onApplyPurchase(
              created.sourceId,
              applyReturnToPurchase(purchase, created)
            )
          }
        }
      }

      return created
    },
    []
  )

  const removeReturn = React.useCallback((id: number) => {
    setReturns((prev) => prev.filter((row) => row.id !== id))
  }, [])

  const value = React.useMemo(
    () => ({
      returns,
      hydrated,
      setReturns,
      getReturn,
      addReturn,
      removeReturn,
    }),
    [returns, hydrated, getReturn, addReturn, removeReturn]
  )

  return <ReturnsContext.Provider value={value}>{children}</ReturnsContext.Provider>
}

export function useReturns() {
  const ctx = React.useContext(ReturnsContext)
  if (!ctx) {
    throw new Error("useReturns must be used within ReturnsProvider")
  }
  return ctx
}
