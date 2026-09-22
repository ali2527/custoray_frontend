import type { ApiOrder, ApiReturn } from "@/lib/api/business"
import {
  PAYMENT_METHODS,
  type OrderLineRow,
  type OrderRow,
} from "@/lib/orders"
import { POS_ORDER_DESCRIPTION } from "@/lib/pos"
import type { ReturnLineRow, ReturnRow } from "@/lib/returns"

/** Stable positive int from a cuid/string id for local UI keys. */
export function stableNumericId(value: string): number {
  let hash = 2166136261
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  const n = hash >>> 0
  return n === 0 ? 1 : n
}

function money(value: string | number | null | undefined): string {
  const n = Number(value ?? 0)
  return (Number.isFinite(n) ? n : 0).toFixed(2)
}

function dateOnly(value: string | Date | null | undefined): string {
  if (!value) return new Date().toISOString().slice(0, 10)
  const raw = typeof value === "string" ? value : value.toISOString()
  return raw.slice(0, 10)
}

function normalizePaymentMethod(value: string | null | undefined): OrderRow["paymentMethod"] {
  const trimmed = (value ?? "Cash").trim()
  const match = PAYMENT_METHODS.find(
    (method) => method.toLowerCase() === trimmed.toLowerCase()
  )
  return match ?? "Cash"
}

function normalizeStatus(
  value: string | null | undefined
): OrderRow["status"] {
  if (value === "pending" || value === "cancelled") return value
  return "completed"
}

export function mapApiOrderToRow(order: ApiOrder): OrderRow & { apiId: string } {
  const lines: OrderLineRow[] = (order.lines ?? [])
    .slice()
    .sort((a, b) => (a.lineNo ?? 0) - (b.lineNo ?? 0))
    .map((line, index) => ({
      id: index + 1,
      productName: line.productName,
      quantity: Number(line.quantity) || 0,
      unitPrice: money(line.unitPrice),
      lineTotal: money(line.lineTotal),
    }))

  const description =
    order.description?.trim() ||
    (order.source === "POS" ? POS_ORDER_DESCRIPTION : "")

  return {
    id: stableNumericId(order.id),
    apiId: order.id,
    invoiceNumber: order.invoiceNumber,
    customerName: order.buyerName?.trim() || "Walk-in",
    description,
    orderDate: dateOnly(order.orderDate),
    totalAmount: money(order.totalAmount),
    paidAmount: money(order.paidAmount),
    paymentMethod: normalizePaymentMethod(order.paymentMethod),
    status: normalizeStatus(order.status),
    lines: lines.length
      ? lines
      : [
          {
            id: 1,
            productName: "Item",
            quantity: 1,
            unitPrice: money(order.totalAmount),
            lineTotal: money(order.totalAmount),
          },
        ],
  }
}

export function mapApiReturnToRow(
  record: ApiReturn,
  options?: { sourceNumericId?: number }
): ReturnRow & { apiId: string; sourceApiId: string } {
  const lines: ReturnLineRow[] = (record.lines ?? [])
    .slice()
    .sort((a, b) => (a.lineNo ?? 0) - (b.lineNo ?? 0))
    .map((line, index) => ({
      id: index + 1,
      sourceLineId: index + 1,
      productName: line.productName,
      quantity: Number(line.quantity) || 0,
      maxQuantity: Number(line.quantity) || 0,
      unitPrice: money(line.unitPrice),
      lineTotal: money(line.lineTotal),
    }))

  const sourceApiId = record.sourceId === "WALK_IN" ? "" : record.sourceId
  const sourceId =
    options?.sourceNumericId ??
    (sourceApiId ? stableNumericId(sourceApiId) : 0)

  return {
    id: stableNumericId(record.id),
    apiId: record.id,
    sourceApiId,
    returnNumber: record.returnNumber,
    type: record.type === "PURCHASE" ? "purchase" : "sales",
    sourceId,
    referenceNumber: record.referenceNumber ?? "",
    partyName: record.partyName?.trim() || "Walk-in",
    returnDate: dateOnly(record.returnDate),
    description: record.description ?? "",
    totalAmount: money(record.totalAmount),
    refundedAmount: money(record.refundedAmount),
    sourcePaidAmount: "0.00",
    sourceTotalBefore: money(record.sourceTotalBefore),
    sourceTotalAfter: money(record.sourceTotalAfter),
    refundDue: money(record.refundDue),
    balanceDue: money(record.balanceDue),
    status: normalizeStatus(record.status),
    lines: lines.length
      ? lines
      : [
          {
            id: 1,
            sourceLineId: 1,
            productName: "Item",
            quantity: 1,
            maxQuantity: 1,
            unitPrice: money(record.totalAmount),
            lineTotal: money(record.totalAmount),
          },
        ],
  }
}

export async function resolveDefaultStoreId(): Promise<string> {
  const { apiListStores } = await import("@/lib/api/business")
  const stores = await apiListStores()
  if (!stores.length) {
    throw new Error("No store found. Create a store before using POS.")
  }
  const preferred =
    stores.find((store) => store.isDefault) ?? stores[0]
  return preferred.id
}
