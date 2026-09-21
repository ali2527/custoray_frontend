import assert from "node:assert/strict"

import {
  customerTabFilter,
  filterCustomerRows,
  mapApiBuyerToRow,
  mapImportedCustomerWrite,
  parseImportedCustomerStatus,
  toApiCustomerWrite,
  type CustomerRow,
} from "../src/lib/customers"
import { customerKeys } from "../src/lib/customers-query"
import { appendCustomerTimelineSeed } from "../src/lib/customer-timeline-seed"
import {
  applyImportedTimelineRows,
  buildCustomerTimelineRows,
  filterTimelineRows,
  groupTimelineByMonth,
  parseImportedTimelineKind,
  parseImportedTimelineStatus,
  summarizeTimeline,
  filterTimelineExportRange,
  timelineExportRows,
} from "../src/lib/customer-timeline"
import {
  buildCustomerTimelineReportHtml,
  timelineReportEntries,
} from "../src/lib/customer-timeline-report"
import {
  buildCustomerTimelineWorkbookSheets,
  timelineExportJsonRecords,
  timelineExportLabeledRows,
  timelineStatementFilename,
} from "../src/lib/customer-timeline-export"
import { DEFAULT_COMPANY_SETTINGS } from "../src/lib/company-settings"

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

const active: CustomerRow = {
  id: 1,
  apiId: "c1",
  name: "Acme Retail",
  description: "Wholesale buyer",
  openingBalance: "100.00",
  totalSales: "50.00",
  totalPayments: "20.00",
  phone: "+92 300 1234567",
  status: "active",
  imageUrl: "",
}
const inactive: CustomerRow = {
  ...active,
  id: 2,
  apiId: "c2",
  name: "Northwind",
  status: "inactive",
}

console.log("\nCustomers flow tests\n")

console.log("Import / mapping")
test("import maps name phone opening balance and status", () => {
  const mapped = mapImportedCustomerWrite({
    name: "Sony Shop",
    description: "Retail",
    phone: "03001234567",
    openingBalance: "15.5",
    status: "inactive",
  })
  assert.deepEqual(mapped, {
    name: "Sony Shop",
    description: "Retail",
    phone: "03001234567",
    openingBalance: 15.5,
    status: "inactive",
  })
})
test("import rejects unmatched status so the row is not created", () => {
  const mapped = mapImportedCustomerWrite({
    name: "Orphan",
    status: "vip",
  })
  assert.equal(mapped, null)
})
test("empty status defaults to active", () => {
  const mapped = mapImportedCustomerWrite({ name: "Walk-in", status: "" })
  assert.equal(mapped?.status, "active")
})
test("on-hold status maps to inactive", () => {
  assert.equal(parseImportedCustomerStatus("on hold"), "inactive")
  assert.equal(parseImportedCustomerStatus("ON-HOLD"), "inactive")
})
test("customer status does not accept product archived lifecycle", () => {
  assert.equal(parseImportedCustomerStatus("archived"), "")
  assert.equal(
    mapImportedCustomerWrite({ name: "Old buyer", status: "archived" }),
    null
  )
})
test("api buyer maps legacy id and order totals", () => {
  const row = mapApiBuyerToRow(
    {
      id: "ckbuyer1",
      legacyId: 12,
      name: "Acme",
      phone: "111",
      description: "Notes",
      status: "active",
      openingBalance: "10.00",
      imageUrl: "",
      totalSales: "40.00",
      totalPayments: "15.00",
    },
    0
  )
  assert.equal(row.id, 12)
  assert.equal(row.apiId, "ckbuyer1")
  assert.equal(row.totalSales, "40.00")
  assert.equal(row.totalPayments, "15.00")
})
test("write payload omits computed totals", () => {
  const payload = toApiCustomerWrite(active)
  assert.deepEqual(payload, {
    name: "Acme Retail",
    phone: "+92 300 1234567",
    description: "Wholesale buyer",
    status: "active",
    openingBalance: 100,
    imageUrl: "",
  })
})

