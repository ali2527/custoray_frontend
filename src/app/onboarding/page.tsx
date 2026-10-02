"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

import { useAuth } from "@/context/auth-context"
import {
  isWelcomeFlowCompleted,
  isWelcomeFlowDismissed,
  isWelcomeFlowPending,
  queueWelcomeFlow,
} from "@/lib/welcome-flow"

export default function OnboardingPage() {
  const router = useRouter()
  const { hydrated, isAuthenticated, access } = useAuth()

  useEffect(() => {
    if (!hydrated) return
    if (!isAuthenticated) {
      router.replace("/")
      return
    }
    if (access && !access.allowed) {
      router.replace("/trial-ended")
      return
    }
    if (
      isWelcomeFlowPending() &&
      !isWelcomeFlowCompleted() &&
      !isWelcomeFlowDismissed()
    ) {
      queueWelcomeFlow()
      router.replace("/home/?welcome=1")
      return
    }
    router.replace("/home/")
  }, [hydrated, isAuthenticated, access, router])

  return null
}
