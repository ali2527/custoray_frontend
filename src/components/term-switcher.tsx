"use client"

import Link from "next/link"
import { Calendar, Check, ChevronRight, Plus } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useFiscalTerms } from "@/context/fiscal-term-context"
import { formatShortDate, type TermListEntry } from "@/lib/fiscal-terms"
import { cn } from "@/lib/utils"
import { useTranslation } from "react-i18next"

function termDateRange(viewing: TermListEntry, plannedEndIso: string): string {
  if (viewing.isActive) {
    return `${formatShortDate(viewing.startedAt)} – ${formatShortDate(plannedEndIso)}`
  }
  if (viewing.closedAt) {
    return `${formatShortDate(viewing.startedAt)} – ${formatShortDate(viewing.closedAt)}`
  }
  return formatShortDate(viewing.startedAt)
}

export function TermSwitcher({ triggerClassName }: { triggerClassName?: string } = {}) {
  const { t } = useTranslation("nav")
  const { state, termsList, viewing, plannedEndIso, setViewingTermId } =
    useFiscalTerms()

  const termTitle = (term: TermListEntry) =>
    t("termSwitcher.termN", { sequence: term.sequence })

  const primary = viewing ? termTitle(viewing) : t("termSwitcher.fiscalTerm")
  const triggerLabel = viewing
    ? `${primary} (${termDateRange(viewing, plannedEndIso)})`
    : primary

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant={triggerClassName ? "ghost" : "outline"}
          size="icon"
          className={cn(
            triggerClassName ??
              "border-input bg-background text-foreground hover:bg-accent hover:text-accent-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50 relative shrink-0 shadow-xs"
          )}
          aria-label={
            viewing
              ? t("termSwitcher.selectWithLabel", { label: triggerLabel })
              : t("termSwitcher.select")
          }
        >
          <Calendar className="size-4" strokeWidth={2} aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="min-w-56 rounded-lg"
        align="end"
        side="bottom"
        sideOffset={6}
      >
        <DropdownMenuLabel className="text-muted-foreground text-xs">
          {t("termSwitcher.terms")}
        </DropdownMenuLabel>
        {termsList.map((term) => {
          const selected = state.viewingTermId === term.id
          const endIso =
            term.isActive ? plannedEndIso : term.closedAt ?? term.startedAt
          const dateLine = `${formatShortDate(term.startedAt)} – ${formatShortDate(endIso)}`
          return (
            <div key={term.id} className="flex items-stretch">
              <DropdownMenuItem
                className={cn(
                  "min-w-0 flex-1 gap-2 rounded-none py-2 pr-1 pl-2",
                  "focus:bg-accent"
                )}
                onClick={() => setViewingTermId(term.id)}
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
                    {termTitle(term)}
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
                  href={`/inventory/terms/${encodeURIComponent(term.id)}`}
                  aria-label={t("termSwitcher.openDetails", { sequence: term.sequence })}
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
          <Link href="/inventory/year-closing">
            <div className="flex size-6 items-center justify-center rounded-md border bg-transparent">
              <Plus className="size-[1.125rem]" />
            </div>
            <span className="font-medium">{t("termSwitcher.addTerm")}</span>
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
