"use client"

import { useEffect, useMemo, useRef, useState } from "react"

import {
  InfiniteScrollSelect,
  type InfiniteScrollSelectOption,
} from "@/components/ui/infinite-scroll-select"
import { useProductSearch } from "@/hooks/use-product-search"
import { formatMoney } from "@/lib/customers"
import type { SearchProductRow } from "@/lib/product-search"
import type { ProductRow } from "@/lib/products"

type ProductSearchSelectProps = {
  id?: string
  value: string
  onSelect: (product: SearchProductRow | (ProductRow & { apiId?: string })) => void
  /** Keeps the closed trigger label when the selected row is not in the current search page. */
  selectedProduct?: ProductRow | null
  /** Which price to show as trailing text. */
  priceField?: "salePrice" | "costPrice"
  placeholder?: string
  searchPlaceholder?: string
  emptyMessage?: string
  pageSize?: number
  onAddNew?: () => void
  addNewLabel?: string
  disabled?: boolean
  className?: string
  "aria-invalid"?: boolean
}

function toOption(
  product: ProductRow,
  priceField: "salePrice" | "costPrice"
): InfiniteScrollSelectOption {
  return {
    value: String(product.id),
    label: product.name,
    description: product.sku,
    trailing: formatMoney(product[priceField]),
  }
}

/**
 * Product picker backed by debounced server search (`useProductSearch`).
 */
export function ProductSearchSelect({
  id,
  value,
  onSelect,
  selectedProduct = null,
  priceField = "salePrice",
  placeholder = "Select product",
  searchPlaceholder = "Search products…",
  emptyMessage = "No products found.",
  pageSize = 10,
  onAddNew,
  addNewLabel = "Add product",
  disabled,
  className,
  "aria-invalid": ariaInvalid,
}: ProductSearchSelectProps) {
  const [open, setOpen] = useState(false)
  const { query, setQuery, products, loading, reset } = useProductSearch({
    enabled: open,
  })
  const selectedRef = useRef<ProductRow | null>(selectedProduct)

  useEffect(() => {
    if (selectedProduct) selectedRef.current = selectedProduct
  }, [selectedProduct])

  useEffect(() => {
    if (!open) reset()
  }, [open, reset])

  const options = useMemo(() => {
    const mapped = products.map((product) => toOption(product, priceField))
    const selected = selectedProduct ?? selectedRef.current
    if (
      value &&
      selected &&
      String(selected.id) === value &&
      !mapped.some((option) => option.value === value)
    ) {
      return [toOption(selected, priceField), ...mapped]
    }
    return mapped
  }, [products, priceField, selectedProduct, value])

  return (
    <InfiniteScrollSelect
      id={id}
      value={value}
      onValueChange={(nextId) => {
        const product =
          products.find((item) => String(item.id) === nextId) ??
          (selectedRef.current && String(selectedRef.current.id) === nextId
            ? selectedRef.current
            : selectedProduct && String(selectedProduct.id) === nextId
              ? selectedProduct
              : null)
        if (!product) return
        selectedRef.current = product
        onSelect(product)
      }}
      options={options}
      placeholder={placeholder}
      searchPlaceholder={searchPlaceholder}
      emptyMessage={loading ? "Searching…" : emptyMessage}
      pageSize={pageSize}
      onAddNew={onAddNew}
      addNewLabel={addNewLabel}
      disabled={disabled}
      className={className}
      aria-invalid={ariaInvalid}
      searchMode="remote"
      searchValue={query}
      onSearchChange={setQuery}
      searchLoading={loading}
      onOpenChange={setOpen}
    />
  )
}
