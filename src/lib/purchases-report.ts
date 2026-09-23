import { z } from "zod"

import { formatMoney, parseMoney } from "@/lib/customers"
import {
  formatDate,
  statusBadgeClass,
  statusLabel,
  type PurchaseRow,
} from "@/lib/purchases"

export { formatMoney, formatDate, statusBadgeClass, statusLabel }

export const purchaseLineReportSchema = z.object({
  id: z.string(),
  purchaseId: z.number(),
  lineId: z.number(),
  purchaseNumber: z.string(),
  vendorName: z.string(),
  purchaseDate: z.string(),
  productName: z.string(),
  quantity: z.number(),
  unitPrice: z.string(),
  lineTotal: z.string(),
  purchaseStatus: z.enum(["pending", "completed", "cancelled"]),
})

export type PurchaseLineReportRow = z.infer<typeof purchaseLineReportSchema>

export function flattenPurchasesToLines(
  purchases: PurchaseRow[]
): PurchaseLineReportRow[] {
  const lines: PurchaseLineReportRow[] = []

  for (const purchase of purchases) {
    for (const line of purchase.lines ?? []) {
      lines.push({
        id: `${purchase.id}-${line.id}`,
        purchaseId: purchase.id,
        lineId: line.id,
        purchaseNumber: purchase.purchaseNumber,
        vendorName: purchase.vendorName,
        purchaseDate: purchase.purchaseDate,
        productName: line.productName,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        lineTotal: line.lineTotal,
        purchaseStatus: purchase.status ?? "pending",
      })
    }
  }

  return lines.sort((a, b) => {
    const dateCmp = b.purchaseDate.localeCompare(a.purchaseDate)
    if (dateCmp !== 0) return dateCmp
    return b.purchaseId - a.purchaseId
  })
}

export function flattenPurchaseLineForExport(
  line: PurchaseLineReportRow
): Record<string, unknown> {
  return {
    purchaseNumber: line.purchaseNumber,
    vendorName: line.vendorName,
    purchaseDate: line.purchaseDate,
    productName: line.productName,
    quantity: line.quantity,
    unitPrice: line.unitPrice,
    paidAmount: "",
    status: line.purchaseStatus,
    description: "",
  }
}

export function mapImportedPurchaseLine(
  row: Record<string, string>,
): PurchaseLineReportRow | null {
  const productName = (row.productName ?? row.product ?? row.product_name ?? "").trim()
  const purchaseNumber = (
    row.purchaseNumber ??
    row.purchase_number ??
    row.po ??
    ""
  ).trim()
  if (!productName && !purchaseNumber) return null

  const purchaseId = Number(row.purchaseId ?? row.purchase_id) || 0
  const lineId = Number(row.lineId ?? row.line_id) || 1

  return {
    id: `${purchaseId || "imp"}-${lineId}-${productName.slice(0, 8)}`,
    purchaseId,
    lineId,
    purchaseNumber: purchaseNumber || "—",
    vendorName: (row.vendorName ?? row.vendor ?? "").trim() || "—",
    purchaseDate:
      (row.purchaseDate ?? row.purchase_date ?? row.date ?? "").trim() ||
      new Date().toISOString().slice(0, 10),
    productName: productName || "—",
    quantity: Number(row.quantity ?? row.qty) || 1,
    unitPrice: parseMoney(String(row.unitPrice ?? row.unit_price ?? row.rate ?? "0")),
    lineTotal: parseMoney(String(row.lineTotal ?? row.line_total ?? row.amount ?? "0")),
    purchaseStatus: "pending",
  }
}
