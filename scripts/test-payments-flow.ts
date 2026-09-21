import assert from "node:assert/strict"

import {
  buildSampleCsv,
  parseCsv,
  pickObjectKeys,
} from "../src/lib/csv"
import { paymentKeys } from "../src/lib/payments-query"
import {
  CUSTOMER_PAYMENT_IMPORT_SAMPLE_ROW,
  PAYMENT_IMPORT_COLUMNS,
  PAYMENT_METHODS,
  PAYMENT_STATUSES,
  VENDOR_PAYMENT_IMPORT_SAMPLE_ROW,
  flattenPaymentForExport,
  fromApiPaymentType,
  mapApiPaymentToRow,
  mapImportedPaymentWrite,
  partySelectValue,
  paymentFromFormData,
  paymentStatusTabFilter,
  parsePaymentMethod,
  parsePaymentStatus,
  parsePaymentType,
  toApiPaymentType,
  toApiPaymentWrite,
  type PaymentParty,
  type PaymentRow,
} from "../src/lib/payments"

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

const parties: PaymentParty[] = [
  { name: "Acme Retail Co.", apiId: "buyer_1" },
  { name: "Karachi Steel Supplies", apiId: "vendor_1" },
]

const customerPayment: PaymentRow = {
  id: 1,
  apiId: "pay_1",
  partyId: "buyer_1",
  paymentNumber: "CP-4001",
  type: "customer",
  partyName: "Acme Retail Co.",
  referenceNumber: "INV-1001",
  paymentDate: "2026-06-02",
  amount: "1500.00",
  paymentMethod: "Cash",
  status: "completed",
  notes: "Full settlement",
}

const vendorPayment: PaymentRow = {
  ...customerPayment,
  id: 2,
  apiId: "pay_2",
  partyId: "vendor_1",
  paymentNumber: "VP-5001",
  type: "vendor",
  partyName: "Karachi Steel Supplies",
  referenceNumber: "PO-2001",
  paymentMethod: "Bank transfer",
  status: "pending",
  notes: "Monthly stock",
}

console.log("\nPayments flow tests\n")

console.log("Query keys")
test("payment list key is scoped to tenant", () => {
  assert.deepEqual(paymentKeys.list("t1"), ["payments", "t1", "list"])
})

console.log("Type and status mapping")
test("frontend types map to backend enums", () => {
  assert.equal(toApiPaymentType("customer"), "CUSTOMER")
  assert.equal(toApiPaymentType("vendor"), "VENDOR")
  assert.equal(fromApiPaymentType("CUSTOMER"), "customer")
  assert.equal(fromApiPaymentType("VENDOR"), "vendor")
})
test("payment type parser accepts aliases", () => {
  assert.equal(parsePaymentType("vendor payment"), "vendor")
  assert.equal(parsePaymentType("CUSTOMER"), "customer")
})
test("status parser maps void aliases", () => {
  assert.equal(parsePaymentStatus("void"), "voided")
  assert.equal(parsePaymentStatus("COMPLETED"), "completed")
  assert.equal(parsePaymentStatus(""), "pending")
})
test("unknown payment method falls back to Cash", () => {
  assert.equal(parsePaymentMethod("Cheque"), "Cash")
  assert.equal(parsePaymentMethod("Bank transfer"), "Bank transfer")
})

console.log("API mapping")
test("api payment maps party and money fields", () => {
  const row = mapApiPaymentToRow(
    {
      id: "ckpay1",
      paymentNumber: "CP-4100",
      type: "CUSTOMER",
      partyId: "buyer_1",
      partyName: "Acme Retail Co.",
      referenceNumber: "INV-1001",
      paymentDate: "2026-09-21T00:00:00.000Z",
      amount: "1500.5",
      paymentMethod: "Card",
      status: "completed",
      notes: "Imported",
    },
    3
  )
  assert.equal(row.id, 4)
  assert.equal(row.apiId, "ckpay1")
  assert.equal(row.partyId, "buyer_1")
  assert.equal(row.type, "customer")
  assert.equal(row.paymentDate, "2026-09-21")
  assert.equal(row.amount, "1500.50")
  assert.equal(row.paymentMethod, "Card")
})
test("write payload omits blank payment numbers", () => {
  const payload = toApiPaymentWrite({
    ...customerPayment,
    paymentNumber: "  ",
    referenceNumber: "—",
    notes: "—",
  })
  assert.equal(payload.paymentNumber, undefined)
  assert.equal(payload.referenceNumber, "")
  assert.equal(payload.notes, "")
  assert.equal(payload.type, "CUSTOMER")
  assert.equal(payload.partyId, "buyer_1")
  assert.equal(payload.amount, 1500)
})

