import assert from "node:assert/strict"

import {
  filterVendorRows,
  mapApiVendorToRow,
  mapImportedVendorWrite,
  parseImportedVendorStatus,
  toApiVendorWrite,
  vendorTabFilter,
  vendorTimelineHref,
  type VendorRow,
} from "../src/lib/vendors"
import { vendorKeys } from "../src/lib/vendors-query"
import { appendVendorTimelineSeed } from "../src/lib/vendor-timeline-seed"
import {
  applyImportedVendorTimelineRows,
  buildVendorTimelineRows,
  mapImportedVendorTimelineEntry,
} from "../src/lib/vendor-timeline"
import {
  filterTimelineExportRange,
  filterTimelineRows,
  groupTimelineByMonth,
  parseImportedTimelineKind,
  summarizeTimeline,
  timelineExportRows,
} from "../src/lib/customer-timeline"
import { timelineReportEntries } from "../src/lib/customer-timeline-report"

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

const active: VendorRow = {
  id: 1,
  apiId: "v1",
  name: "Karachi Steel Supplies",
  description: "Raw materials",
  openingBalance: "20000.00",
  totalPurchases: "100.00",
  totalPayments: "40.00",
  phone: "+92 300 4455667",
  status: "active",
  imageUrl: "",
}
const inactive: VendorRow = {
  ...active,
  id: 2,
  apiId: "v2",
  name: "Peshawar Hardware Hub",
  status: "inactive",
}

console.log("\nVendors flow tests\n")

console.log("Import / mapping")
test("import maps name phone opening balance and status", () => {
  const mapped = mapImportedVendorWrite({
    name: "Steel Co",
    description: "Rods",
    phone: "03001234567",
    openingBalance: "1500",
    status: "active",
  })
  assert.equal(mapped?.name, "Steel Co")
  assert.equal(mapped?.phone, "03001234567")
  assert.equal(mapped?.openingBalance, 1500)
  assert.equal(mapped?.status, "active")
})
test("import rejects unmatched status so the row is not created", () => {
  assert.equal(mapImportedVendorWrite({ name: "X", status: "archived" }), null)
  assert.equal(parseImportedVendorStatus("archived"), "")
})
test("empty status defaults to active", () => {
  assert.equal(mapImportedVendorWrite({ name: "X" })?.status, "active")
})
test("on-hold status maps to inactive", () => {
  assert.equal(parseImportedVendorStatus("on_hold"), "inactive")
  assert.equal(mapImportedVendorWrite({ name: "X", status: "On Hold" })?.status, "inactive")
})
test("vendor status does not accept product archived lifecycle", () => {
  assert.equal(parseImportedVendorStatus("archived"), "")
})
test("api vendor maps sequential id and purchase totals", () => {
  const row = mapApiVendorToRow(
    {
      id: "vnd_9",
      name: "Lahore Packaging Co.",
      phone: "321",
      description: "Cartons",
      status: "active",
      openingBalance: "75",
      totalPurchases: "128400.5",
      totalPayments: "120000",
    },
    3
  )
  assert.equal(row.id, 4)
  assert.equal(row.apiId, "vnd_9")
  assert.equal(row.totalPurchases, "128400.50")
  assert.equal(row.totalPayments, "120000.00")
})
test("write payload omits computed totals", () => {
  const payload = toApiVendorWrite(active)
  assert.equal(payload.name, "Karachi Steel Supplies")
  assert.equal(payload.openingBalance, 20000)
  assert.equal("totalPurchases" in payload, false)
})

console.log("\nActive / inactive filters")
test("tabs isolate active and inactive rows", () => {
  const rows = [active, inactive]
  assert.equal(filterVendorRows(rows, "active").length, 1)
  assert.equal(filterVendorRows(rows, "inactive").length, 1)
  assert.equal(vendorTabFilter(active, "all"), true)
})
test("search filter works inside the selected status tab", () => {
  assert.equal(filterVendorRows([active, inactive], "active", "steel").length, 1)
  assert.equal(filterVendorRows([active, inactive], "active", "peshawar").length, 0)
})

console.log("\nReact Query keys")
test("list keys share a tenant prefix for mutation invalidation", () => {
  assert.deepEqual(vendorKeys.list("t1")[0], "vendors")
  assert.deepEqual(vendorKeys.list("t1")[1], "t1")
})
test("different tenants do not share query keys", () => {
  assert.notDeepEqual(vendorKeys.list("a"), vendorKeys.list("b"))
})
test("timeline href uses the vendor id", () => {
  assert.equal(vendorTimelineHref("vnd_9"), "/vendors/timeline?id=vnd_9")
})

