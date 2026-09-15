"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ORDER_STATUSES, PAYMENT_METHODS, type OrderRow } from "@/lib/orders"
import { normalizeDiscountAmount } from "@/lib/pos"
import { formatMoney as formatCurrency } from "@/lib/customers"
import { cn } from "@/lib/utils"
import { useTranslation } from "react-i18next"

function formatPosPositive(value: string) {
  return formatCurrency(value).replace(/^\$/, "Rs ")
}

type PosCartCheckoutProps = {
  paymentMethod: OrderRow["paymentMethod"]
  onPaymentMethodChange: (value: OrderRow["paymentMethod"]) => void
  status: OrderRow["status"]
  onStatusChange: (value: OrderRow["status"]) => void
  discountDraft: string
  onDiscountDraftChange: (value: string) => void
  onApplyDiscount: () => void
  onClearDiscount: () => void
  appliedDiscount: string
  subtotal: string
  total: string
  lineDiscounts?: string
  lineAdditions?: string
  formatMoney: (value: string) => string
  disabled?: boolean
  processing?: boolean
  onCompleteSale: () => void
  variant?: "sale" | "return"
  enabledPaymentMethods?: OrderRow["paymentMethod"][]
  allowDiscounts?: boolean
  allowPartialPayment?: boolean
  paidAmountDraft?: string
  onPaidAmountDraftChange?: (value: string) => void
}

