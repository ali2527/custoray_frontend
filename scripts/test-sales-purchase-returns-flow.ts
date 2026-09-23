import assert from "node:assert/strict"

import {
  buildSampleCsv,
  parseCsv,
  rowsToCsv,
} from "../src/lib/csv"
import {
  flattenOrderForExport,
  importOrdersFromRows,
  mapImportedOrder,
  ORDER_IMPORT_COLUMNS,
  ORDER_IMPORT_SAMPLE_ROW,
  parseStatus,
  type OrderRow,
} from "../src/lib/orders"
import {
  flattenPurchaseLineForExport,
  flattenPurchasesToLines,
} from "../src/lib/purchases-report"
import {
  flattenPurchaseForExport,
  importPurchasesFromRows,
  PURCHASE_IMPORT_COLUMNS,
  PURCHASE_IMPORT_SAMPLE_ROW,
  type PurchaseRow,
} from "../src/lib/purchases"
import {
  flattenReturnLineForExport,
  flattenReturnsToLines,
} from "../src/lib/returns-report"
import {
  flattenReturnForExport,
  importReturnsFromRows,
  parseReturnStatus,
  parseReturnType,
  RETURN_IMPORT_COLUMNS,
  RETURN_IMPORT_SAMPLE_ROW,
  type ReturnRow,
} from "../src/lib/returns"
import {
  flattenOrdersToSaleLines,
  flattenSaleLineForExport,
} from "../src/lib/sales-report"

let passed = 0
let failed = 0

function test(name: string, fn: () => void) {
  try {
    fn()
    passed += 1
    console.log(`  ok  ${name}`)
  } catch (error) {
    failed += 1
    const message = error instanceof Error ? error.message : String(error)
    console.error(`  FAIL  ${name}`)
    console.error(`        ${message}`)
  }
}

function salesBillTabFilter(row: OrderRow, tab: string) {
  if (tab === "all") return true
  return row.status === tab
}

function purchaseTabFilter(row: PurchaseRow, tab: string) {
  if (tab === "all") return true
  return row.status === tab
}

function returnBillTabFilter(row: ReturnRow, tab: string) {
  if (tab === "all") return true
  if (tab === "sales" || tab === "purchase") return row.type === tab
  return row.status === tab
}

function returnLineTabFilter(
  row: { type: ReturnRow["type"]; returnStatus: ReturnRow["status"] },
  tab: string
) {
  if (tab === "all") return true
  if (tab === "sales" || tab === "purchase") return row.type === tab
  if (tab === "pending" || tab === "completed") return row.returnStatus === tab
  return true
}

const existingOrder: OrderRow = {
  id: 1,
  invoiceNumber: "INV-1001",
  customerName: "Acme Retail Co.",
  description: "Existing",
  orderDate: "2026-07-08",
  totalAmount: "100.00",
  paidAmount: "100.00",
  paymentMethod: "Cash",
  status: "completed",
  lines: [
    {
      id: 1,
      productName: "Rice",
      quantity: 1,
      unitPrice: "100.00",
      lineTotal: "100.00",
    },
  ],
}

const pendingOrder: OrderRow = {
  ...existingOrder,
  id: 2,
  invoiceNumber: "INV-1002",
  customerName: "Northwind",
  status: "pending",
  paidAmount: "0.00",
  totalAmount: "50.00",
}

const cancelledOrder: OrderRow = {
  ...existingOrder,
  id: 3,
  invoiceNumber: "INV-1003",
  customerName: "Contoso",
  status: "cancelled",
}

console.log("\nSales / purchases / returns flow tests\n")

console.log("Sales tab filters")
test("sales tabs isolate pending, completed, and cancelled bills", () => {
  const rows = [existingOrder, pendingOrder, cancelledOrder]
  assert.equal(rows.filter((row) => salesBillTabFilter(row, "all")).length, 3)
  assert.deepEqual(
    rows.filter((row) => salesBillTabFilter(row, "pending")).map((row) => row.invoiceNumber),
    ["INV-1002"]
  )
  assert.deepEqual(
    rows.filter((row) => salesBillTabFilter(row, "completed")).map((row) => row.invoiceNumber),
    ["INV-1001"]
  )
  assert.deepEqual(
    rows.filter((row) => salesBillTabFilter(row, "cancelled")).map((row) => row.invoiceNumber),
    ["INV-1003"]
  )
})
test("item view status tabs follow the parent invoice", () => {
  const lines = flattenOrdersToSaleLines([existingOrder, pendingOrder])
  assert.equal(lines.filter((row) => row.orderStatus === "pending").length, 1)
  assert.equal(lines.filter((row) => row.orderStatus === "completed").length, 1)
})

