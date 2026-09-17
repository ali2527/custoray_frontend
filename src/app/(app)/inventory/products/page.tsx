"use client"

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import { ColumnDef } from "@tanstack/react-table"
import {
  IconAlertTriangleFilled,
  IconArchive,
  IconBan,
  IconCircleCheck,
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

import { confirmDeleteAction } from "@/lib/confirm-action"
import {
  EMPTY_PRODUCT,
  MAX_PRODUCT_IMAGES,
  countAcceptedImageFiles,
  matchCatalogOption,
  mapImportedProduct,
  productFromSidebarForm,
  productImageUploadValue,
  productTabFilter,
  productTabValues,
  removeProductImageAt,
  type ProductRow,
} from "@/lib/inventory-product-rows"

import { DataTableColumnHeader } from "@/components/data-table-column-header"
import { DataTable, type DataTableTab } from "@/components/data-table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
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
import { formatMoney } from "@/lib/customers"
import { buildSampleCsv } from "@/lib/csv"
import {
  DEFAULT_PRODUCT_SKU_SETTINGS,
  PRODUCT_SKU_SETTINGS_EVENT,
  loadProductSkuSettings,
  productImportColumns,
  productImportSampleRow,
  type ProductSkuSettings,
} from "@/lib/product-sku-settings"
import { ApiClientError } from "@/lib/api/client"
import { PageLoader } from "@/components/ui/page-loader"
import { useInventoryProducts } from "@/hooks/use-inventory-products"
import { useCatalogFieldSettings } from "@/hooks/use-catalog-field-settings"
import { productCatalogImportSelect } from "@/lib/catalog-field-settings"

const ADD_NEW_BRAND_VALUE = "__add_new_brand__"
const ADD_NEW_CATEGORY_VALUE = "__add_new_category__"
const ADD_NEW_VARIANT_VALUE = "__add_new_variant__"
const NONE_CATALOG_VALUE = "__none__"

function stockLevelLabel(t: TFunction<"inventory">, level: string) {
  if (level === "In Stock") return t("stockLevel.inStock")
  if (level === "Low Stock") return t("stockLevel.lowStock")
  if (level === "Out of Stock") return t("stockLevel.outOfStock")
  return level
}

function ProductViewDetail({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <div className="bg-muted/20 flex flex-col gap-1 rounded-lg border px-3 py-2.5">
      <dt className="text-muted-foreground text-[11px] font-medium tracking-wide uppercase">
        {label}
      </dt>
      <dd className="text-foreground min-w-0 text-sm font-medium">{children}</dd>
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
  const inputRef = useRef<HTMLInputElement>(null)
  const pendingRef = useRef(new Set<string>())
  const maxImages = MAX_PRODUCT_IMAGES
  const remainingSlots = Math.max(0, maxImages - urls.length)
  const atImageLimit = remainingSlots === 0

  const resetFileInput = () => {
    if (inputRef.current) inputRef.current.value = ""
  }

  const removeAt = (index: number) => {
    setUrls((current) => removeProductImageAt(current, index))
    resetFileInput()
  }

  const addFiles = (files: FileList | null) => {
    if (!files?.length) return
    const accepted = countAcceptedImageFiles(Array.from(files), urls.length, maxImages)
    if (accepted.accepted === 0 && urls.length >= maxImages) {
      toast.message(t("toasts.maxImages", { count: maxImages }))
      resetFileInput()
      return
    }

    let added = 0
    for (const file of Array.from(files)) {
      if (added >= remainingSlots) break
      if (!file.type.startsWith("image/")) continue
      const id = `${file.name}-${file.size}-${file.lastModified}-${added}`
      pendingRef.current.add(id)
      const reader = new FileReader()
      reader.onload = () => {
        if (!pendingRef.current.has(id)) return
        pendingRef.current.delete(id)
        const dataUrl = String(reader.result)
        setUrls((current) => {
          if (current.includes(dataUrl) || current.length >= maxImages) {
            return current
          }
          return [...current, dataUrl]
        })
      }
      reader.readAsDataURL(file)
      added += 1
    }

    if (accepted.skippedOverLimit > 0) {
      toast.message(t("toasts.onlyImagesAllowed", { count: maxImages }))
    }
    resetFileInput()
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
                onClick={() => removeAt(i)}
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
        ref={inputRef}
        id={id}
        type="file"
        accept="image/*"
        multiple
        className="sr-only"
        disabled={atImageLimit}
        onChange={(e) => {
          addFiles(e.target.files)
        }}
      />
      <input type="hidden" name="imageUrls" value={productImageUploadValue(urls)} />
      <p className="text-muted-foreground text-xs">
        {t("images.hint", { count: maxImages })}
      </p>
    </div>
  )
}

function apiErrorMessage(error: unknown, fallback: string) {
  if (error instanceof ApiClientError) return error.message
  if (error instanceof Error) return error.message
  return fallback
}

function ProductViewSidebarBody({ item }: { item: ProductRow }) {
  const { t } = useTranslation("inventory")
  const { settings: tables } = useCatalogFieldSettings()
  const imgs = item.imageUrls ?? []
  const cost = Number(item.costPrice) || 0
  const sale = Number(item.salePrice) || 0
  const margin = sale - cost
  const marginPct = sale > 0 ? (margin / sale) * 100 : 0
  const archived = item.lifecycle === "archived"

  return (
    <div className="flex flex-col gap-5">
      {imgs.length > 0 ? (
        <div className="flex flex-col gap-2">
          <div className="bg-muted aspect-[16/9] overflow-hidden rounded-xl border">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imgs[0]} alt="" className="size-full object-cover" />
          </div>
          {imgs.length > 1 ? (
            <div className="grid grid-cols-5 gap-2">
              {imgs.slice(1).map((url, i) => (
                <div
                  key={`${i}-${url.slice(0, 24)}`}
                  className="bg-muted aspect-square overflow-hidden rounded-lg border"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt="" className="size-full object-cover" />
                </div>
              ))}
            </div>
          ) : null}
        </div>
      ) : (
        <div className="bg-muted/40 text-muted-foreground flex aspect-[16/9] flex-col items-center justify-center gap-2 rounded-xl border border-dashed">
          <IconPhoto className="size-8 opacity-70" />
          <span className="text-xs font-medium">{t("viewSheet.noImage")}</span>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-1.5">
        <Badge variant="outline" className="font-mono text-xs">
          {item.sku || "—"}
        </Badge>
        <Badge
          variant="outline"
          className={
            archived
              ? "border-border text-foreground/80"
              : "border-emerald-500/30 text-emerald-700 dark:text-emerald-400"
          }
        >
          {archived ? t("tabs.archived") : t("tabs.active")}
        </Badge>
        <Badge variant="outline" className="text-muted-foreground">
          {stockLevelLabel(t, item.status)}
        </Badge>
      </div>

      <div>
        <h3 className="mb-2 text-sm font-semibold tracking-tight">
          {t("viewSheet.pricing")}
        </h3>
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-xl border px-3 py-3">
            <p className="text-muted-foreground text-[11px] font-medium tracking-wide uppercase">
              {t("fields.costPrice")}
            </p>
            <p className="mt-1 text-sm font-semibold tabular-nums">
              {formatMoney(item.costPrice)}
            </p>
          </div>
          <div className="rounded-xl border px-3 py-3">
            <p className="text-muted-foreground text-[11px] font-medium tracking-wide uppercase">
              {t("fields.salePrice")}
            </p>
            <p className="mt-1 text-sm font-semibold tabular-nums">
              {formatMoney(item.salePrice)}
            </p>
          </div>
          <div className="rounded-xl border px-3 py-3">
            <p className="text-muted-foreground text-[11px] font-medium tracking-wide uppercase">
              {t("viewSheet.margin")}
            </p>
            <p
              className={`mt-1 text-sm font-semibold tabular-nums ${
                margin >= 0 ? "text-emerald-700 dark:text-emerald-400" : "text-red-600"
              }`}
            >
              {formatMoney(margin.toFixed(2))}
              <span className="text-muted-foreground ms-1 text-[11px] font-medium">
                {marginPct.toFixed(0)}%
              </span>
            </p>
          </div>
        </div>
      </div>

      <div>
        <h3 className="mb-2 text-sm font-semibold tracking-tight">
          {t("viewSheet.details")}
        </h3>
        <dl className="grid grid-cols-2 gap-2">
          {tables.brand ? (
            <ProductViewDetail label={t("fields.brand")}>
              {item.brand || "—"}
            </ProductViewDetail>
          ) : null}
          {tables.category ? (
            <ProductViewDetail label={t("fields.category")}>
              {item.category || "—"}
            </ProductViewDetail>
          ) : null}
          {tables.variant ? (
            <ProductViewDetail label={t("fields.variant")}>
              {item.variant || "—"}
            </ProductViewDetail>
          ) : null}
          <ProductViewDetail label={t("fields.qty")}>{item.stock}</ProductViewDetail>
          <ProductViewDetail label={t("fields.orders")}>{item.orders}</ProductViewDetail>
          <ProductViewDetail label={t("fields.sku")}>
            <span className="font-mono">{item.sku || "—"}</span>
          </ProductViewDetail>
          <ProductViewDetail label={t("fields.status")}>
            {t(`tabs.${item.lifecycle}`)}
          </ProductViewDetail>
        </dl>
      </div>

      <ProductPriceTimeline
        productId={item.id}
        sku={item.sku}
        salePrice={item.salePrice}
        costPrice={item.costPrice}
      />
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
  skuSettings,
  existingProducts,
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
  onSave: (product: ProductRow) => void | Promise<void>
  skuSettings: ProductSkuSettings
  existingProducts: ProductRow[]
}) {
  const { t } = useTranslation("inventory")
  const { settings: tables } = useCatalogFieldSettings()
  const [brandValue, setBrandValue] = useState(
    () => matchCatalogOption(item.brand, brandOptions).value
  )
  const [categoryValue, setCategoryValue] = useState(
    () => matchCatalogOption(item.category, categoryOptions).value
  )
  const [variantValue, setVariantValue] = useState(
    () => matchCatalogOption(item.variant, variantOptions).value
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
      onSubmit={async (e) => {
        e.preventDefault()
        const next = productFromSidebarForm(
          new FormData(e.currentTarget),
          item,
          { skuSettings, existing: existingProducts, isNew }
        )
        if (!next.name.trim()) {
          toast.error(t("toasts.nameRequired"))
          return
        }
        if (skuSettings.mode === "custom" && !next.sku.trim()) {
          toast.error(t("toasts.skuRequired"))
          return
        }
        if (!tables.brand) next.brand = item.brand
        if (!tables.category) next.category = item.category
        if (!tables.variant) next.variant = item.variant
        try {
          await onSave(next)
          toast.success(isNew ? t("toasts.created") : t("toasts.saved"))
          onClose()
        } catch (error) {
          toast.error(
            error instanceof Error ? error.message : t("toasts.saveFailed")
          )
        }
      }}
    >
      <ProductImagesField
        key={`${formId}-images`}
        id={`${formId}-images-input`}
        initialUrls={item.imageUrls ?? []}
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {skuSettings.mode === "custom" ? (
          <div className="flex flex-col gap-2">
            <Label htmlFor={`${formId}-sku`}>{t("fields.sku")}</Label>
            <Input id={`${formId}-sku`} name="sku" defaultValue={item.sku} />
          </div>
        ) : !isNew ? (
          <div className="flex flex-col gap-2">
            <Label>{t("fields.sku")}</Label>
            <p className="text-muted-foreground bg-muted/50 rounded-md border px-3 py-2 font-mono text-sm">
              {item.sku}
            </p>
          </div>
        ) : null}
        <div className="flex flex-col gap-2">
          <Label htmlFor={`${formId}-name`}>{t("fields.name")}</Label>
          <Input id={`${formId}-name`} name="name" defaultValue={item.name} />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {tables.brand ? (
          <div className="flex flex-col gap-2">
            <Label htmlFor={`${formId}-brand`}>
              {t("fields.brand")}
            </Label>
            <Select
              name="brand-select"
              value={brandValue || NONE_CATALOG_VALUE}
              onValueChange={(value) => {
                if (value === ADD_NEW_BRAND_VALUE) {
                  onRequestAddLookup("brand")
                  return
                }
                setBrandValue(value === NONE_CATALOG_VALUE ? "" : value)
              }}
            >
              <SelectTrigger id={`${formId}-brand`} className="w-full">
                <SelectValue placeholder={t("form.selectBrand")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE_CATALOG_VALUE}>
                  {t("form.notSelected")}
                </SelectItem>
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
        ) : (
          <input type="hidden" name="brand" value={item.brand} />
        )}
        {tables.category ? (
          <div className="flex flex-col gap-2">
            <Label htmlFor={`${formId}-category`}>
              {t("fields.category")}
            </Label>
            <Select
              name="category-select"
              value={categoryValue || NONE_CATALOG_VALUE}
              onValueChange={(value) => {
                if (value === ADD_NEW_CATEGORY_VALUE) {
                  onRequestAddLookup("category")
                  return
                }
                setCategoryValue(value === NONE_CATALOG_VALUE ? "" : value)
              }}
            >
              <SelectTrigger id={`${formId}-category`} className="w-full">
                <SelectValue placeholder={t("form.selectCategory")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE_CATALOG_VALUE}>
                  {t("form.notSelected")}
                </SelectItem>
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
        ) : (
          <input type="hidden" name="category" value={item.category} />
        )}
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {tables.variant ? (
          <div className="flex flex-col gap-2">
            <Label htmlFor={`${formId}-variant`}>
              {t("fields.variant")}
            </Label>
            <Select
              name="variant-select"
              value={variantValue || NONE_CATALOG_VALUE}
              onValueChange={(value) => {
                if (value === ADD_NEW_VARIANT_VALUE) {
                  onRequestAddLookup("variant")
                  return
                }
                setVariantValue(value === NONE_CATALOG_VALUE ? "" : value)
              }}
            >
              <SelectTrigger id={`${formId}-variant`} className="w-full">
                <SelectValue placeholder={t("form.selectVariant")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE_CATALOG_VALUE}>
                  {t("form.notSelected")}
                </SelectItem>
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
        ) : (
          <input type="hidden" name="variant" value={item.variant} />
        )}
        <div className="flex flex-col gap-2">
          <Label htmlFor={`${formId}-qty`}>{t("fields.qty")}</Label>
          <Input
            id={`${formId}-qty`}
            name="stock"
            type="number"
            min={0}
            step={1}
            defaultValue={item.stock}
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
        <div className="flex flex-col gap-2">
          <Label htmlFor={`${formId}-lifecycle`}>{t("fields.status")}</Label>
          <select
            id={`${formId}-lifecycle`}
            name="lifecycle"
            defaultValue={item.lifecycle}
            className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm shadow-xs outline-none focus-visible:ring-ring/50 focus-visible:ring-[3px]"
          >
            <option value="active">{t("tabs.active")}</option>
            <option value="inactive">{t("tabs.inactive")}</option>
            <option value="archived">{t("tabs.archived")}</option>
          </select>
        </div>
      </div>
    </form>
  )
}

function getProductColumns(
  t: TFunction<"inventory">,
  openProductSidebar: (row: ProductRow, mode: "view" | "edit") => void,
  onDuplicate: (row: ProductRow) => void,
  onDelete: (row: ProductRow) => void
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
      <button
        type="button"
        className="text-foreground hover:text-foreground/80 font-medium text-start hover:underline"
        onClick={() => openProductSidebar(row.original, "view")}
      >
        {row.original.name}
      </button>
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
    meta: { dataTableFilterVariant: "select" },
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
    meta: { dataTableFilterVariant: "select" },
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
    meta: { dataTableFilterVariant: "select" },
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
    accessorKey: "lifecycle",
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
    enableHiding: false,
    meta: {
      headerClassName: "sticky end-0 z-20 bg-muted w-12 min-w-12",
      cellClassName:
        "sticky end-0 z-10 w-12 min-w-12 bg-background transition-colors group-hover/row:bg-muted/50 group-data-[state=selected]/row:bg-muted",
    },
    cell: ({ row }) => (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="text-muted-foreground hover:bg-muted hover:text-foreground data-[state=open]:bg-muted data-[state=open]:text-foreground flex size-8"
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
          <DropdownMenuItem
            onClick={() => onDuplicate(row.original)}
          >
            <IconCopy />
            {t("actions.duplicate")}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            onClick={() => onDelete(row.original)}
          >
            <IconTrash />
            {t("actions.delete")}
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
  const {
    products,
    brandOptions,
    categoryOptions,
    variantOptions,
    isLoading,
    isError,
    error,
    save,
    removeMany,
    setLifecycle,
    duplicate,
    importRows,
    createLookup,
  } = useInventoryProducts()
  const { settings: catalogTables } = useCatalogFieldSettings()
  const productImportSelect = productCatalogImportSelect(
    {
      brands: brandOptions,
      categories: categoryOptions,
      variants: variantOptions,
    },
    catalogTables
  )
  const [sidebar, setSidebar] = useState<ProductSidebarState>(null)
  const [addFormKey, setAddFormKey] = useState(0)
  const [skuSettings, setSkuSettings] = useState<ProductSkuSettings>(
    DEFAULT_PRODUCT_SKU_SETTINGS
  )
  const [lookupSheet, setLookupSheet] = useState<LookupType | null>(null)
  const [lookupDefaults, setLookupDefaults] = useState<
    Partial<Record<LookupType, string>>
  >({})
  const catalogRef = useRef({
    brands: brandOptions,
    categories: categoryOptions,
    variants: variantOptions,
    tables: catalogTables,
  })
  catalogRef.current = {
    brands: brandOptions,
    categories: categoryOptions,
    variants: variantOptions,
    tables: catalogTables,
  }

  function closeSidebarIfProductRemoved(srNos: Set<number>) {
    setSidebar((current) => {
      if (!current || current.mode === "add") return current
      return srNos.has(current.product.srNo) ? null : current
    })
  }

  const handleSaveProduct = async (next: ProductRow) => {
    const isNew = sidebar?.mode === "add" || !next.id
    if (!isNew && !next.id) {
      throw new Error(t("toasts.saveFailed"))
    }
    try {
      await save({ row: next, isNew })
    } catch (error) {
      throw new Error(apiErrorMessage(error, t("toasts.saveFailed")))
    }
  }

  async function handleDeleteProduct(product: ProductRow) {
    if (
      !(await confirmDeleteAction({
        itemName: product.name,
        entityLabel: t("entity.product"),
      }))
    ) {
      return
    }
    if (!product.id) {
      toast.error(t("toasts.saveFailed"))
      return
    }
    try {
      const result = await removeMany([product.id])
      closeSidebarIfProductRemoved(new Set([product.srNo]))
      if (result.failed > 0) {
        toast.error(t("toasts.saveFailed"))
        return
      }
      toast.success(t("toasts.deletedNamed", { name: product.name }))
    } catch (error) {
      toast.error(apiErrorMessage(error, t("toasts.saveFailed")))
    }
  }

  async function handleDeleteProducts(selected: ProductRow[]) {
    if (selected.length === 0) return
    if (
      !(await confirmDeleteAction({
        count: selected.length,
        entityLabel: t("entity.product"),
      }))
    ) {
      return
    }
    const ids = selected.map((row) => row.id).filter((id): id is string => Boolean(id))
    try {
      const result = await removeMany(ids)
      closeSidebarIfProductRemoved(new Set(selected.map((row) => row.srNo)))
      if (result.failed > 0) {
        toast.error(
          t("toasts.importPartial", {
            added: result.deletedIds.length,
            failed: result.failed,
          })
        )
        return
      }
      toast.success(t("toasts.deletedCount", { count: result.deletedIds.length }))
    } catch (error) {
      toast.error(apiErrorMessage(error, t("toasts.saveFailed")))
    }
  }

  async function handleSetLifecycle(
    selected: ProductRow[],
    lifecycle: ProductRow["lifecycle"],
    successMessage: string
  ) {
    if (selected.length === 0) return
    const ids = selected
      .map((row) => row.id)
      .filter((id): id is string => Boolean(id))
    try {
      const result = await setLifecycle({ ids, lifecycle })
      if (result.failed > 0) {
        toast.error(
          t("toasts.importPartial", {
            added: result.updatedIds.length,
            failed: result.failed,
          })
        )
        return
      }
      toast.success(successMessage)
    } catch (error) {
      toast.error(apiErrorMessage(error, t("toasts.saveFailed")))
    }
  }

  async function handleDuplicateProduct(row: ProductRow) {
    try {
      await duplicate({ source: row, skuSettings })
      toast.success(t("toasts.created"))
    } catch (error) {
      toast.error(apiErrorMessage(error, t("toasts.saveFailed")))
    }
  }

  async function handleImportRows(rows: Record<string, string>[]) {
    const result = await importRows({
      rows,
      skuSettings,
      tables: catalogTables,
    })
    if (result.failed > 0) {
      toast.error(
        t("toasts.importPartial", {
          added: result.created.length,
          failed: result.failed,
        })
      )
    }
    if (result.unmatched.size > 0) {
      const names = [...result.unmatched]
      const shown = names.slice(0, 6).join(", ")
      toast.warning(
        t("toasts.importUnmatchedCatalog", {
          names: names.length > 6 ? `${shown}…` : shown,
        })
      )
    }
    return result.created.length
  }

  async function handleCreateLookup(
    value: string,
    meta?: { description?: string; status?: string }
  ) {
    const type = lookupSheet ?? "brand"
    await createLookup({
      type,
      name: value,
      description: meta?.description,
      status: meta?.status,
    })
    setLookupDefaults((prev) => ({ ...prev, [type]: value }))
  }

  const columns = useMemo(() => {
    const all = getProductColumns(
      t,
      (p, mode) => setSidebar({ product: p, mode }),
      (row) => {
        void handleDuplicateProduct(row)
      },
      (row) => {
        void handleDeleteProduct(row)
      }
    )
    return all.filter((col) => {
      const key =
        "accessorKey" in col && col.accessorKey != null
          ? String(col.accessorKey)
          : undefined
      if (key === "brand") return catalogTables.brand
      if (key === "category") return catalogTables.category
      if (key === "variant") return catalogTables.variant
      return true
    })
  }, [catalogTables, t])

  useEffect(() => {
    const syncSkuSettings = () => setSkuSettings(loadProductSkuSettings())
    syncSkuSettings()
    window.addEventListener(PRODUCT_SKU_SETTINGS_EVENT, syncSkuSettings)
    window.addEventListener("storage", syncSkuSettings)
    return () => {
      window.removeEventListener(PRODUCT_SKU_SETTINGS_EVENT, syncSkuSettings)
      window.removeEventListener("storage", syncSkuSettings)
    }
  }, [])

  useEffect(() => {
    if (isError) {
      toast.error(apiErrorMessage(error, t("toasts.loadFailed")))
    }
  }, [error, isError, t])

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

  if (isLoading) {
    return <PageLoader message={t("actions.loading", { ns: "common" })} />
  }

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
          sidebar?.mode === "view" ? "sm:max-w-xl" : "sm:max-w-md"
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
                    {catalogTables.brand && sheetProduct.brand
                      ? ` · ${sheetProduct.brand}`
                      : ""}
                    {catalogTables.category && sheetProduct.category
                      ? ` · ${sheetProduct.category}`
                      : ""}
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
                  skuSettings={skuSettings}
                  existingProducts={products}
                />
              ) : null}
            </div>
            <SheetFooter className="border-border/60 gap-2 border-t px-6 py-4 sm:flex-row sm:justify-end">
              {sidebar.mode === "view" && sheetProduct ? (
                <>
                  <SheetClose asChild>
                    <Button variant="outline" className="w-full sm:w-auto">
                      {t("actions.close", { ns: "common" })}
                    </Button>
                  </SheetClose>
                  <Button
                    type="button"
                    className="w-full sm:w-auto"
                    onClick={() =>
                      setSidebar({ mode: "edit", product: sheetProduct })
                    }
                  >
                    {t("actions.edit")}
                  </Button>
                </>
              ) : sidebar.mode === "view" ? (
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
      onCreate={handleCreateLookup}
    />
    <DataTable
      data={products}
      columns={columns}
      addButtonLabel={t("addButton")}
      onAddClick={() => {
        setAddFormKey((k) => k + 1)
        setSidebar({ mode: "add" })
      }}
      defaultColumnVisibility={{}}
      settingsKey="inventory-products"
      searchPlaceholder={t("search")}
      importRowMapper={(row, existing) =>
        mapImportedProduct(row, existing, skuSettings, catalogRef.current)
      }
      importSelectColumns={productImportSelect.selectColumns}
      importRequiredSelectColumns={productImportSelect.requiredSelectColumns}
      importSampleFilename="products-sample.csv"
      importSampleCsvContent={buildSampleCsv(
        productImportColumns(skuSettings, catalogTables),
        productImportSampleRow(skuSettings, catalogTables)
      )}
      importColumns={productImportColumns(skuSettings, catalogTables)}
      exportFilename="products-export.csv"
      onImportRows={handleImportRows}
      bulkActions={[
        {
          id: "active",
          label: t("actions.setActive"),
          icon: <IconCircleCheck className="size-4" />,
          onClick: (selected) => {
            void handleSetLifecycle(
              selected,
              "active",
              t("toasts.setActiveCount", { count: selected.length })
            )
          },
        },
        {
          id: "inactive",
          label: t("actions.setInactive"),
          icon: <IconBan className="size-4" />,
          onClick: (selected) => {
            void handleSetLifecycle(
              selected,
              "inactive",
              t("toasts.setInactiveCount", { count: selected.length })
            )
          },
        },
        {
          id: "archive",
          label: t("actions.moveToArchive"),
          icon: <IconArchive className="size-4" />,
          onClick: (selected) => {
            void handleSetLifecycle(
              selected,
              "archived",
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
            void handleDeleteProducts(selected)
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
