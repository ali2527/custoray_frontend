import assert from "node:assert/strict"

import {
  BRAND_STATUS_OPTIONS,
  CATALOG_STATUS_OPTIONS,
  catalogTabFilter,
  filterCatalogRows,
  mapImportedCatalogWrite,
  type CatalogRow,
} from "../src/lib/inventory-catalog-rows"
import { parseCatalogFieldSettings } from "../src/lib/catalog-field-settings"
import { inventoryKeys } from "../src/lib/inventory-query"

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

const brand: CatalogRow = {
  id: "b1",
  srNo: 1,
  name: "Acme",
  description: "Premium electronics",
  products: 2,
  status: "active",
}
const inactiveBrand: CatalogRow = {
  ...brand,
  id: "b2",
  srNo: 2,
  name: "Nova",
  status: "inactive",
}
const archivedBrand: CatalogRow = {
  ...brand,
  id: "b3",
  srNo: 3,
  name: "Legacy",
  status: "archived",
}

console.log("\nCatalog pages flow tests\n")

console.log("Add / edit mapping")
test("brand import maps name description and status", () => {
  const mapped = mapImportedCatalogWrite(
    { name: "Sony", description: "Audio", status: "inactive" },
    BRAND_STATUS_OPTIONS
  )
  assert.deepEqual(mapped, {
    name: "Sony",
    description: "Audio",
    status: "inactive",
  })
})
test("category import rejects unmatched status so it is not created", () => {
  const mapped = mapImportedCatalogWrite(
    { name: "Cables", description: "", status: "unknown" },
    CATALOG_STATUS_OPTIONS
  )
  assert.equal(mapped, null)
})
test("variant import defaults to active when status column is omitted", () => {
  const mapped = mapImportedCatalogWrite(
    { name: "Genuine", description: "Original" },
    CATALOG_STATUS_OPTIONS
  )
  assert.equal(mapped?.status, "active")
})
test("empty status defaults to active", () => {
  const mapped = mapImportedCatalogWrite(
    { name: "Sony", description: "Audio", status: "" },
    BRAND_STATUS_OPTIONS
  )
  assert.equal(mapped?.status, "active")
})
test("catalog table settings parse enabled flags and off from old field needs", () => {
  const parsed = parseCatalogFieldSettings(
    JSON.stringify({
      brand: false,
      product: { category: "off", variant: "required" },
    })
  )
  assert.deepEqual(parsed, {
    brand: false,
    category: false,
    variant: true,
  })
})

console.log("\nActive / inactive / archive filters")
test("brand tabs isolate active inactive and archived rows", () => {
  const rows = [brand, inactiveBrand, archivedBrand]
  assert.equal(filterCatalogRows(rows, "all").length, 3)
  assert.deepEqual(
    filterCatalogRows(rows, "active").map((row) => row.name),
    ["Acme"]
  )
  assert.deepEqual(
    filterCatalogRows(rows, "inactive").map((row) => row.name),
    ["Nova"]
  )
  assert.deepEqual(
    filterCatalogRows(rows, "archived").map((row) => row.name),
    ["Legacy"]
  )
})
test("category and variant tabs hide archived-only rows", () => {
  assert.equal(catalogTabFilter(brand, "active"), true)
  assert.equal(catalogTabFilter(inactiveBrand, "inactive"), true)
  assert.equal(catalogTabFilter(archivedBrand, "active"), false)
  assert.equal(catalogTabFilter(archivedBrand, "inactive"), false)
})
test("search filter works inside the selected status tab", () => {
  const rows = [brand, inactiveBrand, archivedBrand]
  const found = filterCatalogRows(rows, "all", "nova")
  assert.equal(found.length, 1)
  assert.equal(found[0]?.name, "Nova")
  assert.equal(filterCatalogRows(rows, "active", "legacy").length, 0)
  assert.equal(filterCatalogRows(rows, "archived", "legacy").length, 1)
})

console.log("\nReact Query keys")
test("product and catalog keys share a tenant prefix for mutation invalidation", () => {
  const tenantId = "tenant-1"
  const root = inventoryKeys.root(tenantId)
  assert.deepEqual(inventoryKeys.products(tenantId).slice(0, 2), [...root])
  assert.deepEqual(inventoryKeys.facets(tenantId).slice(0, 2), [...root])
  assert.deepEqual(inventoryKeys.catalog("brands", tenantId).slice(0, 2), [...root])
  assert.deepEqual(inventoryKeys.catalog("categories", tenantId).slice(0, 2), [...root])
  assert.deepEqual(inventoryKeys.catalog("variants", tenantId).slice(0, 2), [...root])
})
test("different tenants do not share query keys", () => {
  assert.notDeepEqual(
    inventoryKeys.products("a"),
    inventoryKeys.products("b")
  )
})

console.log(`\n${passed} passed, ${failed} failed`)
if (failed > 0) process.exit(1)
