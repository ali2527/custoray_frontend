"use client"

import Link from "next/link"
import { IconReceipt } from "@tabler/icons-react"
import { useTranslation } from "react-i18next"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import {
  computeBalance,
  formatDate,
  formatMoney,
  ordersForCustomer,
  type OrderRow,
} from "@/lib/orders"
import { useOrders } from "@/context/orders-context"
import { useReturns } from "@/context/returns-context"
import {
  formatDate as formatReturnDate,
  formatMoney as formatReturnMoney,
  returnsForCustomer,
  type ReturnRow,
} from "@/lib/returns"
import type { CustomerRow } from "@/lib/customers"

function OrderCard({ order, compact }: { order: OrderRow; compact?: boolean }) {
  const { t } = useTranslation("customers")
  const { t: tc } = useTranslation("common")
  const balance = computeBalance(order)
  const itemPreview = order.lines
    .slice(0, 2)
    .map((line) => line.productName)
    .join(", ")
  const extraItems = order.lines.length > 2 ? order.lines.length - 2 : 0

  return (
    <Card className="gap-0 py-0 shadow-none">
      <CardContent className={compact ? "space-y-2 p-3" : "space-y-3 p-4"}>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-foreground truncate text-sm font-semibold">
              {order.invoiceNumber}
            </p>
            <p className="text-muted-foreground text-xs tabular-nums">
              {formatDate(order.orderDate)}
            </p>
          </div>
          <Badge variant="outline">
            {tc(`status.${order.status}`)}
          </Badge>
        </div>
        {compact ? null : (
          <p className="text-muted-foreground line-clamp-2 text-xs">
            {itemPreview}
            {extraItems > 0 ? ` +${extraItems}` : ""}
          </p>
        )}
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div>
            <p className="text-muted-foreground">{t("timeline.total")}</p>
            <p className="text-foreground font-medium tabular-nums">
              {formatMoney(order.totalAmount)}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">{t("timeline.paid")}</p>
            <p className="text-foreground font-medium tabular-nums">
              {formatMoney(order.paidAmount)}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">{t("timeline.balance")}</p>
            <p
              className={
                Number(balance) > 0
                  ? "font-medium tabular-nums text-amber-700 dark:text-amber-400"
                  : "text-muted-foreground font-medium tabular-nums"
              }
            >
              {formatMoney(balance)}
            </p>
          </div>
        </div>
        {compact ? null : (
          <p className="text-muted-foreground text-xs">
            {t("timeline.itemCount", { count: order.lines.length })}
          </p>
        )}
      </CardContent>
    </Card>
  )
}

function ReturnCard({ doc, compact }: { doc: ReturnRow; compact?: boolean }) {
  const { t } = useTranslation("customers")
  const itemPreview = doc.lines
    .slice(0, 2)
    .map((line) => line.productName)
    .join(", ")
  const extraItems = doc.lines.length > 2 ? doc.lines.length - 2 : 0

  return (
    <Card className="gap-0 py-0 shadow-none ring-1 ring-red-200/80 dark:ring-red-900/40">
      <CardContent className={compact ? "space-y-2 p-3" : "space-y-3 p-4"}>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-red-800 dark:text-red-300">
              {doc.returnNumber}
            </p>
            <p className="text-muted-foreground text-xs tabular-nums">
              {formatReturnDate(doc.returnDate)}
              {doc.referenceNumber && doc.referenceNumber !== "—"
                ? ` · ${doc.referenceNumber}`
                : ""}
            </p>
          </div>
          <Badge
            variant="outline"
            className="border-red-500/30 px-1.5 text-red-700 dark:text-red-400"
          >
            {t("timeline.return")}
          </Badge>
        </div>
        <p className="text-muted-foreground line-clamp-2 text-xs">
          {itemPreview}
          {extraItems > 0 ? ` +${extraItems}` : ""}
        </p>
        <div className="text-xs">
          <p className="text-muted-foreground">{t("timeline.returnAmount")}</p>
          <p className="font-medium tabular-nums text-red-700 dark:text-red-400">
            ({formatReturnMoney(doc.totalAmount)})
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

export function CustomerOrderCards({
  customer,
  limit,
  compact = false,
}: {
  customer: CustomerRow
  limit?: number
  compact?: boolean
}) {
  const { t } = useTranslation("customers")
  const { orders } = useOrders()
  const { returns } = useReturns()
  const customerOrders = ordersForCustomer(orders, customer.name)
  const customerReturns = returnsForCustomer(returns, customer.name)

  const timeline = [
    ...customerOrders.map((order) => ({
      kind: "invoice" as const,
      date: order.orderDate,
      id: order.id,
      order,
    })),
    ...customerReturns.map((doc) => ({
      kind: "return" as const,
      date: doc.returnDate,
      id: doc.id,
      doc,
    })),
  ].sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id)

  const visible = typeof limit === "number" ? timeline.slice(0, limit) : timeline

  if (timeline.length === 0) {
    return (
      <div
        className={
          compact
            ? "border-border/60 bg-muted/20 flex flex-col items-center gap-1 rounded-lg border border-dashed px-3 py-8 text-center"
            : "border-border/60 bg-muted/20 flex flex-col items-center gap-2 rounded-lg border border-dashed px-4 py-12 text-center"
        }
      >
        <IconReceipt className="text-muted-foreground size-8 stroke-[1.25]" />
        <p className="text-muted-foreground text-sm">{t("timeline.empty")}</p>
        {compact ? null : (
          <Link
            href="/documents/sales-invoice"
            className="text-foreground text-sm font-medium underline-offset-4 hover:underline"
          >
            {t("timeline.createInvoice")}
          </Link>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      {visible.map((item) =>}
        item.kind === "invoice" ? (
          <OrderCard key={`invoice-${item.order.id}`} order={item.order} compact={compact} />
        ) : (
          <ReturnCard key={`return-${item.doc.id}`} doc={item.doc} compact={compact} />
        )
      )}
    </div>
  )
}
