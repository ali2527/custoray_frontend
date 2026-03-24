"use client"

import * as React from "react"
import Link from "next/link"
import { Calendar, Check, ChevronRight, ChevronsUpDown, Plus } from "lucide-react"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { useFiscalTerms } from "@/context/fiscal-term-context"
import { formatShortDate, type TermListEntry } from "@/lib/fiscal-terms"
import { cn } from "@/lib/utils"

function termTitle(t: TermListEntry): string {
  return `Term ${t.sequence}`
}

function termDateSubtitle(viewing: TermListEntry, plannedEndIso: string): string {
  if (viewing.isActive) {
    return `${formatShortDate(viewing.startedAt)} – ${formatShortDate(plannedEndIso)}`
  }
  if (viewing.closedAt) {
    return `${formatShortDate(viewing.startedAt)} – ${formatShortDate(viewing.closedAt)}`
  }
  return formatShortDate(viewing.startedAt)
}

export function TermSwitcher() {
  const { isMobile } = useSidebar()
  const { state, termsList, viewing, plannedEndIso, setViewingTermId } =
    useFiscalTerms()

  const primary = viewing ? termTitle(viewing) : "Fiscal term"
  const secondary = viewing
    ? termDateSubtitle(viewing, plannedEndIso)
    : "—"

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                <Calendar className="size-[1.125rem]" strokeWidth={2} aria-hidden />
              </div>
              <div className="grid min-w-0 flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{primary}</span>
                <span className="text-muted-foreground truncate text-xs">
                  {secondary}
                </span>
              </div>
              <ChevronsUpDown className="ml-auto opacity-50" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            align="start"
            side={isMobile ? "bottom" : "right"}
            sideOffset={4}
          >
            <DropdownMenuLabel className="text-muted-foreground text-xs">
              Terms
            </DropdownMenuLabel>
            {termsList.map((t) => {
              const selected = state.viewingTermId === t.id
              const endIso =
                t.isActive
                  ? plannedEndIso
                  : t.closedAt ?? t.startedAt
              const dateLine = `${formatShortDate(t.startedAt)} – ${formatShortDate(endIso)}`
              return (
                <div key={t.id} className="flex items-stretch">
                  <DropdownMenuItem
                    className={cn(
                      "min-w-0 flex-1 gap-2 rounded-none py-2 pr-1 pl-2",
                      "focus:bg-accent"
                    )}
                    onClick={() => setViewingTermId(t.id)}
                  >
                    <div className="flex size-6 shrink-0 items-center justify-center rounded-md border">
                      {selected ? (
                        <Check className="size-3.5" />
                      ) : (
                        <span className="size-3.5" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="line-clamp-2 text-sm leading-snug">
                        {termTitle(t)}
                      </span>
                      <span className="text-muted-foreground line-clamp-1 text-xs">
                        {dateLine}
                      </span>
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-muted-foreground hover:text-foreground w-9 shrink-0 justify-center rounded-none px-0 py-2"
                    asChild
                  >
                    <Link
                      href={`/dashboard/inventory/terms/${encodeURIComponent(t.id)}`}
                      aria-label={`Open term ${t.sequence} details`}
                      className="flex size-full items-center justify-center"
                    >
                      <ChevronRight className="size-[1.125rem]" />
                    </Link>
                  </DropdownMenuItem>
                </div>
              )
            })}
            <DropdownMenuSeparator />
            <DropdownMenuItem className="gap-2 p-2" asChild>
              <Link href="/dashboard/inventory/year-closing">
                <div className="flex size-6 items-center justify-center rounded-md border bg-transparent">
                  <Plus className="size-[1.125rem]" />
                </div>
                <span className="font-medium">Add term</span>
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
