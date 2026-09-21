"use client"

import { useCallback, type FormEvent } from "react"
import { toast } from "sonner"
import { useTranslation } from "react-i18next"

import { VendorForm } from "@/components/vendors/vendor-form"
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
import { useVendors } from "@/context/vendors-context"
import {
  EMPTY_VENDOR,
  vendorErrorMessage,
  vendorFromFormData,
  type VendorRow,
} from "@/lib/vendors"

type VendorQuickAddSheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  formId?: string
  onCreated: (vendor: VendorRow) => void
}

export function VendorQuickAddSheet({
  open,
  onOpenChange,
  formId = "vendor-quick-add-form",
  onCreated,
}: VendorQuickAddSheetProps) {
  const { t } = useTranslation("vendors")
  const { addVendor } = useVendors()

  const handleSubmit = useCallback(
    async (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault()
      const parsed = vendorFromFormData(new FormData(e.currentTarget), EMPTY_VENDOR)
      if (!parsed.name.trim()) {
        toast.error(t("toasts.nameRequired"))
        return
      }
      try {
        const created = await addVendor(parsed)
        onCreated(created)
        onOpenChange(false)
        toast.success(t("toasts.created"))
      } catch (error) {
        toast.error(vendorErrorMessage(error, t("toasts.saveFailed")))
      }
    },
    [addVendor, onCreated, onOpenChange, t]
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
          <VendorForm formId={formId} vendor={EMPTY_VENDOR} onSubmit={handleSubmit} />
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
