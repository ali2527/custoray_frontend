"use client"

import { Suspense } from "react"
import { useSearchParams } from "next/navigation"

import { LoginForm } from "@/components/loginForm"

function safeNextPath(path?: string | null) {
  if (!path || !path.startsWith("/") || path.startsWith("//")) return undefined
  return path
}

function LoginPageInner() {
  const params = useSearchParams()
  return (
    <LoginForm
      expiredNotice={params.get("expired") === "1"}
      openVerify={params.get("verify") === "1"}
      verifyPending={params.get("pending") === "1"}
      verifiedNotice={params.get("notice") === "verified"}
      justVerified={params.get("notice") === "ready"}
      redirectTo={safeNextPath(params.get("redirect"))}
    />
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginPageInner />
    </Suspense>
  )
}
