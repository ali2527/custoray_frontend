import {
  apiCreateOrder,
  apiDeleteOrder,
  apiUpdateOrder,
  type ApiOrder,
  type ApiOrderCreateInput,
  type ApiOrderLineWrite,
  type ApiOrderPatchInput,
} from "@/lib/api/business"
import type { OrderLineRow, OrderRow } from "@/lib/orders"
import { resolveDefaultStoreId } from "@/lib/pos-api"

export function orderLinesToApiWrite(lines: OrderLineRow[]): ApiOrderLineWrite[] {
  return lines
    .filter((line) => line.productName.trim())
    .map((line) => {
      const unitPrice = Number(line.unitPrice) || 0
      const listRaw = line.listPrice != null ? Number(line.listPrice) : NaN
      return {
        productId: line.productApiId?.trim() || null,
        productName: line.productName.trim(),
        quantity: line.quantity,
        listPrice: Number.isFinite(listRaw) ? listRaw : unitPrice,
        unitPrice,
      }
    })
}

export function orderToCreateInput(
  order: Pick<
    OrderRow,
    | "customerName"
    | "description"
    | "orderDate"
    | "paidAmount"
    | "paymentMethod"
    | "status"
    | "lines"
  >,
  storeId: string,
  options?: { buyerId?: string | null; source?: ApiOrderCreateInput["source"] }
): ApiOrderCreateInput {
  return {
    storeId,
    buyerId: options?.buyerId ?? null,
    buyerName: order.customerName.trim(),
    description: order.description === "—" ? "" : order.description,
    orderDate: order.orderDate,
    paidAmount: Number(order.paidAmount) || 0,
    paymentMethod: order.paymentMethod,
    status: order.status,
    source: options?.source ?? "MANUAL",
    lines: orderLinesToApiWrite(order.lines),
  }
}

export function orderToPatchInput(
  order: Pick<
    OrderRow,
    | "customerName"
    | "description"
    | "orderDate"
    | "paidAmount"
    | "paymentMethod"
    | "status"
    | "lines"
  >,
  options?: { buyerId?: string | null; includeLines?: boolean }
): ApiOrderPatchInput {
  return {
    buyerId: options?.buyerId ?? null,
    buyerName: order.customerName.trim(),
    description: order.description === "—" ? "" : order.description,
    orderDate: order.orderDate,
    paidAmount: Number(order.paidAmount) || 0,
    paymentMethod: order.paymentMethod,
    status: order.status,
    ...(options?.includeLines === false
      ? {}
      : { lines: orderLinesToApiWrite(order.lines) }),
  }
}

export async function persistCreateOrder(
  order: Parameters<typeof orderToCreateInput>[0],
  options?: { buyerId?: string | null; storeId?: string }
): Promise<ApiOrder> {
  const storeId = options?.storeId ?? (await resolveDefaultStoreId())
  return apiCreateOrder(orderToCreateInput(order, storeId, { buyerId: options?.buyerId }))
}

export async function persistUpdateOrder(
  apiId: string,
  order: Parameters<typeof orderToPatchInput>[0],
  options?: { buyerId?: string | null; includeLines?: boolean }
): Promise<ApiOrder> {
  return apiUpdateOrder(apiId, orderToPatchInput(order, options))
}

export async function persistCancelOrder(apiId: string): Promise<ApiOrder> {
  return apiUpdateOrder(apiId, { status: "cancelled" })
}

export async function persistDeleteOrder(order: Pick<OrderRow, "apiId" | "status">) {
  const apiId = order.apiId?.trim()
  if (!apiId) return
  await apiDeleteOrder(apiId)
}

export async function persistDuplicateOrder(order: OrderRow): Promise<ApiOrder> {
  const storeId = await resolveDefaultStoreId()
  return apiCreateOrder(
    orderToCreateInput(
      {
        ...order,
        paidAmount: "0",
        status: "pending",
      },
      storeId
    )
  )
}
