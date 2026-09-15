"use client"

import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

type SettingsSectionProps = {
  title: string
  description?: string
  icon?: ReactNode
  iconClassName?: string
  compact?: boolean
  children: ReactNode
  footer?: ReactNode
  className?: string
  contentClassName?: string
}

export function SettingsSection({
  title,
  description,
  icon,
  iconClassName,
  compact = false,
  children,
  footer,
  className,
  contentClassName,
}: SettingsSectionProps) {
  return (
    <section
      className={cn(
        "bg-card shadow-sm shadow-black/[0.04] ring-1 ring-border/40",
        compact ? "rounded-xl" : "rounded-2xl",
        className
      )}
    >
      <div
        className={cn(
          "border-border/40 border-b",
          compact ? "px-4 py-3" : "px-5 py-4"
        )}
      >
        <div className="flex items-start gap-2.5">
          {icon ? (
            <div
              className={cn(
                "flex size-8 shrink-0 items-center justify-center rounded-lg [&>svg]:size-4",
                iconClassName ?? "bg-primary/10 text-primary"
              )}
            >
              {icon}
            </div>
          ) : null}
          <div className="min-w-0">
            <h3 className={cn("font-semibold", compact ? "text-sm" : "text-base")}>
              {title}
            </h3>
            {description ? (
              <p
                className={cn(
                  "text-muted-foreground mt-0.5",
                  compact ? "text-xs leading-snug" : "text-sm"
                )}
              >
                {description}
              </p>
            ) : null}
          </div>
        </div>
      </div>
      <div
        className={cn(
          compact ? "space-y-3 p-4" : "space-y-5 p-5",
          contentClassName
        )}
      >
        {children}
      </div>
      {footer ? (
        <div
          className={cn(
            "border-border/40 flex items-center border-t",
            compact ? "px-4 py-3" : "px-5 py-4"
          )}
        >
          {footer}
        </div>
      ) : null}
    </section>
  )
}
