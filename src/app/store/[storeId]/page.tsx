"use client"

import { Suspense, use } from "react"
import { useTranslation } from "react-i18next"

import { PublicStorefront } from "@/components/qr-storefront/public-storefront"
import { PageLoader } from "@/components/ui/page-loader"

export default function StorefrontPage({
  params,
}: {
  params: Promise<{ storeId: string }>
}) {
  const { storeId } = use(params)
  const { t } = useTranslation("storefront")
  return (
    <Suspense fallback={<PageLoader fullScreen message={t("opening")} />}>
      <PublicStorefront storeId={storeId} />
    </Suspense>
  )
}
