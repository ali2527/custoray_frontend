import { z } from "zod"

import { formatDate, formatMoney, type ReturnRow } from "@/lib/returns"

export { formatMoney, formatDate }

export const returnLineReportSchema = z.object({
  id: z.string(),
  returnId: z.number(),
  lineId: z.number(),
  returnNumber: z.string(),
  type: z.enum(["sales", "purchase"]),
  referenceNumber: z.string(),
  partyName: z.string(),
  returnDate: z.string(),
  productName: z.string(),
  quantity: z.number(),
  unitPrice: z.string(),
  lineTotal: z.string(),
  refundDue: z.string(),
  balanceDue: z.string(),
  returnStatus: z.enum(["pending", "completed", "cancelled"]),
})

export type ReturnLineReportRow = z.infer<typeof returnLineReportSchema>

export function flattenReturnsToLines(returns: ReturnRow[]): ReturnLineReportRow[] {
  const lines: ReturnLineReportRow[] = []

  for (const row of returns) {
    for (const line of row.lines ?? []) {
      lines.push({
        id: `${row.id}-${line.id}`,
        returnId: row.id,
        lineId: line.id,
        returnNumber: row.returnNumber,
        type: row.type,
        referenceNumber: row.referenceNumber,
        partyName: row.partyName,
        returnDate: row.returnDate,
        productName: line.productName,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        lineTotal: line.lineTotal,
        refundDue: row.refundDue,
        balanceDue: row.balanceDue,
        returnStatus: row.status,
      })
    }
  }

  return lines.sort((a, b) => {
    const dateCmp = b.returnDate.localeCompare(a.returnDate)
    if (dateCmp !== 0) return dateCmp
    return b.returnId - a.returnId
  })
}

export function flattenReturnLineForExport(
  line: ReturnLineReportRow
): Record<string, unknown> {
  return {
    returnNumber: line.returnNumber,
    type: line.type,
    referenceNumber: line.referenceNumber,
    partyName: line.partyName,
    returnDate: line.returnDate,
    productName: line.productName,
    quantity: line.quantity,
    unitPrice: line.unitPrice,
    status: line.returnStatus,
    description: "",
  }
}
