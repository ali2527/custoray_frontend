"use client"

import { useEffect, useMemo, useState, type ReactNode } from "react"
import { ColumnDef } from "@tanstack/react-table"
import {
  IconAlertTriangleFilled,
  IconArchive,
  IconCircleCheckFilled,
  IconCircleXFilled,
  IconCopy,
  IconDotsVertical,
  IconEye,
  IconPhoto,
  IconPlus,
  IconPencil,
  IconTrash,
  IconX,
} from "@tabler/icons-react"
import { toast } from "sonner"
import { useTranslation } from "react-i18next"
import type { TFunction } from "i18next"
import { z } from "zod"

import { DataTableColumnHeader } from "@/components/data-table-column-header"
import { DataTable, type DataTableTab } from "@/components/data-table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { LookupFormSheet, type LookupType } from "@/components/inventory/lookup-form-sheet"
import { ProductPriceTimeline } from "@/components/inventory/product-price-timeline"
import {
  ensureInitialProductPriceHistories,
  recordProductPriceChanges,
} from "@/lib/product-price-history"
import data from "../data.json"

const INVENTORY_PRODUCTS_STORAGE_KEY = "custoray-inventory-products-v1"

const STOCK_LEVELS = ["In Stock", "Low Stock", "Out of Stock"] as const

function stockLevelLabel(t: TFunction<"inventory">, level: string) {
  if (level === "In Stock") return t("stockLevel.inStock")
  if (level === "Low Stock") return t("stockLevel.lowStock")
  if (level === "Out of Stock") return t("stockLevel.outOfStock")
  return level
}
const PRODUCT_VARIANTS = ["Genuine", "1st Copy", "2nd Copy", "Others"] as const
const ADD_NEW_BRAND_VALUE = "__add_new_brand__"
const ADD_NEW_CATEGORY_VALUE = "__add_new_category__"
const ADD_NEW_VARIANT_VALUE = "__add_new_variant__"

const MIN_PRICE = 100
const MAX_PRICE = 10000

function clampPriceValue(value: number): number {
  return Math.min(MAX_PRICE, Math.max(MIN_PRICE, value))
}

function normalizePriceValue(
  value: string | number | null | undefined,
  fallback: number = MIN_PRICE
): string {
  const parsed =
    typeof value === "string" && value.trim() === "" ? Number.NaN : Number(value)
  const finalValue = Number.isFinite(parsed) ? parsed : fallback
  return clampPriceValue(finalValue).toFixed(2)
}

const productSchema = z.object({
  srNo: z.number(),
  sku: z.string(),
  name: z.string(),
  brand: z.string(),
  category: z.string(),
  variant: z.string(),
  /** Shelf availability: In Stock / Low Stock / Out of Stock */
  status: z.string(),
  /** Listing: Active, or none (no status — e.g. inactive lifecycle rows) */
  productStatus: z.enum(["active", "none"]).default("none"),
  stock: z.number(),
  orders: z.number(),
  costPrice: z.string(),
  salePrice: z.string(),
  lifecycle: z.enum(["active", "inactive", "archived"]).default("active"),
  /** Data URLs or remote URLs for gallery (demo) */
  imageUrls: z.array(z.string()).default([]),
})

type ProductRow = z.infer<typeof productSchema>

const productTabValues = ["all", "active", "archived"] as const

function productTabFilter(row: ProductRow, tab: string) {
  if (tab === "all") return true
  if (tab === "archived") return row.lifecycle === "archived"
  if (tab === "active") return row.lifecycle === "active"
  return true
}

