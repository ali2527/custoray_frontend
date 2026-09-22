"use client"

import * as React from "react"
import {
  type OrderRow,
  ORDERS_STORAGE_KEY,
  initialOrders,
  nextInvoiceNumber,
  parsePersistedOrders,
} from "@/lib/orders"
import { markSetupMilestone } from "@/lib/setup-progress"
import { useAuth } from "@/context/auth-context"
import { apiListAllOrders } from "@/lib/api/business"
import { mapApiOrderToRow } from "@/lib/pos-api"
import { isPosOrder } from "@/lib/pos"

type OrdersContextValue = {
  orders: OrderRow[]
  hydrated: boolean
  loading: boolean
  setOrders: React.Dispatch<React.SetStateAction<OrderRow[]>>
  getOrder: (id: number) => OrderRow | undefined
  getOrderByApiId: (apiId: string) => OrderRow | undefined
  addOrder: (order: Omit<OrderRow, "id"> & Partial<Pick<OrderRow, "id">>) => OrderRow
  updateOrder: (id: number, patch: Partial<OrderRow>) => void
  removeOrder: (id: number) => void
  duplicateOrder: (id: number) => OrderRow | null
  refreshOrders: () => Promise<void>
}

const OrdersContext = React.createContext<OrdersContextValue | null>(null)

function ordersStorageKey(tenantId?: string | null) {
  if (!tenantId) return ORDERS_STORAGE_KEY
  return `${ORDERS_STORAGE_KEY}:${tenantId}`
}

function mergeOrders(local: OrderRow[], apiRows: OrderRow[]): OrderRow[] {
  const byApiId = new Map(
    apiRows.filter((row) => row.apiId).map((row) => [row.apiId!, row])
  )
  const keptLocal = local.filter((row) => {
    if (row.apiId && byApiId.has(row.apiId)) return false
    // Drop orphan local POS rows once API sync succeeds
    if (isPosOrder(row) && !row.apiId) return false
    return true
  })
  return [...keptLocal, ...apiRows].sort((a, b) => {
    const dateCompare = b.orderDate.localeCompare(a.orderDate)
    if (dateCompare !== 0) return dateCompare
    return b.id - a.id
  })
}

export function OrdersProvider({ children }: { children: React.ReactNode }) {
  const { session, hydrated: authHydrated } = useAuth()
  const tenantId = session?.tenantId
  const [orders, setOrders] = React.useState<OrderRow[]>([])
  const [hydrated, setHydrated] = React.useState(false)
  const [loading, setLoading] = React.useState(true)
  const tenantIdRef = React.useRef(tenantId)
  tenantIdRef.current = tenantId

  const refreshOrders = React.useCallback(async () => {
    if (!tenantIdRef.current) return
    try {
      const items = await apiListAllOrders()
      const apiRows = items.map(mapApiOrderToRow)
      setOrders((prev) => mergeOrders(prev, apiRows))
    } catch {
      /* keep local cache when API is unavailable */
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    if (!authHydrated) return
    const key = ordersStorageKey(tenantId)
    const saved = parsePersistedOrders(
      typeof window !== "undefined" ? window.localStorage.getItem(key) : null
    )
    if (saved?.length) {
      setOrders(saved)
    } else if (!tenantId) {
      setOrders([...initialOrders])
    } else {
      setOrders([])
    }
    setHydrated(true)
    if (tenantId) {
      void refreshOrders()
    } else {
      setLoading(false)
    }
  }, [authHydrated, tenantId, refreshOrders])

  React.useEffect(() => {
    if (!hydrated || typeof window === "undefined") return
    window.localStorage.setItem(
      ordersStorageKey(tenantId),
      JSON.stringify(orders)
    )
  }, [orders, hydrated, tenantId])

  const getOrder = React.useCallback(
    (id: number) => orders.find((o) => o.id === id),
    [orders]
  )

  const getOrderByApiId = React.useCallback(
    (apiId: string) => orders.find((o) => o.apiId === apiId),
    [orders]
  )

  const addOrder = React.useCallback(
    (order: Omit<OrderRow, "id"> & Partial<Pick<OrderRow, "id">>) => {
      let created = { ...order, id: 0 } as OrderRow
      setOrders((prev) => {
        const maxId = prev.reduce((m, x) => Math.max(m, x.id), 0)
        const lineMaxId = order.lines.reduce((m, l) => Math.max(m, l.id), 0)
        const nextId =
          typeof order.id === "number" && order.id > 0 ? order.id : maxId + 1
        created = {
          ...order,
          id: nextId,
          apiId: order.apiId ?? "",
          invoiceNumber: order.invoiceNumber.trim() || nextInvoiceNumber(prev),
          lines: order.lines.map((line, i) => ({
            ...line,
            id: line.id > 0 ? line.id : lineMaxId + i + 1,
          })),
        }
        if (created.apiId) {
          const without = prev.filter((row) => row.apiId !== created.apiId)
          return [...without, created]
        }
        return [...prev, created]
      })
      markSetupMilestone("invoice")
      return created
    },
    []
  )

  const updateOrder = React.useCallback((id: number, patch: Partial<OrderRow>) => {
    setOrders((prev) =>
      prev.map((o) => (o.id === id ? { ...o, ...patch, id: o.id } : o))
    )
  }, [])

  const removeOrder = React.useCallback((id: number) => {
    setOrders((prev) => prev.filter((o) => o.id !== id))
  }, [])

  const duplicateOrder = React.useCallback((id: number) => {
    let copy: OrderRow | null = null
    setOrders((prev) => {
      const source = prev.find((o) => o.id === id)
      if (!source) return prev
      const maxId = prev.reduce((m, x) => Math.max(m, x.id), 0)
      copy = {
        ...source,
        id: maxId + 1,
        apiId: "",
        invoiceNumber: nextInvoiceNumber(prev),
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
      orders,
      hydrated,
      loading,
      setOrders,
      getOrder,
      getOrderByApiId,
      addOrder,
      updateOrder,
      removeOrder,
      duplicateOrder,
      refreshOrders,
    }),
    [
      orders,
      hydrated,
      loading,
      getOrder,
      getOrderByApiId,
      addOrder,
      updateOrder,
      removeOrder,
      duplicateOrder,
      refreshOrders,
    ]
  )

  return <OrdersContext.Provider value={value}>{children}</OrdersContext.Provider>
}

export function useOrders() {
  const ctx = React.useContext(OrdersContext)
  if (!ctx) {
    throw new Error("useOrders must be used within OrdersProvider")
  }
  return ctx
}
