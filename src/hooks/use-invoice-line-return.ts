"use client"

import * as React from "react"
import { useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { useAuth } from "@/context/auth-context"
import { useOrders } from "@/context/orders-context"
import { useReturns } from "@/context/returns-context"
import { confirmReturnLineAction } from "@/lib/confirm-action"
import { invalidateCustomers } from "@/lib/customers-query"
import { type OrderLineRow, type OrderRow } from "@/lib/orders"
import { mapApiReturnToRow } from "@/lib/pos-api"
import {
  canReturnDocument,
  isReturnableOrderLine,
} from "@/lib/return-eligibility"
import { persistCompletedReturn } from "@/lib/return-persist"
import { buildReturnFromOrder } from "@/lib/returns"

export function useInvoiceLineReturn() {
  const { session } = useAuth()
  const queryClient = useQueryClient()
  const { refreshOrders } = useOrders()
  const { addReturn, refreshReturns } = useReturns()
  const [returningLineId, setReturningLineId] = React.useState<number | null>(null)

  const returnInvoiceLine = React.useCallback(
    async (order: OrderRow, line: OrderLineRow) => {
      if (!canReturnDocument(order)) {
        toast.error("Only completed paid sales can be returned.")
        return false
      }
      if (!isReturnableOrderLine(line)) {
        toast.error("This line cannot be returned.")
        return false
      }
      const sourceApiId = order.apiId?.trim()
      if (!sourceApiId) {
        toast.error("This sale is not saved on the server yet.")
        return false
      }

      const quantity = await confirmReturnLineAction({
        itemName: line.productName,
        referenceNumber: order.invoiceNumber,
        unitPrice: line.unitPrice,
        maxQuantity: line.quantity,
      })
      if (!quantity) return false

      const draft = buildReturnFromOrder(order, {
        lineIds: [line.id],
        quantities: { [line.id]: quantity },
      })

      setReturningLineId(line.id)
      try {
        const productIdBySourceLineId: Record<number, string> = {}
        if (line.productApiId?.trim()) {
          productIdBySourceLineId[line.id] = line.productApiId.trim()
        }
        const apiReturn = await persistCompletedReturn(
          draft,
          sourceApiId,
          productIdBySourceLineId
        )
        addReturn(mapApiReturnToRow(apiReturn, { sourceNumericId: order.id }))
        await refreshOrders()
        await refreshReturns()
        invalidateCustomers(queryClient, session?.tenantId)
        toast.success(
          `Return ${apiReturn.returnNumber} recorded. Invoice ${order.invoiceNumber} updated.`
        )
        return true
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Could not record return."
        )
        return false
      } finally {
        setReturningLineId(null)
      }
    },
    [addReturn, queryClient, refreshOrders, refreshReturns, session?.tenantId]
  )

  return { returnInvoiceLine, returningLineId }
}