function mapImportedProduct(
  row: Record<string, string>,
  existing: ProductRow[]
): ProductRow | null {
  const maxSr = existing.reduce((m, x) => Math.max(m, x.srNo), 0)
  const srNo = Number(row.srNo)
  const finalSr = Number.isFinite(srNo) && srNo > 0 ? srNo : maxSr + 1
  if (!(row.sku ?? "").trim() && !(row.name ?? "").trim()) return null
  const lc = (row.lifecycle ?? "active").toLowerCase()
  const lifecycle =
    lc === "inactive" || lc === "archived" ? lc : "active"
  const ps = (row.productStatus ?? "").toLowerCase()
  const productStatus = ps === "active" ? "active" : "none"
  let imageUrls: string[] = []
  const rawImgs = row.imageUrls?.trim()
  if (rawImgs) {
    try {
      const parsed = JSON.parse(rawImgs) as unknown
      if (Array.isArray(parsed)) imageUrls = parsed.filter((x) => typeof x === "string")
    } catch {
      /* ignore */
    }
  }
  const importedSalePrice =
    row.salePrice ?? row["sale price"] ?? row["sale_price"] ?? row.price
  const normalizedSalePrice = normalizePriceValue(importedSalePrice, MIN_PRICE)
  const importedCostPrice =
    row.costPrice ?? row.costprice ?? row["cost price"] ?? row["cost_price"]
  const normalizedCostPrice = normalizePriceValue(
    importedCostPrice,
    Number(normalizedSalePrice) * 0.8
  )
  return {
    srNo: finalSr,
    sku: row.sku ?? "",
    name: row.name ?? "",
    brand: row.brand ?? "",
    category: row.category ?? row.model ?? "",
    variant: row.variant ?? row.varient ?? "Others",
    status: row.status ?? "In Stock",
    productStatus,
    stock: Number(row.stock) || 0,
    orders: Number(row.orders) || 0,
    costPrice: normalizedCostPrice,
    salePrice: normalizedSalePrice,
    lifecycle,
    imageUrls,
  }
}

const EMPTY_PRODUCT: ProductRow = {
  srNo: 0,
  sku: "",
  name: "",
  brand: "",
  category: "Electronics",
  variant: "Others",
  status: "In Stock",
  productStatus: "none",
  stock: 0,
  orders: 0,
  costPrice: "100.00",
  salePrice: "100.00",
  lifecycle: "active",
  imageUrls: [],
}

function ProductViewDetail({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <div className="grid grid-cols-[6.5rem_1fr] items-baseline gap-x-3 gap-y-1 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-foreground min-w-0 font-medium">{children}</dd>
    </div>
  )
}

