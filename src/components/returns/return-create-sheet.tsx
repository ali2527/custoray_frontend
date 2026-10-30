"use client"

import { useCallback, useState, type FormEvent } from "react"
import { toast } from "sonner"
import { useTranslation } from "react-i18next"

import { ReturnForm } from "@/components/returns/return-form"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { useOrders } from "@/context/orders-context"
import { usePurchases } from "@/context/purchases-context"
import { useReturns } from "@/context/returns-context"
import { apiCreateReturn } from "@/lib/api/business"
import { mapApiReturnToRow } from "@/lib/pos-api"
import { persistCompletedReturn, returnToCreateInput } from "@/lib/return-persist"
import { returnFromFormData, type ReturnRow } from "@/lib/returns"
import { canReturnDocument } from "@/lib/return-eligibility"

type ReturnCreateSheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  draft: Omit<ReturnRow, "id"> | null
  formId?: string
}

export function ReturnCreateSheet({
  open,
  onOpenChange,
  draft,
  formId = "return-create-form",
}: ReturnCreateSheetProps) {
  const { t } = useTranslation("returns")
  const { addReturn, refreshReturns } = useReturns()
  const { getOrder, refreshOrders } = useOrders()
  const { getPurchase } = usePurchases()
  const [saving, setSaving] = useState(false)

  const handleSubmit = useCallback(
    async (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault()
      if (!draft || saving) return

      const parsed = returnFromFormData(new FormData(e.currentTarget), 0)
      if (parsed.lines.length === 0 || !parsed.lines.some((l) => l.productName.trim())) {
        toast.error(t("toasts.addItem"))
        return
      }

      const source =
        parsed.type === "sales"
          ? getOrder(parsed.sourceId)
          : getPurchase(parsed.sourceId)
      if (!source || !canReturnDocument(source)) {
        toast.error(t("toasts.onlyCompleted"))
        return
      }

      const sourceApiId =
        ("apiId" in source ? source.apiId?.trim() : "") ||
        draft.sourceApiId?.trim() ||
        ""
      if (!sourceApiId) {
        toast.error("This document is not saved on the server yet.")
        return
      }

      setSaving(true)
      try {
        const productIdBySourceLineId =
          parsed.type === "sales" && source && "lines" in source
            ? Object.fromEntries(
                (source.lines ?? [])
                  .filter((line) => "productApiId" in line && line.productApiId?.trim())
                  .map((line) => [
                    line.id,
                    (line as { productApiId?: string }).productApiId!.trim(),
                  ])
              )
            : undefined

        const apiReturn =
          parsed.status === "completed"
            ? await persistCompletedReturn(
                parsed,
                sourceApiId,
                productIdBySourceLineId
              )
            : await apiCreateReturn(
                returnToCreateInput(parsed, sourceApiId, productIdBySourceLineId)
              )

        addReturn(
          mapApiReturnToRow(apiReturn, { sourceNumericId: parsed.sourceId })
        )
        if (parsed.type === "sales") await refreshOrders()
        await refreshReturns()
        toast.success(
          parsed.status === "completed" ? t("toasts.recorded") : t("toasts.saved")
        )
        onOpenChange(false)
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Could not save return."
        )
      } finally {
        setSaving(false)
      }
    },
    [
      addReturn,
      draft,
      getOrder,
      getPurchase,
      onOpenChange,
      refreshOrders,
      refreshReturns,
      saving,
      t,
    ]
  )

  const title =
    draft?.type === "sales"
      ? t("create.returnSale")
      : draft?.type === "purchase"
        ? t("create.returnPurchase")
        : t("create.createReturn")

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-lg"
      >
        {draft ? (
          <>
            <SheetHeader className="border-border/60 space-y-1 border-b px-6 py-5 text-left">
              <SheetTitle className="text-lg leading-tight">{title}</SheetTitle>
              <SheetDescription>
                {draft.referenceNumber} · {draft.partyName}
              </SheetDescription>
            </SheetHeader>
            <div key={`${draft.type}-${draft.sourceId}`} className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
              <ReturnForm
                formId={formId}
                returnDoc={{ ...draft, id: 0 }}
                isNew
                onSubmit={handleSubmit}
              />
            </div>
            <SheetFooter className="border-border/60 gap-2 border-t px-6 py-4 sm:flex-row sm:justify-end">
              <SheetClose asChild>
                <Button variant="outline" type="button">
                  {t("actions.cancel", { ns: "common" })}
                </Button>
              </SheetClose>
              <Button type="submit" form={formId} disabled={saving}>
                {t("form.recordReturn")}
              </Button>
            </SheetFooter>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  )
}
