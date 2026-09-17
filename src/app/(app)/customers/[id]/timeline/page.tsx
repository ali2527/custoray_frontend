"use client"

import { useParams } from "next/navigation"
import Link from "next/link"
import { IconArrowLeft } from "@tabler/icons-react"
import { useTranslation } from "react-i18next"

import { CustomerAvatar } from "@/components/customers/customer-avatar"
import { CustomerOrderCards } from "@/components/customers/customer-order-cards"
import { Button } from "@/components/ui/button"
import { PageLoader } from "@/components/ui/page-loader"
import { useCustomers } from "@/context/customers-context"
import { computeBalance, formatMoney } from "@/lib/customers"

export default function CustomerTimelinePage() {
  const params = useParams<{ id: string }>()
  const { t } = useTranslation("customers")
  const { getCustomer, loading } = useCustomers()
  const customer = getCustomer(Number(params.id))

  if (loading) return <PageLoader />

  if (!customer) {
    return (
      <div className="flex max-w-xl flex-col gap-4">
        <p className="text-muted-foreground text-sm">{t("timeline.notFound")}</p>
        <Button asChild variant="outline" className="w-fit">
          <Link href="/customers">{t("timeline.back")}</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <div className="flex flex-col gap-4">
        <Button asChild variant="ghost" className="text-muted-foreground -ms-2 w-fit px-2">
          <Link href="/customers">
            <IconArrowLeft className="size-4 rtl:rotate-180" />
            {t("timeline.back")}
          </Link>
        </Button>
        <div className="flex items-center gap-4">
          <CustomerAvatar name={customer.name} imageUrl={customer.imageUrl} size="lg" />
          <div className="min-w-0">
            <p className="text-foreground truncate text-lg font-semibold">
              {customer.name}
            </p>
            <p className="text-muted-foreground text-sm">
              {t("timeline.title")} · {formatMoney(computeBalance(customer))}
            </p>
          </div>
        </div>
      </div>
      <CustomerOrderCards customer={customer} />
    </div>
  )
}