console.log("\nTimeline seed")
test("empty vendor gets purchases and returns across several months", () => {
  const seeded = appendVendorTimelineSeed([{ id: 1, name: "Sony Supplies" }], [], [])
  assert.equal(seeded.added, true)
  assert.equal(seeded.purchases.length, 6)
  assert.equal(seeded.returns.length, 2)
  assert.ok(seeded.purchases.every((row) => row.vendorName === "Sony Supplies"))
  assert.ok(seeded.returns.every((row) => row.type === "purchase"))
})
test("vendor who already has the full seed is left unchanged", () => {
  const first = appendVendorTimelineSeed([{ id: 1, name: "Sony Supplies" }], [], [])
  const again = appendVendorTimelineSeed(
    [{ id: 1, name: "Sony Supplies" }],
    first.purchases,
    first.returns
  )
  assert.equal(again.added, false)
  assert.equal(again.purchases.length, first.purchases.length)
})
test("timeline import maps purchase and return to the vendor", () => {
  const result = applyImportedVendorTimelineRows(
    [
      {
        date: "2026-09-01",
        type: "purchase",
        number: "PO-B",
        amount: "300.00",
        status: "pending",
      },
      {
        date: "2026-08-02",
        type: "return",
        number: "PR-A",
        amount: "50.00",
        status: "completed",
      },
    ],
    "Sony Supplies",
    [],
    []
  )
  assert.equal(result.added, 2)
  assert.equal(result.purchases[0]?.vendorName, "Sony Supplies")
  assert.equal(result.returns[0]?.type, "purchase")
})
test("timeline import rejects unmatched type and status", () => {
  assert.equal(
    mapImportedVendorTimelineEntry(
      { date: "2026-09-01", type: "widget", amount: "10" },
      "Sony Supplies",
      [],
      []
    ),
    null
  )
  assert.equal(
    mapImportedVendorTimelineEntry(
      { date: "2026-09-01", type: "purchase", amount: "10", status: "archived" },
      "Sony Supplies",
      [],
      []
    ),
    null
  )
})
test("timeline import defaults empty type to purchase and empty status to completed", () => {
  const mapped = mapImportedVendorTimelineEntry(
    { date: "2026-09-01", amount: "10.00" },
    "Sony Supplies",
    [],
    []
  )
  assert.equal(mapped?.kind, "purchase")
  if (mapped?.kind === "purchase") {
    assert.equal(mapped.purchase.status, "completed")
  }
})
test("purchase is a valid imported timeline kind", () => {
  assert.equal(parseImportedTimelineKind("po"), "purchase")
  assert.equal(parseImportedTimelineKind("bill"), "purchase")
})
test("seeded vendor flow filters, paginates, totals, exports and reports", () => {
  const seeded = appendVendorTimelineSeed(
    [
      { id: 1, name: "Sony Supplies" },
      { id: 2, name: "Acme Wholesale" },
    ],
    [],
    []
  )
  assert.equal(seeded.purchases.length, 12)
  assert.equal(seeded.returns.length, 4)

  const rows = buildVendorTimelineRows(
    { name: "Sony Supplies" },
    seeded.purchases,
    seeded.returns
  )
  assert.equal(rows.length, 8)
  assert.equal(filterTimelineRows(rows, { kind: "purchase" }).length, 6)
  assert.equal(filterTimelineRows(rows, { kind: "return" }).length, 2)
  assert.equal(filterTimelineRows(rows, { month: "2026-06" }).length, 2)
  assert.equal(filterTimelineRows(rows, { search: "seasonal" }).length, 1)

  const groups = groupTimelineByMonth(rows)
  assert.deepEqual(
    groups.map((group) => group.month),
    ["2026-09", "2026-08", "2026-07", "2026-06"]
  )

  const summary = summarizeTimeline(rows)
  assert.equal(summary.total, "79900.00")
  assert.ok(Number(summary.credit) > 0)

  assert.equal(
    filterTimelineExportRange(rows, { mode: "month", from: "2026-07", to: "2026-08" }).length,
    4
  )
  const exported = timelineExportRows(rows)
  assert.equal(exported.length, 8)
  assert.ok("running" in exported[0]!)

  const entries = timelineReportEntries(rows)
  assert.ok(entries.some((entry) => entry.lines.some((line) => line.name.includes("Steel Rod"))))
})

console.log(`\n${passed} passed, ${failed} failed`)
if (failed > 0) process.exit(1)