console.log("\nSales import / export")
test("sample csv round-trips through parse and import", () => {
  const csv = buildSampleCsv([...ORDER_IMPORT_COLUMNS], ORDER_IMPORT_SAMPLE_ROW)
  const parsed = parseCsv(csv)
  const created = importOrdersFromRows(parsed, [])
  assert.equal(created.length, 1)
  assert.equal(created[0]?.customerName, "Acme Retail Co.")
  assert.equal(created[0]?.lines[0]?.productName, "Premium Basmati Rice 25kg")
  assert.equal(created[0]?.status, "completed")
})
test("csv rows with the same invoice number become one bill with multiple lines", () => {
  const created = importOrdersFromRows(
    [
      {
        invoiceNumber: "INV-9001",
        customerName: "Beta Co",
        productName: "Item A",
        quantity: "2",
        unitPrice: "10.00",
        paidAmount: "30.00",
        status: "pending",
      },
      {
        invoiceNumber: "INV-9001",
        customerName: "Beta Co",
        productName: "Item B",
        quantity: "1",
        unitPrice: "10.00",
        status: "pending",
      },
    ],
    [existingOrder]
  )
  assert.equal(created.length, 1)
  assert.equal(created[0]?.lines.length, 2)
  assert.equal(created[0]?.totalAmount, "30.00")
  assert.equal(created[0]?.id, 2)
})
test("importing an existing invoice number assigns a new number instead of colliding", () => {
  const created = importOrdersFromRows(
    [
      {
        invoiceNumber: "INV-1001",
        customerName: "Collision",
        productName: "New line",
        quantity: "1",
        unitPrice: "5.00",
        status: "completed",
      },
    ],
    [existingOrder]
  )
  assert.equal(created.length, 1)
  assert.notEqual(created[0]?.invoiceNumber, "INV-1001")
  assert.equal(created[0]?.id, 2)
})
test("blank rows without customer or invoice are skipped", () => {
  assert.equal(mapImportedOrder({ productName: "Orphan" }, []), null)
  assert.equal(importOrdersFromRows([{ productName: "Orphan" }], []).length, 0)
})
test("on-hold status maps to pending", () => {
  assert.equal(parseStatus("on hold"), "pending")
  assert.equal(parseStatus("ON-HOLD"), "pending")
})
test("export flattens bills to the import column set and round-trips", () => {
  const created = importOrdersFromRows(
    [
      {
        invoiceNumber: "INV-9002",
        customerName: "Export Co",
        productName: "A",
        quantity: "1",
        unitPrice: "8.00",
        status: "completed",
      },
      {
        invoiceNumber: "INV-9002",
        customerName: "Export Co",
        productName: "B",
        quantity: "2",
        unitPrice: "4.00",
        status: "completed",
      },
    ],
    []
  )
  const exported = flattenOrderForExport(created[0]!)
  assert.equal(exported.length, 2)
  for (const key of ORDER_IMPORT_COLUMNS) {
    assert.ok(key in exported[0]!, `missing export column ${key}`)
  }
  const csv = rowsToCsv(exported)
  const reimported = importOrdersFromRows(parseCsv(csv), created)
  assert.equal(reimported.length, 1)
  assert.equal(reimported[0]?.lines.length, 2)
})
test("item export uses the same import columns as bills", () => {
  const lines = flattenOrdersToSaleLines([existingOrder])
  const exported = flattenSaleLineForExport(lines[0]!)
  for (const key of ORDER_IMPORT_COLUMNS) {
    assert.ok(key in exported, `missing item export column ${key}`)
  }
  assert.equal(exported.status, "completed")
})

console.log("\nPurchase tab filters and import / export")
test("purchase tabs isolate status", () => {
  const rows: PurchaseRow[] = [
    {
      id: 1,
      purchaseNumber: "PO-1",
      vendorName: "Steel",
      description: "A",
      purchaseDate: "2026-06-01",
      totalAmount: "10.00",
      paidAmount: "10.00",
      status: "completed",
      lines: [
        {
          id: 1,
          productName: "Rod",
          quantity: 1,
          unitPrice: "10.00",
          lineTotal: "10.00",
        },
      ],
    },
    {
      id: 2,
      purchaseNumber: "PO-2",
      vendorName: "Wood",
      description: "B",
      purchaseDate: "2026-06-02",
      totalAmount: "20.00",
      paidAmount: "0.00",
      status: "pending",
      lines: [
        {
          id: 1,
          productName: "Plank",
          quantity: 2,
          unitPrice: "10.00",
          lineTotal: "20.00",
        },
      ],
    },
  ]
  assert.equal(rows.filter((row) => purchaseTabFilter(row, "pending")).length, 1)
  assert.equal(flattenPurchasesToLines(rows).length, 2)
})
test("purchase sample csv imports and groups lines", () => {
  const csv = buildSampleCsv([...PURCHASE_IMPORT_COLUMNS], PURCHASE_IMPORT_SAMPLE_ROW)
  const created = importPurchasesFromRows(parseCsv(csv), [])
  assert.equal(created.length, 1)
  assert.equal(created[0]?.vendorName, "Karachi Steel Supplies")
  const grouped = importPurchasesFromRows(
    [
      {
        purchaseNumber: "PO-9001",
        vendorName: "Steel Co",
        productName: "Rod",
        quantity: "3",
        unitPrice: "100.00",
        status: "pending",
      },
      {
        purchaseNumber: "PO-9001",
        vendorName: "Steel Co",
        productName: "Sheet",
        quantity: "1",
        unitPrice: "50.00",
        status: "pending",
      },
    ],
    created
  )
  assert.equal(grouped.length, 1)
  assert.equal(grouped[0]?.lines.length, 2)
  assert.equal(grouped[0]?.totalAmount, "350.00")
  const exported = flattenPurchaseForExport(grouped[0]!)
  assert.equal(exported.length, 2)
  const lineExport = flattenPurchaseLineForExport(
    flattenPurchasesToLines(grouped)[0]!
  )
  for (const key of PURCHASE_IMPORT_COLUMNS) {
    assert.ok(key in lineExport, `missing purchase line export column ${key}`)
  }
})

