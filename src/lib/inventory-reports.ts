import { formatMoney } from "@/lib/customers"
import { type ProductRow } from "@/lib/products"
import i18n from "@/i18n"

export type InventoryStockLevel = "In Stock" | "Low Stock" | "Out of Stock"

export type InventoryReportPreset = "this_month" | "last_month" | "custom"

export type InventoryReportDateRange = {
  start: string
  end: string
}

export type InventoryReportFilter = {
  preset: InventoryReportPreset
  start: string
  end: string
  categories: string[]
}

/** A single stock event: goods received, issued to a sale, or written off. */
export type InventoryMovementType = "receipt" | "issue" | "adjustment"

export type InventoryMovementRow = {
  date: string
  productId: number
  sku: string
  productName: string
  category: string
  type: InventoryMovementType
  quantity: number
  unitCost: string
  value: string
}

export type InventoryMovementBucketRow = {
  date: string
  label: string
  received: number
  issued: number
  adjusted: number
  net: number
  balance: number
  receivedValue: string
  issuedValue: string
}

export type InventoryAgingBucket =
  | "0-30 days"
  | "31-60 days"
  | "61-90 days"
  | "90+ days"

export type InventoryAgingRow = {
  bucket: InventoryAgingBucket
  skuCount: number
  units: number
  stockValue: string
  share: number
}

export type InventoryReorderStatus = "Critical" | "Reorder" | "Healthy" | "Overstocked"

export type InventoryReorderRow = {
  productId: number
  sku: string
  productName: string
  category: string
  brand: string
  level: InventoryStockLevel
  stock: number
  avgDailyUsage: number
  daysOfCover: number | null
  reorderPoint: number
  suggestedQty: number
  status: InventoryReorderStatus
  stockValue: string
  daysSinceLastIssue: number | null
}

export type InventoryReportSummary = {
  skuCount: number
  unitCount: number
  stockValue: string
  retailValue: string
  unitsReceived: number
  unitsIssued: number
  receivedValue: string
  issuedValue: string
  netUnits: number
  turnoverRate: number
  deadStockCount: number
  deadStockValue: string
  reorderCount: number
  criticalCount: number
  avgDaysOfCover: number | null
}

/** Assumed supplier lead time; drives the reorder point. */
export const REORDER_LEAD_TIME_DAYS = 14
/** Extra buffer held on top of lead-time demand. */
export const REORDER_SAFETY_DAYS = 7
/** Target coverage when suggesting an order quantity. */
export const REORDER_TARGET_DAYS = 30
/** No outbound movement for this long counts as dead stock. */
export const DEAD_STOCK_DAYS = 60

export const INVENTORY_AGING_BUCKETS: InventoryAgingBucket[] = [
  "0-30 days",
  "31-60 days",
  "61-90 days",
  "90+ days",
]

export const INVENTORY_REPORT_PRESETS: {
  value: InventoryReportPreset
  label: string
  description: string
}[] = [
  {
    value: "this_month",
    label: "This month",
    description: "From the 1st through today",
  },
  {
    value: "last_month",
    label: "Last month",
    description: "The previous calendar month",
  },
  {
    value: "custom",
    label: "Custom",
    description: "Choose a from and to date",
  },
]

function toMoney(value: number): string {
  return value.toFixed(2)
}

function toNumber(value: string | number): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function toLocalIsoDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

function shiftDate(iso: string, days: number): string {
  const date = new Date(`${iso}T00:00:00`)
  date.setDate(date.getDate() + days)
  return toLocalIsoDate(date)
}

function daysBetween(from: string, to: string): number {
  const start = new Date(`${from}T00:00:00`)
  const end = new Date(`${to}T00:00:00`)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 0
  return Math.round((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000))
}

function monthStartIso(year: number, monthIndex: number): string {
  return toLocalIsoDate(new Date(year, monthIndex, 1))
}

function monthEndIso(year: number, monthIndex: number): string {
  return toLocalIsoDate(new Date(year, monthIndex + 1, 0))
}

export function formatDate(value: string): string {
  const date = new Date(`${value}T00:00:00`)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date)
}

