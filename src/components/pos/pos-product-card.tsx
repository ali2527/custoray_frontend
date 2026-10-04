"use client"

import { IconPackage, IconPlus } from "@tabler/icons-react"
import { useTranslation } from "react-i18next"

import type { ProductRow } from "@/lib/products"
import { cn } from "@/lib/utils"

type PosProductCardProps = {
  product: ProductRow
  inCartQty: number
  formatPrice: (value: string) => string
  onAdd: (product: ProductRow) => void
  /** When false, out-of-stock items remain tappable (e.g. POS returns). */
  disableWhenOutOfStock?: boolean
  showSku?: boolean
  showStock?: boolean
  lowStockThreshold?: number
}

function productInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return "?"
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase()
}

export function PosProductCard({
  product,
  inCartQty,
  formatPrice,
  onAdd,
  disableWhenOutOfStock = true,
  showSku = true,
  showStock = true,
  lowStockThreshold = 5,
}: PosProductCardProps) {
  const { t } = useTranslation("pos")
  const outOfStock = product.stock <= 0
  const lowStock = !outOfStock && product.stock <= lowStockThreshold
  const imageUrl = product.imageUrls?.[0]?.trim()
  const isDisabled = disableWhenOutOfStock && outOfStock

  return (
    <button
      type="button"
      disabled={isDisabled}
      onClick={() => onAdd(product)}
      className={cn(
        "group relative flex h-full flex-col overflow-hidden rounded-xl bg-card text-left",
        "shadow-sm shadow-black/[0.04] ring-1 ring-border/40",
        "transition-all hover:-translate-y-0.5 hover:shadow-md hover:ring-primary/25",
        "focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
        isDisabled && "cursor-not-allowed opacity-55 hover:translate-y-0 hover:shadow-sm hover:ring-border/40"
      )}
    >
      {inCartQty > 0 ? (
        <span className="bg-primary text-primary-foreground absolute top-2 right-2 z-10 flex size-6 items-center justify-center rounded-full text-[11px] font-semibold shadow-sm">
          {inCartQty}
        </span>
      ) : !isDisabled ? (
        <span className="bg-background/90 text-muted-foreground absolute top-2 right-2 z-10 flex size-6 items-center justify-center rounded-full opacity-100 shadow-sm ring-1 ring-border/50 transition-opacity lg:opacity-0 lg:group-hover:opacity-100">
          <IconPlus className="size-3.5" stroke={2} />
        </span>
      ) : null}

      <div className="relative h-16 w-full shrink-0 overflow-hidden bg-muted/40 sm:h-20">
        {imageUrl ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={imageUrl}
            alt=""
            className="size-full object-cover transition-transform duration-300 group-hover:scale-[1.04]"
          />
        ) : (
          <div className="text-muted-foreground flex size-full flex-col items-center justify-center gap-1.5 bg-gradient-to-b from-muted/20 to-muted/55 px-2">
            <div className="bg-background/80 flex size-9 items-center justify-center rounded-lg ring-1 ring-border/40">
              <IconPackage className="size-4" stroke={1.5} />
            </div>
            <span className="text-muted-foreground/80 truncate text-[10px] font-semibold tracking-wide uppercase">
              {productInitials(product.name)}
            </span>
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-1.5 p-3">
        <div className="min-h-0 flex-1">
          <p className="line-clamp-2 text-sm leading-snug font-medium">{product.name}</p>
          {showSku ? (
            <p className="text-muted-foreground mt-0.5 truncate text-xs">
              {product.sku}
              {product.brand && product.brand !== "—" ? ` · ${product.brand}` : ""}
            </p>
          ) : product.brand && product.brand !== "—" ? (
            <p className="text-muted-foreground mt-0.5 truncate text-xs">{product.brand}</p>
          ) : null}
        </div>

        <div className="mt-auto flex items-end justify-between gap-2 border-t border-border/40 pt-2">
          <span className="text-foreground text-sm font-semibold tabular-nums">
            {formatPrice(product.salePrice)}
          </span>
          {showStock ? (
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium",
                outOfStock && "bg-muted text-muted-foreground",
                lowStock && "bg-amber-500/10 text-amber-800 dark:text-amber-300",
                !outOfStock && !lowStock && "bg-emerald-500/10 text-emerald-800 dark:text-emerald-300"
              )}
            >
              <span
                className={cn(
                  "size-1.5 rounded-full",
                  outOfStock && "bg-muted-foreground/50",
                  lowStock && "bg-amber-500",
                  !outOfStock && !lowStock && "bg-emerald-500"
                )}
              />
              {outOfStock ? t("outOfStockShort") : product.stock}
            </span>
          ) : null}
        </div>
      </div>
    </button>
  )
}