function ProductImagesField({
  id,
  initialUrls,
}: {
  id: string
  initialUrls: string[]
}) {
  const { t } = useTranslation("inventory")
  const [urls, setUrls] = useState<string[]>(initialUrls)
  const maxImages = 8
  const remainingSlots = Math.max(0, maxImages - urls.length)
  const atImageLimit = remainingSlots === 0

  const addFiles = (files: FileList | null) => {
    if (!files?.length) return
    if (atImageLimit) {
      toast.message(t("toasts.maxImages", { count: maxImages }))
      return
    }

    let added = 0
    for (const file of Array.from(files)) {
      if (added >= remainingSlots) break
      if (!file.type.startsWith("image/")) continue
      const reader = new FileReader()
      reader.onload = () => setUrls((u) => [...u, String(reader.result)])
      reader.readAsDataURL(file)
      added += 1
    }

    if (files.length > remainingSlots) {
      toast.message(t("toasts.onlyImagesAllowed", { count: maxImages }))
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{t("fields.images")}</Label>
      {urls.length > 0 ? (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {urls.map((url, i) => (
            <div
              key={`${i}-${url.slice(0, 48)}`}
              className="group border-border bg-muted relative aspect-square overflow-hidden rounded-lg border"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" className="size-full object-cover" />
              <button
                type="button"
                className="bg-background/90 text-foreground hover:bg-destructive/10 hover:text-destructive absolute top-1 right-1 flex size-7 items-center justify-center rounded-md border shadow-sm transition-colors"
                onClick={() => setUrls((u) => u.filter((_, j) => j !== i))}
                aria-label={t("images.remove")}
              >
                <IconX className="size-4" />
              </button>
            </div>
          ))}
          {!atImageLimit ? (
            <label
              htmlFor={id}
              className="border-border bg-muted/40 text-muted-foreground hover:bg-muted/70 flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed text-xs font-medium transition-colors"
            >
              <IconPlus className="size-4" />
              {t("images.upload")}
            </label>
          ) : (
            <div className="border-border bg-muted/30 text-muted-foreground flex aspect-square flex-col items-center justify-center gap-1 rounded-lg border border-dashed text-[11px] font-medium">
              {t("images.maxReached")}
            </div>
          )}
        </div>
      ) : (
        <label
          htmlFor={id}
          className="border-border bg-muted/50 text-muted-foreground hover:bg-muted/70 flex aspect-[2/1] max-h-28 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed text-sm transition-colors"
        >
          <IconPhoto className="text-muted-foreground mb-1 size-5" />
          <span className="text-foreground text-sm font-medium">
            {t("images.uploadImages")}
          </span>
          <span className="text-muted-foreground text-xs">
            {t("images.clickToAdd")}
          </span>
        </label>
      )}
      <Input
        id={id}
        type="file"
        accept="image/*"
        multiple
        className="sr-only"
        disabled={atImageLimit}
        onChange={(e) => {
          addFiles(e.target.files)
          e.target.value = ""
        }}
      />
      <p className="text-muted-foreground text-xs">
        {t("images.hint", { count: maxImages })}
      </p>
    </div>
  )
}

function productFromSidebarForm(fd: FormData, previous: ProductRow): ProductRow {
  const lifecycleRaw = String(fd.get("lifecycle") ?? previous.lifecycle)
  const lifecycle =
    lifecycleRaw === "inactive" || lifecycleRaw === "archived"
      ? lifecycleRaw
      : "active"
  const productStatus =
    String(fd.get("productStatus") ?? previous.productStatus) === "active"
      ? "active"
      : "none"
  const salePrice = normalizePriceValue(
    String(fd.get("salePrice") ?? previous.salePrice),
    Number(previous.salePrice) || MIN_PRICE
  )
  return {
    ...previous,
    sku: String(fd.get("sku") ?? previous.sku).trim() || previous.sku,
    name: String(fd.get("name") ?? previous.name).trim() || previous.name,
    brand: String(fd.get("brand") ?? previous.brand).trim(),
    category: String(fd.get("category") ?? previous.category).trim() || "Electronics",
    variant: String(fd.get("variant") ?? previous.variant).trim() || "Others",
    status: String(fd.get("status") ?? previous.status) || "In Stock",
    productStatus,
    stock: Number(fd.get("stock")) || 0,
    orders: Number(fd.get("orders")) || 0,
    costPrice: normalizePriceValue(
      String(fd.get("costPrice") ?? previous.costPrice),
      Number(salePrice) * 0.8
    ),
    salePrice,
    lifecycle,
  }
}

function loadInventoryProducts(): ProductRow[] | null {
  if (typeof window === "undefined") return null
  try {
    const raw = window.localStorage.getItem(INVENTORY_PRODUCTS_STORAGE_KEY)
    if (!raw) return null
    const parsed = z.array(productSchema).safeParse(JSON.parse(raw))
    return parsed.success ? parsed.data : null
  } catch {
    return null
  }
}

function ProductViewSidebarBody({ item }: { item: ProductRow }) {
  const { t } = useTranslation("inventory")
  const imgs = item.imageUrls ?? []
  return (
    <div className="flex flex-col gap-4">
      {imgs.length > 0 ? (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {imgs.map((url, i) => (
            <div
              key={i}
              className="border-border bg-muted aspect-square overflow-hidden rounded-lg border"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" className="size-full object-cover" />
            </div>
          ))}
        </div>
      ) : null}
      <div className="flex flex-col gap-3">
        <ProductViewDetail label={t("fields.sku")}>{item.sku}</ProductViewDetail>
        <ProductViewDetail label={t("fields.brand")}>{item.brand || "—"}</ProductViewDetail>
        <ProductViewDetail label={t("fields.category")}>{item.category || "—"}</ProductViewDetail>
        <ProductViewDetail label={t("fields.variant")}>{item.variant || "—"}</ProductViewDetail>
        <ProductViewDetail label={t("fields.stock")}>
          {stockLevelLabel(t, item.status)}
        </ProductViewDetail>
        <ProductViewDetail label={t("fields.qty")}>{item.stock}</ProductViewDetail>
        <ProductViewDetail label={t("fields.costPrice")}>{item.costPrice}</ProductViewDetail>
        <ProductViewDetail label={t("fields.salePrice")}>{item.salePrice}</ProductViewDetail>
        <ProductViewDetail label={t("fields.orders")}>{item.orders}</ProductViewDetail>
        <ProductViewDetail label={t("fields.lifecycle")}>
          {t(`tabs.${item.lifecycle}`)}
        </ProductViewDetail>
        <ProductViewDetail label={t("fields.status")}>
          {item.lifecycle === "archived" ? t("tabs.archived") : t("tabs.active")}
        </ProductViewDetail>
        <ProductViewDetail label={t("fields.listing")}>
          {item.productStatus === "active" ? t("listing.active") : t("listing.none")}
        </ProductViewDetail>
      </div>
      <ProductPriceTimeline sku={item.sku} />
    </div>
  )
}

function ProductFormSidebarForm({
  item,
  formId,
  onClose,
  isNew,
  brandOptions,
  categoryOptions,
  variantOptions,
  lookupDefaults,
  onRequestAddLookup,
  onSave,
}: {
  item: ProductRow
  formId: string
  onClose: () => void
  isNew: boolean
  brandOptions: string[]
  categoryOptions: string[]
  variantOptions: string[]
  lookupDefaults?: Partial<Record<LookupType, string>>
  onRequestAddLookup: (type: LookupType) => void
  onSave: (product: ProductRow) => void
}) {
  const { t } = useTranslation("inventory")
  const [brandValue, setBrandValue] = useState(
    item.brand || brandOptions[0] || ""
  )
  const [categoryValue, setCategoryValue] = useState(
    item.category || categoryOptions[0] || ""
  )
  const [variantValue, setVariantValue] = useState(
    item.variant || variantOptions[0] || ""
  )

  useEffect(() => {
    if (lookupDefaults?.brand) setBrandValue(lookupDefaults.brand)
  }, [lookupDefaults?.brand])

  useEffect(() => {
    if (lookupDefaults?.category) setCategoryValue(lookupDefaults.category)
  }, [lookupDefaults?.category])

  useEffect(() => {
    if (lookupDefaults?.variant) setVariantValue(lookupDefaults.variant)
  }, [lookupDefaults?.variant])

  return (
    <form
      id={formId}
      className="flex flex-col gap-4 text-sm"
      onSubmit={(e) => {
        e.preventDefault()
        const next = productFromSidebarForm(new FormData(e.currentTarget), item)
        if (!next.name.trim()) {
          toast.error(t("toasts.nameRequired"))
          return
        }
        onSave(next)
        toast.success(isNew ? t("toasts.created") : t("toasts.saved"))
        onClose()
      }}
    >
      <ProductImagesField
        key={`${formId}-images`}
        id={`${formId}-images-input`}
        initialUrls={item.imageUrls ?? []}
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor={`${formId}-sku`}>{t("fields.sku")}</Label>
          <Input id={`${formId}-sku`} name="sku" defaultValue={item.sku} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor={`${formId}-name`}>{t("fields.name")}</Label>
          <Input id={`${formId}-name`} name="name" defaultValue={item.name} />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor={`${formId}-brand`}>{t("fields.brand")}</Label>
          <Select
            name="brand-select"
            value={brandValue}
            onValueChange={(value) => {
              if (value === ADD_NEW_BRAND_VALUE) {
                onRequestAddLookup("brand")
                return
              }
              setBrandValue(value)
            }}
          >
            <SelectTrigger id={`${formId}-brand`} className="w-full">
              <SelectValue placeholder={t("fields.brand")} />
            </SelectTrigger>
            <SelectContent>
              {brandOptions.map((brand) => (
                <SelectItem key={brand} value={brand}>
                  {brand}
                </SelectItem>
              ))}
              <SelectItem value={ADD_NEW_BRAND_VALUE}>{t("form.addNewBrand")}</SelectItem>
            </SelectContent>
          </Select>
          <input type="hidden" name="brand" value={brandValue} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor={`${formId}-category`}>{t("fields.category")}</Label>
          <Select
            name="category-select"
            value={categoryValue}
            onValueChange={(value) => {
              if (value === ADD_NEW_CATEGORY_VALUE) {
                onRequestAddLookup("category")
                return
              }
              setCategoryValue(value)
            }}
          >
            <SelectTrigger id={`${formId}-category`} className="w-full">
              <SelectValue placeholder={t("fields.category")} />
            </SelectTrigger>
            <SelectContent>
              {categoryOptions.map((category) => (
                <SelectItem key={category} value={category}>
                  {category}
                </SelectItem>
              ))}
              <SelectItem value={ADD_NEW_CATEGORY_VALUE}>
                {t("form.addNewCategory")}
              </SelectItem>
            </SelectContent>
          </Select>
          <input type="hidden" name="category" value={categoryValue} />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor={`${formId}-variant`}>{t("fields.variant")}</Label>
          <Select
            name="variant-select"
            value={variantValue}
            onValueChange={(value) => {
              if (value === ADD_NEW_VARIANT_VALUE) {
                onRequestAddLookup("variant")
                return
              }
              setVariantValue(value)
            }}
          >
            <SelectTrigger id={`${formId}-variant`} className="w-full">
              <SelectValue placeholder={t("fields.variant")} />
            </SelectTrigger>
            <SelectContent>
              {variantOptions.map((variant) => (
                <SelectItem key={variant} value={variant}>
                  {variant}
                </SelectItem>
              ))}
              <SelectItem value={ADD_NEW_VARIANT_VALUE}>
                {t("form.addNewVariant")}
              </SelectItem>
            </SelectContent>
          </Select>
          <input type="hidden" name="variant" value={variantValue} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor={`${formId}-lifecycle`}>{t("fields.lifecycle")}</Label>
          <Select name="lifecycle" defaultValue={item.lifecycle}>
            <SelectTrigger id={`${formId}-lifecycle`} className="w-full">
              <SelectValue placeholder={t("fields.lifecycle")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">{t("tabs.active")}</SelectItem>
              <SelectItem value="inactive">{t("tabs.inactive")}</SelectItem>
              <SelectItem value="archived">{t("tabs.archived")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor={`${formId}-stock-level`}>{t("fields.stock")}</Label>
          <Select name="status" defaultValue={item.status}>
            <SelectTrigger id={`${formId}-stock-level`} className="w-full">
              <SelectValue placeholder={t("fields.stock")} />
            </SelectTrigger>
            <SelectContent>
              {STOCK_LEVELS.map((v) => (
                <SelectItem key={v} value={v}>
                  {stockLevelLabel(t, v)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor={`${formId}-listing`}>{t("fields.listing")}</Label>
          <Select name="productStatus" defaultValue={item.productStatus}>
            <SelectTrigger id={`${formId}-listing`} className="w-full">
              <SelectValue placeholder={t("fields.listing")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">{t("listing.active")}</SelectItem>
              <SelectItem value="none">{t("listing.none")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor={`${formId}-qty`}>{t("fields.qty")}</Label>
          <Input
            id={`${formId}-qty`}
            name="stock"
            type="number"
            defaultValue={item.stock}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor={`${formId}-orders`}>{t("fields.ordersPeriod")}</Label>
          <Input
            id={`${formId}-orders`}
            name="orders"
            type="number"
            defaultValue={item.orders}
          />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor={`${formId}-cost-price`}>{t("fields.costPrice")}</Label>
          <Input
            id={`${formId}-cost-price`}
            name="costPrice"
            defaultValue={item.costPrice}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor={`${formId}-sale-price`}>{t("fields.salePrice")}</Label>
          <Input
            id={`${formId}-sale-price`}
            name="salePrice"
            defaultValue={item.salePrice}
          />
        </div>
      </div>
    </form>
  )
}

function getProductColumns(
  t: TFunction<"inventory">,
  openProductSidebar: (row: ProductRow, mode: "view" | "edit") => void
): ColumnDef<ProductRow>[] {
  return [
  {
    id: "select",
    header: ({ table }) => (
      <div className="flex items-center justify-center">
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && "indeterminate")
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label={t("table.selectAll", { ns: "common" })}
        />
      </div>
    ),
    cell: ({ row }) => (
      <div className="flex items-center justify-center">
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label={t("table.selectRow", { ns: "common" })}
        />
      </div>
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "sku",
    header: ({ column }) => <DataTableColumnHeader column={column} title={t("columns.sku")} />,
    cell: ({ row }) => (
      <span className="text-muted-foreground font-mono">{row.original.sku}</span>
    ),
    meta: { dataTableFilter: false },
  },
  {
    accessorKey: "name",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title={t("columns.productName")} />
    ),
    cell: ({ row }) => (
      <span className="text-foreground font-medium">{row.original.name}</span>
    ),
    enableHiding: false,
    meta: { dataTableFilter: false },
  },
  {
    accessorKey: "brand",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title={t("columns.brand")} />
    ),
    cell: ({ row }) => (
      <span className="text-muted-foreground max-w-[10rem] truncate">
        {row.original.brand || "—"}
      </span>
    ),
  },
  {
    accessorKey: "variant",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title={t("columns.variant")} />
    ),
    cell: ({ row }) => (
      <div className="w-28">
        <Badge variant="outline" className="text-muted-foreground px-1.5">
          {row.original.variant || "—"}
        </Badge>
      </div>
    ),
  },
  {
    accessorKey: "category",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title={t("columns.category")} />
    ),
    cell: ({ row }) => (
      <div className="w-32">
        <Badge variant="outline" className="text-muted-foreground px-1.5">
          {row.original.category || "—"}
        </Badge>
      </div>
    ),
  },
  {
    accessorKey: "status",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title={t("columns.stock")} align="center" />
    ),
    sortingFn: (rowA, rowB) => rowA.original.stock - rowB.original.stock,
    meta: { dataTableFilter: false },
    cell: ({ row }) => {
      const level = row.original.status
      const isInStock = level === "In Stock"
      const isLowStock = level === "Low Stock"
      const isOutOfStock = level === "Out of Stock"
      return (
        <div className="flex w-full items-center justify-center gap-2">
          <span className="text-foreground min-w-8 text-center tabular-nums">
            {row.original.stock}
          </span>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="inline-flex cursor-default" aria-label={stockLevelLabel(t, level)}>
                {isInStock ? (
                  <IconCircleCheckFilled className="size-4 fill-green-500 dark:fill-green-400" />
                ) : isLowStock ? (
                  <IconAlertTriangleFilled className="size-4 fill-amber-500 dark:fill-amber-400" />
                ) : isOutOfStock ? (
                  <IconCircleXFilled className="size-4 fill-red-500 dark:fill-red-400" />
                ) : null}
              </span>
            </TooltipTrigger>
            <TooltipContent sideOffset={8}>{stockLevelLabel(t, level)}</TooltipContent>
          </Tooltip>
        </div>
      )
    },
  },
  {
    accessorKey: "costPrice",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title={t("columns.costPrice")} align="center" />
    ),
    sortingFn: (rowA, rowB, columnId) => {
      const a = Number(rowA.getValue(columnId))
      const b = Number(rowB.getValue(columnId))
      return a === b ? 0 : a > b ? 1 : -1
    },
    meta: { dataTableFilter: false },
    cell: ({ row }) => (
      <div className="flex justify-center">
        <span className="text-foreground min-w-12 text-center tabular-nums">
          {row.original.costPrice}
        </span>
      </div>
    ),
  },
  {
    accessorKey: "salePrice",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title={t("columns.salePrice")} align="center" />
    ),
    sortingFn: (rowA, rowB, columnId) => {
      const a = Number(rowA.getValue(columnId))
      const b = Number(rowB.getValue(columnId))
      return a === b ? 0 : a > b ? 1 : -1
    },
    meta: { dataTableFilter: false },
    cell: ({ row }) => (
      <div className="flex justify-center">
        <span className="text-foreground min-w-12 text-center tabular-nums">
          {row.original.salePrice}
        </span>
      </div>
    ),
  },
  {
    accessorKey: "productStatus",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title={t("columns.status")} />
    ),
    meta: { dataTableFilter: false },
    cell: ({ row }) => {
      const archived = row.original.lifecycle === "archived"
      if (archived) {
        return (
          <Badge
            variant="outline"
            className="border-border px-1.5 text-foreground/80"
          >
            {t("tabs.archived")}
          </Badge>
        )
      }
      return (
        <Badge
          variant="outline"
          className="border-emerald-500/30 px-1.5 text-emerald-700 dark:text-emerald-400"
        >
          {t("tabs.active")}
        </Badge>
      )
    },
  },
  {
    id: "actions",
    enableSorting: false,
    cell: ({ row }) => (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="data-[state=open]:bg-muted text-muted-foreground flex size-8"
            size="icon"
          >
            <IconDotsVertical />
            <span className="sr-only">{t("actions.openMenu")}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-40">
          <DropdownMenuItem
            onClick={() => openProductSidebar(row.original, "view")}
          >
            <IconEye />
            {t("actions.view")}
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => openProductSidebar(row.original, "edit")}
          >
            <IconPencil />
            {t("actions.edit")}
          </DropdownMenuItem>
          <DropdownMenuItem>
            <IconCopy />
            {t("actions.duplicate")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    ),
  },
]
}

type ProductSidebarState =
  | { mode: "view"; product: ProductRow }
  | { mode: "edit"; product: ProductRow }
  | { mode: "add" }
  | null

export default function ProductsPage() {
  const { t } = useTranslation("inventory")
  const seedRows = useMemo(() => {
    type RawProductRow = Omit<ProductRow, "costPrice" | "salePrice" | "category"> & {
      costPrice?: string
      salePrice?: string
      price?: string
      category?: string
      model?: string
      variant?: string
      varient?: string
    }
    return (data as RawProductRow[]).map((row) => {
      const normalizedSalePrice = normalizePriceValue(
        row.salePrice ?? row.price,
        MIN_PRICE
      )
      return {
        ...row,
        category: row.category ?? row.model ?? "Electronics",
        variant: row.variant ?? row.varient ?? "Others",
        costPrice: normalizePriceValue(
          row.costPrice,
          Number(normalizedSalePrice) * 0.8
        ),
        salePrice: normalizedSalePrice,
      }
    })
  }, [])
  const [products, setProducts] = useState<ProductRow[]>(seedRows)
  const [hydrated, setHydrated] = useState(false)
  const [sidebar, setSidebar] = useState<ProductSidebarState>(null)
  const [addFormKey, setAddFormKey] = useState(0)
  const [lookupSheet, setLookupSheet] = useState<LookupType | null>(null)
  const [lookupDefaults, setLookupDefaults] = useState<
    Partial<Record<LookupType, string>>
  >({})

  const [brandOptions, setBrandOptions] = useState(() =>
    Array.from(
      new Set(
        seedRows
          .map((row) => row.brand.trim())
          .filter((brand): brand is string => brand.length > 0)
      )
    ).sort((a, b) => a.localeCompare(b))
  )
  const [categoryOptions, setCategoryOptions] = useState(() =>
    Array.from(
      new Set(
        seedRows
          .map((row) => row.category.trim())
          .filter((category): category is string => category.length > 0)
      )
    ).sort((a, b) => a.localeCompare(b))
  )
  const [variantOptions, setVariantOptions] = useState(() =>
    Array.from(
      new Set([
        ...PRODUCT_VARIANTS,
        ...seedRows
          .map((row) => row.variant.trim())
          .filter((variant): variant is string => variant.length > 0),
      ])
    ).sort((a, b) => a.localeCompare(b))
  )

  const columns = useMemo(
    () =>
      getProductColumns(t, (p, mode) => setSidebar({ product: p, mode })),
    [t]
  )

  useEffect(() => {
    const saved = loadInventoryProducts()
    const next = saved ?? seedRows
    setProducts(next)
    ensureInitialProductPriceHistories(next)
    setHydrated(true)
  }, [seedRows])

  useEffect(() => {
    if (!hydrated || typeof window === "undefined") return
    window.localStorage.setItem(
      INVENTORY_PRODUCTS_STORAGE_KEY,
      JSON.stringify(products)
    )
    ensureInitialProductPriceHistories(products)
  }, [hydrated, products])

  const handleSaveProduct = (next: ProductRow) => {
    if (sidebar?.mode === "add") {
      const maxSr = products.reduce((max, row) => Math.max(max, row.srNo), 0)
      const created = { ...next, srNo: maxSr + 1 }
      recordProductPriceChanges(null, created)
      setProducts((prev) => [...prev, created])
      return
    }
    const previous = products.find((row) => row.srNo === next.srNo)
    recordProductPriceChanges(previous ?? null, next)
    setProducts((prev) =>
      prev.map((row) =>
        row.srNo === next.srNo ? { ...next, imageUrls: row.imageUrls } : row
      )
    )
  }

  const closeSidebar = () => setSidebar(null)
  const sheetMode = sidebar?.mode ?? "view"
  const sheetProduct =
    sidebar && sidebar.mode !== "add" ? sidebar.product : null
  const formItem =
    sidebar?.mode === "add" ? EMPTY_PRODUCT : sheetProduct ?? EMPTY_PRODUCT
  const formId =
    sidebar?.mode === "add"
      ? "product-add-form"
      : sheetProduct
        ? `product-edit-${sheetProduct.srNo}`
        : "product-edit"

  const productTabs: DataTableTab[] = productTabValues.map((value) => ({
    value,
    label: t(`tabs.${value}`),
  }))

  return (
    <>
    <Sheet
      open={sidebar !== null}
      onOpenChange={(open) => {
        if (!open) closeSidebar()
      }}
    >
      <SheetContent
        side="right"
        className={`flex w-full flex-col gap-0 overflow-hidden p-0 ${
          sidebar?.mode === "view" ? "sm:max-w-lg" : "sm:max-w-md"
        }`}
      >
        {sidebar ? (
          <>
            <SheetHeader className="border-border/60 space-y-1 border-b px-6 py-5 text-left">
              <SheetTitle className="text-lg leading-tight">
                {sidebar.mode === "add"
                  ? t("productSheet.add")
                  : sidebar.mode === "edit"
                    ? t("productSheet.edit")
                    : sheetProduct?.name}
              </SheetTitle>
              <SheetDescription>
                {sidebar.mode === "add" ? (
                  t("productSheet.addDescription")
                ) : sidebar.mode === "edit" && sheetProduct ? (
                  <>
                    {sheetProduct.name}
                    <span className="text-muted-foreground">
                      {" "}
                      · {t("productSheet.skuLabel", { sku: sheetProduct.sku })}
                    </span>
                  </>
                ) : sheetProduct ? (
                  <>
                    {t("productSheet.skuLabel", { sku: sheetProduct.sku })}
                    {sheetProduct.brand ? ` · ${sheetProduct.brand}` : ""}
                    {sheetProduct.category ? ` · ${sheetProduct.category}` : ""}
                  </>
                ) : null}
              </SheetDescription>
            </SheetHeader>
            <div
              key={
                sidebar.mode === "add"
                  ? `add-${addFormKey}`
                  : `${sheetProduct?.srNo}-${sheetMode}`
              }
              className="min-h-0 flex-1 overflow-y-auto px-6 py-5"
            >
              {sidebar.mode === "view" && sheetProduct ? (
                <ProductViewSidebarBody item={sheetProduct} />
              ) : sidebar.mode === "edit" || sidebar.mode === "add" ? (
                <ProductFormSidebarForm
                  item={formItem}
                  formId={formId}
                  onClose={closeSidebar}
                  isNew={sidebar.mode === "add"}
                  brandOptions={brandOptions}
                  categoryOptions={categoryOptions}
                  variantOptions={variantOptions}
                  lookupDefaults={lookupDefaults}
                  onRequestAddLookup={setLookupSheet}
                  onSave={handleSaveProduct}
                />
              ) : null}
            </div>
            <SheetFooter className="border-border/60 gap-2 border-t px-6 py-4 sm:flex-row sm:justify-end">
              {sidebar.mode === "view" ? (
                <SheetClose asChild>
                  <Button variant="outline" className="w-full sm:w-auto">
                    {t("actions.close", { ns: "common" })}
                  </Button>
                </SheetClose>
              ) : (
                <>
                  <SheetClose asChild>
                    <Button variant="outline" type="button">
                      {t("actions.cancel", { ns: "common" })}
                    </Button>
                  </SheetClose>
                  <Button type="submit" form={formId}>
                    {sidebar.mode === "add"
                      ? t("productSheet.create")
                      : t("productSheet.save")}
                  </Button>
                </>
              )}
            </SheetFooter>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
    <LookupFormSheet
      open={lookupSheet !== null}
      onOpenChange={(open) => {
        if (!open) setLookupSheet(null)
      }}
      type={lookupSheet ?? "brand"}
      existingValues={
        lookupSheet === "category"
          ? categoryOptions
          : lookupSheet === "variant"
            ? variantOptions
            : brandOptions
      }
      onCreate={(value) => {
        if (lookupSheet === "category") {
          setCategoryOptions((prev) =>
            Array.from(new Set([...prev, value])).sort((a, b) =>
              a.localeCompare(b)
            )
          )
          setLookupDefaults((prev) => ({ ...prev, category: value }))
          return
        }
        if (lookupSheet === "variant") {
          setVariantOptions((prev) =>
            Array.from(new Set([...prev, value])).sort((a, b) =>
              a.localeCompare(b)
            )
          )
          setLookupDefaults((prev) => ({ ...prev, variant: value }))
          return
        }
        setBrandOptions((prev) =>
          Array.from(new Set([...prev, value])).sort((a, b) =>
            a.localeCompare(b)
          )
        )
        setLookupDefaults((prev) => ({ ...prev, brand: value }))
      }}
    />
    <DataTable
      data={products}
      columns={columns}
      addButtonLabel={t("addButton")}
      onAddClick={() => {
        setAddFormKey((k) => k + 1)
        setSidebar({ mode: "add" })
      }}
      defaultColumnVisibility={{ actions: false }}
      searchPlaceholder={t("search")}
      importRowMapper={mapImportedProduct}
      importSampleFilename="products-sample.csv"
      exportFilename="products-export.csv"
      onDataChange={setProducts}
      bulkActions={[
        {
          id: "archive",
          label: t("actions.moveToArchive"),
          icon: <IconArchive className="size-4" />,
          onClick: (selected) => {
            toast.message(
              t("toasts.archivedCount", { count: selected.length })
            )
          },
        },
        {
          id: "delete",
          label: t("actions.deleteSelected"),
          icon: <IconTrash className="size-4" />,
          variant: "destructive",
          onClick: (selected) => {
            toast.message(t("toasts.wouldDeleteProducts", { count: selected.length }))
          },
        },
      ]}
      tabs={productTabs}
      defaultTab="all"
      tabFilter={productTabFilter}
    />
    </>
  )
}