export function resolveInventoryReportRange(
  filter: Pick<InventoryReportFilter, "preset" | "start" | "end">,
  now = new Date()
): InventoryReportDateRange {
  const today = toLocalIsoDate(now)

  if (filter.preset === "this_month") {
    return {
      start: monthStartIso(now.getFullYear(), now.getMonth()),
      end: today,
    }
  }

  if (filter.preset === "last_month") {
    const year = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear()
    const month = now.getMonth() === 0 ? 11 : now.getMonth() - 1
    return {
      start: monthStartIso(year, month),
      end: monthEndIso(year, month),
    }
  }

  let start = filter.start.trim() || today
  let end = filter.end.trim() || today
  if (start > end) {
    const swap = start
    start = end
    end = swap
  }
  return { start, end }
}

export function createDefaultInventoryReportFilter(
  now = new Date()
): InventoryReportFilter {
  const range = resolveInventoryReportRange(
    { preset: "this_month", start: "", end: "" },
    now
  )
  return {
    preset: "this_month",
    start: range.start,
    end: range.end,
    categories: [],
  }
}

export function countActiveInventoryFilters(
  filter: InventoryReportFilter
): number {
  let count = 0
  if (filter.preset !== "this_month") count += 1
  if (filter.categories.length > 0) count += 1
  return count
}

export function formatInventoryReportFilterLabel(
  filter: InventoryReportFilter
): string {
  const range = resolveInventoryReportRange(filter)
  if (filter.preset === "this_month") return i18n.t("presets.thisMonth", { ns: "reports" })
  if (filter.preset === "last_month") return i18n.t("presets.lastMonth", { ns: "reports" })
  if (range.start === range.end) return formatDate(range.start)
  return `${formatDate(range.start)} – ${formatDate(range.end)}`
}

/**
 * Products carry a free-text status, so fall back to the stock count when it is
 * missing or does not match a known level.
 */
export function resolveStockLevel(product: ProductRow): InventoryStockLevel {
  const status = product.status?.trim()
  if (
    status === "In Stock" ||
    status === "Low Stock" ||
    status === "Out of Stock"
  ) {
    return status
  }
  if (product.stock <= 0) return "Out of Stock"
  if (product.stock <= 5) return "Low Stock"
  return "In Stock"
}

export function listInventoryCategories(products: ProductRow[]): string[] {
  const set = new Set<string>()
  for (const product of products) {
    set.add(product.category || "General")
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b))
}

/** Archived products are excluded, matching the inventory table's default tab. */
export function scopeInventoryProducts(
  products: ProductRow[],
  filter: InventoryReportFilter
): ProductRow[] {
  return products.filter((product) => {
    if (product.lifecycle === "archived") return false
    const category = product.category || "General"
    if (filter.categories.length > 0 && !filter.categories.includes(category)) {
      return false
    }
    return true
  })
}

/** Deterministic 0–1 from a string seed (stable across renders). */
function demoNoise(seed: string): number {
  let hash = 0
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0
  }
  return (hash % 1000) / 1000
}

/** How many days of movement history the ledger covers. */
const LEDGER_WINDOW_DAYS = 120

/**
 * Products only store a current stock count, so the movement history is
 * synthesised per SKU. Receipts and issues are generated first, then the
 * opening balance is solved so the ledger closes exactly on `product.stock`.
 */
