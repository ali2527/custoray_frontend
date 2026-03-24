"use client"

import * as React from "react"
import { FiscalTermProvider } from "@/context/fiscal-term-context"
import { Toaster } from "@/components/ui/sonner"

export function DashboardProviders({ children }: { children: React.ReactNode }) {
  return (
    <FiscalTermProvider>
      {children}
      <Toaster richColors position="top-center" />
    </FiscalTermProvider>
  )
}
