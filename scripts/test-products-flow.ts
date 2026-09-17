import assert from "node:assert/strict"
import { createRequire } from "node:module"

import {
  EMPTY_PRODUCT,
  MAX_PRICE,
  MAX_PRODUCT_IMAGES,
  MIN_PRICE,
  applyImportedProductRows,
  countAcceptedImageFiles,
  duplicateProductRow,
  filterProductRows,
  mapImportedProduct,
  normalizePriceValue,
  nextProductSrNo,
  productFromSidebarForm,
  productImageUploadValue,
  productTabFilter,
  removeProductImageAt,
  toApiProductWrite,
  type ProductRow,
} from "../src/lib/inventory-product-rows"
import {
  DEFAULT_PRODUCT_SKU_SETTINGS,
  formatAutoSku,
  nextAutoSku,
  parseProductSkuSettings,
  productImportColumns,
  productImportSampleRow,
  sanitizeSkuPrefixInput,
  type ProductSkuSettings,
} from "../src/lib/product-sku-settings"
import {
  buildSampleCsv,
  escapeCsvCell,
  exportFilenameBase,
  parseCsv,
  rowsToCsv,
  rowsToJson,
} from "../src/lib/csv"

const require = createRequire(import.meta.url)
const XLSX = require("xlsx") as typeof import("xlsx")

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

const AUTO: ProductSkuSettings = { mode: "auto", prefix: "SKU" }
const CUSTOM: ProductSkuSettings = { mode: "custom", prefix: "SKU" }

const sample: ProductRow = {
  ...EMPTY_PRODUCT,
  srNo: 1,
  sku: "SKU-001",
  name: "Cotton shirt",
  brand: "Acme",
  status: "In Stock",
  stock: 12,
  orders: 3,
  salePrice: "250.00",
  costPrice: "180.00",
}

console.log("\nProducts flow tests\n")

