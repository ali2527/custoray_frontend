"use client"

import { useState } from "react"
import { IconDownload } from "@tabler/icons-react"
import { toast } from "sonner"
import { useTranslation } from "react-i18next"

import { LoadingSpinner } from "@/components/ui/loading-spinner"

import { Button } from "@/components/ui/button"
import { loadCompanySettings } from "@/lib/company-settings"
import {
  computeBalance as computeCustomerBalance,
  CUSTOMERS_STORAGE_KEY,
  parsePersistedCustomers,
  type CustomerRow,
} from "@/lib/customers"
import { loadDocumentDisplaySettings } from "@/lib/document-display-settings"
import { resolveActiveTemplateForPdf } from "@/lib/invoice-templates"
import { buildInvoicePdfHtml, resolveLogoSrc } from "@/lib/invoice-pdf-html"
import { printHtmlDocument } from "@/lib/print-document"
import type { OrderRow } from "@/lib/orders"
import { cn } from "@/lib/utils"

type InvoicePdfButtonProps = {
  order: OrderRow
  variant?: "default" | "outline" | "ghost"
  size?: "default" | "sm" | "icon"
  className?: string
  label?: string
  showIcon?: boolean
}

function lookupCustomerBalance(customerName: string): string | undefined {
  if (typeof window === "undefined") return undefined
  const customers: CustomerRow[] = []
  for (let i = 0; i < window.localStorage.length; i += 1) {
    const key = window.localStorage.key(i)
    if (!key?.startsWith(CUSTOMERS_STORAGE_KEY)) continue
    const parsed = parsePersistedCustomers(window.localStorage.getItem(key))
    if (parsed?.length) customers.push(...parsed)
  }
  const match = customers.find(
    (customer) =>
      customer.name.trim().toLowerCase() === customerName.trim().toLowerCase()
  )
  return match ? computeCustomerBalance(match) : undefined
}

export async function downloadInvoicePdf(order: OrderRow) {
  const company = loadCompanySettings()
  const { templateId, colors, builder } = resolveActiveTemplateForPdf()
  const display = loadDocumentDisplaySettings().invoice
  const customerBalance = lookupCustomerBalance(order.customerName)
  const html = buildInvoicePdfHtml(
    order,
    company,
    resolveLogoSrc(company),
    templateId,
    undefined,
    colors,
    builder,
    { display, customerBalance }
  )
  printHtmlDocument(html)
}

export function InvoicePdfButton({
  order,
  variant = "outline",
  size = "default",
  className,
  label,
  showIcon = true,
}: InvoicePdfButtonProps) {
  const { t } = useTranslation("documents")
  const [loading, setLoading] = useState(false)
  const buttonLabel = label ?? t("downloadPdf")

  const handleClick = async () => {
    setLoading(true)
    try {
      await downloadInvoicePdf(order)
    } catch {
      toast.error(t("toasts.pdfFailed"))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      className={cn(className)}
      disabled={loading}
      onClick={handleClick}
    >
      {loading ? (
        <LoadingSpinner size="sm" />
      ) : showIcon ? (
        <IconDownload className="size-4" />
      ) : null}
      {size !== "icon" ? buttonLabel : <span className="sr-only">{buttonLabel}</span>}
    </Button>
  )
}