console.log("Import")
test("import resolves customer by name to partyId", () => {
  const mapped = mapImportedPaymentWrite(
    {
      partyName: "Acme Retail Co.",
      paymentDate: "2026-09-21",
      amount: "1500",
      paymentMethod: "Cash",
      status: "completed",
      referenceNumber: "INV-1001",
      notes: "Imported customer payment",
    },
    "customer",
    parties
  )
  assert.deepEqual(mapped, {
    type: "CUSTOMER",
    partyId: "buyer_1",
    partyName: "Acme Retail Co.",
    paymentNumber: undefined,
    referenceNumber: "INV-1001",
    paymentDate: "2026-09-21",
    amount: 1500,
    paymentMethod: "Cash",
    status: "completed",
    notes: "Imported customer payment",
  })
})
test("import resolves vendor by name and keeps payment number", () => {
  const mapped = mapImportedPaymentWrite(
    {
      paymentNumber: "VP-9001",
      partyName: "Karachi Steel Supplies",
      amount: "2500.00",
      paymentMethod: "Bank transfer",
      status: "pending",
    },
    "vendor",
    parties
  )
  assert.equal(mapped?.type, "VENDOR")
  assert.equal(mapped?.partyId, "vendor_1")
  assert.equal(mapped?.paymentNumber, "VP-9001")
  assert.equal(mapped?.amount, 2500)
})
test("import rejects unknown party", () => {
  assert.equal(
    mapImportedPaymentWrite(
      { partyName: "Ghost Buyer", amount: "10" },
      "customer",
      parties
    ),
    null
  )
})
test("import rejects zero or invalid amount", () => {
  assert.equal(
    mapImportedPaymentWrite(
      { partyName: "Acme Retail Co.", amount: "0" },
      "customer",
      parties
    ),
    null
  )
  assert.equal(
    mapImportedPaymentWrite(
      { partyName: "Acme Retail Co.", amount: "abc" },
      "customer",
      parties
    ),
    null
  )
})
test("sample csv round-trips import columns", () => {
  const csv = buildSampleCsv(
    [...PAYMENT_IMPORT_COLUMNS],
    CUSTOMER_PAYMENT_IMPORT_SAMPLE_ROW
  )
  const parsed = parseCsv(csv)
  assert.deepEqual(parsed[0], CUSTOMER_PAYMENT_IMPORT_SAMPLE_ROW)
  const vendorCsv = buildSampleCsv(
    [...PAYMENT_IMPORT_COLUMNS],
    VENDOR_PAYMENT_IMPORT_SAMPLE_ROW
  )
  assert.equal(parseCsv(vendorCsv)[0]?.partyName, "Karachi Steel Supplies")
})
test("export flatten matches import columns", () => {
  const flattened = flattenPaymentForExport(customerPayment)
  assert.deepEqual(
    pickObjectKeys(flattened, [...PAYMENT_IMPORT_COLUMNS]),
    {
      paymentNumber: "CP-4001",
      partyName: "Acme Retail Co.",
      paymentDate: "2026-06-02",
      amount: "1500.00",
      paymentMethod: "Cash",
      status: "completed",
      referenceNumber: "INV-1001",
      notes: "Full settlement",
    }
  )
})
test("re-imported export row keeps the same party", () => {
  const exported = flattenPaymentForExport(vendorPayment) as Record<string, string>
  const mapped = mapImportedPaymentWrite(exported, "vendor", parties)
  assert.equal(mapped?.partyId, "vendor_1")
  assert.equal(mapped?.type, "VENDOR")
  assert.equal(mapped?.amount, 1500)
})

console.log("Filters")
test("status tabs keep matching rows", () => {
  assert.equal(paymentStatusTabFilter(customerPayment, "all"), true)
  assert.equal(paymentStatusTabFilter(customerPayment, "completed"), true)
  assert.equal(paymentStatusTabFilter(customerPayment, "pending"), false)
  assert.equal(paymentStatusTabFilter(vendorPayment, "pending"), true)
})
test("page date and method filters can isolate a row", () => {
  const rows = [customerPayment, vendorPayment]
  const filtered = rows.filter((row) => {
    if (row.paymentDate < "2026-06-02" || row.paymentDate > "2026-06-02") {
      return false
    }
    if (row.paymentMethod !== "Cash") return false
    return true
  })
  assert.deepEqual(
    filtered.map((row) => row.paymentNumber),
    ["CP-4001"]
  )
})
test("import select columns cover statuses and methods", () => {
  assert.ok(PAYMENT_STATUSES.includes("voided"))
  assert.ok(PAYMENT_METHODS.includes("Bank transfer"))
})

console.log("Form")
test("form data captures backend partyId", () => {
  const fd = new FormData()
  fd.set("type", "customer")
  fd.set("partyId", "buyer_1")
  fd.set("partyName", "Acme Retail Co.")
  fd.set("paymentNumber", "CP-4101")
  fd.set("paymentDate", "2026-09-21")
  fd.set("amount", "99.5")
  fd.set("paymentMethod", "Card")
  fd.set("status", "completed")
  fd.set("referenceNumber", "INV-9")
  fd.set("notes", "Paid")
  const row = paymentFromFormData(fd, customerPayment)
  assert.equal(row.apiId, "pay_1")
  assert.equal(row.partyId, "buyer_1")
  assert.equal(row.amount, "99.50")
  assert.equal(row.paymentMethod, "Card")
})
test("party select value prefers apiId", () => {
  assert.equal(partySelectValue({ id: 12, apiId: "buyer_1" }), "buyer_1")
  assert.equal(partySelectValue({ id: 12, apiId: "" }), "12")
})

console.log(`\n${passed} passed, ${failed} failed`)
if (failed > 0) process.exit(1)
