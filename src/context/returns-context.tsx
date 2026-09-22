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
  isPosReturn,
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

function returnsStorageKey(tenantId?: string | null) {
  if (!tenantId) return RETURNS_STORAGE_KEY
  return `${RETURNS_STORAGE_KEY}:${tenantId}`
}

function mergeReturns(local: ReturnRow[], apiRows: ReturnRow[]): ReturnRow[] {
  const byApiId = new Map(
    apiRows.filter((row) => row.apiId).map((row) => [row.apiId!, row])
  )
  const keptLocal = local.filter((row) => {
    if (row.apiId && byApiId.has(row.apiId)) return false
    if (isPosReturn(row) && !row.apiId) return false
    return true
  })
  return [...keptLocal, ...apiRows].sort((a, b) => {
    const dateCompare = b.returnDate.localeCompare(a.returnDate)
    if (dateCompare !== 0) return dateCompare
    return b.id - a.id
  })
}

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
      const apiRows = items.map((item) => mapApiReturnToRow(item))
      setReturns((prev) => mergeReturns(prev, apiRows))
    } catch {
      /* keep local cache when API is unavailable */
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    if (!authHydrated) return
    const key = returnsStorageKey(tenantId)
    const saved = parsePersistedReturns(
      typeof window !== "undefined" ? window.localStorage.getItem(key) : null
    )
    if (saved?.length) {
      setReturns(saved)
    } else if (!tenantId) {
      setReturns([...initialReturns])
    } else {
      setReturns([])
    }
    setHydrated(true)
    if (tenantId) {
      void refreshReturns()
    } else {
      setLoading(false)
    }
  }, [authHydrated, tenantId, refreshReturns])

  React.useEffect(() => {
    if (!hydrated || typeof window === "undefined") return
    window.localStorage.setItem(
      returnsStorageKey(tenantId),
      JSON.stringify(returns)
    )
  }, [returns, hydrated, tenantId])

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
