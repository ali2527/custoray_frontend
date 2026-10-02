"use client"

import * as React from "react"
import {
  applyReturnToOrder,
  applyReturnToPurchase,
  type ReturnRow,
  nextReturnNumber,
} from "@/lib/returns"
import type { OrderRow } from "@/lib/orders"
import type { PurchaseRow } from "@/lib/purchases"
import { useAuth } from "@/context/auth-context"
import { apiListAllReturns } from "@/lib/api/business"
import { mapApiReturnToRow } from "@/lib/pos-api"

type ReturnsContextValue = {
  returns: ReturnRow[]
  hydrated: boolean
  loading: boolean
  setReturns: React.Dispatch<React.SetStateAction<ReturnRow[]>>
  getReturn: (id: number) => ReturnRow | undefined
  addReturn: (
    returnDoc: Omit<ReturnRow, "id"> & Partial<Pick<ReturnRow, "id">>,
    options?: {
      onApplySales?: (orderId: number, patch: Partial<OrderRow>) => void
      onApplyPurchase?: (purchaseId: number, patch: Partial<PurchaseRow>) => void
      getOrder?: (id: number) => OrderRow | undefined
      getPurchase?: (id: number) => PurchaseRow | undefined
    }
  ) => ReturnRow
  removeReturn: (id: number) => void
  refreshReturns: () => Promise<void>
}

const ReturnsContext = React.createContext<ReturnsContextValue | null>(null)

export function ReturnsProvider({ children }: { children: React.ReactNode }) {
  const { session, hydrated: authHydrated } = useAuth()
  const tenantId = session?.tenantId
  const [returns, setReturns] = React.useState<ReturnRow[]>([])
  const [hydrated, setHydrated] = React.useState(false)
  const [loading, setLoading] = React.useState(true)
  const tenantIdRef = React.useRef(tenantId)
  tenantIdRef.current = tenantId

  const refreshReturns = React.useCallback(async () => {
    if (!tenantIdRef.current) return
    try {
      const items = await apiListAllReturns()
      setReturns(items.map((item) => mapApiReturnToRow(item)))
    } catch {
      /* keep local cache when API is unavailable */
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    if (!authHydrated) return
    setReturns([])
    setHydrated(true)
    if (tenantId) {
      void refreshReturns()
    } else {
      setLoading(false)
    }
  }, [authHydrated, tenantId, refreshReturns])

  const getReturn = React.useCallback(
    (id: number) => returns.find((row) => row.id === id),
    [returns]
  )

  const addReturn = React.useCallback(
    (
      returnDoc: Omit<ReturnRow, "id"> & Partial<Pick<ReturnRow, "id">>,
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
        const nextId =
          typeof returnDoc.id === "number" && returnDoc.id > 0
            ? returnDoc.id
            : maxId + 1
        created = {
          ...returnDoc,
          id: nextId,
          apiId: returnDoc.apiId ?? "",
          sourceApiId: returnDoc.sourceApiId ?? "",
          returnNumber:
            returnDoc.returnNumber.trim() ||
            nextReturnNumber(prev, returnDoc.type),
        }
        if (created.apiId) {
          const without = prev.filter((row) => row.apiId !== created.apiId)
          return [...without, created]
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
      loading,
      setReturns,
      getReturn,
      addReturn,
      removeReturn,
      refreshReturns,
    }),
    [returns, hydrated, loading, getReturn, addReturn, removeReturn, refreshReturns]
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