export function buildInventoryMovements(
  products: ProductRow[],
  now = new Date()
): InventoryMovementRow[] {
  const today = toLocalIsoDate(now)
  const movements: InventoryMovementRow[] = []

  for (const product of products) {
    const unitCost = toNumber(product.costPrice)
    const category = product.category || "General"
    // Busier products churn faster; `orders` is the only velocity hint we have.
    const velocity = Math.max(0.2, Math.min(6, product.orders / 6))
    const issues: { date: string; quantity: number }[] = []
    const receipts: { date: string; quantity: number }[] = []
    const adjustments: { date: string; quantity: number }[] = []

    for (let offset = LEDGER_WINDOW_DAYS - 1; offset >= 0; offset--) {
      const date = shiftDate(today, -offset)
      const seed = `${product.sku}-${date}`

      // Out-of-stock items stop selling once they run dry near the window end.
      const stalled = product.stock === 0 && offset < 20
      if (!stalled && demoNoise(`${seed}-issue`) > 0.55) {
        const qty = Math.max(
          1,
          Math.round(velocity * (0.5 + demoNoise(`${seed}-iq`) * 1.5))
        )
        issues.push({ date, quantity: qty })
      }

      // Restock roughly every three weeks.
      if (offset % 21 === 5 && demoNoise(`${seed}-recv`) > 0.25) {
        const qty = Math.max(
          5,
          Math.round(velocity * 18 * (0.6 + demoNoise(`${seed}-rq`) * 0.9))
        )
        receipts.push({ date, quantity: qty })
      }

      if (demoNoise(`${seed}-adj`) > 0.985) {
        adjustments.push({
          date,
          quantity: 1 + Math.floor(demoNoise(`${seed}-aq`) * 3),
        })
      }
    }

    const totalIssued = issues.reduce((sum, row) => sum + row.quantity, 0)
    const totalAdjusted = adjustments.reduce((sum, row) => sum + row.quantity, 0)
    let totalReceived = receipts.reduce((sum, row) => sum + row.quantity, 0)

    // closing = opening + received - issued - adjusted, and closing must equal
    // the product's current stock. A negative opening balance means the random
    // receipts overshot, so scale them back to what the closing stock allows.
    let opening = product.stock - totalReceived + totalIssued + totalAdjusted
    if (opening < 0) {
      const target = product.stock + totalIssued + totalAdjusted
      const scale = totalReceived > 0 ? target / totalReceived : 0
      let scaled = 0
      for (const receipt of receipts) {
        receipt.quantity = Math.max(0, Math.floor(receipt.quantity * scale))
        scaled += receipt.quantity
      }
      // Flooring loses a few units; put the remainder on the first receipt.
      if (receipts.length > 0) receipts[0].quantity += target - scaled
      totalReceived = target
      opening = 0
    }

    const push = (
      type: InventoryMovementType,
      rows: { date: string; quantity: number }[]
    ) => {
      for (const row of rows) {
        if (row.quantity <= 0) continue
        movements.push({
          date: row.date,
          productId: product.id,
          sku: product.sku,
          productName: product.name,
          category,
          type,
          quantity: row.quantity,
          unitCost: toMoney(unitCost),
          value: toMoney(unitCost * row.quantity),
        })
      }
    }

    push("receipt", receipts)
    push("issue", issues)
    push("adjustment", adjustments)
  }

  return movements.sort((a, b) => a.date.localeCompare(b.date))
}

export function filterMovementsByPeriod(
  movements: InventoryMovementRow[],
  filter: InventoryReportFilter
): InventoryMovementRow[] {
  const range = resolveInventoryReportRange(filter)
  const allowed =
    filter.categories.length > 0 ? new Set(filter.categories) : null
  return movements.filter((row) => {
    if (row.date < range.start || row.date > range.end) return false
    if (allowed && !allowed.has(row.category)) return false
    return true
  })
}

export type InventoryTimelineBucket = "day" | "week" | "month"

export function resolveInventoryTimelineBucket(
  range: InventoryReportDateRange,
  preset?: InventoryReportPreset
): InventoryTimelineBucket {
  const days = daysBetween(range.start, range.end) + 1
  if (days > 93) return "month"
  if (preset === "this_month" || preset === "last_month" || days <= 31) {
    return "day"
  }
  return "week"
}

export function inventoryTimelineBucketLabel(
  bucket: InventoryTimelineBucket
): string {
  return i18n.t(`buckets.${bucket}`, { ns: "reports" })
}

function startOfWeekMonday(iso: string): string {
  const date = new Date(`${iso}T00:00:00`)
  const day = date.getDay()
  const diff = day === 0 ? -6 : 1 - day
  date.setDate(date.getDate() + diff)
  return toLocalIsoDate(date)
}

function formatWeekLabel(weekStart: string): string {
  const start = new Date(`${weekStart}T00:00:00`)
  const end = new Date(start)
  end.setDate(end.getDate() + 6)
  const dayMonth: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" }
  const from = new Intl.DateTimeFormat("en-GB", dayMonth).format(start)
  const to = new Intl.DateTimeFormat("en-GB", dayMonth).format(end)
  return `${from} – ${to}`
}

function formatMonthBucketLabel(yyyyMm: string): string {
  const [year, month] = yyyyMm.split("-").map(Number)
  if (!year || !month) return yyyyMm
  return new Intl.DateTimeFormat("en-GB", {
    month: "short",
    year: "numeric",
  }).format(new Date(year, month - 1, 1))
}

