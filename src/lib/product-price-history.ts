import { z } from "zod"

export const productPriceFieldSchema = z.enum(["sale", "cost"])
export type ProductPriceField = z.infer<typeof productPriceFieldSchema>

export const productPriceKindSchema = z.enum(["set", "increased", "decreased"])
export type ProductPriceKind = z.infer<typeof productPriceKindSchema>

export const productPriceEventSchema = z.object({
  id: z.string(),
  sku: z.string(),
  field: productPriceFieldSchema,
  kind: productPriceKindSchema,
  previousPrice: z.string().nullable(),
  price: z.string(),
  createdAt: z.string(),
})

export type ProductPriceEvent = z.infer<typeof productPriceEventSchema>

export const PRODUCT_PRICE_HISTORY_STORAGE_KEY = "custoray-product-price-history-v1"

const historyStoreSchema = z.record(z.string(), z.array(productPriceEventSchema))

type HistoryStore = Record<string, ProductPriceEvent[]>

function toPrice(value: string | number | null | undefined): string {
  const n = Number(String(value ?? "").replace(/[^0-9.-]/g, ""))
  return Number.isFinite(n) ? n.toFixed(2) : "0.00"
}

function newEventId(): string {
  return `pe-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function historyKey(sku: string): string {
  return sku.trim().toLowerCase()
}

function loadStore(): HistoryStore {
  if (typeof window === "undefined") return {}
  try {
    const raw = window.localStorage.getItem(PRODUCT_PRICE_HISTORY_STORAGE_KEY)
    if (!raw) return {}
    const parsed = historyStoreSchema.safeParse(JSON.parse(raw))
    return parsed.success ? parsed.data : {}
  } catch {
    return {}
  }
}

function saveStore(store: HistoryStore) {
  if (typeof window === "undefined") return
  window.localStorage.setItem(PRODUCT_PRICE_HISTORY_STORAGE_KEY, JSON.stringify(store))
}

export function loadProductPriceHistory(sku: string): ProductPriceEvent[] {
  const events = loadStore()[historyKey(sku)] ?? []
  return [...events].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

function historyEventKey(event: ProductPriceEvent) {
  return `${event.field}|${event.kind}|${event.previousPrice ?? ""}|${event.price}|${event.createdAt.slice(0, 16)}`
}

export function mergeProductPriceHistory(
  apiEvents: ProductPriceEvent[],
  localEvents: ProductPriceEvent[]
): ProductPriceEvent[] {
  const merged = new Map<string, ProductPriceEvent>()
  for (const event of localEvents) merged.set(historyEventKey(event), event)
  for (const event of apiEvents) merged.set(historyEventKey(event), event)
  return [...merged.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

function appendEvents(sku: string, events: ProductPriceEvent[]) {
  if (events.length === 0) return
  const key = historyKey(sku)
  const store = loadStore()
  store[key] = [...(store[key] ?? []), ...events]
  saveStore(store)
}

function kindFromPrices(previous: string, next: string): ProductPriceKind | null {
  const from = Number(previous)
  const to = Number(next)
  if (!Number.isFinite(from) || !Number.isFinite(to) || from === to) return null
  return to > from ? "increased" : "decreased"
}

function eventForField(
  sku: string,
  field: ProductPriceField,
  previousPrice: string | null,
  price: string,
  createdAt: string,
  kind?: ProductPriceKind
): ProductPriceEvent | null {
  const next = toPrice(price)
  if (previousPrice == null) {
    return {
      id: newEventId(),
      sku,
      field,
      kind: kind ?? "set",
      previousPrice: null,
      price: next,
      createdAt,
    }
  }
  const prev = toPrice(previousPrice)
  const resolvedKind = kind ?? kindFromPrices(prev, next)
  if (!resolvedKind) return null
  return {
    id: newEventId(),
    sku,
    field,
    kind: resolvedKind,
    previousPrice: prev,
    price: next,
    createdAt,
  }
}

type PricedProduct = {
  sku: string
  salePrice: string | number
  costPrice: string | number
}

export function recordProductPriceChanges(
  previous: PricedProduct | null,
  next: PricedProduct
) {
  const sku = next.sku.trim()
  if (!sku) return
  const createdAt = new Date().toISOString()
  const events = [
    eventForField(
      sku,
      "sale",
      previous ? toPrice(previous.salePrice) : null,
      toPrice(next.salePrice),
      createdAt
    ),
    eventForField(
      sku,
      "cost",
      previous ? toPrice(previous.costPrice) : null,
      toPrice(next.costPrice),
      createdAt
    ),
  ].filter((event): event is ProductPriceEvent => event !== null)

  if (previous && historyKey(previous.sku) !== historyKey(sku)) {
    moveProductPriceHistory(previous.sku, sku)
  }

  appendEvents(sku, events)
}

export function ensureInitialProductPriceHistory(product: PricedProduct) {
  const sku = product.sku.trim()
  if (!sku) return
  const existing = loadStore()[historyKey(sku)] ?? []
  const createdAt = new Date().toISOString()
  const missing: ProductPriceEvent[] = []
  if (!existing.some((event) => event.field === "sale")) {
    const event = eventForField(sku, "sale", null, toPrice(product.salePrice), createdAt)
    if (event) missing.push(event)
  }
  if (!existing.some((event) => event.field === "cost")) {
    const event = eventForField(sku, "cost", null, toPrice(product.costPrice), createdAt)
    if (event) missing.push(event)
  }
  appendEvents(sku, missing)
}

export function ensureInitialProductPriceHistories(products: PricedProduct[]) {
  for (const product of products) ensureInitialProductPriceHistory(product)
}

export function moveProductPriceHistory(fromSku: string, toSku: string) {
  const from = historyKey(fromSku)
  const to = historyKey(toSku)
  if (!from || !to || from === to) return
  const store = loadStore()
  const moved = store[from]
  if (!moved?.length) return
  store[to] = [...(store[to] ?? []), ...moved.map((event) => ({ ...event, sku: toSku }))]
  delete store[from]
  saveStore(store)
}

export function formatPriceTimelineDate(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  })
    .format(date)
    .replace(/\b(am|pm)\b/gi, (match) => match.toUpperCase())
}

export function priceFieldLabel(field: ProductPriceField): string {
  return field === "sale" ? "Sale price" : "Cost price"
}

export function priceKindLabel(kind: ProductPriceKind): string {
  if (kind === "increased") return "increased"
  if (kind === "decreased") return "decreased"
  return "set"
}
