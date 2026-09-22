"use client"

import { useCallback, useMemo, useState, type FormEvent } from "react"
import { useTranslation } from "react-i18next"

import { DocumentNumberField } from "@/components/document-number-field"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useDocumentNumberSettings } from "@/hooks/use-document-number-settings"
import {
  computePaymentImpact,
  computeReturnTotal,
  formatMoney,
  type ReturnLineRow,
  type ReturnRow,
} from "@/lib/returns"

type ReturnFormProps = {
  formId: string
  returnDoc: ReturnRow
  isNew?: boolean
  onSubmit: (e: FormEvent<HTMLFormElement>) => void
}

export function ReturnForm({
  formId,
  returnDoc,
  isNew = false,
  onSubmit,
}: ReturnFormProps) {
  const { t } = useTranslation("returns")
  const { settings: numberSettings } = useDocumentNumberSettings()
  const [lines, setLines] = useState<ReturnLineRow[]>(
    returnDoc.lines.length > 0 ? returnDoc.lines : []
  )

  const returnTotal = useMemo(() => computeReturnTotal(lines), [lines])

  const paymentImpact = useMemo(
    () =>
      computePaymentImpact(
        returnDoc.sourcePaidAmount,
        returnDoc.sourceTotalBefore,
        returnTotal
      ),
    [returnDoc.sourcePaidAmount, returnDoc.sourceTotalBefore, returnTotal]
  )

  const updateLine = useCallback((index: number, quantity: number) => {
    setLines((prev) =>
      prev.map((line, i) => {
        if (i !== index) return line
        const qty = Math.min(Math.max(1, quantity), line.maxQuantity)
        const lineTotal = (Number(line.unitPrice) * qty).toFixed(2)
        return { ...line, quantity: qty, lineTotal }
      })
    )
  }, [])

  const typeLabel = returnDoc.type === "sales" ? t("form.sale") : t("form.purchase")
  const partyLabel =
    returnDoc.type === "sales" ? t("detail.customer") : t("detail.vendor")
  const numberKey =
    returnDoc.type === "sales" ? "salesReturns" : "purchaseReturns"

  return (
    <form id={formId} className="flex flex-col gap-4 text-sm" onSubmit={onSubmit}>
      <input type="hidden" name="type" value={returnDoc.type} />
      <input type="hidden" name="sourceId" value={returnDoc.sourceId} />
      <input type="hidden" name="referenceNumber" value={returnDoc.referenceNumber} />
      <input type="hidden" name="partyName" value={returnDoc.partyName} />
      <input type="hidden" name="sourcePaidAmount" value={returnDoc.sourcePaidAmount} />
      <input type="hidden" name="sourceTotalBefore" value={returnDoc.sourceTotalBefore} />
      <input type="hidden" name="refundedAmount" value={paymentImpact.refundDue} />

      <div className="bg-muted/30 border-border/60 rounded-lg border p-3 text-sm">
        <p className="text-muted-foreground">
          {t("form.returnOf", { type: typeLabel })} ·{" "}
          <span className="text-foreground font-medium">{returnDoc.referenceNumber}</span>
        </p>
        <p className="text-muted-foreground mt-1">
          {partyLabel}:{" "}
          <span className="text-foreground">{returnDoc.partyName}</span>
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <DocumentNumberField
          id={`${formId}-returnNumber`}
          name="returnNumber"
          label={t("form.returnNumber")}
          value={returnDoc.returnNumber}
          settings={numberSettings[numberKey]}
          isNew={isNew}
          placeholder={returnDoc.type === "sales" ? "SR-3001" : "PR-3001"}
          autoHint="Auto-generated"
        />
        <div className="flex flex-col gap-2">
          <Label htmlFor={`${formId}-returnDate`}>{t("form.returnDate")}</Label>
          <Input
            id={`${formId}-returnDate`}
            name="returnDate"
            type="date"
            defaultValue={returnDoc.returnDate}
            required
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor={`${formId}-description`}>{t("form.notes")}</Label>
        <Input
          id={`${formId}-description`}
          name="description"
          defaultValue={returnDoc.description === "—" ? "" : returnDoc.description}
          placeholder={t("form.reasonPlaceholder")}
        />
      </div>

      <div className="flex flex-col gap-3">
        <Label>{t("form.itemsToReturn")}</Label>
        <div className="flex flex-col gap-3">
          {lines.map((line, index) => (
            <div
              key={`${line.id}-${index}`}
              className="border-border/60 bg-muted/20 space-y-2 rounded-lg border p-3"
            >
              <input type="hidden" name={`lines[${index}].id`} value={line.id} />
              <input
                type="hidden"
                name={`lines[${index}].sourceLineId`}
                value={line.sourceLineId}
              />
              <input
                type="hidden"
                name={`lines[${index}].productName`}
                value={line.productName}
              />
              <input
                type="hidden"
                name={`lines[${index}].maxQuantity`}
                value={line.maxQuantity}
              />
              <input
                type="hidden"
                name={`lines[${index}].unitPrice`}
                value={line.unitPrice}
              />
              <p className="text-foreground font-medium">{line.productName}</p>
              <div className="grid grid-cols-3 gap-2">
                <div className="flex flex-col gap-1">
                  <Label htmlFor={`${formId}-qty-${index}`}>{t("form.returnQty")}</Label>
                  <Input
                    id={`${formId}-qty-${index}`}
                    name={`lines[${index}].quantity`}
                    type="number"
                    min={1}
                    max={line.maxQuantity}
                    value={line.quantity}
                    onChange={(e) => updateLine(index, Number(e.target.value) || 1)}
                  />
                  <span className="text-muted-foreground text-xs">
                    {t("form.maxQty", { count: line.maxQuantity })}
                  </span>
                </div>
                <div className="flex flex-col gap-1">
                  <Label>{t("form.unitPrice")}</Label>
                  <div className="text-muted-foreground flex h-9 items-center tabular-nums">
                    {formatMoney(line.unitPrice)}
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <Label>{t("detail.lineTotal")}</Label>
                  <div className="text-foreground flex h-9 items-center tabular-nums">
                    {line.lineTotal}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="border-border/60 bg-muted/20 space-y-2 rounded-lg border p-3">
        <p className="text-foreground font-medium">{t("detail.paymentImpact")}</p>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
          <span className="text-muted-foreground">{t("detail.originalTotal")}</span>
          <span className="text-right tabular-nums">
            {formatMoney(returnDoc.sourceTotalBefore)}
          </span>
          <span className="text-muted-foreground">{t("form.paidAmount")}</span>
          <span className="text-right tabular-nums">
            {formatMoney(returnDoc.sourcePaidAmount)}
          </span>
          <span className="text-muted-foreground">{t("detail.returnAmount")}</span>
          <span className="text-right tabular-nums text-amber-700 dark:text-amber-400">
            −{returnTotal}
          </span>
          <span className="text-muted-foreground">{t("detail.newTotal")}</span>
          <span className="text-right tabular-nums">
            {formatMoney(paymentImpact.sourceTotalAfter)}
          </span>
          {Number(paymentImpact.refundDue) > 0 ? (
            <>
              <span className="text-muted-foreground">{t("detail.refundDue")}</span>
              <span className="text-right font-medium text-emerald-700 tabular-nums dark:text-emerald-400">
                {formatMoney(paymentImpact.refundDue)}
              </span>
            </>
          ) : null}
          {Number(paymentImpact.balanceDue) > 0 ? (
            <>
              <span className="text-muted-foreground">{t("detail.balanceDue")}</span>
              <span className="text-right font-medium text-amber-700 tabular-nums dark:text-amber-400">
                {formatMoney(paymentImpact.balanceDue)}
              </span>
            </>
          ) : null}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor={`${formId}-status`}>{t("detail.status")}</Label>
        <select
          id={`${formId}-status`}
          name="status"
          defaultValue={returnDoc.status}
          className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm shadow-xs outline-none focus-visible:ring-ring/50 focus-visible:ring-[3px]"
        >
          <option value="pending">{t("status.pending", { ns: "common" })}</option>
          <option value="completed">{t("status.completed", { ns: "common" })}</option>
          <option value="cancelled">{t("status.cancelled", { ns: "common" })}</option>
        </select>
      </div>
    </form>
  )
}
