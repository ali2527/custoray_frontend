"use client"

import { useMemo } from "react"
import { IconShoppingCart } from "@tabler/icons-react"
import { useTranslation } from "react-i18next"

import { PosCartCheckout } from "@/components/pos/pos-cart-checkout"
import { PosCartLineControls } from "@/components/pos/pos-cart-line-controls"
import { Button } from "@/components/ui/button"
import {
  cartAdjustmentTotals,
  cartLineBaseTotal,
  cartLineHasAdjustment,
  cartLineTotal,
  type PosCartLine,
} from "@/lib/pos"
import { cn } from "@/lib/utils"

type PosCartPanelProps = {
  cart: PosCartLine[]
  selectedProductId: number | null
  onSelectLine: (productId: number) => void
  onQuantityChange: (productId: number, quantity: number) => void
  onFinalPriceChange: (productId: number, finalLineTotal: string | undefined) => void
  onRemoveLine: (productId: number) => void
  onClearCart: () => void
  formatMoney: (value: string) => string
  paymentMethod: Parameters<typeof PosCartCheckout>[0]["paymentMethod"]
  onPaymentMethodChange: Parameters<typeof PosCartCheckout>[0]["onPaymentMethodChange"]
  status: Parameters<typeof PosCartCheckout>[0]["status"]
  onStatusChange: Parameters<typeof PosCartCheckout>[0]["onStatusChange"]
  discountDraft: string
  onDiscountDraftChange: (value: string) => void
  onApplyDiscount: () => void
  onClearDiscount: () => void
  appliedDiscount: string
  subtotal: string
  total: string
  disabled?: boolean
  processing?: boolean
  onCompleteSale: () => void
  variant?: "sale" | "return"
  enabledPaymentMethods?: Parameters<typeof PosCartCheckout>[0]["enabledPaymentMethods"]
  allowDiscounts?: boolean
  allowLinePriceEdit?: boolean
  allowPartialPayment?: boolean
  paidAmountDraft?: string
  onPaidAmountDraftChange?: (value: string) => void
  className?: string
}

export function PosCartPanel({
  cart,
  selectedProductId,
  onSelectLine,
  onQuantityChange,
  onFinalPriceChange,
  onRemoveLine,
  onClearCart,
  formatMoney,
  paymentMethod,
  onPaymentMethodChange,
  status,
  onStatusChange,
  discountDraft,
  onDiscountDraftChange,
  onApplyDiscount,
  onClearDiscount,
  appliedDiscount,
  subtotal,
  total,
  disabled,
  processing,
  onCompleteSale,
  variant = "sale",
  enabledPaymentMethods,
  allowDiscounts,
  allowLinePriceEdit = true,
  allowPartialPayment,
  paidAmountDraft,
  onPaidAmountDraftChange,
  className,
}: PosCartPanelProps) {
  const { t } = useTranslation("pos")
  const isReturn = variant === "return"
  const cartItemCount = cart.reduce((sum, line) => sum + line.quantity, 0)
  const selectedLine =
    cart.find((line) => line.productId === selectedProductId) ?? cart[cart.length - 1] ?? null
  const { discounts: lineDiscounts, additions: lineAdditions } = useMemo(
    () => cartAdjustmentTotals(cart),
    [cart]
  )

  return (
    <aside
      className={cn(
        "flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl bg-card shadow-sm shadow-black/[0.04] ring-1 ring-border/40",
        className
      )}
    >
      <div className="border-border/40 flex items-center justify-between gap-2 border-b px-3 py-2.5 sm:px-4 sm:py-3">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold">{isReturn ? t("return") : t("cart")}</p>
          {cartItemCount > 0 ? (
            <span className="bg-primary/10 text-primary inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-semibold tabular-nums">
              {cartItemCount}
            </span>
          ) : (
            <span className="text-muted-foreground text-xs">{t("empty")}</span>
          )}
        </div>
        {cart.length > 0 ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-muted-foreground h-9 min-w-11 px-3 text-xs"
            onClick={onClearCart}
          >
            {t("clear")}
          </Button>
        ) : null}
      </div>

      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain p-2.5 sm:min-h-[160px] sm:p-3">
        {cart.length === 0 ? (
          <div className="text-muted-foreground flex min-h-[120px] flex-col items-center justify-center gap-2 text-center text-sm sm:min-h-[140px]">
            <div className="bg-muted/60 flex size-11 items-center justify-center rounded-2xl">
              <IconShoppingCart className="size-5 opacity-50" stroke={1.5} />
            </div>
            <p className="font-medium text-foreground/80">
              {isReturn ? t("noItemsToReturn") : t("cartEmpty")}
            </p>
            <p className="max-w-[12rem] text-xs">
              {isReturn ? t("tapToAddReturn") : t("tapToAddSale")}
            </p>
          </div>
        ) : (
          cart.map((line) => {
            const isSelected = line.productId === selectedLine?.productId
            const lineTotal = cartLineTotal(line)
            const hasAdjustment = cartLineHasAdjustment(line)

            return (
              <div
                key={line.productId}
                className={cn(
                  "rounded-lg ring-1 transition-colors",
                  isSelected
                    ? "bg-primary/[0.06] ring-primary/40"
                    : "bg-muted/25 ring-border/25 hover:bg-muted/40"
                )}
              >
                <button
                  type="button"
                  onClick={() => onSelectLine(line.productId)}
                  className="w-full min-h-11 px-3 py-2.5 text-left"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{line.productName}</p>
                      <p className="text-muted-foreground text-xs tabular-nums">
                        {line.quantity} × {formatMoney(line.unitPrice)}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p
                        className={cn(
                          "text-sm font-semibold tabular-nums",
                          isReturn && "text-amber-800 dark:text-amber-400"
                        )}
                      >
                        {formatMoney(lineTotal)}
                      </p>
                      {hasAdjustment && !isSelected ? (
                        <p className="text-muted-foreground text-[10px] line-through tabular-nums">
                          {formatMoney(cartLineBaseTotal(line))}
                        </p>
                      ) : null}
                    </div>
                  </div>
                </button>

                {isSelected ? (
                  <div className="px-3 pb-3">
                    <PosCartLineControls
                      line={line}
                      formatMoney={formatMoney}
                      onQuantityChange={onQuantityChange}
                      onFinalPriceChange={onFinalPriceChange}
                      onRemove={onRemoveLine}
                      allowLinePriceEdit={allowLinePriceEdit}
                    />
                  </div>
                ) : null}
              </div>
            )
          })
        )}
      </div>

      <PosCartCheckout
        paymentMethod={paymentMethod}
        onPaymentMethodChange={onPaymentMethodChange}
        status={status}
        onStatusChange={onStatusChange}
        discountDraft={discountDraft}
        onDiscountDraftChange={onDiscountDraftChange}
        onApplyDiscount={onApplyDiscount}
        onClearDiscount={onClearDiscount}
        appliedDiscount={appliedDiscount}
        subtotal={subtotal}
        total={total}
        lineDiscounts={lineDiscounts}
        lineAdditions={lineAdditions}
        formatMoney={formatMoney}
        disabled={disabled}
        processing={processing}
        onCompleteSale={onCompleteSale}
        variant={variant}
        enabledPaymentMethods={enabledPaymentMethods}
        allowDiscounts={allowDiscounts}
        allowPartialPayment={allowPartialPayment}
        paidAmountDraft={paidAmountDraft}
        onPaidAmountDraftChange={onPaidAmountDraftChange}
      />
    </aside>
  )
}
