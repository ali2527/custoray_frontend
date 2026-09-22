import assert from "node:assert/strict"

import {
  buildSampleCsv,
  parseCsv,
  pickObjectKeys,
} from "../src/lib/csv"
import {
  EMPTY_EXPENSE_TYPE,
  EXPENSE_TYPE_IMPORT_COLUMNS,
  EXPENSE_TYPE_IMPORT_SAMPLE_ROW,
  expenseTypeFromFormData,
  mapImportedExpenseTypeWrite,
} from "../src/lib/expense-types"
import { expenseKeys } from "../src/lib/expenses-query"
import {
  EMPTY_EXPENSE,
  EXPENSE_IMPORT_COLUMNS,
  EXPENSE_IMPORT_SAMPLE_ROW,
  EXPENSE_METHODS,
  EXPENSE_STATUSES,
  expenseFromFormData,
  expenseStatusTabFilter,
  flattenExpenseForExport,
  mapApiExpenseToRow,
  mapImportedExpenseWrite,
  parseExpenseMethod,
  parseExpenseStatus,
  toApiExpenseWrite,
  type ExpenseRow,
  type ExpenseTypeRef,
} from "../src/lib/expenses"

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

const types: ExpenseTypeRef[] = [
  { name: "Office supplies", apiId: "type_1" },
  { name: "Travel", apiId: "type_2" },
]

const expense: ExpenseRow = {
  id: 1,
  apiId: "exp_1",
  typeId: "type_1",
  expenseNumber: "EX-4001",
  typeName: "Office supplies",
  payeeName: "",
  expenseDate: "2026-06-02",
  amount: "2500.00",
  paymentMethod: "Cash",
  status: "paid",
  notes: "Monthly stock",
}

console.log("\nExpenses flow tests\n")

console.log("Query keys")
test("expense list key is scoped to tenant", () => {
  assert.deepEqual(expenseKeys.list("t1"), ["expenses", "t1", "list"])
})

console.log("Status and method mapping")
test("status parser maps completed to paid", () => {
  assert.equal(parseExpenseStatus("completed"), "paid")
  assert.equal(parseExpenseStatus("PAID"), "paid")
  assert.equal(parseExpenseStatus("void"), "voided")
  assert.equal(parseExpenseStatus(""), "pending")
})
test("unknown payment method falls back to Cash", () => {
  assert.equal(parseExpenseMethod("Cheque"), "Cash")
  assert.equal(parseExpenseMethod("Bank transfer"), "Bank transfer")
})

console.log("API mapping")
test("api expense maps type and money fields", () => {
  const row = mapApiExpenseToRow(
    {
      id: "ckexp1",
      expenseNumber: "EX-4100",
      typeId: "type_1",
      typeName: "Office supplies",
      payeeName: "",
      expenseDate: "2026-09-21T00:00:00.000Z",
      amount: "2500.5",
      paymentMethod: "Card",
      status: "paid",
      notes: "Imported",
    },
    3
  )
  assert.equal(row.id, 4)
  assert.equal(row.apiId, "ckexp1")
  assert.equal(row.typeId, "type_1")
  assert.equal(row.expenseDate, "2026-09-21")
  assert.equal(row.amount, "2500.50")
  assert.equal(row.paymentMethod, "Card")
})
test("write payload omits blank expense numbers", () => {
  const payload = toApiExpenseWrite({
    ...expense,
    expenseNumber: "  ",
    notes: "—",
  })
  assert.equal(payload.expenseNumber, undefined)
  assert.equal(payload.notes, "")
  assert.equal(payload.typeId, "type_1")
  assert.equal(payload.amount, 2500)
})

