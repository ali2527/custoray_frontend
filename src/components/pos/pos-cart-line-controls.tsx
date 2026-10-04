"use client"

import * as React from "react"
import { IconMinus, IconPlus, IconRotateClockwise, IconTrash } from "@tabler/icons-react"
import { useTranslation } from "react-i18next"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  cartLineAdjustment,
  cartLineBaseTotal,
  cartLineHasAdjustment,
  cartLineTotal,
  type PosCartLine,
} from "@/lib/pos"
import { cn } from "@/lib/utils"

type PosCartLineControlsProps = {
  line: PosCartLine
  formatMoney: (value: string) => string
  onQuantityChange: (productId: number, quantity: number) => void
  onFinalPriceChange: (productId: number, finalLineTotal: string | undefined) => void
  onRemove: (productId: number) => void
  allowLinePriceEdit?: boolean
}

export function PosCartLineControls({
  line,
  formatMoney,
  onQuantityChange,
  onFinalPriceChange,
  onRemove,
  allowLinePriceEdit = true,
}: PosCartLineControlsProps) {
  const { t } = useTranslation("pos")
  const { t: tc } = useTranslation("common")
  const [qtyDraft, setQtyDraft] = React.useState(String(line.quantity))
  const [priceDraft, setPriceDraft] = React.useState("")

  React.useEffect(() => {
    setQtyDraft(String(line.quantity))
  }, [line.productId, line.quantity])

  React.useEffect(() => {
    if (line.finalLineTotal !== undefined && line.finalLineTotal !== "") {
      setPriceDraft(line.finalLineTotal)
      return
    }
    setPriceDraft(cartLineBaseTotal(line))
  }, [line.finalLineTotal, line.quantity, line.unitPrice])

  const baseTotal = cartLineBaseTotal(line)
  const adjustment = cartLineAdjustment(line)
  const adjustmentNum = Number(adjustment)
  const hasAdjustment = cartLineHasAdjustment(line)

  const applyQuantity = (raw: string) => {
    const parsed = Number.parseInt(raw, 10)
    if (!Number.isFinite(parsed) || parsed <= 0) return
    onQuantityChange(line.productId, Math.min(parsed, line.maxStock))
    setQtyDraft(String(Math.min(parsed, line.maxStock)))
  }

  const applyPrice = (raw: string) => {
    const parsed = Number(raw)
    if (!Number.isFinite(parsed) || parsed < 0) return
    const normalized = parsed.toFixed(2)
    if (Math.abs(parsed - Number(baseTotal)) < 0.005) {
      onFinalPriceChange(line.productId, undefined)
      setPriceDraft(baseTotal)
      return
    }
    onFinalPriceChange(line.productId, normalized)
    setPriceDraft(normalized)
  }

  return (
    <div className="space-y-3 border-t border-border/30 pt-3">
      <div
        className={cn(
          "grid items-end gap-2 sm:gap-3",
          allowLinePriceEdit
            ? "grid-cols-1 min-[420px]:grid-cols-[1fr_1fr_auto]"
            : "grid-cols-[1fr_auto]"
        )}
      >
        <div>
          <p className="text-muted-foreground mb-1.5 text-xs font-medium">Quantity</p>
          <div className="flex items-center gap-1.5">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="size-10 shrink-0 rounded-lg sm:size-9"
              onClick={() => applyQuantity(String(Math.max(1, line.quantity - 1)))}
            >
              <IconMinus className="size-3.5" />
            </Button>
            <Input
              inputMode="numeric"
              value={qtyDraft}
              onChange={(event) => setQtyDraft(event.target.value.replace(/\D/g, ""))}
              onBlur={() => {
                if (qtyDraft.trim()) applyQuantity(qtyDraft)
                else setQtyDraft(String(line.quantity))
              }}
              onKeyDown={(event) => {
                if (event.key !== "Enter") return
                event.preventDefault()
                if (qtyDraft.trim()) applyQuantity(qtyDraft)
                else setQtyDraft(String(line.quantity))
                event.currentTarget.blur()
              }}
              className="h-10 px-1 text-center text-sm font-semibold tabular-nums sm:h-9"
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="size-10 shrink-0 rounded-lg sm:size-9"
              onClick={() =>
                applyQuantity(String(Math.min(line.maxStock, line.quantity + 1)))
              }
            >
              <IconPlus className="size-3.5" />
            </Button>
          </div>
        </div>

        {allowLinePriceEdit ? (
          <div>
            <p className="text-muted-foreground mb-1.5 text-xs font-medium">Line total</p>
            <Input
              inputMode="decimal"
              value={priceDraft}
              onChange={(event) =>
                setPriceDraft(event.target.value.replace(/[^\d.]/g, ""))
              }
              onBlur={() => {
                if (priceDraft.trim()) applyPrice(priceDraft)
              }}
              onKeyDown={(event) => {
                if (event.key !== "Enter") return
                event.preventDefault()
                if (priceDraft.trim()) applyPrice(priceDraft)
                event.currentTarget.blur()
              }}
              className="h-10 text-sm font-semibold tabular-nums sm:h-9"
            />
          </div>
        ) : (
          <div className="flex flex-col justify-end pb-1">
            <p className="text-muted-foreground text-xs font-medium">{t("lineTotal")}</p>
            <p className="text-sm font-semibold tabular-nums">{formatMoney(cartLineTotal(line))}</p>
          </div>
        )}

        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="text-muted-foreground hover:text-destructive size-10 shrink-0 justify-self-end sm:size-9"
          onClick={() => onRemove(line.productId)}
          aria-label={t("remove")}
        >
          <IconTrash className="size-4" />
        </Button>
      </div>

      <div className="text-muted-foreground flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
        <span>{t("listPrice", { amount: formatMoney(baseTotal) })}</span>
        {hasAdjustment ? (
          <>
            <span
              className={cn(
                "font-medium",
                adjustmentNum < 0 && "text-emerald-600 dark:text-emerald-400",
                adjustmentNum > 0 && "text-amber-700 dark:text-amber-400"
              )}
            >
              {adjustmentNum < 0
                ? t("offAmount", { amount: formatMoney(Math.abs(adjustmentNum).toFixed(2)) })
                : `+${formatMoney(adjustment)}`}
            </span>
            <button
              type="button"
              onClick={() => {
                onFinalPriceChange(line.productId, undefined)
                setPriceDraft(baseTotal)
              }}
              className="hover:text-foreground inline-flex items-center gap-0.5 font-medium"
            >
              <IconRotateClockwise className="size-2.5" />
              {tc("actions.reset")}
            </button>
          </>
        ) : null}
      </div>
    </div>
  )
}