console.log("\nReturns tab filters and import / export")
test("return tabs filter by type and status", () => {
  const rows: ReturnRow[] = [
    {
      id: 1,
      returnNumber: "SR-1",
      type: "sales",
      sourceId: 1,
      referenceNumber: "INV-1001",
      partyName: "Acme",
      returnDate: "2026-09-01",
      description: "A",
      totalAmount: "10.00",
      refundedAmount: "0.00",
      sourcePaidAmount: "10.00",
      sourceTotalBefore: "10.00",
      sourceTotalAfter: "0.00",
      refundDue: "10.00",
      balanceDue: "0.00",
      status: "pending",
      lines: [
        {
          id: 1,
          sourceLineId: 1,
          productName: "Rice",
          quantity: 1,
          maxQuantity: 1,
          unitPrice: "10.00",
          lineTotal: "10.00",
        },
      ],
    },
    {
      id: 2,
      returnNumber: "PR-1",
      type: "purchase",
      sourceId: 1,
      referenceNumber: "PO-1",
      partyName: "Steel",
      returnDate: "2026-09-02",
      description: "B",
      totalAmount: "20.00",
      refundedAmount: "20.00",
      sourcePaidAmount: "20.00",
      sourceTotalBefore: "20.00",
      sourceTotalAfter: "0.00",
      refundDue: "0.00",
      balanceDue: "0.00",
      status: "completed",
      lines: [
        {
          id: 1,
          sourceLineId: 1,
          productName: "Rod",
          quantity: 1,
          maxQuantity: 1,
          unitPrice: "20.00",
          lineTotal: "20.00",
        },
      ],
    },
  ]
  assert.equal(rows.filter((row) => returnBillTabFilter(row, "sales")).length, 1)
  assert.equal(rows.filter((row) => returnBillTabFilter(row, "purchase")).length, 1)
  assert.equal(rows.filter((row) => returnBillTabFilter(row, "pending")).length, 1)
  const lines = flattenReturnsToLines(rows)
  assert.equal(lines.filter((row) => returnLineTabFilter(row, "completed")).length, 1)
})
test("return sample csv imports and export matches import columns", () => {
  const csv = buildSampleCsv([...RETURN_IMPORT_COLUMNS], RETURN_IMPORT_SAMPLE_ROW)
  const created = importReturnsFromRows(parseCsv(csv), [])
  assert.equal(created.length, 1)
  assert.equal(created[0]?.type, "sales")
  assert.equal(created[0]?.partyName, "Contoso Foods")
  const grouped = importReturnsFromRows(
    [
      {
        returnNumber: "SR-9001",
        type: "sales",
        partyName: "Acme",
        referenceNumber: "INV-1001",
        productName: "Rice",
        quantity: "1",
        unitPrice: "20.00",
        status: "pending",
      },
      {
        returnNumber: "SR-9001",
        type: "sales",
        partyName: "Acme",
        referenceNumber: "INV-1001",
        productName: "Oil",
        quantity: "2",
        unitPrice: "5.00",
        status: "pending",
      },
    ],
    created
  )
  assert.equal(grouped.length, 1)
  assert.equal(grouped[0]?.lines.length, 2)
  const exported = flattenReturnForExport(grouped[0]!)
  assert.equal(exported.length, 2)
  const lineExport = flattenReturnLineForExport(flattenReturnsToLines(grouped)[0]!)
  for (const key of RETURN_IMPORT_COLUMNS) {
    assert.ok(key in lineExport, `missing return line export column ${key}`)
  }
})
test("return type and status parsers accept aliases", () => {
  assert.equal(parseReturnType("vendor"), "purchase")
  assert.equal(parseReturnType("SALES"), "sales")
  assert.equal(parseReturnStatus("canceled"), "cancelled")
  assert.equal(parseReturnStatus("completed"), "completed")
})

console.log(`\n${passed} passed, ${failed} failed`)
if (failed > 0) process.exit(1)