console.log("Add / edit form")
test("add form without stock/orders keeps 0 qty and 0 orders", () => {
  const fd = new FormData()
  fd.set("name", "New lamp")
  fd.set("sku", "LAMP-1")
  fd.set("salePrice", "150")
  fd.set("costPrice", "120")
  const next = productFromSidebarForm(fd, EMPTY_PRODUCT, {
    skuSettings: CUSTOM,
    existing: [],
    isNew: true,
  })
  assert.equal(next.stock, 0)
  assert.equal(next.orders, 0)
  assert.equal(next.status, "Out of Stock")
  assert.equal(next.name, "New lamp")
  assert.equal(next.sku, "LAMP-1")
  assert.equal(next.brand, "")
  assert.equal(next.category, "")
  assert.equal(next.variant, "")
})
test("add form rejects blank name by keeping previous empty name", () => {
  const fd = new FormData()
  fd.set("name", "   ")
  fd.set("salePrice", "150")
  const next = productFromSidebarForm(fd, EMPTY_PRODUCT, {
    skuSettings: CUSTOM,
    isNew: true,
  })
  assert.equal(next.name, "")
})
test("custom add keeps empty sku so the form can require it", () => {
  const fd = new FormData()
  fd.set("name", "No sku")
  fd.set("sku", "  ")
  fd.set("salePrice", "150")
  const next = productFromSidebarForm(fd, EMPTY_PRODUCT, {
    skuSettings: CUSTOM,
    isNew: true,
  })
  assert.equal(next.sku, "")
})
test("auto add ignores typed sku and increments the prefix", () => {
  const fd = new FormData()
  fd.set("name", "Auto lamp")
  fd.set("sku", "IGNORE-ME")
  fd.set("salePrice", "150")
  const next = productFromSidebarForm(fd, EMPTY_PRODUCT, {
    skuSettings: AUTO,
    existing: [sample],
    isNew: true,
  })
  assert.equal(next.sku, "SKU-002")
  assert.equal(next.name, "Auto lamp")
})
test("auto edit keeps the existing sku", () => {
  const fd = new FormData()
  fd.set("name", "Renamed")
  fd.set("sku", "CHANGED")
  fd.set("salePrice", sample.salePrice)
  const next = productFromSidebarForm(fd, sample, {
    skuSettings: AUTO,
    existing: [sample],
    isNew: false,
  })
  assert.equal(next.sku, "SKU-001")
  assert.equal(next.name, "Renamed")
})
test("edit form updates stock and orders when fields are present", () => {
  const fd = new FormData()
  fd.set("name", sample.name)
  fd.set("stock", "40")
  fd.set("orders", "9")
  fd.set("salePrice", sample.salePrice)
  const next = productFromSidebarForm(fd, sample, {
    skuSettings: CUSTOM,
    isNew: false,
  })
  assert.equal(next.stock, 40)
  assert.equal(next.orders, 9)
})
test("edit form without stock fields keeps previous qty", () => {
  const fd = new FormData()
  fd.set("name", sample.name)
  fd.set("salePrice", sample.salePrice)
  const next = productFromSidebarForm(fd, sample, {
    skuSettings: CUSTOM,
    isNew: false,
  })
  assert.equal(next.stock, 12)
  assert.equal(next.orders, 3)
  assert.equal(next.lifecycle, sample.lifecycle)
})
test("price below minimum clamps to 100.00", () => {
  assert.equal(normalizePriceValue("12"), "100.00")
})
test("price above maximum clamps to 10000.00", () => {
  assert.equal(normalizePriceValue("99999"), "10000.00")
})
test("empty price uses fallback then clamps", () => {
  assert.equal(normalizePriceValue("", 180), "180.00")
  assert.equal(MIN_PRICE, 100)
  assert.equal(MAX_PRICE, 10000)
})
test("next srNo increments from existing", () => {
  assert.equal(nextProductSrNo([sample]), 2)
  assert.equal(nextProductSrNo([]), 1)
})
test("duplicate with custom sku appends -copy", () => {
  const copy = duplicateProductRow(sample, [sample], CUSTOM)
  assert.equal(copy.srNo, 2)
  assert.equal(copy.sku, "SKU-001-copy")
  assert.equal(copy.name, "Cotton shirt (copy)")
  assert.equal(copy.stock, sample.stock)
})
test("duplicate with auto sku assigns the next prefix number", () => {
  const copy = duplicateProductRow(sample, [sample], AUTO)
  assert.equal(copy.sku, "SKU-002")
})
test("uploaded images persist through the add form", () => {
  const fd = new FormData()
  fd.set("name", "With photo")
  fd.set("salePrice", "150")
  fd.set("imageUrls", JSON.stringify(["data:image/png;base64,abc"]))
  const next = productFromSidebarForm(fd, EMPTY_PRODUCT, {
    skuSettings: CUSTOM,
    isNew: true,
  })
  assert.deepEqual(next.imageUrls, ["data:image/png;base64,abc"])
})
test("invalid imageUrls json keeps previous images", () => {
  const previous = { ...sample, imageUrls: ["keep-me"] }
  const fd = new FormData()
  fd.set("name", previous.name)
  fd.set("salePrice", previous.salePrice)
  fd.set("imageUrls", "not-json")
  const next = productFromSidebarForm(fd, previous, {
    skuSettings: CUSTOM,
    isNew: false,
  })
  assert.deepEqual(next.imageUrls, ["keep-me"])
})
test("deleting one uploaded image removes it from the save payload", () => {
  const previous = {
    ...sample,
    imageUrls: ["data:image/png;base64,keep", "data:image/png;base64,drop"],
  }
  const remaining = removeProductImageAt(previous.imageUrls, 1)
  assert.deepEqual(remaining, ["data:image/png;base64,keep"])
  const fd = new FormData()
  fd.set("name", previous.name)
  fd.set("salePrice", previous.salePrice)
  fd.set("imageUrls", productImageUploadValue(remaining))
  const next = productFromSidebarForm(fd, previous, {
    skuSettings: CUSTOM,
    isNew: false,
  })
  assert.deepEqual(next.imageUrls, ["data:image/png;base64,keep"])
  assert.deepEqual(toApiProductWrite(next).imageUrls, ["data:image/png;base64,keep"])
})
test("deleting all images sends an empty upload list instead of previous urls", () => {
  const previous = { ...sample, imageUrls: ["one", "two"] }
  const emptied = removeProductImageAt(removeProductImageAt(previous.imageUrls, 1), 0)
  assert.deepEqual(emptied, [])
  const fd = new FormData()
  fd.set("name", previous.name)
  fd.set("salePrice", previous.salePrice)
  fd.set("imageUrls", productImageUploadValue(emptied))
  const next = productFromSidebarForm(fd, previous, {
    skuSettings: CUSTOM,
    isNew: false,
  })
  assert.deepEqual(next.imageUrls, [])
  assert.deepEqual(toApiProductWrite(next).imageUrls, [])
})
test("edit form can set active inactive and archived lifecycle", () => {
  const fd = new FormData()
  fd.set("name", sample.name)
  fd.set("salePrice", sample.salePrice)
  fd.set("lifecycle", "inactive")
  const inactive = productFromSidebarForm(fd, sample, {
    skuSettings: CUSTOM,
    isNew: false,
  })
  assert.equal(inactive.lifecycle, "inactive")
  fd.set("lifecycle", "archived")
  assert.equal(
    productFromSidebarForm(fd, sample, { skuSettings: CUSTOM, isNew: false }).lifecycle,
    "archived"
  )
  fd.set("lifecycle", "active")
  assert.equal(
    productFromSidebarForm(fd, sample, { skuSettings: CUSTOM, isNew: false }).lifecycle,
    "active"
  )
})

