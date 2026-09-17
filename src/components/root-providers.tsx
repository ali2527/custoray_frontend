"use client"

import * as React from "react"
import { QueryClientProvider } from "@tanstack/react-query"

import { AuthProvider } from "@/context/auth-context"
import { AppearanceProvider } from "@/components/theme/appearance-provider"
import { I18nProvider } from "@/components/i18n/i18n-provider"
import { ConfirmDialogHost } from "@/components/confirm-dialog"
import { Toaster } from "@/components/ui/sonner"
import { getQueryClient } from "@/lib/query-client"

export function RootProviders({ children }: { children: React.ReactNode }) {
  const queryClient = getQueryClient()
  return (
    <AppearanceProvider>
      <I18nProvider>
        <AuthProvider>
          <QueryClientProvider client={queryClient}>
            {children}
            <ConfirmDialogHost />
            <Toaster />
          </QueryClientProvider>
        </AuthProvider>
      </I18nProvider>
    </AppearanceProvider>
  )
}
