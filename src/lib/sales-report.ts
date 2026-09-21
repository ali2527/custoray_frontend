import { z } from "zod"

import { formatMoney, parseMoney } from "@/lib/customers"
import {
  formatDate,
  statusBadgeClass,
  statusLabel,
  type OrderRow,
} from "@/lib/orders"

export { formatMoney, formatDate, statusBadgeClass, statusLabel }

export const saleLineSchema = z.object({
  id: z.string(),
  orderId: z.number(),
  lineId: z.number(),
  invoiceNumber: z.string(),
  customerName: z.string(),
  orderDate: z.string(),
  productName: z.string(),
  quantity: z.number(),
  unitPrice: z.string(),
  lineTotal: z.string(),
  orderStatus: z.enum(["pending", "completed", "cancelled"]),
  paymentMethod: z.enum(["Cash", "Bank transfer", "Card", "Credit"]),
})

export type SaleLineRow = z.infer<typeof saleLineSchema>

export function flattenSaleLineForExport(
  line: SaleLineRow
): Record<string, unknown> {
  return {
    invoiceNumber: line.invoiceNumber,
    customerName: line.customerName,
    orderDate: line.orderDate,
    productName: line.productName,
    quantity: line.quantity,
    unitPrice: line.unitPrice,
    paidAmount: "",
    paymentMethod: line.paymentMethod,
    status: line.orderStatus,
    description: "",
  }
}

export function flattenOrdersToSaleLines(orders: OrderRow[]): SaleLineRow[] {
  const lines: SaleLineRow[] = []

  for (const order of orders) {
    for (const line of order.lines) {
      lines.push({
        id: `${order.id}-${line.id}`,
        orderId: order.id,
        lineId: line.id,
        invoiceNumber: order.invoiceNumber,
        customerName: order.customerName,
        orderDate: order.orderDate,
        productName: line.productName,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        lineTotal: line.lineTotal,
        orderStatus: order.status,
        paymentMethod: order.paymentMethod,
      })
    }
  }

  return lines.sort((a, b) => {
    const dateCmp = b.orderDate.localeCompare(a.orderDate)
    if (dateCmp !== 0) return dateCmp
    return b.orderId - a.orderId
  })
}

export function mapImportedSaleLine(
  row: Record<string, string>,
): SaleLineRow | null {
  const productName = (row.productName ?? row.product ?? row.product_name ?? "").trim()
  const invoiceNumber = (
    row.invoiceNumber ??
    row.invoice_number ??
    row.invoice ??
    row.saleNumber ??
    ""
  ).trim()
  if (!productName && !invoiceNumber) return null

  const orderId = Number(row.orderId ?? row.order_id) || 0
  const lineId = Number(row.lineId ?? row.line_id) || 1

  return {
    id: `${orderId || "imp"}-${lineId}-${productName.slice(0, 8)}`,
    orderId,
    lineId,
    invoiceNumber: invoiceNumber || "—",
    customerName: (row.customerName ?? row.customer ?? "").trim() || "—",
    orderDate:
      (row.orderDate ?? row.order_date ?? row.saleDate ?? row.date ?? "").trim() ||
      new Date().toISOString().slice(0, 10),
    productName: productName || "—",
    quantity: Number(row.quantity ?? row.qty) || 1,
    unitPrice: parseMoney(String(row.unitPrice ?? row.unit_price ?? row.rate ?? "0")),
    lineTotal: parseMoney(String(row.lineTotal ?? row.line_total ?? row.amount ?? "0")),
    orderStatus: "pending",
    paymentMethod: "Cash",
  }
}