console.log("\nSKU settings")
test("default sku mode is auto with SKU prefix", () => {
  assert.equal(DEFAULT_PRODUCT_SKU_SETTINGS.mode, "auto")
  assert.equal(DEFAULT_PRODUCT_SKU_SETTINGS.prefix, "SKU")
})
test("next auto sku pads to three digits", () => {
  assert.equal(nextAutoSku([], "SKU"), "SKU-001")
  assert.equal(formatAutoSku("PRD", 12), "PRD-012")
})
test("next auto sku increments only matching prefixes", () => {
  const rows = [
    { sku: "SKU-009" },
    { sku: "PRD-040" },
    { sku: "SKU-011" },
  ]
  assert.equal(nextAutoSku(rows, "SKU"), "SKU-012")
  assert.equal(nextAutoSku(rows, "PRD"), "PRD-041")
})
test("prefix sanitizes symbols and trailing separators", () => {
  assert.equal(sanitizeSkuPrefixInput("PRD-$%"), "PRD-")
  assert.equal(nextAutoSku([], "ITEM_"), "ITEM-001")
})
test("parsed settings reject unknown modes", () => {
  assert.equal(parseProductSkuSettings(null), null)
  assert.equal(parseProductSkuSettings("{"), null)
  const parsed = parseProductSkuSettings(
    JSON.stringify({ mode: "custom", prefix: "AB#" })
  )
  assert.equal(parsed?.mode, "custom")
  assert.equal(parsed?.prefix, "AB")
})
test("auto import sample omits sku; custom sample includes it", () => {
  assert.deepEqual(productImportColumns(AUTO), [
    "name",
    "brand",
    "category",
    "variant",
    "costPrice",
    "salePrice",
  ])
  assert.equal(productImportColumns(CUSTOM)[0], "sku")
  assert.equal("sku" in productImportSampleRow(AUTO), false)
  assert.equal(productImportSampleRow(CUSTOM).sku, "SKU-001")
})