console.log("\nActive / inactive filters")
test("tabs isolate active and inactive rows", () => {
  const rows = [active, inactive]
  assert.equal(filterCustomerRows(rows, "all").length, 2)
  assert.deepEqual(
    filterCustomerRows(rows, "active").map((row) => row.name),
    ["Acme Retail"]
  )
  assert.deepEqual(
    filterCustomerRows(rows, "inactive").map((row) => row.name),
    ["Northwind"]
  )
})
test("search filter works inside the selected status tab", () => {
  const rows = [active, inactive]
  assert.equal(filterCustomerRows(rows, "all", "north").length, 1)
  assert.equal(filterCustomerRows(rows, "active", "north").length, 0)
  assert.equal(customerTabFilter(inactive, "inactive"), true)
})

console.log("\nReact Query keys")
test("list keys share a tenant prefix for mutation invalidation", () => {
  const tenantId = "tenant-1"
  const root = customerKeys.root(tenantId)
  assert.deepEqual(customerKeys.list(tenantId).slice(0, 2), [...root])
})
test("different tenants do not share query keys", () => {
  assert.notDeepEqual(customerKeys.list("a"), customerKeys.list("b"))
})

console.log("\nTimeline seed")
test("empty customer gets invoices and returns across several months", () => {
  const seeded = appendCustomerTimelineSeed(
    [{ id: 12, name: "Sony Shop" }],
    [],
    []
  )
  assert.equal(seeded.added, true)
  assert.equal(seeded.orders.length, 10)
  assert.equal(seeded.returns.length, 2)
  assert.ok(seeded.orders.every((row) => row.customerName === "Sony Shop"))
  assert.ok(seeded.returns.every((row) => row.partyName === "Sony Shop"))
  const months = [...new Set(seeded.orders.map((row) => row.orderDate.slice(0, 7)))]
  assert.deepEqual(months.sort(), ["2026-06", "2026-07", "2026-08", "2026-09"])
  assert.equal(seeded.orders.filter((row) => row.status === "cancelled").length, 1)
  assert.equal(seeded.orders.filter((row) => row.status === "pending").length, 5)
})
test("customer who already has the full seed is left unchanged", () => {
  const existing = appendCustomerTimelineSeed(
    [{ id: 12, name: "Sony Shop" }],
    [],
    []
  )
  const again = appendCustomerTimelineSeed(
    [{ id: 12, name: "Sony Shop" }],
    existing.orders,
    existing.returns
  )
  assert.equal(again.added, false)
  assert.equal(again.orders.length, existing.orders.length)
  assert.equal(again.returns.length, existing.returns.length)
})
test("older three-invoice seed is topped up with extra months", () => {
  const partial = appendCustomerTimelineSeed(
    [{ id: 12, name: "Sony Shop" }],
    [],
    []
  )
  const onlyAugustSeptember = {
    orders: partial.orders.filter((row) => row.orderDate.startsWith("2026-08") || row.orderDate.startsWith("2026-09")),
    returns: partial.returns.filter((row) => row.returnDate.startsWith("2026-09")),
  }
  const topped = appendCustomerTimelineSeed(
    [{ id: 12, name: "Sony Shop" }],
    onlyAugustSeptember.orders,
    onlyAugustSeptember.returns
  )
  assert.equal(topped.added, true)
  assert.ok(topped.orders.length > onlyAugustSeptember.orders.length)
  assert.ok(topped.orders.some((row) => row.orderDate.startsWith("2026-06")))
  assert.ok(topped.returns.some((row) => row.returnDate.startsWith("2026-07")))
})
test("timeline import maps invoice and return to the customer", () => {
  const result = applyImportedTimelineRows(
    [
      {
        date: "2026-09-01",
        type: "invoice",
        number: "INV-4001",
        amount: "1500.00",
        status: "completed",
      },
      {
        date: "2026-09-08",
        type: "return",
        number: "SR-4001",
        amount: "200.00",
        status: "completed",
      },
    ],
    "Sony Shop",
    [],
    []
  )
  assert.equal(result.added, 2)
  assert.equal(result.failed, 0)
  assert.equal(result.orders[0]?.customerName, "Sony Shop")
  assert.equal(result.orders[0]?.invoiceNumber, "INV-4001")
  assert.equal(result.returns[0]?.partyName, "Sony Shop")
  assert.equal(result.returns[0]?.returnNumber, "SR-4001")
})
test("timeline import rejects unmatched type and status", () => {
  assert.equal(parseImportedTimelineKind("credit-note"), "")
  assert.equal(parseImportedTimelineStatus("void"), "")
  const result = applyImportedTimelineRows(
    [
      { date: "2026-09-01", type: "credit-note", number: "X", amount: "10", status: "completed" },
      { date: "2026-09-01", type: "invoice", number: "Y", amount: "10", status: "void" },
    ],
    "Sony Shop",
    [],
    []
  )
  assert.equal(result.added, 0)
  assert.equal(result.failed, 2)
})
test("timeline import defaults empty type to invoice and empty status to completed", () => {
  const result = applyImportedTimelineRows(
    [{ date: "2026-09-01", type: "", number: "INV-9", amount: "99.00", status: "" }],
    "Sony Shop",
    [],
    []
  )
  assert.equal(result.added, 1)
  assert.equal(result.orders[0]?.status, "completed")
})
test("timeline rows include details paid due and running balance", () => {
  const imported = applyImportedTimelineRows(
    [
      {
        date: "2026-09-01",
        type: "invoice",
        number: "INV-1",
        amount: "1000.00",
        status: "pending",
      },
      {
        date: "2026-09-10",
        type: "return",
        number: "SR-1",
        amount: "200.00",
        status: "completed",
      },
    ],
    "Sony Shop",
    [],
    []
  )
  const rows = buildCustomerTimelineRows(
    { name: "Sony Shop" },
    imported.orders,
    imported.returns
  )
  assert.equal(rows[0]?.kind, "return")
  assert.equal(rows[0]?.details, "Imported")
  assert.equal(rows[1]?.paid, "0.00")
  assert.equal(rows[1]?.balance, "1000.00")
  assert.equal(rows[0]?.runningBalance, "800.00")
})
test("timeline filters by type and groups monthly totals", () => {
  const imported = applyImportedTimelineRows(
    [
      {
        date: "2026-08-02",
        type: "invoice",
        number: "INV-A",
        amount: "500.00",
        status: "completed",
      },
      {
        date: "2026-09-02",
        type: "invoice",
        number: "INV-B",
        amount: "300.00",
        status: "pending",
      },
      {
        date: "2026-09-12",
        type: "return",
        number: "SR-B",
        amount: "50.00",
        status: "completed",
      },
    ],
    "Sony Shop",
    [],
    []
  )
  const rows = buildCustomerTimelineRows(
    { name: "Sony Shop" },
    imported.orders,
    imported.returns
  )
  const invoices = filterTimelineRows(rows, { kind: "invoice" })
  assert.equal(invoices.every((row) => row.kind === "invoice"), true)
  const groups = groupTimelineByMonth(rows)
  assert.equal(groups[0]?.month, "2026-09")
  assert.equal(groups[0]?.total, "300.00")
  assert.equal(groups[0]?.credit, "50.00")
  const summary = summarizeTimeline(rows)
  assert.equal(summary.total, "800.00")
})
test("timeline export range filters by month or date", () => {
  const imported = applyImportedTimelineRows(
    [
      {
        date: "2026-08-02",
        type: "invoice",
        number: "INV-A",
        amount: "500.00",
        status: "completed",
      },
      {
        date: "2026-09-02",
        type: "invoice",
        number: "INV-B",
        amount: "300.00",
        status: "pending",
      },
      {
        date: "2026-09-12",
        type: "return",
        number: "SR-B",
        amount: "50.00",
        status: "completed",
      },
    ],
    "Sony Shop",
    [],
    []
  )
  const rows = buildCustomerTimelineRows(
    { name: "Sony Shop" },
    imported.orders,
    imported.returns
  )
  assert.equal(filterTimelineExportRange(rows, { mode: "all" }).length, 3)
  assert.equal(
    filterTimelineExportRange(rows, {
      mode: "month",
      from: "2026-09",
      to: "2026-09",
    }).length,
    2
  )
  assert.equal(
    filterTimelineExportRange(rows, {
      mode: "date",
      from: "2026-08-01",
      to: "2026-08-31",
    }).length,
    1
  )
})
test("timeline report entries are chronological and include line items", () => {
  const imported = applyImportedTimelineRows(
    [
      {
        date: "2026-09-02",
        type: "invoice",
        number: "INV-B",
        amount: "300.00",
        status: "pending",
      },
      {
        date: "2026-08-02",
        type: "invoice",
        number: "INV-A",
        amount: "500.00",
        status: "completed",
      },
    ],
    "Sony Shop",
    [],
    []
  )
  const rows = buildCustomerTimelineRows(
    { name: "Sony Shop" },
    imported.orders,
    imported.returns
  )
  const entries = timelineReportEntries(rows)
  assert.equal(entries[0]?.number, "INV-A")
  assert.equal(entries[1]?.number, "INV-B")
  assert.equal(Array.isArray(entries[0]?.lines), true)
})
test("seeded customer flow filters, paginates, totals, exports and reports", () => {
  const seeded = appendCustomerTimelineSeed(
    [
      { id: 1, name: "Sony Shop" },
      { id: 2, name: "Acme Retail" },
    ],
    [],
    []
  )
  assert.equal(seeded.orders.length, 20)
  assert.equal(seeded.returns.length, 4)

  const rows = buildCustomerTimelineRows(
    { name: "Sony Shop" },
    seeded.orders,
    seeded.returns
  )
  assert.equal(rows.length, 12)
  assert.equal(rows[0]?.date >= rows[rows.length - 1]?.date, true)

  const invoices = filterTimelineRows(rows, { kind: "invoice" })
  const returnsOnly = filterTimelineRows(rows, { kind: "return" })
  assert.equal(invoices.length, 10)
  assert.equal(returnsOnly.length, 2)
  assert.equal(filterTimelineRows(rows, { status: "pending" }).length, 5)
  assert.equal(filterTimelineRows(rows, { status: "cancelled" }).length, 1)
  assert.equal(filterTimelineRows(rows, { search: "seasonal" }).length, 1)
  assert.equal(filterTimelineRows(rows, { month: "2026-06" }).length, 2)

  const groups = groupTimelineByMonth(rows)
  assert.deepEqual(
    groups.map((group) => group.month),
    ["2026-09", "2026-08", "2026-07", "2026-06"]
  )
  assert.equal(groups[3]?.total, "23600.00")
  assert.equal(groups[3]?.remaining, "10400.00")
  assert.equal(groups[0]?.month, "2026-09")

  const summary = summarizeTimeline(rows)
  assert.equal(summary.total, "154000.00")
  assert.equal(summary.credit, "118360.00")
  assert.equal(summary.remaining, "40600.00")
  assert.equal(summary.balance, "35640.00")

  const pageSize = 10
  assert.equal(Math.ceil(rows.length / pageSize), 2)
  const firstPage = rows.slice(0, pageSize)
  const secondPage = rows.slice(pageSize)
  assert.equal(firstPage.length, 10)
  assert.equal(secondPage.length, 2)

  assert.equal(
    filterTimelineExportRange(rows, { mode: "month", from: "2026-07", to: "2026-08" }).length,
    6
  )
  const exported = timelineExportRows(rows)
  assert.equal(exported.length, 12)
  assert.ok("running" in exported[0]!)

  const html = buildCustomerTimelineReportHtml({
    customer: {
      ...active,
      name: "Sony Shop",
      phone: "03001234567",
    },
    rows,
    company: DEFAULT_COMPANY_SETTINGS,
    logoSrc: "/assets/logo-2.png",
    periodLabel: "All dates",
    generatedAt: "21 Sep 2026, 5:00 PM",
    locale: "en",
    labels: {
      title: "Customer statement",
      customer: "Bill to",
      phone: "Phone",
      period: "Period",
      generated: "Generated",
      date: "Date",
      type: "Type",
      document: "Document",
      details: "Details",
      reference: "Reference",
      amount: "Amount",
      paid: "Paid",
      due: "Due",
      running: "Running",
      status: "Status",
      invoice: "Invoice",
      returnLabel: "Return",
      item: "Item",
      qty: "Qty",
      rate: "Rate",
      lineAmount: "Amount",
      total: "Total",
      credit: "Credit",
      remaining: "Remaining",
      balance: "Balance",
      openingBalance: "Opening balance",
      statusOf: (status) => status,
    },
  })
  assert.match(html, /Sony Shop/)
  assert.match(html, /June 2026/)
  assert.match(html, /Premium Basmati Rice/)
  assert.match(html, /\$154,000\.00/)
  assert.match(html, /Frozen Chicken/)
})

