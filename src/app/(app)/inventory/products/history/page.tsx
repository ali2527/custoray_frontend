"use client"

import { Suspense } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { useTranslation } from "react-i18next"

import { ProductStockHistoryPage } from "@/components/inventory/product-stock-history-page"
import { Button } from "@/components/ui/button"
import { PageLoader } from "@/components/ui/page-loader"
import { useInventoryProducts } from "@/hooks/use-inventory-products"

function ProductStockHistoryRouteInner() {
  const searchParams = useSearchParams()
  const { t } = useTranslation("inventory")
  const { products, isLoading } = useInventoryProducts()
  const raw = (searchParams.get("id") ?? "").trim()
  const product = products.find(
    (row) => row.id === raw || String(row.srNo) === raw || row.sku === raw
  )

  if (isLoading) return <PageLoader />

  if (!product?.id) {
    return (
      <div className="flex max-w-xl flex-col gap-4 py-8">
        <p className="text-muted-foreground text-sm">{t("stockHistory.notFound")}</p>
        <Button asChild variant="outline" className="w-fit">
          <Link href="/inventory/products">{t("stockHistory.back")}</Link>
        </Button>
      </div>
    )
  }

  return <ProductStockHistoryPage product={product} />
}

export default function ProductStockHistoryRoutePage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <ProductStockHistoryRouteInner />
    </Suspense>
  )
}
