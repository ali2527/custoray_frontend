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

console.log(`\n${passed} passed, ${failed} failed`)
if (failed > 0) process.exit(1)