export function PosCartCheckout({
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
  lineDiscounts = "0.00",
  lineAdditions = "0.00",
  formatMoney,
  disabled,
  processing,
  onCompleteSale,
  variant = "sale",
  enabledPaymentMethods = [...PAYMENT_METHODS],
  allowDiscounts = true,
  allowPartialPayment = false,
  paidAmountDraft = "",
  onPaidAmountDraftChange,
}: PosCartCheckoutProps) {
  const { t } = useTranslation("pos")
  const isReturn = variant === "return"
  const lineDiscountAmount = Number(lineDiscounts) || 0
  const additionAmount = Number(lineAdditions) || 0
  const cartDiscountAmount = Number(appliedDiscount) || 0
  const totalDiscountAmount = lineDiscountAmount + cartDiscountAmount
  const hasDiscount = cartDiscountAmount > 0
  const hasLineDiscounts = totalDiscountAmount > 0.005
  const hasAdditions = additionAmount > 0.005
  const listSubtotal = (
    Number(subtotal) - additionAmount + lineDiscountAmount
  ).toFixed(2)
  const showPartialPayment = !isReturn && allowPartialPayment
  const balanceDue = Math.max(
    0,
    Number(total) - (Number(paidAmountDraft) || 0)
  ).toFixed(2)

  const actionLabel = processing
    ? t("processing")
    : isReturn
      ? status === "completed"
        ? t("completeReturn")
        : status === "pending"
          ? t("savePendingReturn")
          : t("saveCancelledReturn")
      : status === "completed"
        ? t("completeSale")
        : status === "pending"
          ? t("savePendingSale")
          : t("saveCancelledSale")

  return (
    <div className="border-border/40 space-y-2.5 border-t p-3">
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1.5">
          <Label htmlFor="pos-payment" className="text-xs">
            {isReturn ? t("refund") : t("payment")}
          </Label>
          <Select
            value={paymentMethod}
            onValueChange={(value) =>
              onPaymentMethodChange(value as OrderRow["paymentMethod"])
            }
          >
            <SelectTrigger id="pos-payment" className="h-10 w-full">
              <SelectValue placeholder={t("selectPaymentMethod")} />
            </SelectTrigger>
            <SelectContent>
              {enabledPaymentMethods.map((method) => (
                <SelectItem key={method} value={method}>
                  {method}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="pos-status" className="text-xs">
            {t("status")}
          </Label>
          <Select
            value={status}
            onValueChange={(value) => onStatusChange(value as OrderRow["status"])}
          >
            <SelectTrigger id="pos-status" className="h-10 w-full">
              <SelectValue placeholder={t("selectStatus")} />
            </SelectTrigger>
            <SelectContent>
              {ORDER_STATUSES.map((option) => (
                <SelectItem key={option} value={option}>
                  {t(`status.${option}`, { ns: "common" })}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {allowDiscounts ? (
        <div className="space-y-1.5">
          <Label htmlFor="pos-discount" className="text-xs">
            {t("discount")}
          </Label>
          <div className="flex gap-2">
            <Input
              id="pos-discount"
              type="number"
              min={0}
              step="0.01"
              inputMode="decimal"
              value={discountDraft}
              onChange={(event) => onDiscountDraftChange(event.target.value)}
              placeholder="0.00"
              disabled={disabled}
              className="h-10"
            />
            <Button
              type="button"
              variant="outline"
              className="h-10 shrink-0"
              disabled={disabled}
              onClick={onApplyDiscount}
            >
              {t("apply")}
            </Button>
          </div>
          {hasDiscount ? (
            <button
              type="button"
              onClick={onClearDiscount}
              className="text-muted-foreground hover:text-foreground text-xs font-medium"
            >
              {t("removeDiscount")}
            </button>
          ) : null}
        </div>
      ) : null}

      {showPartialPayment ? (
        <div className="space-y-1.5">
          <Label htmlFor="pos-paid-amount" className="text-xs">
            {t("amountPaid")}
          </Label>
          <Input
            id="pos-paid-amount"
            type="number"
            min={0}
            step="0.01"
            inputMode="decimal"
            value={paidAmountDraft}
            onChange={(event) => onPaidAmountDraftChange?.(event.target.value)}
            placeholder={total}
            disabled={disabled}
            className="h-10"
          />
        </div>
      ) : null}

      <div className="space-y-2 text-sm">
        <div className="flex items-center justify-between gap-3">
          <span className="text-muted-foreground">{t("subtotal")}</span>
          <span className="tabular-nums">{formatMoney(listSubtotal)}</span>
        </div>
        {hasAdditions ? (
          <div className="flex items-center justify-between gap-3">
            <span className="text-muted-foreground">{t("additions")}</span>
            <span className="tabular-nums text-amber-700 dark:text-amber-400">
              +{formatMoney(additionAmount.toFixed(2))}
            </span>
          </div>
        ) : null}
        {hasLineDiscounts ? (
          <div className="flex items-center justify-between gap-3">
            <span className="text-muted-foreground">{t("discounts")}</span>
            <span className="tabular-nums text-emerald-600 dark:text-emerald-400">
              −{formatMoney(totalDiscountAmount.toFixed(2))}
            </span>
          </div>
        ) : null}
        {showPartialPayment ? (
          <div className="flex items-center justify-between gap-3 text-xs">
            <span className="text-muted-foreground">{t("balanceDue")}</span>
            <span className="font-medium tabular-nums">{formatPosPositive(balanceDue)}</span>
          </div>
        ) : null}
        <div
          className={cn(
            "flex items-center justify-between rounded-xl px-3 py-3",
            isReturn ? "bg-amber-500/10" : "bg-primary/10"
          )}
        >
          <span className="font-medium">{isReturn ? t("refundTotal") : t("totalDue")}</span>
          <span
            className={cn(
              "text-lg font-semibold tabular-nums tracking-tight",
              isReturn && "text-amber-900 dark:text-amber-300"
            )}
          >
            {formatMoney(total)}
          </span>
        </div>
      </div>

      <Button
        type="button"
        className="h-12 w-full text-[15px] font-semibold"
        disabled={disabled || processing}
        onClick={onCompleteSale}
      >
        {actionLabel}
      </Button>
    </div>
  )
}

export function applyPosDiscount(subtotal: string, discountDraft: string): string {
  return normalizeDiscountAmount(subtotal, discountDraft.trim() || "0")
}