console.log("Import")
test("import resolves type by name to typeId", () => {
  const mapped = mapImportedExpenseWrite(
    {
      typeName: "Office supplies",
      expenseDate: "2026-09-21",
      amount: "2500",
      paymentMethod: "Cash",
      status: "paid",
      notes: "Imported expense",
    },
    types
  )
  assert.deepEqual(mapped, {
    typeId: "type_1",
    typeName: "Office supplies",
    expenseNumber: undefined,
    payeeName: "",
    expenseDate: "2026-09-21",
    amount: 2500,
    paymentMethod: "Cash",
    status: "paid",
    notes: "Imported expense",
  })
})
test("import keeps expense number when provided", () => {
  const mapped = mapImportedExpenseWrite(
    {
      expenseNumber: "EX-9001",
      typeName: "Travel",
      amount: "500.00",
      paymentMethod: "Bank transfer",
      status: "pending",
    },
    types
  )
  assert.equal(mapped?.typeId, "type_2")
  assert.equal(mapped?.expenseNumber, "EX-9001")
  assert.equal(mapped?.amount, 500)
})
test("import rejects unknown type", () => {
  assert.equal(
    mapImportedExpenseWrite({ typeName: "Ghost type", amount: "10" }, types),
    null
  )
})
test("import rejects zero or invalid amount", () => {
  assert.equal(
    mapImportedExpenseWrite(
      { typeName: "Office supplies", amount: "0" },
      types
    ),
    null
  )
  assert.equal(
    mapImportedExpenseWrite(
      { typeName: "Office supplies", amount: "abc" },
      types
    ),
    null
  )
})
test("expense type import maps sample row", () => {
  const mapped = mapImportedExpenseTypeWrite(EXPENSE_TYPE_IMPORT_SAMPLE_ROW)
  assert.deepEqual(mapped, {
    name: "Office supplies",
    description: "Stationery and consumables",
    status: "active",
  })
})
test("sample csv round-trips import columns", () => {
  const csv = buildSampleCsv([...EXPENSE_IMPORT_COLUMNS], EXPENSE_IMPORT_SAMPLE_ROW)
  const parsed = parseCsv(csv)
  assert.deepEqual(parsed[0], EXPENSE_IMPORT_SAMPLE_ROW)
  const typeCsv = buildSampleCsv(
    [...EXPENSE_TYPE_IMPORT_COLUMNS],
    EXPENSE_TYPE_IMPORT_SAMPLE_ROW
  )
  assert.equal(parseCsv(typeCsv)[0]?.name, "Office supplies")
})
test("export flatten matches import columns", () => {
  const flattened = flattenExpenseForExport(expense)
  assert.deepEqual(pickObjectKeys(flattened, [...EXPENSE_IMPORT_COLUMNS]), {
    expenseNumber: "EX-4001",
    typeName: "Office supplies",
    expenseDate: "2026-06-02",
    amount: "2500.00",
    paymentMethod: "Cash",
    status: "paid",
    notes: "Monthly stock",
  })
})
test("re-imported export row keeps the same type", () => {
  const exported = flattenExpenseForExport(expense) as Record<string, string>
  const mapped = mapImportedExpenseWrite(exported, types)
  assert.equal(mapped?.typeId, "type_1")
  assert.equal(mapped?.amount, 2500)
})

console.log("Filters")
test("status tabs keep matching rows", () => {
  assert.equal(expenseStatusTabFilter(expense, "all"), true)
  assert.equal(expenseStatusTabFilter(expense, "paid"), true)
  assert.equal(expenseStatusTabFilter(expense, "pending"), false)
})
test("page date and type filters can isolate a row", () => {
  const pending: ExpenseRow = {
    ...expense,
    id: 2,
    expenseNumber: "EX-4002",
    typeName: "Travel",
    expenseDate: "2026-07-01",
    status: "pending",
  }
  const rows = [expense, pending]
  const filtered = rows.filter((row) => {
    if (row.expenseDate < "2026-06-02" || row.expenseDate > "2026-06-02") {
      return false
    }
    if (row.typeName !== "Office supplies") return false
    return true
  })
  assert.deepEqual(
    filtered.map((row) => row.expenseNumber),
    ["EX-4001"]
  )
})
test("import select columns cover statuses and methods", () => {
  assert.ok(EXPENSE_STATUSES.includes("voided"))
  assert.ok(EXPENSE_METHODS.includes("Bank transfer"))
})

console.log("Form")
test("form data captures typeId", () => {
  const fd = new FormData()
  fd.set("typeId", "type_1")
  fd.set("typeName", "Office supplies")
  fd.set("expenseNumber", "EX-4101")
  fd.set("expenseDate", "2026-09-21")
  fd.set("amount", "99.5")
  fd.set("paymentMethod", "Card")
  fd.set("status", "paid")
  fd.set("notes", "Paid")
  const row = expenseFromFormData(fd, expense)
  assert.equal(row.apiId, "exp_1")
  assert.equal(row.typeId, "type_1")
  assert.equal(row.amount, "99.50")
  assert.equal(row.paymentMethod, "Card")
})
test("expense type form data captures name", () => {
  const fd = new FormData()
  fd.set("name", "Utilities")
  fd.set("description", "Power and water")
  fd.set("status", "inactive")
  const row = expenseTypeFromFormData(fd, EMPTY_EXPENSE_TYPE)
  assert.equal(row.name, "Utilities")
  assert.equal(row.status, "inactive")
})

console.log(`\n${passed} passed, ${failed} failed`)
if (failed > 0) process.exit(1)
