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
import data from "../data.json"

const STOCK_LEVELS = ["In Stock", "Low Stock", "Out of Stock"] as const
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

export type ProductRow = z.infer<typeof productSchema>

const productTabs: DataTableTab[] = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "archived", label: "Archived" },
]

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
  const [urls, setUrls] = useState<string[]>(initialUrls)
  const maxImages = 8
  const remainingSlots = Math.max(0, maxImages - urls.length)
  const atImageLimit = remainingSlots === 0

  const addFiles = (files: FileList | null) => {
    if (!files?.length) return
    if (atImageLimit) {
      toast.message(`You can upload up to ${maxImages} images.`)
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
      toast.message(`Only ${maxImages} images are allowed.`)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>Images</Label>
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
                aria-label="Remove image"
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
              Upload
            </label>
          ) : (
            <div className="border-border bg-muted/30 text-muted-foreground flex aspect-square flex-col items-center justify-center gap-1 rounded-lg border border-dashed text-[11px] font-medium">
              Max reached
            </div>
          )}
        </div>
      ) : (
        <label
          htmlFor={id}
          className="border-border bg-muted/50 text-muted-foreground hover:bg-muted/70 flex aspect-[2/1] max-h-28 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed text-sm transition-colors"
        >
          <IconPhoto className="text-muted-foreground mb-1 size-5" />
          <span className="text-foreground text-sm font-medium">Upload images</span>
          <span className="text-muted-foreground text-xs">
            Click to add one or multiple product images
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
        PNG, JPG, WebP — up to {maxImages} images. Click the X on any thumbnail
        to remove it.
      </p>
    </div>
  )
}

