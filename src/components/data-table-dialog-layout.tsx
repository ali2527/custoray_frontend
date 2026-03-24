import * as React from "react"

import { cn } from "@/lib/utils"

/** Shared shell for import / export data-table modals */
export const dataTableDialogContentClassName = cn(
  "flex max-h-[min(92vh,920px)] w-[calc(100vw-1.25rem)] flex-col gap-0 overflow-hidden rounded-xl border bg-background p-0 shadow-2xl",
  "sm:max-w-3xl lg:max-w-4xl"
)

export function DataTableDialogHeaderSection({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "border-b bg-muted/40 px-6 py-5 sm:px-8",
        className
      )}
      {...props}
    />
  )
}

export function DataTableDialogBody({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("min-h-0 flex-1 overflow-y-auto px-6 py-6 sm:px-8", className)}
      {...props}
    />
  )
}

export function DataTableDialogFooterSection({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "border-t bg-muted/30 px-6 py-4 sm:px-8",
        className
      )}
      {...props}
    />
  )
}