function bucketKeyForDate(iso: string, bucket: InventoryTimelineBucket): string {
  if (bucket === "month") return iso.slice(0, 7)
  if (bucket === "week") return startOfWeekMonday(iso)
  return iso
}

function bucketLabelForKey(
  key: string,
  bucket: InventoryTimelineBucket
): string {
  if (bucket === "month") return formatMonthBucketLabel(key)
  if (bucket === "week") return formatWeekLabel(key)
  return formatDate(key)
}

/**
 * Continuous in/out series with a running closing balance. The balance is
 * seeded from stock on hand and rolled backwards so the last bucket lands on
 * the current total.
 */
export function computeInventoryMovementTimeline(
  products: ProductRow[],
  movements: InventoryMovementRow[],
  filter: InventoryReportFilter
): InventoryMovementBucketRow[] {
  const range = resolveInventoryReportRange(filter)
  const scoped = filterMovementsByPeriod(movements, filter)

  const daily = new Map<
    string,
    {
      received: number
      issued: number
      adjusted: number
      receivedValue: number
      issuedValue: number
    }
  >()

  for (const row of scoped) {
    const current = daily.get(row.date) ?? {
      received: 0,
      issued: 0,
      adjusted: 0,
      receivedValue: 0,
      issuedValue: 0,
    }
    if (row.type === "receipt") {
      current.received += row.quantity
      current.receivedValue += toNumber(row.value)
    } else if (row.type === "issue") {
      current.issued += row.quantity
      current.issuedValue += toNumber(row.value)
    } else {
      current.adjusted += row.quantity
    }
    daily.set(row.date, current)
  }

  const buckets = new Map<
    string,
    {
      received: number
      issued: number
      adjusted: number
      receivedValue: number
      issuedValue: number
    }
  >()

  let cursor = range.start
  while (cursor <= range.end) {
    const stats = daily.get(cursor) ?? {
      received: 0,
      issued: 0,
      adjusted: 0,
      receivedValue: 0,
      issuedValue: 0,
    }
    const key = bucketKeyForDate(cursor, resolveInventoryTimelineBucket(range, filter.preset))
    const current = buckets.get(key) ?? {
      received: 0,
      issued: 0,
      adjusted: 0,
      receivedValue: 0,
      issuedValue: 0,
    }
    buckets.set(key, {
      received: current.received + stats.received,
      issued: current.issued + stats.issued,
      adjusted: current.adjusted + stats.adjusted,
      receivedValue: current.receivedValue + stats.receivedValue,
      issuedValue: current.issuedValue + stats.issuedValue,
    })
    cursor = shiftDate(cursor, 1)
  }

  const bucket = resolveInventoryTimelineBucket(range, filter.preset)
  const ordered = Array.from(buckets.entries()).sort((a, b) =>
    a[0].localeCompare(b[0])
  )

  const closingStock = scopeInventoryProducts(products, filter).reduce(
    (sum, product) => sum + product.stock,
    0
  )

  // Walk backwards from today's stock to recover each bucket's closing balance.
  const balances: number[] = new Array(ordered.length).fill(0)
  let running = closingStock
  for (let i = ordered.length - 1; i >= 0; i--) {
    balances[i] = running
    const stats = ordered[i][1]
    running = running - stats.received + stats.issued + stats.adjusted
  }

  return ordered.map(([key, stats], index) => ({
    date: key,
    label: bucketLabelForKey(key, bucket),
    received: stats.received,
    issued: stats.issued,
    adjusted: stats.adjusted,
    net: stats.received - stats.issued - stats.adjusted,
    balance: Math.max(0, balances[index]),
    receivedValue: toMoney(stats.receivedValue),
    issuedValue: toMoney(stats.issuedValue),
  }))
}

/** Days since each product last moved outbound, across the whole ledger. */
function lastIssueByProduct(
  movements: InventoryMovementRow[]
): Map<number, string> {
  const map = new Map<number, string>()
  for (const row of movements) {
    if (row.type !== "issue") continue
    const current = map.get(row.productId)
    if (!current || row.date > current) map.set(row.productId, row.date)
  }
  return map
}

function agingBucketFor(days: number | null): InventoryAgingBucket {
  if (days == null) return "90+ days"
  if (days <= 30) return "0-30 days"
  if (days <= 60) return "31-60 days"
  if (days <= 90) return "61-90 days"
  return "90+ days"
}

