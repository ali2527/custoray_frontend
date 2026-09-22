"use client"

import { useCallback, type FormEvent } from "react"
import { toast } from "sonner"
import { useTranslation } from "react-i18next"

import { CustomerForm } from "@/components/customers/customer-form"
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
import { useCustomers } from "@/context/customers-context"
import {
  customerErrorMessage,
  customerFromFormData,
  EMPTY_CUSTOMER,
  type CustomerRow,
} from "@/lib/customers"

type CustomerQuickAddSheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  formId?: string
  onCreated: (customer: CustomerRow) => void
}

export function CustomerQuickAddSheet({
  open,
  onOpenChange,
  formId = "customer-quick-add-form",
  onCreated,
}: CustomerQuickAddSheetProps) {
  const { t } = useTranslation("customers")
  const { addCustomer } = useCustomers()

  const handleSubmit = useCallback(
    async (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault()
      const parsed = customerFromFormData(new FormData(e.currentTarget), EMPTY_CUSTOMER)
      if (!parsed.name.trim()) {
        toast.error(t("toasts.nameRequired"))
        return
      }
      try {
        const created = await addCustomer(parsed)
        onCreated(created)
        onOpenChange(false)
        toast.success(t("toasts.created"))
      } catch (error) {
        toast.error(customerErrorMessage(error, t("toasts.saveFailed")))
      }
    },
    [addCustomer, onCreated, onOpenChange, t]
  )

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-md"
      >
        <SheetHeader className="border-border/60 space-y-1 border-b px-6 py-5 text-left">
          <SheetTitle className="text-lg leading-tight">{t("sheet.add")}</SheetTitle>
          <SheetDescription>{t("sheet.quickAddDescription")}</SheetDescription>
        </SheetHeader>
        <div key="add" className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          <CustomerForm
            formId={formId}
            customer={EMPTY_CUSTOMER}
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
            {t("sheet.create")}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
