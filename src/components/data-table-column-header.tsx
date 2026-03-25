"use client"

import type { HTMLAttributes } from "react"
import type { Column } from "@tanstack/react-table"
import {
  IconChevronDown,
  IconChevronUp,
  IconSelector,
} from "@tabler/icons-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

type Align = "start" | "center" | "end"

export function DataTableColumnHeader<TData, TValue>({
  column,
  title,
  className,
  align = "start",
}: HTMLAttributes<HTMLDivElement> & {
  column: Column<TData, TValue>
  title: string
  align?: Align
}) {
  if (!column.getCanSort()) {
    return (
      <div
        className={cn(
          align === "center" && "flex w-full justify-center",
          align === "end" && "flex w-full justify-end",
          className
        )}
      >
        {title}
      </div>
    )
  }

  return (
    <div
      className={cn(
        "flex items-center",
        align === "center" && "w-full justify-center",
        align === "end" && "w-full justify-end",
        className
      )}
    >
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className={cn(
          "h-8 gap-1 px-2 lg:px-3",
          align === "start" && "-ml-3",
          align === "center" && "-ml-0",
          align === "end" && "-mr-3 ml-auto"
        )}
        onClick={column.getToggleSortingHandler()}
      >
        <span>{title}</span>
        {column.getIsSorted() === "desc" ? (
          <IconChevronDown className="size-4 shrink-0 opacity-70" />
        ) : column.getIsSorted() === "asc" ? (
          <IconChevronUp className="size-4 shrink-0 opacity-70" />
        ) : (
          <IconSelector className="size-4 shrink-0 opacity-45" />
        )}
      </Button>
    </div>
  )
}
