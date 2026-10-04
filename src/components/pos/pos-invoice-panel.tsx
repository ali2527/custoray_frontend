"use client"

import { useTranslation } from "react-i18next"

import { InvoicePdfButton } from "@/components/invoices/invoice-pdf-button"
import { formatDate, type OrderRow } from "@/lib/orders"
import { cn } from "@/lib/utils"

type PosInvoicePanelProps = {
  nextInvoiceNumber: string
  lastCreated: OrderRow | null
  justCreated: OrderRow | null
  formatMoney: (value: string) => string
  onDismissJustCreated?: () => void
  className?: string
}

export function PosInvoicePanel({
  nextInvoiceNumber,
  lastCreated,
  justCreated,
  formatMoney,
  onDismissJustCreated,
  className,
}: PosInvoicePanelProps) {
  const { t } = useTranslation("pos")
  return (
    <div
      className={cn(
        "rounded-xl bg-card px-4 py-2.5 text-xs shadow-sm shadow-black/[0.04] ring-1 ring-border/40",
        className
      )}
    >
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-muted-foreground">{t("nextInvoice")}</span>
        <span className="font-semibold tabular-nums">{nextInvoiceNumber}</span>
      </div>

      {justCreated ? (
        <div className="bg-muted/40 mt-2 flex items-start justify-between gap-2 rounded-md px-2 py-1.5">
          <div className="min-w-0">
            <p className="font-medium tabular-nums">{justCreated.invoiceNumber}</p>
            <p className="text-muted-foreground truncate text-[10px]">
              {justCreated.customerName} · {formatMoney(justCreated.totalAmount)}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <InvoicePdfButton order={justCreated} size="sm" variant="outline" label={t("pdf")} />
            {onDismissJustCreated ? (
              <button
                type="button"
                onClick={onDismissJustCreated}
                className="text-muted-foreground hover:text-foreground inline-flex size-8 shrink-0 items-center justify-center rounded-md text-sm"
                aria-label="Dismiss"
              >
                ×
              </button>
            ) : null}
          </div>
        </div>
      ) : lastCreated ? (
        <p className="text-muted-foreground mt-1 truncate text-[10px]">
          {t("lastReceipt", {
            number: lastCreated.invoiceNumber,
            date: formatDate(lastCreated.orderDate),
            amount: formatMoney(lastCreated.totalAmount),
          })}
        </p>
      ) : null}
    </div>
  )
}