export function computeInventoryAging(
  products: ProductRow[],
  movements: InventoryMovementRow[],
  filter: InventoryReportFilter,
  now = new Date()
): InventoryAgingRow[] {
  const today = toLocalIsoDate(now)
  const scoped = scopeInventoryProducts(products, filter)
  const lastIssue = lastIssueByProduct(movements)

  const totals = new Map<
    InventoryAgingBucket,
    { skuCount: number; units: number; stockValue: number }
  >()
  let totalValue = 0

  for (const product of scoped) {
    if (product.stock <= 0) continue
    const last = lastIssue.get(product.id)
    const days = last ? daysBetween(last, today) : null
    const bucket = agingBucketFor(days)
    const value = toNumber(product.costPrice) * product.stock
    totalValue += value

    const current = totals.get(bucket) ?? {
      skuCount: 0,
      units: 0,
      stockValue: 0,
    }
    totals.set(bucket, {
      skuCount: current.skuCount + 1,
      units: current.units + product.stock,
      stockValue: current.stockValue + value,
    })
  }

  return INVENTORY_AGING_BUCKETS.map((bucket) => {
    const stats = totals.get(bucket) ?? {
      skuCount: 0,
      units: 0,
      stockValue: 0,
    }
    return {
      bucket,
      skuCount: stats.skuCount,
      units: stats.units,
      stockValue: toMoney(stats.stockValue),
      share: totalValue > 0 ? (stats.stockValue / totalValue) * 100 : 0,
    }
  })
}

export function computeReorderRows(
  products: ProductRow[],
  movements: InventoryMovementRow[],
  filter: InventoryReportFilter,
  now = new Date()
): InventoryReorderRow[] {
  const today = toLocalIsoDate(now)
  const scoped = scopeInventoryProducts(products, filter)
  const lastIssue = lastIssueByProduct(movements)

  const issuedByProduct = new Map<number, number>()
  for (const row of movements) {
    if (row.type !== "issue") continue
    issuedByProduct.set(
      row.productId,
      (issuedByProduct.get(row.productId) ?? 0) + row.quantity
    )
  }

  return scoped
    .map((product) => {
      const issued = issuedByProduct.get(product.id) ?? 0
      const avgDailyUsage = issued / LEDGER_WINDOW_DAYS
      const daysOfCover =
        avgDailyUsage > 0 ? product.stock / avgDailyUsage : null
      const reorderPoint = Math.ceil(
        avgDailyUsage * (REORDER_LEAD_TIME_DAYS + REORDER_SAFETY_DAYS)
      )
      const target = Math.ceil(
        avgDailyUsage * (REORDER_LEAD_TIME_DAYS + REORDER_TARGET_DAYS)
      )
      const suggestedQty = Math.max(0, target - product.stock)
      const last = lastIssue.get(product.id)
      const daysSinceLastIssue = last ? daysBetween(last, today) : null

      let status: InventoryReorderStatus
      if (product.stock <= 0) {
        status = "Critical"
      } else if (daysOfCover != null && daysOfCover <= REORDER_LEAD_TIME_DAYS) {
        status = "Critical"
      } else if (product.stock <= reorderPoint) {
        status = "Reorder"
      } else if (
        daysSinceLastIssue != null &&
        daysSinceLastIssue >= DEAD_STOCK_DAYS
      ) {
        status = "Overstocked"
      } else if (daysOfCover == null) {
        status = "Overstocked"
      } else {
        status = "Healthy"
      }

      return {
        productId: product.id,
        sku: product.sku,
        productName: product.name,
        category: product.category || "General",
        brand: product.brand || "—",
        level: resolveStockLevel(product),
        stock: product.stock,
        avgDailyUsage,
        daysOfCover,
        reorderPoint,
        suggestedQty,
        status,
        stockValue: toMoney(toNumber(product.costPrice) * product.stock),
        daysSinceLastIssue,
      }
    })
    .sort((a, b) => {
      const priority: Record<InventoryReorderStatus, number> = {
        Critical: 0,
        Reorder: 1,
        Overstocked: 2,
        Healthy: 3,
      }
      const cmp = priority[a.status] - priority[b.status]
      if (cmp !== 0) return cmp
      const aCover = a.daysOfCover ?? Number.POSITIVE_INFINITY
      const bCover = b.daysOfCover ?? Number.POSITIVE_INFINITY
      return aCover - bCover
    })
}

