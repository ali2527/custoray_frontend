import { parseMoney, type VendorRow } from "@/lib/vendors"
import {
  computeBalance,
  computeLineTotal,
  nextPurchaseNumber,
  purchasesForVendor,
  type PurchaseRow,
} from "@/lib/purchases"
import {
  nextReturnNumber,
  returnsForVendor,
  type ReturnRow,
} from "@/lib/returns"
import {
  parseImportedTimelineDate,
  parseImportedTimelineKind,
  parseImportedTimelineStatus,
  type CustomerTimelineRow,
} from "@/lib/customer-timeline"

export const VENDOR_TIMELINE_IMPORT_SAMPLE_ROW = {
  date: "2026-09-15",
  type: "purchase",
  number: "PO-3001",
  amount: "15000.00",
  status: "completed",
}

function blankText(value: string | undefined): string {
  const next = (value ?? "").trim()
  if (!next || next === "—") return ""
  return next
}

function itemSummary(lines: { productName: string }[], extra?: string): string {
  const names = lines
    .map((line) => line.productName.trim())
    .filter(Boolean)
    .slice(0, 2)
  return blankText(extra) || names.join(", ")
}

export function buildVendorTimelineRows(
  vendor: Pick<VendorRow, "name">,
  purchases: PurchaseRow[],
  returns: ReturnRow[]
): CustomerTimelineRow[] {
  const purchaseRows: CustomerTimelineRow[] = purchasesForVendor(
    purchases,
    vendor.name
  ).map((purchase) => ({
    id: `purchase-${purchase.id}`,
    kind: "purchase" as const,
    date: purchase.purchaseDate,
    number: purchase.purchaseNumber,
    amount: purchase.totalAmount,
    paid: purchase.paidAmount,
    balance: computeBalance(purchase),
    runningBalance: "0.00",
    details: itemSummary(purchase.lines, purchase.description),
    reference: "",
    status: purchase.status,
    purchase,
  }))
  const returnRows: CustomerTimelineRow[] = returnsForVendor(
    returns,
    vendor.name
  ).map((doc) => ({
    id: `return-${doc.id}`,
    kind: "return" as const,
    date: doc.returnDate,
    number: doc.returnNumber,
    amount: doc.totalAmount,
    paid: doc.refundedAmount,
    balance: "0.00",
    runningBalance: "0.00",
    details: itemSummary(doc.lines, doc.description),
    reference: blankText(doc.referenceNumber),
    status: doc.status,
    returnDoc: doc,
  }))

  const chronological = [...purchaseRows, ...returnRows].sort(
    (a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id)
  )
  let running = 0
  for (const row of chronological) {
    if (row.status !== "cancelled") {
      if (row.kind === "purchase") running += Number(row.balance) || 0
      else running -= Number(row.amount) || 0
    }
    row.runningBalance = running.toFixed(2)
  }
  return chronological.reverse()
}

type ImportedVendorTimelineEntry =
  | { kind: "purchase"; purchase: PurchaseRow }
  | { kind: "return"; returnDoc: ReturnRow }

export function mapImportedVendorTimelineEntry(
  row: Record<string, string>,
  vendorName: string,
  purchases: PurchaseRow[],
  returns: ReturnRow[]
): ImportedVendorTimelineEntry | null {
  const name = vendorName.trim()
  if (!name) return null

  const kindRaw = (row.type ?? row.kind ?? "").trim()
  const parsedKind = parseImportedTimelineKind(kindRaw)
  if (kindRaw && !parsedKind) return null
  const kind = parsedKind === "return" ? "return" : "purchase"

  const statusRaw = (row.status ?? "").trim()
  const parsedStatus = parseImportedTimelineStatus(statusRaw)
  if (statusRaw && !parsedStatus) return null
  const status = parsedStatus || "completed"

  const date = parseImportedTimelineDate(
    row.date ?? row.purchaseDate ?? row.returnDate
  )
  if (!date) return null

  const amountRaw = (row.amount ?? row.totalAmount ?? row.total ?? "").trim()
  if (!amountRaw) return null
  const amount = parseMoney(amountRaw)
  if (Number(amount) < 0) return null

  const number = (
    row.number ??
    row.purchaseNumber ??
    row.returnNumber ??
    ""
  ).trim()

  if (kind === "purchase") {
    const id = purchases.reduce((max, item) => Math.max(max, item.id), 0) + 1
    const paidAmount = status === "completed" ? amount : "0.00"
    return {
      kind,
      purchase: {
        id,
        purchaseNumber: number || nextPurchaseNumber(purchases),
        vendorName: name,
        description: (row.description ?? "").trim() || "Imported",
        purchaseDate: date,
        totalAmount: amount,
        paidAmount,
        status,
        lines: [
          {
            id: 1,
            productName: "Imported item",
            quantity: 1,
            unitPrice: amount,
            lineTotal: computeLineTotal(1, amount),
          },
        ],
      },
    }
  }

  const id = returns.reduce((max, item) => Math.max(max, item.id), 0) + 1
  const refundedAmount = status === "completed" ? amount : "0.00"
  return {
    kind,
    returnDoc: {
      id,
      returnNumber: number || nextReturnNumber(returns, "purchase"),
      type: "purchase",
      sourceId: 0,
      referenceNumber: (row.reference ?? row.referenceNumber ?? "").trim() || "—",
      partyName: name,
      returnDate: date,
      description: (row.description ?? "").trim() || "Imported",
      totalAmount: amount,
      refundedAmount,
      sourcePaidAmount: amount,
      sourceTotalBefore: amount,
      sourceTotalAfter: "0.00",
      refundDue: "0.00",
      balanceDue: "0.00",
      status,
      lines: [
        {
          id: 1,
          sourceLineId: 1,
          productName: "Imported item",
          quantity: 1,
          maxQuantity: 1,
          unitPrice: amount,
          lineTotal: computeLineTotal(1, amount),
        },
      ],
    },
  }
}

export function applyImportedVendorTimelineRows(
  rows: Record<string, string>[],
  vendorName: string,
  purchases: PurchaseRow[],
  returns: ReturnRow[]
): {
  purchases: PurchaseRow[]
  returns: ReturnRow[]
  added: number
  failed: number
} {
  let nextPurchases = [...purchases]
  let nextReturns = [...returns]
  let added = 0
  let failed = 0

  for (const row of rows) {
    const mapped = mapImportedVendorTimelineEntry(
      row,
      vendorName,
      nextPurchases,
      nextReturns
    )
    if (!mapped) {
      failed += 1
      continue
    }
    if (mapped.kind === "purchase") {
      nextPurchases = [...nextPurchases, mapped.purchase]
    } else {
      nextReturns = [...nextReturns, mapped.returnDoc]
    }
    added += 1
  }

  return { purchases: nextPurchases, returns: nextReturns, added, failed }
}
