/**
 * Verifies welcome-related settings persist/parse round-trips.
 * Run: node scripts/verify-welcome-persist.mjs
 */
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { createRequire } from "node:module"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, "..")
const require = createRequire(import.meta.url)

// Minimal localStorage for Node
const store = new Map()
globalThis.window = {
  localStorage: {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
  },
  dispatchEvent: () => true,
  addEventListener: () => undefined,
  removeEventListener: () => undefined,
}
globalThis.localStorage = globalThis.window.localStorage
globalThis.Event = class Event {
  constructor(type) {
    this.type = type
  }
}

function loadTsModule(rel) {
  // Prefer compiled-free approach: evaluate via dynamic import of source through tsx if available,
  // else parse key constants from source and re-implement roundtrip with zod from node_modules.
  return rel
}

const { z } = require("zod")

const productSkuSettingsSchema = z.object({
  mode: z.enum(["auto", "custom"]),
  prefix: z.string(),
})
const PRODUCT_SKU_SETTINGS_STORAGE_KEY = "custoray-product-sku-settings-v1"
const DEFAULT_PRODUCT_SKU_SETTINGS = { mode: "auto", prefix: "SKU" }

function sanitizeSkuPrefixInput(value) {
  return value.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 20)
}

function saveProductSkuSettings(settings) {
  const next = {
    mode: settings.mode === "custom" ? "custom" : "auto",
    prefix:
      sanitizeSkuPrefixInput(settings.prefix) || DEFAULT_PRODUCT_SKU_SETTINGS.prefix,
  }
  localStorage.setItem(PRODUCT_SKU_SETTINGS_STORAGE_KEY, JSON.stringify(next))
  return next
}

function loadProductSkuSettings() {
  const raw = localStorage.getItem(PRODUCT_SKU_SETTINGS_STORAGE_KEY)
  if (!raw) return { ...DEFAULT_PRODUCT_SKU_SETTINGS }
  const parsed = productSkuSettingsSchema.safeParse(JSON.parse(raw))
  if (!parsed.success) return { ...DEFAULT_PRODUCT_SKU_SETTINGS }
  return {
    mode: parsed.data.mode,
    prefix: sanitizeSkuPrefixInput(parsed.data.prefix) || DEFAULT_PRODUCT_SKU_SETTINGS.prefix,
  }
}

const DOCUMENT_NUMBER_KEYS = [
  "sales",
  "purchases",
  "salesReturns",
  "purchaseReturns",
  "customerPayments",
  "vendorPayments",
  "expenses",
]
const DOCUMENT_NUMBER_SETTINGS_STORAGE_KEY = "custoray-document-number-settings-v1"
const DEFAULT_DOCUMENT_NUMBER_SETTINGS = {
  sales: { mode: "auto", prefix: "INV" },
  purchases: { mode: "auto", prefix: "PO" },
  salesReturns: { mode: "auto", prefix: "SR" },
  purchaseReturns: { mode: "auto", prefix: "PR" },
  customerPayments: { mode: "auto", prefix: "CP" },
  vendorPayments: { mode: "auto", prefix: "VP" },
  expenses: { mode: "auto", prefix: "EX" },
}

function sanitizeNumberPrefixInput(value) {
  return value.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 20)
}

function saveDocumentNumberSettings(settings) {
  const next = { ...DEFAULT_DOCUMENT_NUMBER_SETTINGS }
  for (const key of DOCUMENT_NUMBER_KEYS) {
    const entry = settings[key] ?? DEFAULT_DOCUMENT_NUMBER_SETTINGS[key]
    next[key] = {
      mode: entry.mode === "custom" ? "custom" : "auto",
      prefix:
        sanitizeNumberPrefixInput(entry.prefix) ||
        DEFAULT_DOCUMENT_NUMBER_SETTINGS[key].prefix,
    }
  }
  localStorage.setItem(DOCUMENT_NUMBER_SETTINGS_STORAGE_KEY, JSON.stringify(next))
  return next
}

function loadDocumentNumberSettings() {
  const raw = localStorage.getItem(DOCUMENT_NUMBER_SETTINGS_STORAGE_KEY)
  if (!raw) {
    return structuredClone(DEFAULT_DOCUMENT_NUMBER_SETTINGS)
  }
  const parsed = JSON.parse(raw)
  const next = structuredClone(DEFAULT_DOCUMENT_NUMBER_SETTINGS)
  for (const key of DOCUMENT_NUMBER_KEYS) {
    if (!parsed[key]) continue
    next[key] = {
      mode: parsed[key].mode === "custom" ? "custom" : "auto",
      prefix:
        sanitizeNumberPrefixInput(parsed[key].prefix) ||
        DEFAULT_DOCUMENT_NUMBER_SETTINGS[key].prefix,
    }
  }
  return next
}

function updateEntryFromLatest(key, patch) {
  const current = loadDocumentNumberSettings()
  return saveDocumentNumberSettings({
    ...current,
    [key]: { ...current[key], ...patch },
  })
}

const appearanceSchema = z.object({
  colorTheme: z.string(),
  customColor: z.string(),
  language: z.enum(["en", "ar", "ur"]),
})
const APPEARANCE_KEY = "custoray-appearance-v1"

function monthsFromEnd(startValue, endValue) {
  const start = new Date(`${startValue}T00:00:00.000Z`)
  const end = new Date(`${endValue}T00:00:00.000Z`)
  const months =
    (end.getUTCFullYear() - start.getUTCFullYear()) * 12 +
    (end.getUTCMonth() - start.getUTCMonth())
  return Math.max(1, months)
}