export function computeInventoryReportSummary(
  products: ProductRow[],
  movements: InventoryMovementRow[],
  filter: InventoryReportFilter,
  now = new Date()
): InventoryReportSummary {
  const scoped = scopeInventoryProducts(products, filter)
  const periodMovements = filterMovementsByPeriod(movements, filter)
  const reorderRows = computeReorderRows(products, movements, filter, now)
  const aging = computeInventoryAging(products, movements, filter, now)

  const stockValue = scoped.reduce(
    (sum, product) => sum + toNumber(product.costPrice) * product.stock,
    0
  )
  const retailValue = scoped.reduce(
    (sum, product) => sum + toNumber(product.salePrice) * product.stock,
    0
  )
  const unitCount = scoped.reduce((sum, product) => sum + product.stock, 0)

  let unitsReceived = 0
  let unitsIssued = 0
  let receivedValue = 0
  let issuedValue = 0
  for (const row of periodMovements) {
    if (row.type === "receipt") {
      unitsReceived += row.quantity
      receivedValue += toNumber(row.value)
    } else if (row.type === "issue") {
      unitsIssued += row.quantity
      issuedValue += toNumber(row.value)
    }
  }

  const dead = aging
    .filter(
      (row) => row.bucket === "61-90 days" || row.bucket === "90+ days"
    )
    .reduce(
      (acc, row) => ({
        count: acc.count + row.skuCount,
        value: acc.value + toNumber(row.stockValue),
      }),
      { count: 0, value: 0 }
    )

  const covers = reorderRows
    .map((row) => row.daysOfCover)
    .filter((value): value is number => value != null)

  return {
    skuCount: scoped.length,
    unitCount,
    stockValue: toMoney(stockValue),
    retailValue: toMoney(retailValue),
    unitsReceived,
    unitsIssued,
    receivedValue: toMoney(receivedValue),
    issuedValue: toMoney(issuedValue),
    netUnits: unitsReceived - unitsIssued,
    turnoverRate: unitCount > 0 ? (unitsIssued / unitCount) * 100 : 0,
    deadStockCount: dead.count,
    deadStockValue: toMoney(dead.value),
    reorderCount: reorderRows.filter(
      (row) => row.status === "Critical" || row.status === "Reorder"
    ).length,
    criticalCount: reorderRows.filter((row) => row.status === "Critical").length,
    avgDaysOfCover:
      covers.length > 0
        ? covers.reduce((sum, value) => sum + value, 0) / covers.length
        : null,
  }
}

/** Fastest-moving products by units issued in the selected period. */
export function computeTopMovers(
  movements: InventoryMovementRow[],
  filter: InventoryReportFilter,
  limit = 6
): { sku: string; productName: string; issued: number; value: string }[] {
  const scoped = filterMovementsByPeriod(movements, filter).filter(
    (row) => row.type === "issue"
  )
  const map = new Map<string, { productName: string; issued: number; value: number }>()

  for (const row of scoped) {
    const current = map.get(row.sku) ?? {
      productName: row.productName,
      issued: 0,
      value: 0,
    }
    map.set(row.sku, {
      productName: row.productName,
      issued: current.issued + row.quantity,
      value: current.value + toNumber(row.value),
    })
  }

  return Array.from(map.entries())
    .map(([sku, stats]) => ({
      sku,
      productName: stats.productName,
      issued: stats.issued,
      value: toMoney(stats.value),
    }))
    .sort((a, b) => b.issued - a.issued)
    .slice(0, limit)
}

export function formatInventoryReportMoney(value: string): string {
  return formatMoney(value)
}

export function reorderStatusBadgeClass(status: InventoryReorderStatus): string {
  if (status === "Critical")
    return "border-rose-500/30 px-1.5 text-rose-700 dark:text-rose-400"
  if (status === "Reorder")
    return "border-amber-500/30 px-1.5 text-amber-700 dark:text-amber-400"
  if (status === "Overstocked")
    return "border-violet-500/30 px-1.5 text-violet-700 dark:text-violet-400"
  return "border-emerald-500/30 px-1.5 text-emerald-700 dark:text-emerald-400"
}

export function formatDaysOfCover(days: number | null): string {
  if (days == null) return "—"
  if (!Number.isFinite(days)) return "—"
  if (days >= 999) return "999+"
  return days < 10 ? days.toFixed(1) : String(Math.round(days))
}