function ProductViewSidebarBody({ item }: { item: ProductRow }) {
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
        <ProductViewDetail label="SKU">{item.sku}</ProductViewDetail>
        <ProductViewDetail label="Brand">{item.brand || "—"}</ProductViewDetail>
        <ProductViewDetail label="Category">{item.category || "—"}</ProductViewDetail>
        <ProductViewDetail label="Variant">{item.variant || "—"}</ProductViewDetail>
        <ProductViewDetail label="Stock">{item.status}</ProductViewDetail>
        <ProductViewDetail label="Qty">{item.stock}</ProductViewDetail>
        <ProductViewDetail label="Cost price">{item.costPrice}</ProductViewDetail>
        <ProductViewDetail label="Sale price">{item.salePrice}</ProductViewDetail>
        <ProductViewDetail label="Orders">{item.orders}</ProductViewDetail>
        <ProductViewDetail label="Lifecycle">
          <span className="capitalize">{item.lifecycle}</span>
        </ProductViewDetail>
        <ProductViewDetail label="Status">
          {item.lifecycle === "archived" ? "Archived" : "Active"}
        </ProductViewDetail>
        <ProductViewDetail label="Listing">
          {item.productStatus === "active" ? "Active" : "No status"}
        </ProductViewDetail>
      </div>
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
}) {
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
        void (async () => {
          try {
            await toast.promise(
              new Promise<void>((r) => setTimeout(r, 800)),
              {
                loading: isNew ? "Creating product…" : "Saving product…",
                success: isNew ? "Product created (demo)" : "Saved",
                error: "Something went wrong",
              }
            ).unwrap()
            onClose()
          } catch {
            /* toast already showed error */
          }
        })()
      }}
    >
      <ProductImagesField
        key={`${formId}-images`}
        id={`${formId}-images-input`}
        initialUrls={item.imageUrls ?? []}
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor={`${formId}-sku`}>SKU</Label>
          <Input id={`${formId}-sku`} name="sku" defaultValue={item.sku} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor={`${formId}-name`}>Name</Label>
          <Input id={`${formId}-name`} name="name" defaultValue={item.name} />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor={`${formId}-brand`}>Brand</Label>
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
              <SelectValue placeholder="Brand" />
            </SelectTrigger>
            <SelectContent>
              {brandOptions.map((brand) => (
                <SelectItem key={brand} value={brand}>
                  {brand}
                </SelectItem>
              ))}
              <SelectItem value={ADD_NEW_BRAND_VALUE}>+ Add new brand</SelectItem>
            </SelectContent>
          </Select>
          <input type="hidden" name="brand" value={brandValue} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor={`${formId}-category`}>Category</Label>
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
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              {categoryOptions.map((category) => (
                <SelectItem key={category} value={category}>
                  {category}
                </SelectItem>
              ))}
              <SelectItem value={ADD_NEW_CATEGORY_VALUE}>
                + Add new category
              </SelectItem>
            </SelectContent>
          </Select>
          <input type="hidden" name="category" value={categoryValue} />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor={`${formId}-variant`}>Variant</Label>
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
              <SelectValue placeholder="Variant" />
            </SelectTrigger>
            <SelectContent>
              {variantOptions.map((variant) => (
                <SelectItem key={variant} value={variant}>
                  {variant}
                </SelectItem>
              ))}
              <SelectItem value={ADD_NEW_VARIANT_VALUE}>
                + Add new variant
              </SelectItem>
            </SelectContent>
          </Select>
          <input type="hidden" name="variant" value={variantValue} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor={`${formId}-lifecycle`}>Lifecycle</Label>
          <Select name="lifecycle" defaultValue={item.lifecycle}>
            <SelectTrigger id={`${formId}-lifecycle`} className="w-full">
              <SelectValue placeholder="Lifecycle" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor={`${formId}-stock-level`}>Stock</Label>
          <Select name="status" defaultValue={item.status}>
            <SelectTrigger id={`${formId}-stock-level`} className="w-full">
              <SelectValue placeholder="Stock" />
            </SelectTrigger>
            <SelectContent>
              {STOCK_LEVELS.map((v) => (
                <SelectItem key={v} value={v}>
                  {v}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor={`${formId}-listing`}>Listing</Label>
          <Select name="productStatus" defaultValue={item.productStatus}>
            <SelectTrigger id={`${formId}-listing`} className="w-full">
              <SelectValue placeholder="Listing" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="none">No status</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor={`${formId}-qty`}>Qty</Label>
          <Input
            id={`${formId}-qty`}
            name="stock"
            type="number"
            defaultValue={item.stock}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor={`${formId}-orders`}>Orders (period)</Label>
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
          <Label htmlFor={`${formId}-cost-price`}>Cost price</Label>
          <Input
            id={`${formId}-cost-price`}
            name="costPrice"
            defaultValue={item.costPrice}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor={`${formId}-sale-price`}>Sale price</Label>
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
          aria-label="Select all"
        />
      </div>
    ),
    cell: ({ row }) => (
      <div className="flex items-center justify-center">
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
        />
      </div>
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "sku",
    header: ({ column }) => <DataTableColumnHeader column={column} title="SKU" />,
    cell: ({ row }) => (
      <span className="text-muted-foreground font-mono">{row.original.sku}</span>
    ),
    meta: { dataTableFilter: false },
  },
  {
    accessorKey: "name",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Product name" />
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
      <DataTableColumnHeader column={column} title="Brand" />
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
      <DataTableColumnHeader column={column} title="Variant" />
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
      <DataTableColumnHeader column={column} title="Category" />
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
      <DataTableColumnHeader column={column} title="Stock" align="center" />
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
              <span className="inline-flex cursor-default" aria-label={level}>
                {isInStock ? (
                  <IconCircleCheckFilled className="size-4 fill-green-500 dark:fill-green-400" />
                ) : isLowStock ? (
                  <IconAlertTriangleFilled className="size-4 fill-amber-500 dark:fill-amber-400" />
                ) : isOutOfStock ? (
                  <IconCircleXFilled className="size-4 fill-red-500 dark:fill-red-400" />
                ) : null}
              </span>
            </TooltipTrigger>
            <TooltipContent sideOffset={8}>{level}</TooltipContent>
          </Tooltip>
        </div>
      )
    },
  },
  {
    accessorKey: "costPrice",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Cost Price" align="center" />
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
      <DataTableColumnHeader column={column} title="Sale Price" align="center" />
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
      <DataTableColumnHeader column={column} title="Status" />
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
            Archived
          </Badge>
        )
      }
      return (
        <Badge
          variant="outline"
          className="border-emerald-500/30 px-1.5 text-emerald-700 dark:text-emerald-400"
        >
          Active
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
            <span className="sr-only">Open menu</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-40">
          <DropdownMenuItem
            onClick={() => openProductSidebar(row.original, "view")}
          >
            <IconEye />
            View
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => openProductSidebar(row.original, "edit")}
          >
            <IconPencil />
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem>
            <IconCopy />
            Duplicate
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
  const rows = useMemo(() => {
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
  const [sidebar, setSidebar] = useState<ProductSidebarState>(null)
  const [addFormKey, setAddFormKey] = useState(0)
  const [lookupSheet, setLookupSheet] = useState<LookupType | null>(null)
  const [lookupDefaults, setLookupDefaults] = useState<
    Partial<Record<LookupType, string>>
  >({})

  const [brandOptions, setBrandOptions] = useState(() =>
    Array.from(
      new Set(
        rows
          .map((row) => row.brand.trim())
          .filter((brand): brand is string => brand.length > 0)
      )
    ).sort((a, b) => a.localeCompare(b))
  )
  const [categoryOptions, setCategoryOptions] = useState(() =>
    Array.from(
      new Set(
        rows
          .map((row) => row.category.trim())
          .filter((category): category is string => category.length > 0)
      )
    ).sort((a, b) => a.localeCompare(b))
  )
  const [variantOptions, setVariantOptions] = useState(() =>
    Array.from(
      new Set([
        ...PRODUCT_VARIANTS,
        ...rows
          .map((row) => row.variant.trim())
          .filter((variant): variant is string => variant.length > 0),
      ])
    ).sort((a, b) => a.localeCompare(b))
  )

  const columns = useMemo(
    () =>
      getProductColumns((p, mode) => setSidebar({ product: p, mode })),
    []
  )

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
        className="flex w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-md"
      >
        {sidebar ? (
          <>
            <SheetHeader className="border-border/60 space-y-1 border-b px-6 py-5 text-left">
              <SheetTitle className="text-lg leading-tight">
                {sidebar.mode === "add"
                  ? "Add product"
                  : sidebar.mode === "edit"
                    ? "Edit product"
                    : sheetProduct?.name}
              </SheetTitle>
              <SheetDescription>
                {sidebar.mode === "add" ? (
                  "Fill in details and images. Saving is a demo only."
                ) : sidebar.mode === "edit" && sheetProduct ? (
                  <>
                    {sheetProduct.name}
                    <span className="text-muted-foreground">
                      {" "}
                      · SKU {sheetProduct.sku}
                    </span>
                  </>
                ) : sheetProduct ? (
                  <>
                    SKU {sheetProduct.sku}
                    {sheetProduct.brand ? ` · ${sheetProduct.brand}` : ""}
                    {sheetProduct.category ? ` · ${sheetProduct.category}` : ""}
                  </>
                ) : null}
              </SheetDescription>
            </SheetHeader>
            <div
              key={
                sidebar.mode === "add"
                  ? "add"
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
                />
              ) : null}
            </div>
            <SheetFooter className="border-border/60 gap-2 border-t px-6 py-4 sm:flex-row sm:justify-end">
              {sidebar.mode === "view" ? (
                <SheetClose asChild>
                  <Button variant="outline" className="w-full sm:w-auto">
                    Close
                  </Button>
                </SheetClose>
              ) : (
                <>
                  <SheetClose asChild>
                    <Button variant="outline" type="button">
                      Cancel
                    </Button>
                  </SheetClose>
                  <Button type="submit" form={formId}>
                    {sidebar.mode === "add" ? "Create product" : "Save product"}
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
      data={rows}
      columns={columns}
      onAddClick={() => {
        setAddFormKey((k) => k + 1)
        setSidebar({ mode: "add" })
      }}
      addButtonLabel="Add product"
      searchPlaceholder="Search products..."
      importRowMapper={mapImportedProduct}
      importSampleFilename="products-sample.csv"
      exportFilename="products-export.csv"
      bulkActions={[
        {
          id: "archive",
          label: "Move to archive",
          icon: <IconArchive className="size-4" />,
          onClick: (selected) => {
            toast.message(
              `Moved ${selected.length} product(s) to archive (demo).`
            )
          },
        },
        {
          id: "delete",
          label: "Delete selected",
          icon: <IconTrash className="size-4" />,
          variant: "destructive",
          onClick: (selected) => {
            toast.message(`Would delete ${selected.length} product(s).`)
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
