"use client"

import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"

import { formatMoney } from "@/lib/customers"
import { apiListProductPriceHistory } from "@/lib/api/business"
import {
  formatPriceTimelineDate,
  type ProductPriceEvent,
  type ProductPriceKind,
} from "@/lib/product-price-history"
import { cn } from "@/lib/utils"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

const KIND_PILL: Record<ProductPriceKind, string> = {
  increased: "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300",
  decreased: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300",
  set: "bg-sky-100 text-sky-800 dark:bg-sky-500/15 dark:text-sky-300",
}

export function ProductPriceTimeline({
  productId,
  salePrice,
  costPrice,
}: {
  productId?: string
  sku?: string
  salePrice?: string
  costPrice?: string
}) {
  const { t } = useTranslation("inventory")
  const [events, setEvents] = useState<ProductPriceEvent[]>([])
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
        const res = await apiListProductPriceHistory(productId)
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
  }, [productId, salePrice, costPrice])

  return (
    <section className="overflow-hidden rounded-xl border">
      <div className="flex items-center justify-between gap-2 border-b px-4 py-3">
        <h3 className="text-sm font-semibold tracking-tight">
          {t("timeline.title")}
        </h3>
        {events.length > 0 ? (
          <span className="text-muted-foreground text-xs tabular-nums">
            {events.length}
          </span>
        ) : null}
      </div>
      {events.length === 0 ? (
        <p className="text-muted-foreground px-4 py-4 text-sm">
          {loading ? t("actions.loading", { ns: "common" }) : t("timeline.empty")}
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>{t("timeline.date")}</TableHead>
              <TableHead>{t("timeline.field")}</TableHead>
              <TableHead>{t("timeline.change")}</TableHead>
              <TableHead className="text-end">{t("timeline.previous")}</TableHead>
              <TableHead className="text-end">{t("timeline.current")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {events.map((event) => (
              <TableRow key={event.id} className="hover:bg-muted/40">
                <TableCell className="text-muted-foreground whitespace-nowrap text-xs">
                  {formatPriceTimelineDate(event.createdAt)}
                </TableCell>
                <TableCell className="text-xs font-medium">
                  {t(`timeline.${event.field}`)}
                </TableCell>
                <TableCell>
                  <span
                    className={cn(
                      "inline-flex rounded-full px-2 py-0.5 text-xs font-medium",
                      KIND_PILL[event.kind]
                    )}
                  >
                    {t(`timeline.${event.kind}`)}
                  </span>
                </TableCell>
                <TableCell className="text-end text-xs tabular-nums">
                  {event.previousPrice ? formatMoney(event.previousPrice) : "—"}
                </TableCell>
                <TableCell className="text-end text-xs font-medium tabular-nums">
                  {formatMoney(event.price)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </section>
  )
}
