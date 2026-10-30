import type { ReactNode } from "react"
import { Badge } from "@/components/ui/badge"
import {
  formatDate,
  formatMoney,
  statusBadgeClass,
  statusLabel,
  type SaleLineRow,
} from "@/lib/sales-report"

function detailRow(label: string, value: ReactNode) {
  return (
    <div className="grid grid-cols-[7.5rem_1fr] gap-2 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-foreground min-w-0 font-medium">{value}</dd>
    </div>
  )
}

export function SaleLineDetail({ saleLine }: { saleLine: SaleLineRow }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="min-w-0">
        <p className="text-foreground text-base font-semibold">{saleLine.productName}</p>
        <p className="text-muted-foreground text-xs">
          {saleLine.invoiceNumber} · {formatDate(saleLine.orderDate)}
        </p>
      </div>
      <dl className="space-y-3">
        {detailRow("Invoice", saleLine.invoiceNumber)}
        {detailRow("Customer", saleLine.customerName)}
        {detailRow("Date", formatDate(saleLine.orderDate))}
        {detailRow("Quantity", saleLine.quantity)}
        {detailRow("Original price", formatMoney(saleLine.listPrice))}
        {detailRow("Sale price", formatMoney(saleLine.unitPrice))}
        {detailRow(
          "Adjustments",
          (() => {
            const list = Number(saleLine.listPrice)
            const unit = Number(saleLine.unitPrice)
            const qty = Number(saleLine.quantity) || 0
            const adjustment =
              Number.isFinite(list) && Number.isFinite(unit)
                ? (unit - list) * qty
                : 0
            if (Math.abs(adjustment) < 0.005) return "—"
            const amount = formatMoney(Math.abs(adjustment).toFixed(2))
            return adjustment < 0 ? `−${amount}` : `+${amount}`
          })()
        )}
        {detailRow("Line total", formatMoney(saleLine.lineTotal))}
        {detailRow(
          "Status",
          <Badge variant="outline" className={statusBadgeClass(saleLine.orderStatus)}>
            {statusLabel(saleLine.orderStatus)}
          </Badge>
        )}
      </dl>
    </div>
  )
}
