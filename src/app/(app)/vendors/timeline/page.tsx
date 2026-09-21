"use client"

import { Suspense } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { useTranslation } from "react-i18next"

import { VendorTimelinePage } from "@/components/vendors/vendor-timeline-page"
import { Button } from "@/components/ui/button"
import { PageLoader } from "@/components/ui/page-loader"
import { useVendors } from "@/context/vendors-context"

function VendorTimelineRouteInner() {
  const searchParams = useSearchParams()
  const { t } = useTranslation("vendors")
  const { vendors, loading } = useVendors()
  const raw = (searchParams.get("id") ?? "").trim()
  const vendor = vendors.find(
    (row) => String(row.id) === raw || row.apiId === raw
  )

  if (loading) return <PageLoader />

  if (!vendor) {
    return (
      <div className="flex max-w-xl flex-col gap-4 py-8">
        <p className="text-muted-foreground text-sm">{t("timeline.notFound")}</p>
        <Button asChild variant="outline" className="w-fit">
          <Link href="/vendors">{t("timeline.back")}</Link>
        </Button>
      </div>
    )
  }

  return <VendorTimelinePage vendor={vendor} />
}

export default function VendorTimelineRoutePage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <VendorTimelineRouteInner />
    </Suspense>
  )
}
