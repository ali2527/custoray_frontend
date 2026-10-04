"use client"

import { IconPlus, IconUser, IconX } from "@tabler/icons-react"
import { useTranslation } from "react-i18next"

import { Button } from "@/components/ui/button"
import { InfiniteScrollSelect } from "@/components/ui/infinite-scroll-select"
import { cn } from "@/lib/utils"

type PosCustomerSelectProps = {
  customerId: string
  customerName: string
  onCustomerChange: (value: string) => void
  onClearCustomer: () => void
  onAddCustomer: () => void
  customerOptions: {
    value: string
    label: string
    description?: string
  }[]
  walkInCustomerId: string
  className?: string
}

export function PosCustomerSelect({
  customerId,
  customerName,
  onCustomerChange,
  onClearCustomer,
  onAddCustomer,
  customerOptions,
  walkInCustomerId,
  className,
}: PosCustomerSelectProps) {
  const { t } = useTranslation("pos")
  const hasSelectedCustomer = customerId !== walkInCustomerId

  return (
    <div className={cn("flex min-w-0 items-center gap-1.5", className)}>
      <InfiniteScrollSelect
        id="pos-customer-toolbar"
        value={customerId}
        onValueChange={onCustomerChange}
        options={customerOptions}
        placeholder={t("customer")}
        searchPlaceholder={t("searchCustomers")}
        emptyMessage={t("noCustomersFound")}
        pageSize={10}
        onAddNew={onAddCustomer}
        addNewLabel={t("addCustomer")}
        leadingIcon={<IconUser className="size-3.5" stroke={1.75} />}
        className="h-10 min-w-0 flex-1 rounded-full text-xs font-medium shadow-sm sm:h-9"
      />

      {hasSelectedCustomer ? (
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="size-10 shrink-0 rounded-full shadow-sm sm:size-9"
          onClick={onClearCustomer}
          aria-label={t("clearCustomer", { name: customerName })}
        >
          <IconX className="size-3.5" />
        </Button>
      ) : (
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="size-10 shrink-0 rounded-full shadow-sm sm:size-9"
          onClick={onAddCustomer}
          aria-label={t("addCustomer")}
        >
          <IconPlus className="size-3.5" />
        </Button>
      )}
    </div>
  )
}