console.log("\nTabs")
test("all tab shows every lifecycle", () => {
  const archived = { ...sample, lifecycle: "archived" as const }
  assert.equal(productTabFilter(sample, "all"), true)
  assert.equal(productTabFilter(archived, "all"), true)
})
test("active tab hides archived", () => {
  const archived = { ...sample, lifecycle: "archived" as const }
  assert.equal(productTabFilter(sample, "active"), true)
  assert.equal(productTabFilter(archived, "active"), false)
})
test("archived tab only shows archived", () => {
  const archived = { ...sample, lifecycle: "archived" as const }
  assert.equal(productTabFilter(sample, "archived"), false)
  assert.equal(productTabFilter(archived, "archived"), true)
})
test("inactive tab only shows inactive products", () => {
  const inactive = { ...sample, lifecycle: "inactive" as const }
  assert.equal(productTabFilter(inactive, "inactive"), true)
  assert.equal(productTabFilter(sample, "inactive"), false)
  assert.equal(productTabFilter({ ...sample, lifecycle: "archived" }, "inactive"), false)
})
test("search filter matches name and sku within the active tab", () => {
  const rows: ProductRow[] = [
    { ...sample, name: "Alpha lamp", sku: "SKU-001", lifecycle: "active" },
    { ...sample, srNo: 2, name: "Beta chair", sku: "SKU-002", lifecycle: "inactive" },
    { ...sample, srNo: 3, name: "Alpha archived", sku: "SKU-003", lifecycle: "archived" },
  ]
  const found = filterProductRows(rows, "active", "alpha")
  assert.equal(found.length, 1)
  assert.equal(found[0]?.name, "Alpha lamp")
  assert.equal(filterProductRows(rows, "all", "sku-002").length, 1)
})

console.log("\nImage upload rules")
test("accepts images up to the limit of 8", () => {
  const files = Array.from({ length: 10 }, () => ({ type: "image/png" }))
  const result = countAcceptedImageFiles(files, 0)
  assert.equal(result.accepted, MAX_PRODUCT_IMAGES)
  assert.equal(result.skippedOverLimit, 2)
})
test("skips non-image files", () => {
  const result = countAcceptedImageFiles(
    [{ type: "application/pdf" }, { type: "image/jpeg" }],
    0
  )
  assert.equal(result.accepted, 1)
  assert.equal(result.skippedNonImage, 1)
})
test("remaining slots shrink with current images", () => {
  const result = countAcceptedImageFiles(
    [{ type: "image/png" }, { type: "image/png" }],
    7
  )
  assert.equal(result.accepted, 1)
  assert.equal(result.skippedOverLimit, 1)
})

