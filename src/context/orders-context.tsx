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

type OrdersContextValue = {
  orders: OrderRow[]
  setOrders: React.Dispatch<React.SetStateAction<OrderRow[]>>
  getOrder: (id: number) => OrderRow | undefined
  addOrder: (order: Omit<OrderRow, "id">) => OrderRow
  updateOrder: (id: number, patch: Partial<OrderRow>) => void
  removeOrder: (id: number) => void
  duplicateOrder: (id: number) => OrderRow | null
}

const OrdersContext = React.createContext<OrdersContextValue | null>(null)

export function OrdersProvider({ children }: { children: React.ReactNode }) {
  const [orders, setOrders] = React.useState<OrderRow[]>(() => [...initialOrders])
  const [hydrated, setHydrated] = React.useState(false)

  React.useEffect(() => {
    const saved = parsePersistedOrders(
      typeof window !== "undefined"
        ? window.localStorage.getItem(ORDERS_STORAGE_KEY)
        : null
    )
    if (saved) setOrders(saved)
    setHydrated(true)
  }, [])

  React.useEffect(() => {
    if (!hydrated || typeof window === "undefined") return
    window.localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(orders))
  }, [orders, hydrated])

  const getOrder = React.useCallback(
    (id: number) => orders.find((o) => o.id === id),
    [orders]
  )

  const addOrder = React.useCallback((order: Omit<OrderRow, "id">) => {
    let created = { ...order, id: 0 } as OrderRow
    setOrders((prev) => {
      const maxId = prev.reduce((m, x) => Math.max(m, x.id), 0)
      const lineMaxId = order.lines.reduce((m, l) => Math.max(m, l.id), 0)
      created = {
        ...order,
        id: maxId + 1,
        invoiceNumber: order.invoiceNumber.trim() || nextInvoiceNumber(prev),
        lines: order.lines.map((line, i) => ({
          ...line,
          id: line.id > 0 ? line.id : lineMaxId + i + 1,
        })),
      }
      return [...prev, created]
    })
    markSetupMilestone("invoice")
    return created
  }, [])

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
      setOrders,
      getOrder,
      addOrder,
      updateOrder,
      removeOrder,
      duplicateOrder,
    }),
    [orders, getOrder, addOrder, updateOrder, removeOrder, duplicateOrder]
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