test("timeline export files use readable columns, items, and monthly excel sheets", () => {
  const seeded = appendCustomerTimelineSeed(
    [{ id: 1, name: "Sony Shop" }],
    [],
    []
  )
  const rows = buildCustomerTimelineRows(
    { name: "Sony Shop" },
    seeded.orders,
    seeded.returns
  )
  const labels = {
    title: "Customer statement",
    customer: "Bill to",
    phone: "Phone",
    period: "Period",
    generated: "Generated",
    date: "Date",
    type: "Type",
    document: "Document",
    details: "Details",
    reference: "Reference",
    amount: "Amount",
    paid: "Paid",
    due: "Due",
    running: "Running",
    status: "Status",
    invoice: "Invoice",
    returnLabel: "Return",
    item: "Item",
    qty: "Qty",
    rate: "Rate",
    lineAmount: "Amount",
    total: "Total",
    credit: "Credit",
    remaining: "Remaining",
    balance: "Balance",
    openingBalance: "Opening balance",
    statusOf: (status: string) => status,
    month: "Month",
    items: "Items",
    monthsHeading: "Months",
    ledger: "Ledger",
  }
  const labeled = timelineExportLabeledRows(rows, labels, "en")
  assert.equal(labeled.length, 12)
  assert.match(String(labeled[0]?.Date), /Jun/)
  assert.match(String(labeled[0]?.Date), /2026/)
  assert.equal(labeled[0]?.Type, "Invoice")
  assert.ok(String(labeled[0]?.Items ?? "").includes("All-purpose Flour"))
  assert.equal(typeof labeled[0]?.Amount, "number")

  const json = timelineExportJsonRecords(rows, labels, "en")
  assert.ok(Array.isArray(json[0]?.items))
  assert.ok((json[0]?.items as unknown[]).length > 0)

  const sheets = buildCustomerTimelineWorkbookSheets({
    customer: { ...active, name: "Sony Shop", phone: "03001234567" },
    rows,
    company: DEFAULT_COMPANY_SETTINGS,
    periodLabel: "All dates",
    generatedAt: "21 Sep 2026, 5:00 PM",
    locale: "en",
    labels,
  })
  assert.equal(sheets[0]?.name, "Customer statement")
  assert.equal(sheets[1]?.name, "Ledger")
  assert.ok(sheets.some((sheet) => sheet.name === "June 2026"))
  assert.ok(sheets.some((sheet) => sheet.name === "September 2026"))
  assert.ok(
    sheets[1]?.rows.some(
      (row) =>
        typeof row[3] === "string" && row[3].includes("All-purpose Flour")
    )
  )
  assert.equal(timelineStatementFilename("Sony Shop", "all"), "sony-shop-statement-all")
  assert.equal(
    timelineStatementFilename("Sony Shop", "2026-07-to-2026-08"),
    "sony-shop-statement-2026-07-to-2026-08"
  )
})

console.log(`\n${passed} passed, ${failed} failed`)
if (failed > 0) process.exit(1)
