"use client"

import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"

import { formatMoney } from "@/lib/customers"
import { apiListProductStockValueHistory } from "@/lib/api/business"
import { formatPriceTimelineDate } from "@/lib/product-price-history"
import { cn } from "@/lib/utils"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

type StockValueReason = "set" | "price" | "quantity" | "both"

type StockValueEvent = {
  id: string
  reason: StockValueReason
  previousPrice: string | null
  price: string
  previousStock: number | null
  stock: number
  previousValue: string | null
  value: string
  createdAt: string
}

const REASON_PILL: Record<StockValueReason, string> = {
  price: "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300",
  quantity: "bg-violet-100 text-violet-800 dark:bg-violet-500/15 dark:text-violet-300",
  both: "bg-sky-100 text-sky-800 dark:bg-sky-500/15 dark:text-sky-300",
  set: "bg-muted text-foreground",
}

export function ProductStockValueTimeline({
  productId,
  salePrice,
  stock,
}: {
  productId?: string
  salePrice?: string
  stock?: number
}) {
  const { t } = useTranslation("inventory")
  const [events, setEvents] = useState<StockValueEvent[]>([])
  const [loading, setLoading] = useState(Boolean(productId))

  useEffect(() => {
    let cancelled = false

    async function load() {
      if (!productId) {
        setEvents([])
        setLoading(false)
        return
      }
      setLoading(true)
      try {
        const res = await apiListProductStockValueHistory(productId)
        if (!cancelled) setEvents(res.items ?? [])
      } catch {
        if (!cancelled) setEvents([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [productId, salePrice, stock])

  return (
    <section className="overflow-hidden rounded-xl border">
      <div className="flex items-center justify-between gap-2 border-b px-4 py-3">
        <h3 className="text-sm font-semibold tracking-tight">
          {t("stockValueTimeline.title")}
        </h3>
        {events.length > 0 ? (
          <span className="text-muted-foreground text-xs tabular-nums">
            {events.length}
          </span>
        ) : null}
      </div>
      {events.length === 0 ? (
        <p className="text-muted-foreground px-4 py-4 text-sm">
          {loading
            ? t("actions.loading", { ns: "common" })
            : t("stockValueTimeline.empty")}
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>{t("stockValueTimeline.date")}</TableHead>
              <TableHead>{t("stockValueTimeline.change")}</TableHead>
              <TableHead className="text-end">{t("stockValueTimeline.qty")}</TableHead>
              <TableHead className="text-end">{t("stockValueTimeline.price")}</TableHead>
              <TableHead className="text-end">{t("stockValueTimeline.value")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {events.map((event) => (
              <TableRow key={event.id} className="hover:bg-muted/40">
                <TableCell className="text-muted-foreground whitespace-nowrap text-xs">
                  {formatPriceTimelineDate(event.createdAt)}
                </TableCell>
                <TableCell>
                  <span
                    className={cn(
                      "inline-flex rounded-full px-2 py-0.5 text-xs font-medium",
                      REASON_PILL[event.reason]
                    )}
                  >
                    {t(`stockValueTimeline.${event.reason}`)}
                  </span>
                </TableCell>
                <TableCell className="text-end text-xs tabular-nums">
                  {event.previousStock == null
                    ? event.stock
                    : `${event.previousStock} → ${event.stock}`}
                </TableCell>
                <TableCell className="text-end text-xs tabular-nums">
                  {event.previousPrice
                    ? `${formatMoney(event.previousPrice)} → ${formatMoney(event.price)}`
                    : formatMoney(event.price)}
                </TableCell>
                <TableCell className="text-end text-xs font-medium tabular-nums">
                  {event.previousValue ? (
                    <span>
                      <span className="text-muted-foreground font-normal">
                        {formatMoney(event.previousValue)}
                      </span>
                      {" → "}
                      {formatMoney(event.value)}
                    </span>
                  ) : (
                    formatMoney(event.value)
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </section>
  )
}