console.log("\nCSV upload / import")
test("auto import skips rows without a name even if sku is present", () => {
  assert.equal(mapImportedProduct({ sku: "SKU-9", name: "" }, [], AUTO), null)
  assert.equal(mapImportedProduct({ sku: "", name: "" }, [], AUTO), null)
})
test("custom import skips rows without a sku", () => {
  assert.equal(mapImportedProduct({ sku: "", name: "" }, [], CUSTOM), null)
  assert.equal(mapImportedProduct({ sku: "", name: "Named" }, [], CUSTOM), null)
})
test("imports by name only in auto mode and assigns sku", () => {
  const row = mapImportedProduct({ name: "Imported mug" }, [sample], AUTO)
  assert.ok(row)
  assert.equal(row?.name, "Imported mug")
  assert.equal(row?.sku, "SKU-002")
  assert.equal(row?.srNo, 2)
})
test("custom import takes the sku field", () => {
  const row = mapImportedProduct({ sku: "LAMP-9", name: "Lamp" }, [sample], CUSTOM)
  assert.ok(row)
  assert.equal(row?.sku, "LAMP-9")
})
test("auto import ignores the sku column and auto increments", () => {
  const first = mapImportedProduct(
    { name: "One", sku: "FILE-1" },
    [sample],
    AUTO
  )
  const second = mapImportedProduct(
    { name: "Two", sku: "FILE-2" },
    [sample, first!],
    AUTO
  )
  assert.equal(first?.sku, "SKU-002")
  assert.equal(second?.sku, "SKU-003")
})
test("auto import takes stock but ignores listing and order columns", () => {
  const row = mapImportedProduct(
    {
      name: "Plain",
      status: "Out of Stock",
      lifecycle: "archived",
      productStatus: "active",
      stock: "40",
      orders: "9",
    },
    [],
    AUTO
  )
  assert.equal(row?.status, "In Stock")
  assert.equal(row?.lifecycle, "active")
  assert.equal(row?.productStatus, "none")
  assert.equal(row?.stock, 40)
  assert.equal(row?.orders, 0)
})
test("maps sale price aliases and clamps", () => {
  const cheap = mapImportedProduct({ name: "Cheap", "sale price": "5" }, [], AUTO)
  const named = mapImportedProduct({ name: "Priced", price: "300" }, [], AUTO)
  assert.equal(cheap?.salePrice, "100.00")
  assert.equal(named?.salePrice, "300.00")
})
test("maps cost price aliases and model/varient columns", () => {
  const row = mapImportedProduct(
    {
      name: "Phone",
      model: "Mobiles",
      varient: "Genuine",
      "cost price": "400",
      salePrice: "500",
    },
    [],
    AUTO
  )
  assert.equal(row?.category, "Mobiles")
  assert.equal(row?.variant, "Genuine")
  assert.equal(row?.costPrice, "400.00")
})
test("empty brand category and variant stay unassigned", () => {
  const row = mapImportedProduct({ name: "Plain" }, [], AUTO)
  assert.equal(row?.brand, "")
  assert.equal(row?.category, "")
  assert.equal(row?.variant, "")
})
test("matches catalog names case-insensitively and drops unknown names", () => {
  const unmatched: string[] = []
  const row = mapImportedProduct(
    {
      name: "Phone",
      brand: "sony",
      category: "Unknown Cat",
      variant: "GENUINE",
    },
    [],
    AUTO,
    {
      brands: ["Sony"],
      categories: ["Mobiles"],
      variants: ["Genuine", "Others"],
    },
    (name) => unmatched.push(name)
  )
  assert.equal(row?.brand, "Sony")
  assert.equal(row?.category, "")
  assert.equal(row?.variant, "Genuine")
  assert.deepEqual(unmatched, ["Unknown Cat"])
})
test("image json still imports without status fields", () => {
  const row = mapImportedProduct(
    {
      name: "Hat",
      imageUrls: '["https://cdn.example/hat.png"]',
    },
    [],
    AUTO
  )
  assert.deepEqual(row?.imageUrls, ["https://cdn.example/hat.png"])
})
test("broken image json imports as empty gallery", () => {
  const row = mapImportedProduct({ name: "No img", imageUrls: "{bad" }, [], AUTO)
  assert.deepEqual(row?.imageUrls, [])
})
test("quoted commas survive csv parse", () => {
  const csv = 'name,sku,brand\r\n"Shirt, cotton",SKU-2,"Acme, Inc"\r\n'
  const rows = parseCsv(csv)
  assert.equal(rows.length, 1)
  assert.equal(rows[0]?.name, "Shirt, cotton")
  assert.equal(rows[0]?.brand, "Acme, Inc")
})
test("empty csv and header-only csv import nothing", () => {
  assert.deepEqual(parseCsv(""), [])
  assert.deepEqual(parseCsv("name,sku\r\n"), [])
})
test("applyImportedProductRows auto-increments skus across a batch", () => {
  const { next, added } = applyImportedProductRows(
    [sample],
    [{ name: "", sku: "SKIP" }, { name: "Batch A" }, { name: "Batch B" }],
    AUTO
  )
  assert.equal(added, 2)
  assert.equal(next.length, 3)
  assert.equal(next[1]?.sku, "SKU-002")
  assert.equal(next[2]?.sku, "SKU-003")
})
test("applyImportedProductRows custom mode keeps file skus", () => {
  const { next, added } = applyImportedProductRows(
    [],
    [
      { name: "A", sku: "CUST-1" },
      { name: "B", sku: "CUST-2" },
    ],
    CUSTOM
  )
  assert.equal(added, 2)
  assert.equal(next[0]?.sku, "CUST-1")
  assert.equal(next[1]?.sku, "CUST-2")
})

