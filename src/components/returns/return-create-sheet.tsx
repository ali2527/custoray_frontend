"use client"

import { useCallback, type FormEvent } from "react"
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
  const { addReturn } = useReturns()
  const { getOrder, updateOrder } = useOrders()
  const { getPurchase, updatePurchase } = usePurchases()

  const handleSubmit = useCallback(
    (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault()
      if (!draft) return

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

      addReturn(parsed, {
        getOrder,
        getPurchase,
        onApplySales: updateOrder,
        onApplyPurchase: updatePurchase,
      })

      toast.success(
        parsed.status === "completed" ? t("toasts.recorded") : t("toasts.saved")
      )
      onOpenChange(false)
    },
    [addReturn, draft, getOrder, getPurchase, onOpenChange, t, updateOrder, updatePurchase]
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
              <Button type="submit" form={formId}>
                {t("form.recordReturn")}
              </Button>
            </SheetFooter>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  )
}
