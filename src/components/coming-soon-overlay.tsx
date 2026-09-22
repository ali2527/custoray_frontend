"use client"

import { useTranslation } from "react-i18next"

import { cn } from "@/lib/utils"

type ComingSoonOverlayProps = {
  children: React.ReactNode
  className?: string
  titleKey?: string
  descriptionKey?: string
}

export function ComingSoonOverlay({
  children,
  className,
  titleKey = "comingSoon.title",
  descriptionKey = "comingSoon.description",
}: ComingSoonOverlayProps) {
  const { t } = useTranslation("common")

  return (
    <div className={cn("relative min-h-[min(28rem,70vh)] flex-1", className)}>
      <div
        className="pointer-events-none select-none opacity-40 blur-[1px]"
        aria-hidden
      >
        {children}
      </div>
      <div className="bg-background/75 absolute inset-0 z-20 flex items-center justify-center backdrop-blur-[2px]">
        <div className="mx-4 max-w-md rounded-2xl border border-border/60 bg-card px-8 py-10 text-center shadow-sm">
          <p className="text-muted-foreground text-[11px] font-semibold tracking-[0.18em] uppercase">
            {t("comingSoon.badge")}
          </p>
          <h2 className="text-foreground mt-3 text-2xl font-semibold tracking-tight">
            {t(titleKey)}
          </h2>
          <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
            {t(descriptionKey)}
          </p>
        </div>
      </div>
    </div>
  )
}
