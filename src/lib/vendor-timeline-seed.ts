import type { VendorRow } from "@/lib/vendors"
import {
  nextPurchaseNumber,
  purchasesForVendor,
  type PurchaseRow,
} from "@/lib/purchases"
import {
  nextReturnNumber,
  returnsForVendor,
  type ReturnRow,
} from "@/lib/returns"

export const VENDOR_TIMELINE_SEED_KEY = "custoray-vendor-timeline-seed-v1"

export function vendorTimelineSeedStorageKey(tenantId?: string | null) {
  return tenantId
    ? `${VENDOR_TIMELINE_SEED_KEY}:${tenantId}`
    : VENDOR_TIMELINE_SEED_KEY
}

function purchaseTemplates(name: string): Omit<PurchaseRow, "id" | "purchaseNumber">[] {
  return [
    {
      vendorName: name,
      description: "Opening stock — steel rods",
      purchaseDate: "2026-06-10",
      totalAmount: "14500.00",
      paidAmount: "14500.00",
      status: "completed",
      lines: [
        {
          id: 1,
          productName: "Steel Rod 12mm (bundle)",
          quantity: 10,
          unitPrice: "1450.00",
          lineTotal: "14500.00",
        },
      ],
    },
    {
      vendorName: name,
      description: "Mid-month packing restock",
      purchaseDate: "2026-06-24",
      totalAmount: "9600.00",
      paidAmount: "4000.00",
      status: "pending",
      lines: [
        {
          id: 1,
          productName: "Corrugated Carton Large",
          quantity: 200,
          unitPrice: "48.00",
          lineTotal: "9600.00",
        },
      ],
    },
    {
      vendorName: name,
      description: "Cooking oil pallet — paid in full",
      purchaseDate: "2026-07-09",
      totalAmount: "24800.00",
      paidAmount: "24800.00",
      status: "completed",
      lines: [
        {
          id: 1,
          productName: "Cooking Oil 5L",
          quantity: 20,
          unitPrice: "1240.00",
          lineTotal: "24800.00",
        },
      ],
    },
    {
      vendorName: name,
      description: "Cancelled — supplier shortage",
      purchaseDate: "2026-07-22",
      totalAmount: "3600.00",
      paidAmount: "0.00",
      status: "cancelled",
      lines: [
        {
          id: 1,
          productName: "White Sugar 10kg",
          quantity: 12,
          unitPrice: "300.00",
          lineTotal: "3600.00",
        },
      ],
    },
    {
      vendorName: name,
      description: "Seasonal rice shipment",
      purchaseDate: "2026-08-14",
      totalAmount: "18600.00",
      paidAmount: "8000.00",
      status: "pending",
      lines: [
        {
          id: 1,
          productName: "Premium Basmati Rice 25kg",
          quantity: 12,
          unitPrice: "1550.00",
          lineTotal: "18600.00",
        },
      ],
    },
    {
      vendorName: name,
      description: "Frozen chicken delivery",
      purchaseDate: "2026-09-05",
      totalAmount: "12400.00",
      paidAmount: "12400.00",
      status: "completed",
      lines: [
        {
          id: 1,
          productName: "Frozen Chicken 10kg",
          quantity: 10,
          unitPrice: "1240.00",
          lineTotal: "12400.00",
        },
      ],
    },
  ]
}

function returnTemplates(
  name: string,
  purchases: PurchaseRow[]
): Omit<ReturnRow, "id" | "returnNumber">[] {
  const oil = purchases.find((row) =>
    row.lines.some((line) => line.productName.includes("Cooking Oil"))
  )
  const chicken = purchases.find((row) =>
    row.lines.some((line) => line.productName.includes("Frozen Chicken"))
  )
  const rows: Omit<ReturnRow, "id" | "returnNumber">[] = []
  if (oil) {
    rows.push({
      type: "purchase",
      sourceId: oil.id,
      referenceNumber: oil.purchaseNumber,
      partyName: name,
      returnDate: "2026-07-18",
      description: "Leaking tins returned to supplier",
      totalAmount: "2480.00",
      refundedAmount: "2480.00",
      sourcePaidAmount: oil.paidAmount,
      sourceTotalBefore: oil.totalAmount,
      sourceTotalAfter: "22320.00",
      refundDue: "0.00",
      balanceDue: "0.00",
      status: "completed",
      lines: [
        {
          id: 1,
          sourceLineId: 1,
          productName: "Cooking Oil 5L",
          quantity: 2,
          maxQuantity: 20,
          unitPrice: "1240.00",
          lineTotal: "2480.00",
        },
      ],
    })
  }
  if (chicken) {
    rows.push({
      type: "purchase",
      sourceId: chicken.id,
      referenceNumber: chicken.purchaseNumber,
      partyName: name,
      returnDate: "2026-09-12",
      description: "Partial return — damaged carton",
      totalAmount: "2480.00",
      refundedAmount: "2480.00",
      sourcePaidAmount: chicken.paidAmount,
      sourceTotalBefore: chicken.totalAmount,
      sourceTotalAfter: "9920.00",
      refundDue: "0.00",
      balanceDue: "0.00",
      status: "completed",
      lines: [
        {
          id: 1,
          sourceLineId: 1,
          productName: "Frozen Chicken 10kg",
          quantity: 2,
          maxQuantity: 10,
          unitPrice: "1240.00",
          lineTotal: "2480.00",
        },
      ],
    })
  }
  return rows
}

function purchaseKey(row: Pick<PurchaseRow, "purchaseDate" | "totalAmount">) {
  return `${row.purchaseDate}|${row.totalAmount}`
}

function returnKey(row: Pick<ReturnRow, "returnDate" | "totalAmount">) {
  return `${row.returnDate}|${row.totalAmount}`
}

export function appendVendorTimelineSeed(
  vendors: Pick<VendorRow, "id" | "name">[],
  purchases: PurchaseRow[],
  returns: ReturnRow[]
): { purchases: PurchaseRow[]; returns: ReturnRow[]; added: boolean } {
  const nextPurchases = [...purchases]
  const nextReturns = [...returns]
  let purchaseId = nextPurchases.reduce((max, row) => Math.max(max, row.id), 0)
  let returnId = nextReturns.reduce((max, row) => Math.max(max, row.id), 0)
  let added = false

  for (const vendor of vendors) {
    const name = vendor.name.trim()
    if (!name) continue

    const existingPurchases = purchasesForVendor(nextPurchases, name)
    const existingPurchaseKeys = new Set(existingPurchases.map(purchaseKey))
    const missing = purchaseTemplates(name).filter(
      (template) => !existingPurchaseKeys.has(purchaseKey(template))
    )

    for (const template of missing) {
      purchaseId += 1
      nextPurchases.push({
        ...template,
        id: purchaseId,
        purchaseNumber: nextPurchaseNumber(nextPurchases),
      })
      added = true
    }

    const allForVendor = purchasesForVendor(nextPurchases, name)
    const existingReturnKeys = new Set(
      returnsForVendor(nextReturns, name).map(returnKey)
    )
    for (const template of returnTemplates(name, allForVendor)) {
      if (existingReturnKeys.has(returnKey(template))) continue
      returnId += 1
      nextReturns.push({
        ...template,
        id: returnId,
        returnNumber: nextReturnNumber(nextReturns, "purchase"),
      })
      added = true
    }
  }

  return { purchases: nextPurchases, returns: nextReturns, added }
}
