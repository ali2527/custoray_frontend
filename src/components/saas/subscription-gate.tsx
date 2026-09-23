"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

import { useAuth } from "@/context/auth-context"
import { isApiEnabled } from "@/lib/api/client"

export function SubscriptionGate({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { hydrated, isAuthenticated, access } = useAuth()
  const useApi = isApiEnabled()

  useEffect(() => {
    if (!hydrated || !useApi) return
    if (!isAuthenticated) {
      router.replace("/")
      return
    }
    if (access && !access.allowed) {
      router.replace("/trial-ended")
    }
  }, [hydrated, isAuthenticated, access, router, useApi])

  if (useApi && !hydrated) return null
  if (useApi && !isAuthenticated) return null
  if (useApi && isAuthenticated && access && !access.allowed) return null

  return <>{children}</>
}
