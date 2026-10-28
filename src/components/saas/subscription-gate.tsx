"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

import { PageLoader } from "@/components/ui/page-loader"
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

  // Keep the real app chrome while auth restores so the home skeleton matches
  // the dashboard. On logout / denied, show a spinner instead of a blank flash.
  if (useApi && !hydrated) return <>{children}</>
  if (useApi && !isAuthenticated) return <PageLoader fullScreen />
  if (useApi && isAuthenticated && access && !access.allowed) {
    return <PageLoader fullScreen />
  }

  return <>{children}</>
}
