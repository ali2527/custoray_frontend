"use client"

import { useEffect, useRef } from "react"

import { useAuth } from "@/context/auth-context"
import { usePurchases } from "@/context/purchases-context"
import { useReturns } from "@/context/returns-context"
import { useVendors } from "@/context/vendors-context"
import {
  appendVendorTimelineSeed,
  vendorTimelineSeedStorageKey,
} from "@/lib/vendor-timeline-seed"

export function VendorTimelineSeeder() {
  const { session } = useAuth()
  const { vendors, loading } = useVendors()
  const { purchases, setPurchases, hydrated: purchasesHydrated } = usePurchases()
  const { returns, setReturns, hydrated: returnsHydrated } = useReturns()
  const seededRef = useRef(false)

  useEffect(() => {
    if (seededRef.current) return
    if (loading || !purchasesHydrated || !returnsHydrated) return
    if (!vendors.length) return
    if (typeof window === "undefined") return

    const key = vendorTimelineSeedStorageKey(session?.tenantId)
    if (window.localStorage.getItem(key)) {
      seededRef.current = true
      return
    }

    const next = appendVendorTimelineSeed(vendors, purchases, returns)
    if (!next.added) {
      window.localStorage.setItem(key, "1")
      seededRef.current = true
      return
    }

    setPurchases(next.purchases)
    setReturns(next.returns)
    window.localStorage.setItem(key, "1")
    seededRef.current = true
  }, [
    vendors,
    loading,
    purchases,
    purchasesHydrated,
    returns,
    returnsHydrated,
    session?.tenantId,
    setPurchases,
    setReturns,
  ])

  return null
}
