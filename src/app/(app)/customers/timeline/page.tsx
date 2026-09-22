"use client"

import { Suspense } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { useTranslation } from "react-i18next"

import { CustomerTimelinePage } from "@/components/customers/customer-timeline-page"
import { Button } from "@/components/ui/button"
import { PageLoader } from "@/components/ui/page-loader"
import { useCustomers } from "@/context/customers-context"

function CustomerTimelineRouteInner() {
  const searchParams = useSearchParams()
  const { t } = useTranslation("customers")
  const { customers, loading } = useCustomers()
  const raw = (searchParams.get("id") ?? "").trim()
  const customer = customers.find(
    (row) => String(row.id) === raw || row.apiId === raw
  )

  if (loading) return <PageLoader />

  if (!customer) {
    return (
      <div className="flex max-w-xl flex-col gap-4 py-8">
        <p className="text-muted-foreground text-sm">{t("timeline.notFound")}</p>
        <Button asChild variant="outline" className="w-fit">
          <Link href="/customers">{t("timeline.back")}</Link>
        </Button>
      </div>
    )
  }

  return <CustomerTimelinePage customer={customer} />
}

export default function CustomerTimelineRoutePage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <CustomerTimelineRouteInner />
    </Suspense>
  )
}
