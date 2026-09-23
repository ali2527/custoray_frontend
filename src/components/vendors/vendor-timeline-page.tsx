"use client"

import { useMemo } from "react"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"

import { StatementTimelinePage } from "@/components/customers/customer-timeline-page"
import { usePurchases } from "@/context/purchases-context"
import { useReturns } from "@/context/returns-context"
import {
  applyImportedVendorTimelineRows,
  buildVendorTimelineRows,
  VENDOR_TIMELINE_IMPORT_SAMPLE_ROW,
} from "@/lib/vendor-timeline"
import type { VendorRow } from "@/lib/vendors"

export function VendorTimelinePage({ vendor }: { vendor: VendorRow }) {
  const { t } = useTranslation("vendors")
  const { t: tc } = useTranslation()
  const { purchases, setPurchases } = usePurchases()
  const { returns, setReturns } = useReturns()
  const allRows = useMemo(
    () => buildVendorTimelineRows(vendor, purchases, returns),
    [vendor, purchases, returns]
  )

  function handleImport(imported: Record<string, string>[]) {
    if (imported.length === 0) {
      toast.error(tc("toast.noRowsToImport"))
      return
    }
    const result = applyImportedVendorTimelineRows(
      imported,
      vendor.name,
      purchases,
      returns
    )
    if (result.added === 0) {
      toast.message(tc("toast.noRowsAdded"))
      return
    }
    setPurchases(result.purchases)
    setReturns(result.returns)
    if (result.failed > 0) {
      toast.error(
        t("toasts.importPartial", { added: result.added, failed: result.failed })
      )
      return
    }
    toast.success(tc("toast.importedRows", { count: result.added }))
  }

  return (
    <StatementTimelinePage
      party={vendor}
      allRows={allRows}
      backHref="/vendors"
      i18nNs="vendors"
      documentKind="purchase"
      importKinds={["purchase", "return"]}
      importSampleFilename="vendor-timeline-sample.csv"
      importSampleRow={VENDOR_TIMELINE_IMPORT_SAMPLE_ROW}
      onImport={handleImport}
    />
  )
}
