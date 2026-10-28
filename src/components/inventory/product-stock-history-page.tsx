"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import {
  IconArrowDownRight,
  IconArrowLeft,
  IconArrowUpRight,
  IconPackage,
  IconSearch,
} from "@tabler/icons-react"
import { useTranslation } from "react-i18next"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { PageLoader } from "@/components/ui/page-loader"
import { SearchInput } from "@/components/ui/search-input"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { dateLocaleForLanguage } from "@/i18n/config"
import {
  apiListProductStockLedger,
  type ApiProductStockLedgerItem,
} from "@/lib/api/business"
import type { ProductRow } from "@/lib/inventory-product-rows"
import { cn } from "@/lib/utils"

type KindFilter = "all" | "in" | "out" | "sale" | "purchase" | "return" | "adjustment"

type LedgerRow = ApiProductStockLedgerItem & {
  stockBefore: number
}

function formatWhen(iso: string, locale: string) {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return { date: iso, time: "" }
  return {
    date: new Intl.DateTimeFormat(locale, {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(date),
    time: new Intl.DateTimeFormat(locale, {
      hour: "numeric",
      minute: "2-digit",
    }).format(date),
  }
}

function monthKey(iso: string) {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return "unknown"
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  return `${y}-${m}`
}

function formatMonthLabel(key: string, locale: string) {
  if (key === "unknown") return "—"
  const [y, m] = key.split("-").map(Number)
  if (!y || !m) return key
  return new Intl.DateTimeFormat(locale, {
    month: "long",
    year: "numeric",
  }).format(new Date(y, m - 1, 1))
}

function kindBadgeClass(kind: string) {
  if (kind === "sale" || kind === "pos_sale" || kind === "storefront") {
    return "border-rose-500/25 bg-rose-500/10 text-rose-700 dark:text-rose-300"
  }
  if (kind === "purchase" || kind === "return_in") {
    return "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
  }
  if (kind === "return_out") {
    return "border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300"
  }
  return "border-border bg-muted/80 text-muted-foreground"
}

function describeEvent(
  item: ApiProductStockLedgerItem,
  t: (key: string, values?: Record<string, string | number>) => string
) {
  const qty = Math.abs(item.quantityDelta)
  const party = item.partyName?.trim()
  switch (item.kind) {
    case "sale":
    case "pos_sale":
      if (party) return t("stockHistory.summary.saleWithParty", { party, qty })
      return t("stockHistory.summary.sale", { qty })
    case "storefront":
      return t("stockHistory.summary.storefront", { qty })
    case "purchase":
      if (party) return t("stockHistory.summary.purchaseWithParty", { party, qty })
      return t("stockHistory.summary.purchase", { qty })
    case "return_in":
      if (party) return t("stockHistory.summary.returnInWithParty", { party, qty })
      return t("stockHistory.summary.returnIn", { qty })
    case "return_out":
      if (party) return t("stockHistory.summary.returnOutWithParty", { party, qty })
      return t("stockHistory.summary.returnOut", { qty })
    case "adjustment":
      return item.quantityDelta >= 0
        ? t("stockHistory.summary.adjustmentIn", { qty })
        : t("stockHistory.summary.adjustmentOut", { qty })
    default:
      return item.quantityDelta >= 0
        ? t("stockHistory.summary.stockIn", { qty })
        : t("stockHistory.summary.stockOut", { qty })
  }
}

function kindLabel(kind: string, t: (key: string) => string) {
  const key = `stockHistory.kinds.${kind}`
  const translated = t(key)
  return translated === key ? t("stockHistory.kinds.other") : translated
}

function matchesFilter(item: ApiProductStockLedgerItem, filter: KindFilter) {
  if (filter === "all") return true
  if (filter === "in") return item.quantityDelta > 0
  if (filter === "out") return item.quantityDelta < 0
  if (filter === "sale") {
    return item.kind === "sale" || item.kind === "pos_sale" || item.kind === "storefront"
  }
  if (filter === "purchase") return item.kind === "purchase"
  if (filter === "return") {
    return item.kind === "return_in" || item.kind === "return_out"
  }
  if (filter === "adjustment") return item.kind === "adjustment"
  return true
}

function withStockBefore(items: ApiProductStockLedgerItem[]): LedgerRow[] {
  return items.map((item) => ({
    ...item,
    stockBefore: item.stockAfter - item.quantityDelta,
  }))
}

export function ProductStockHistoryPage({ product }: { product: ProductRow }) {
  const { t, i18n } = useTranslation("inventory")
  const locale = dateLocaleForLanguage(i18n.language)
  const [items, setItems] = useState<LedgerRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [filter, setFilter] = useState<KindFilter>("all")

  const productId = product.id?.trim() ?? ""

  useEffect(() => {
    let cancelled = false
    async function load() {
      if (!productId) {
        setItems([])
        setLoading(false)
        setError(t("stockHistory.missingId"))
        return
      }
      setLoading(true)
      setError(null)
      try {
        const res = await apiListProductStockLedger(productId)
        if (!cancelled) setItems(withStockBefore(res.items ?? []))
      } catch (err) {
        if (!cancelled) {
          setItems([])
          setError(
            err instanceof Error ? err.message : t("stockHistory.loadFailed")
          )
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [productId, t])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return items.filter((item) => {
      if (!matchesFilter(item, filter)) return false
      if (!q) return true
      const hay = [
        describeEvent(item, t),
        item.partyName,
        item.documentNumber,
        kindLabel(item.kind, t),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
      return hay.includes(q)
    })
  }, [items, filter, search, t])

  const totals = useMemo(() => {
    let inQty = 0
    let outQty = 0
    for (const item of items) {
      if (item.quantityDelta >= 0) inQty += item.quantityDelta
      else outQty += Math.abs(item.quantityDelta)
    }
    return { inQty, outQty, events: items.length }
  }, [items])

  const groups = useMemo(() => {
    const map = new Map<string, LedgerRow[]>()
    for (const item of filtered) {
      const key = monthKey(item.createdAt)
      const list = map.get(key) ?? []
      list.push(item)
      map.set(key, list)
    }
    return [...map.entries()]
  }, [filtered])

  return (
    <div className="flex w-full flex-col gap-6 pb-10">
      <div className="space-y-4">
        <Button asChild variant="ghost" size="sm" className="-ms-2 w-fit gap-1.5 px-2">
          <Link href="/inventory/products">
            <IconArrowLeft className="size-4" />
            {t("stockHistory.back")}
          </Link>
        </Button>

        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0 space-y-1">
            <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
              {t("stockHistory.title")}
            </p>
            <h1 className="text-foreground truncate text-2xl font-semibold tracking-tight sm:text-3xl">
              {product.name}
            </h1>
            <p className="text-muted-foreground text-sm">
              <span className="font-mono">{product.sku || "—"}</span>
              {product.brand ? ` · ${product.brand}` : ""}
              {product.category ? ` · ${product.category}` : ""}
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2 sm:min-w-[20rem]">
            <div className="bg-card rounded-2xl border px-3.5 py-3 shadow-sm">
              <div className="text-muted-foreground flex items-center gap-1.5 text-[11px] font-medium">
                <IconPackage className="size-3.5" />
                {t("stockHistory.currentStock")}
              </div>
              <p className="mt-1.5 text-2xl font-semibold tabular-nums tracking-tight">
                {product.stock}
              </p>
            </div>
            <div className="bg-card rounded-2xl border px-3.5 py-3 shadow-sm">
              <div className="text-muted-foreground flex items-center gap-1.5 text-[11px] font-medium">
                <IconArrowDownRight className="size-3.5 text-emerald-600" />
                {t("stockHistory.stockIn")}
              </div>
              <p className="mt-1.5 text-2xl font-semibold tabular-nums tracking-tight text-emerald-700 dark:text-emerald-400">
                +{totals.inQty}
              </p>
            </div>
            <div className="bg-card rounded-2xl border px-3.5 py-3 shadow-sm">
              <div className="text-muted-foreground flex items-center gap-1.5 text-[11px] font-medium">
                <IconArrowUpRight className="size-3.5 text-rose-600" />
                {t("stockHistory.stockOut")}
              </div>
              <p className="mt-1.5 text-2xl font-semibold tabular-nums tracking-tight text-rose-700 dark:text-rose-400">
                −{totals.outQty}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Tabs
          value={filter}
          onValueChange={(value) => setFilter(value as KindFilter)}
        >
          <TabsList className="h-auto flex-wrap justify-start gap-1 bg-transparent p-0">
            {(
              [
                ["all", t("stockHistory.filters.all")],
                ["in", t("stockHistory.filters.in")],
                ["out", t("stockHistory.filters.out")],
                ["sale", t("stockHistory.filters.sales")],
                ["purchase", t("stockHistory.filters.purchases")],
                ["return", t("stockHistory.filters.returns")],
                ["adjustment", t("stockHistory.filters.adjustments")],
              ] as const
            ).map(([value, label]) => (
              <TabsTrigger
                key={value}
                value={value}
                className="data-[state=active]:bg-foreground data-[state=active]:text-background rounded-full border px-3 py-1.5 text-xs shadow-none"
              >
                {label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <div className="w-full sm:max-w-xs">
          <SearchInput
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={t("stockHistory.search")}
            icon={<IconSearch className="size-4" />}
          />
        </div>
      </div>

      {loading ? (
        <PageLoader />
      ) : error ? (
        <p className="text-destructive text-sm">{error}</p>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed px-6 py-16 text-center">
          <p className="text-foreground text-sm font-medium">
            {items.length === 0
              ? t("stockHistory.emptyTitle")
              : t("stockHistory.emptyFiltered")}
          </p>
          <p className="text-muted-foreground mt-1 text-sm">
            {items.length === 0
              ? t("stockHistory.emptyDescription")
              : t("stockHistory.emptyFilteredHint")}
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          <p className="text-muted-foreground text-sm">
            {t("stockHistory.showing", {
              shown: filtered.length,
              total: items.length,
            })}
          </p>

          {groups.map(([key, rows]) => (
            <section key={key} className="space-y-3">
              <div className="flex items-center gap-3">
                <h2 className="text-foreground text-sm font-semibold tracking-tight">
                  {formatMonthLabel(key, locale)}
                </h2>
                <div className="bg-border h-px flex-1" />
                <span className="text-muted-foreground text-xs tabular-nums">
                  {t("stockHistory.eventCount", { count: rows.length })}
                </span>
              </div>

              <ol className="relative ms-2 space-y-0 border-s border-border/80 ps-6">
                {rows.map((item) => {
                  const when = formatWhen(item.createdAt, locale)
                  const inbound = item.quantityDelta > 0
                  return (
                    <li key={item.id} className="relative pb-5 last:pb-0">
                      <span
                        className={cn(
                          "absolute top-3 -left-[1.9rem] flex size-5 items-center justify-center rounded-full border bg-background",
                          inbound
                            ? "border-emerald-500/40 text-emerald-600"
                            : "border-rose-500/40 text-rose-600"
                        )}
                        aria-hidden
                      >
                        {inbound ? (
                          <IconArrowDownRight className="size-3" />
                        ) : (
                          <IconArrowUpRight className="size-3" />
                        )}
                      </span>

                      <article className="bg-card hover:border-border/90 rounded-2xl border px-4 py-3.5 shadow-sm transition-colors sm:px-5">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0 space-y-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge
                                variant="outline"
                                className={cn(
                                  "rounded-full font-medium",
                                  kindBadgeClass(item.kind)
                                )}
                              >
                                {kindLabel(item.kind, t)}
                              </Badge>
                              <span className="text-muted-foreground text-xs">
                                {when.date}
                                {when.time ? ` · ${when.time}` : ""}
                              </span>
                            </div>

                            <p className="text-foreground text-[15px] leading-snug font-medium">
                              {describeEvent(item, t)}
                            </p>

                            <div className="text-muted-foreground flex flex-wrap gap-x-4 gap-y-1 text-sm">
                              <span>
                                <span className="text-muted-foreground/80">
                                  {t("stockHistory.columns.document")}:{" "}
                                </span>
                                <span className="text-foreground font-mono text-[13px]">
                                  {item.documentNumber || "—"}
                                </span>
                              </span>
                              <span>
                                <span className="text-muted-foreground/80">
                                  {t("stockHistory.columns.party")}:{" "}
                                </span>
                                <span className="text-foreground">
                                  {item.partyName || "—"}
                                </span>
                              </span>
                            </div>
                          </div>

                          <div className="shrink-0 rounded-xl border bg-muted/30 px-3.5 py-2.5 sm:min-w-[10.5rem] sm:text-end">
                            <p
                              className={cn(
                                "text-lg font-semibold tabular-nums tracking-tight",
                                inbound
                                  ? "text-emerald-700 dark:text-emerald-400"
                                  : "text-rose-700 dark:text-rose-400"
                              )}
                            >
                              {inbound ? "+" : ""}
                              {item.quantityDelta}
                            </p>
                            <p className="text-muted-foreground mt-1 text-xs tabular-nums">
                              {t("stockHistory.stockPath", {
                                before: item.stockBefore,
                                after: item.stockAfter,
                              })}
                            </p>
                          </div>
                        </div>
                      </article>
                    </li>
                  )
                })}
              </ol>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