console.log("\nCSV / JSON / Excel download")
test("csv roundtrip keeps product fields", () => {
  const exported = rowsToCsv([
    {
      sku: sample.sku,
      name: sample.name,
      salePrice: sample.salePrice,
      costPrice: sample.costPrice,
    },
  ])
  const parsed = parseCsv(exported)
  assert.equal(parsed[0]?.sku, sample.sku)
  assert.equal(parsed[0]?.name, sample.name)
  assert.equal(parsed[0]?.salePrice, sample.salePrice)
})
test("csv escape quotes and newlines", () => {
  assert.equal(escapeCsvCell('He said "hi"'), '"He said ""hi"""')
  const csv = rowsToCsv([{ name: "Line\nBreak" }])
  const parsed = parseCsv(csv.replace(/\r\n/g, "\n"))
  assert.ok(csv.includes('"Line\nBreak"') || parsed[0]?.name.includes("Line"))
})
test("auto sample csv has header plus one example row without sku", () => {
  const sampleCsv = buildSampleCsv(
    productImportColumns(AUTO),
    productImportSampleRow(AUTO)
  )
  const parsed = parseCsv(sampleCsv)
  assert.equal(parsed.length, 1)
  assert.equal(parsed[0]?.name, "Demo product")
  assert.equal(parsed[0]?.sku, undefined)
})
test("custom sample csv includes sku", () => {
  const sampleCsv = buildSampleCsv(
    productImportColumns(CUSTOM),
    productImportSampleRow(CUSTOM)
  )
  const parsed = parseCsv(sampleCsv)
  assert.equal(parsed[0]?.sku, "SKU-001")
})
test("export filename strips extension", () => {
  assert.equal(exportFilenameBase("products-export.csv"), "products-export")
  assert.equal(exportFilenameBase(""), "export")
})
test("json export is valid and roundtrips", () => {
  const json = rowsToJson([{ sku: "A", name: "B" }])
  const parsed = JSON.parse(json) as { sku: string; name: string }[]
  assert.equal(parsed[0]?.sku, "A")
})
test("excel workbook roundtrips rows", () => {
  const rows = [{ sku: "XLS-1", name: "Excel shirt", salePrice: "200.00" }]
  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.json_to_sheet(rows)
  XLSX.utils.book_append_sheet(wb, ws, "Data")
  const out = XLSX.write(wb, { type: "buffer", bookType: "xls" }) as Buffer
  assert.ok(out.length > 0)
  const read = XLSX.read(out, { type: "buffer" })
  const sheet = read.Sheets[read.SheetNames[0]!]
  const parsed = XLSX.utils.sheet_to_json<Record<string, string>>(sheet!)
  assert.equal(parsed[0]?.sku, "XLS-1")
  assert.equal(parsed[0]?.name, "Excel shirt")
})
test("imported csv can be exported again without losing rows", () => {
  const csv = rowsToCsv([
    { name: "Roundtrip one", salePrice: "150.00" },
    { name: "Roundtrip two", salePrice: "220.00" },
  ])
  const parsed = parseCsv(csv)
  const { next, added } = applyImportedProductRows([], parsed, AUTO)
  assert.equal(added, 2)
  const exported = rowsToCsv(
    next.map((row) => ({ sku: row.sku, name: row.name, salePrice: row.salePrice }))
  )
  const again = parseCsv(exported)
  assert.equal(again.length, 2)
  assert.equal(again[1]?.name, "Roundtrip two")
  assert.equal(again[0]?.sku, "SKU-001")
  assert.equal(again[1]?.sku, "SKU-002")
})

console.log("\nCatalog tables")
test("disabled brand ignores unmatched values", () => {
  const unmatched: string[] = []
  const row = mapImportedProduct(
    { name: "Phone", brand: "Unknown" },
    [],
    AUTO,
    {
      brands: ["Sony"],
      tables: {
        brand: false,
        category: true,
        variant: true,
      },
    },
    (name) => unmatched.push(name)
  )
  assert.equal(row?.brand, "")
  assert.deepEqual(unmatched, [])
})
test("enabled brand still matches catalog names", () => {
  const row = mapImportedProduct(
    { name: "Phone", brand: "Sony" },
    [],
    AUTO,
    {
      brands: ["Sony"],
      tables: { brand: true, category: false, variant: false },
    }
  )
  assert.equal(row?.brand, "Sony")
  assert.equal(row?.category, "")
  assert.equal(row?.variant, "")
})

console.log(`\n${passed} passed, ${failed} failed`)
if (failed > 0) process.exit(1)
