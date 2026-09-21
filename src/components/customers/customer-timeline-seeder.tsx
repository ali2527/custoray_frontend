"use client"

import { useEffect, useRef } from "react"

import { useAuth } from "@/context/auth-context"
import { useCustomers } from "@/context/customers-context"
import { useOrders } from "@/context/orders-context"
import { useReturns } from "@/context/returns-context"
import {
  appendCustomerTimelineSeed,
  customerTimelineSeedStorageKey,
} from "@/lib/customer-timeline-seed"

export function CustomerTimelineSeeder() {
  const { session } = useAuth()
  const { customers, loading } = useCustomers()
  const { orders, setOrders, hydrated: ordersHydrated } = useOrders()
  const { returns, setReturns, hydrated: returnsHydrated } = useReturns()
  const seededRef = useRef(false)

  useEffect(() => {
    if (seededRef.current) return
    if (loading || !ordersHydrated || !returnsHydrated) return
    if (!customers.length) return
    if (typeof window === "undefined") return

    const key = customerTimelineSeedStorageKey(session?.tenantId)
    if (window.localStorage.getItem(key)) {
      seededRef.current = true
      return
    }

    const next = appendCustomerTimelineSeed(customers, orders, returns)
    if (!next.added) {
      window.localStorage.setItem(key, "1")
      seededRef.current = true
      return
    }

    setOrders(next.orders)
    setReturns(next.returns)
    window.localStorage.setItem(key, "1")
    seededRef.current = true
  }, [
    customers,
    loading,
    orders,
    ordersHydrated,
    returns,
    returnsHydrated,
    session?.tenantId,
    setOrders,
    setReturns,
  ])

  return null
}
