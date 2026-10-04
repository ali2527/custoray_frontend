"use client"

import * as React from "react"
import { IconSearch } from "@tabler/icons-react"
import { useTranslation } from "react-i18next"

import { Badge } from "@/components/ui/badge"
import { SearchInput } from "@/components/ui/search-input"
import { useReturns } from "@/context/returns-context"
import { formatMoney } from "@/lib/customers"
import { statusBadgeClass, statusLabel } from "@/lib/orders"
import { formatDate as formatReturnDate, isPosReturn, type ReturnRow } from "@/lib/returns"
import { cn } from "@/lib/utils"

function formatPosMoney(value: string) {
  return formatMoney(value)
}

const panelClass =
  "rounded-2xl bg-card shadow-sm shadow-black/[0.04] ring-1 ring-border/40"

const searchInputClass =
  "rounded-full shadow-sm focus-visible:ring-0 focus-visible:ring-offset-0 hover:ring-0 focus:ring-0 focus:outline-none min-w-0 flex-1"

function returnItemCount(row: ReturnRow): number {
  return row.lines.reduce((sum, line) => sum + line.quantity, 0)
}

export function PosReturnsHistory() {
  const { t } = useTranslation("pos")
  const { returns } = useReturns()
  const [search, setSearch] = React.useState("")

  const posReturns = React.useMemo(() => {
    const query = search.trim().toLowerCase()
    return returns
      .filter(isPosReturn)
      .filter((row) => {
        if (!query) return true
        return (
          row.returnNumber.toLowerCase().includes(query) ||
          row.partyName.toLowerCase().includes(query) ||
          row.referenceNumber.toLowerCase().includes(query)
        )
      })
      .sort((a, b) => {
        const dateCompare = b.returnDate.localeCompare(a.returnDate)
        if (dateCompare !== 0) return dateCompare
        return b.id - a.id
      })
  }, [returns, search])

  const totalRefunded = React.useMemo(() => {
    const sum = posReturns
      .filter((row) => row.status === "completed")
      .reduce((acc, row) => {
        const value = Number(row.totalAmount)
        return acc + (Number.isFinite(value) ? value : 0)
      }, 0)
    return sum.toFixed(2)
  }, [posReturns])

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">{t("returnsHistory.title")}</h2>
        <p className="text-muted-foreground mt-1 text-sm">{t("returnsHistory.hint")}</p>
      </div>

      <div className={cn(panelClass, "overflow-hidden")}>
        <div className="border-border/40 border-b px-4 py-4">
          <p className="text-muted-foreground text-sm">
            {t("returnsHistory.countRefunded", {
              count: posReturns.length,
              amount: formatPosMoney(totalRefunded),
            })}
          </p>
          <div className="mt-3 sm:max-w-md">
            <SearchInput
              placeholder={t("returnsHistory.searchPlaceholder")}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              icon={<IconSearch className="size-4" />}
              className={searchInputClass}
            />
          </div>
        </div>

        <div className="p-4">
          {posReturns.length === 0 ? (
            <p className="text-muted-foreground py-12 text-center text-sm">
              {t("returnsHistory.empty")}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-sm">
                <thead>
                  <tr className="text-muted-foreground border-border/40 border-b text-left text-xs tracking-wide uppercase">
                    <th className="pb-3 pr-4 font-medium">{t("returnsHistory.returnNumber")}</th>
                    <th className="pb-3 pr-4 font-medium">{t("returnsHistory.date")}</th>
                    <th className="pb-3 pr-4 font-medium">{t("returnsHistory.customer")}</th>
                    <th className="pb-3 pr-4 font-medium">{t("returnsHistory.items")}</th>
                    <th className="pb-3 pr-4 font-medium">{t("returnsHistory.status")}</th>
                    <th className="pb-3 text-right font-medium">{t("returnsHistory.refund")}</th>
                  </tr>
                </thead>
                <tbody>
                  {posReturns.map((row) => (
                    <tr
                      key={row.id}
                      className="border-border/30 border-b last:border-0 hover:bg-muted/20"
                    >
                      <td className="py-3.5 pr-4 font-medium tabular-nums">
                        {row.returnNumber}
                      </td>
                      <td className="text-muted-foreground py-3.5 pr-4">
                        {formatReturnDate(row.returnDate)}
                      </td>
                      <td className="max-w-[10rem] truncate py-3.5 pr-4">
                        {row.partyName}
                      </td>
                      <td className="py-3.5 pr-4 tabular-nums">
                        {returnItemCount(row)}
                      </td>
                      <td className="py-3.5 pr-4">
                        <Badge
                          variant="outline"
                          className={cn("h-5 px-1.5 text-[10px]", statusBadgeClass(row.status))}
                        >
                          {statusLabel(row.status)}
                        </Badge>
                      </td>
                      <td className="py-3.5 text-right font-semibold tabular-nums">
                        {formatPosMoney(row.totalAmount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