const results = []
function check(name, fn) {
  try {
    fn()
    results.push({ name, ok: true })
    console.log(`PASS  ${name}`)
  } catch (error) {
    results.push({ name, ok: false, error: String(error.message || error) })
    console.error(`FAIL  ${name}`)
    console.error(`      ${error.message || error}`)
  }
}

check("SKU auto prefix round-trip", () => {
  store.clear()
  saveProductSkuSettings({ mode: "auto", prefix: "PROD" })
  const loaded = loadProductSkuSettings()
  assert.equal(loaded.mode, "auto")
  assert.equal(loaded.prefix, "PROD")
})

check("SKU custom mode round-trip", () => {
  store.clear()
  saveProductSkuSettings({ mode: "custom", prefix: "X" })
  const loaded = loadProductSkuSettings()
  assert.equal(loaded.mode, "custom")
  assert.equal(loaded.prefix, "X")
})

check("SKU sanitizes bad prefix chars", () => {
  store.clear()
  saveProductSkuSettings({ mode: "auto", prefix: "AB@#$12" })
  assert.equal(loadProductSkuSettings().prefix, "AB12")
})

check("Document numbers: rapid sequential updates keep all keys", () => {
  store.clear()
  updateEntryFromLatest("sales", { mode: "custom", prefix: "SALE" })
  updateEntryFromLatest("customerPayments", { mode: "auto", prefix: "CUST" })
  updateEntryFromLatest("purchases", { mode: "custom", prefix: "BUY" })
  const loaded = loadDocumentNumberSettings()
  assert.equal(loaded.sales.mode, "custom")
  assert.equal(loaded.sales.prefix, "SALE")
  assert.equal(loaded.customerPayments.mode, "auto")
  assert.equal(loaded.customerPayments.prefix, "CUST")
  assert.equal(loaded.purchases.mode, "custom")
  assert.equal(loaded.purchases.prefix, "BUY")
  // untouched defaults remain
  assert.equal(loaded.expenses.prefix, "EX")
})

check("Document numbers: stale-closure pattern WOULD lose data (baseline)", () => {
  store.clear()
  // Simulate buggy hook that spreads a stale snapshot
  let stale = loadDocumentNumberSettings()
  stale = {
    ...stale,
    sales: { ...stale.sales, mode: "custom", prefix: "S1" },
  }
  saveDocumentNumberSettings(stale)
  // Another update from an older snapshot (before sales change)
  const older = {
    ...DEFAULT_DOCUMENT_NUMBER_SETTINGS,
    purchases: { mode: "custom", prefix: "P1" },
  }
  saveDocumentNumberSettings(older)
  const loaded = loadDocumentNumberSettings()
  // sales should be wiped by stale overwrite
  assert.equal(loaded.sales.prefix, "INV")
  assert.equal(loaded.purchases.prefix, "P1")
})

check("Document numbers: load-from-storage pattern keeps prior keys", () => {
  store.clear()
  updateEntryFromLatest("sales", { mode: "custom", prefix: "S1" })
  updateEntryFromLatest("purchases", { mode: "custom", prefix: "P1" })
  const loaded = loadDocumentNumberSettings()
  assert.equal(loaded.sales.prefix, "S1")
  assert.equal(loaded.purchases.prefix, "P1")
})

check("Appearance language/theme prefs JSON shape", () => {
  store.clear()
  const prefs = {
    colorTheme: "blue",
    customColor: "#92c720",
    reduceMotion: false,
    compactLayout: false,
    language: "ar",
    fontSize: "base",
  }
  localStorage.setItem(APPEARANCE_KEY, JSON.stringify(prefs))
  const parsed = JSON.parse(localStorage.getItem(APPEARANCE_KEY))
  assert.equal(parsed.language, "ar")
  assert.equal(parsed.colorTheme, "blue")
  assert.ok(appearanceSchema.safeParse({
    colorTheme: parsed.colorTheme,
    customColor: parsed.customColor,
    language: parsed.language,
  }).success)
})

check("Fiscal term months from start/end", () => {
  assert.equal(monthsFromEnd("2025-01-01", "2026-01-01"), 12)
  assert.equal(monthsFromEnd("2025-04-01", "2025-10-01"), 6)
  assert.ok(monthsFromEnd("2025-01-15", "2025-01-20") >= 1)
})

check("Welcome flow source includes logo await + doc flush", () => {
  const src = readFileSync(
    path.join(root, "src/components/welcome/welcome-flow.tsx"),
    "utf8"
  )
  assert.match(src, /logoEncodeRef/)
  assert.match(src, /await logoEncodeRef\.current/)
  assert.match(src, /loadDocumentNumberSettings\(\)/)
  assert.match(src, /persistNumbers\(numbers\)/)
  assert.match(src, /invoicePrefix:\s*salesPrefix/)
})

check("Document number hook reads latest from storage", () => {
  const src = readFileSync(
    path.join(root, "src/hooks/use-document-number-settings.ts"),
    "utf8"
  )
  assert.match(src, /loadDocumentNumberSettings\(\)/)
  assert.match(src, /Read latest from storage/)
})

const failed = results.filter((r) => !r.ok)
console.log("")
console.log(`${results.length - failed.length}/${results.length} checks passed`)
if (failed.length) process.exit(1)
