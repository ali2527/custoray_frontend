"use client"

import * as React from "react"

export function PosViewport({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-[calc(100dvh-7.25rem)] min-h-0 flex-1 flex-col overflow-hidden sm:h-[calc(100dvh-7.75rem)] lg:h-[calc(100dvh-8rem)]">
      {children}
    </div>
  )
}
