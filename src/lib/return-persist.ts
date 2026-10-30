import {
  apiCompleteReturn,
  apiCreateReturn,
  type ApiReturn,
  type ApiReturnCreateInput,
} from "@/lib/api/business"
import type { ReturnRow } from "@/lib/returns"

export function returnToCreateInput(
  draft: Pick<
    ReturnRow,
    | "type"
    | "referenceNumber"
    | "partyName"
    | "returnDate"
    | "description"
    | "refundedAmount"
    | "lines"
  >,
  sourceApiId: string,
  productIdBySourceLineId?: Record<number, string>
): ApiReturnCreateInput {
  return {
    type: draft.type === "purchase" ? "PURCHASE" : "SALES",
    sourceId: sourceApiId,
    referenceNumber: draft.referenceNumber || undefined,
    partyName: draft.partyName === "—" ? "" : draft.partyName,
    returnDate: draft.returnDate,
    description: draft.description === "—" ? "" : draft.description,
    refundedAmount: Number(draft.refundedAmount) || 0,
    lines: draft.lines
      .filter((line) => line.productName.trim() && line.quantity > 0)
      .map((line) => ({
        productId: productIdBySourceLineId?.[line.sourceLineId]?.trim() || null,
        productName: line.productName.trim(),
        quantity: line.quantity,
        unitPrice: Number(line.unitPrice) || 0,
      })),
  }
}

/** Create a return and mark it completed (restocks via API). */
export async function persistCompletedReturn(
  draft: Parameters<typeof returnToCreateInput>[0],
  sourceApiId: string,
  productIdBySourceLineId?: Record<number, string>
): Promise<ApiReturn> {
  const created = await apiCreateReturn(
    returnToCreateInput(draft, sourceApiId, productIdBySourceLineId)
  )
  return apiCompleteReturn(created.id)
}
