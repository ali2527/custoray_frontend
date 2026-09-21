"use client"

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react"
import { IconPlus, IconTrash } from "@tabler/icons-react"
import { toast } from "sonner"

import { ProductQuickForm } from "@/components/inventory/product-quick-form"
import { VendorQuickAddSheet } from "@/components/vendors/vendor-quick-add-sheet"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { InfiniteScrollSelect } from "@/components/ui/infinite-scroll-select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useProducts } from "@/context/products-context"
import { useVendors } from "@/context/vendors-context"
import { formatMoney } from "@/lib/customers"
import {
  findVendorBySelectValue,
  vendorSelectValue,
} from "@/lib/vendors"
import { EMPTY_PRODUCT, nextSku, productFromFormData } from "@/lib/products"
import {
  computeLineTotal,
  computePurchaseTotal,
  type PurchaseLineRow,
  type PurchaseRow,
} from "@/lib/purchases"

type PurchaseFormProps = {
  formId: string
  purchase: PurchaseRow
  onSubmit: (e: FormEvent<HTMLFormElement>) => void
}

type QuickAddState =
  | { type: "vendor" }
  | { type: "product"; lineIndex: number }
  | null

function emptyLine(id: number): PurchaseLineRow {
  return {
    id,
    productName: "",
    quantity: 1,
    unitPrice: "0",
    lineTotal: "0.00",
  }
}

function resolveVendorId(
  vendors: { id: number; apiId?: string; name: string }[],
  name: string
) {
  const normalized = name.trim()
  if (!normalized || normalized === "—") return ""
  const match = vendors.find((vendor) => vendor.name === normalized)
  return match ? vendorSelectValue(match) : ""
}

function resolveProductId(products: { id: number; name: string }[], name: string) {
  const normalized = name.trim()
  if (!normalized) return ""
  const match = products.find((product) => product.name === normalized)
  return match ? String(match.id) : ""
}

export function PurchaseForm({ formId, purchase, onSubmit }: PurchaseFormProps) {
  const { vendors } = useVendors()
  const { products, addProduct } = useProducts()

  const initialVendorName = purchase.vendorName === "—" ? "" : purchase.vendorName
  const [vendorId, setVendorId] = useState(() =>
    resolveVendorId(vendors, initialVendorName)
  )
  const [lines, setLines] = useState<PurchaseLineRow[]>(
    purchase.lines.length > 0 ? purchase.lines : [emptyLine(1)]
  )
  const [quickAdd, setQuickAdd] = useState<QuickAddState>(null)

  useEffect(() => {
    if (vendorId) return
    const resolved = resolveVendorId(vendors, initialVendorName)
    if (resolved) setVendorId(resolved)
  }, [vendors, initialVendorName, vendorId])

  const vendorName = useMemo(() => {
    if (!vendorId) return ""
    const vendor = findVendorBySelectValue(vendors, vendorId)
    return vendor?.name ?? ""
  }, [vendorId, vendors])

  const purchaseTotal = useMemo(() => computePurchaseTotal(lines), [lines])

  const vendorOptions = useMemo(
    () =>
      vendors.map((vendor) => ({
        value: vendorSelectValue(vendor),
        label: vendor.name,
        description: vendor.phone !== "—" ? vendor.phone : vendor.description,
      })),
    [vendors]
  )

  const productOptions = useMemo(
    () =>
      products.map((product) => ({
        value: String(product.id),
        label: product.name,
        description: product.sku,
        trailing: formatMoney(product.costPrice),
      })),
    [products]
  )

  const updateLine = useCallback(
    (index: number, patch: Partial<PurchaseLineRow>) => {
      setLines((prev) =>
        prev.map((line, i) => {
          if (i !== index) return line
          const next = { ...line, ...patch }
          const qty = patch.quantity ?? line.quantity
          const price = patch.unitPrice ?? line.unitPrice
          return {
            ...next,
            lineTotal: computeLineTotal(qty, price),
          }
        })
      )
    },
    []
  )

  const addLine = useCallback(() => {
    setLines((prev) => {
      const maxId = prev.reduce((m, l) => Math.max(m, l.id), 0)
      return [...prev, emptyLine(maxId + 1)]
    })
  }, [])

  const removeLine = useCallback((index: number) => {
    setLines((prev) => {
      if (prev.length <= 1) return prev
      return prev.filter((_, i) => i !== index)
    })
  }, [])

  const handleProductSelect = useCallback(
    (index: number, productId: string) => {
      const product = products.find((item) => String(item.id) === productId)
      if (!product) return
      updateLine(index, {
        productName: product.name,
        unitPrice: product.costPrice,
      })
    },
    [products, updateLine]
  )

  const handleVendorCreated = useCallback((created: { id: number; apiId?: string }) => {
    setVendorId(vendorSelectValue(created))
    setQuickAdd(null)
  }, [])

  const handleAddProduct = useCallback(
    async (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault()
      if (quickAdd?.type !== "product") return

      const fd = new FormData(e.currentTarget)
      const parsed = productFromFormData(fd, 0, products)
      if (!parsed.name.trim()) {
        toast.error("Product name is required.")
        return
      }

      try {
        const created = await addProduct(parsed)
        updateLine(quickAdd.lineIndex, {
          productName: created.name,
          unitPrice: created.costPrice,
        })
        setQuickAdd(null)
        toast.success("Product added.")
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not save product.")
      }
    },
    [addProduct, products, quickAdd, updateLine]
  )

  const vendorFormId = `${formId}-add-vendor`
  const productFormId = `${formId}-add-product`

  return (
    <>
      <form id={formId} className="flex flex-col gap-4 text-sm" onSubmit={onSubmit}>
        <input type="hidden" name="vendorName" value={vendorName} required />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor={`${formId}-purchaseNumber`}>Purchase #</Label>
            <Input
              id={`${formId}-purchaseNumber`}
              name="purchaseNumber"
              defaultValue={purchase.purchaseNumber}
              placeholder="PO-2006"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor={`${formId}-purchaseDate`}>Purchase date</Label>
            <Input
              id={`${formId}-purchaseDate`}
              name="purchaseDate"
              type="date"
              defaultValue={purchase.purchaseDate}
              required
            />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor={`${formId}-vendor`}>Vendor</Label>
          <InfiniteScrollSelect
            id={`${formId}-vendor`}
            value={vendorId}
            onValueChange={setVendorId}
            options={vendorOptions}
            placeholder="Select vendor"
            searchPlaceholder="Search vendors…"
            emptyMessage="No vendors found."
            pageSize={10}
            onAddNew={() => setQuickAdd({ type: "vendor" })}
            addNewLabel="Add vendor"
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor={`${formId}-description`}>Notes</Label>
          <Input
            id={`${formId}-description`}
            name="description"
            defaultValue={purchase.description === "—" ? "" : purchase.description}
            placeholder="Delivery details, internal notes…"
          />
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2">
            <Label>Line items</Label>
            <Button type="button" variant="outline" size="sm" onClick={addLine}>
              <IconPlus className="size-4" />
              Add line
            </Button>
          </div>
          <div className="flex flex-col gap-3">
            {lines.map((line, index) => (
              <div
                key={`${line.id}-${index}`}
                className="border-border/60 bg-muted/20 space-y-2 rounded-lg border p-3"
              >
                <input type="hidden" name={`lines[${index}].id`} value={line.id} />
                <input
                  type="hidden"
                  name={`lines[${index}].productName`}
                  value={line.productName}
                />
                <div className="flex flex-col gap-2">
                  <Label htmlFor={`${formId}-product-${index}`}>Product</Label>
                  <InfiniteScrollSelect
                    id={`${formId}-product-${index}`}
                    value={resolveProductId(products, line.productName)}
                    onValueChange={(productId) => handleProductSelect(index, productId)}
                    options={productOptions}
                    placeholder="Select product"
                    searchPlaceholder="Search products…"
                    emptyMessage="No products found."
                    pageSize={10}
                    onAddNew={() => setQuickAdd({ type: "product", lineIndex: index })}
                    addNewLabel="Add product"
                  />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="flex flex-col gap-1">
                    <Label htmlFor={`${formId}-qty-${index}`}>Qty</Label>
                    <Input
                      id={`${formId}-qty-${index}`}
                      name={`lines[${index}].quantity`}
                      type="number"
                      min={1}
                      value={line.quantity}
                      onChange={(e) =>
                        updateLine(index, { quantity: Number(e.target.value) || 1 })
                      }
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <Label htmlFor={`${formId}-price-${index}`}>Unit price</Label>
                    <Input
                      id={`${formId}-price-${index}`}
                      name={`lines[${index}].unitPrice`}
                      value={line.unitPrice}
                      onChange={(e) => updateLine(index, { unitPrice: e.target.value })}
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <Label>Line total</Label>
                    <div className="text-foreground flex h-9 items-center tabular-nums">
                      {line.lineTotal}
                    </div>
                  </div>
                </div>
                {lines.length > 1 ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive h-8 w-fit px-2"
                    onClick={() => removeLine(index)}
                  >
                    <IconTrash className="size-4" />
                    Remove line
                  </Button>
                ) : null}
              </div>
            ))}
          </div>
          <p className="text-muted-foreground text-right text-sm tabular-nums">
            Purchase total:{" "}
            <span className="text-foreground font-medium">{purchaseTotal}</span>
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor={`${formId}-paidAmount`}>Paid amount</Label>
            <Input
              id={`${formId}-paidAmount`}
              name="paidAmount"
              defaultValue={purchase.paidAmount}
              placeholder="0.00"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor={`${formId}-status`}>Status</Label>
            <select
              id={`${formId}-status`}
              name="status"
              defaultValue={purchase.status}
              className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm shadow-xs outline-none focus-visible:ring-ring/50 focus-visible:ring-[3px]"
            >
              <option value="pending">Pending</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>
      </form>

      <VendorQuickAddSheet
        open={quickAdd?.type === "vendor"}
        onOpenChange={(open) => {
          if (!open) setQuickAdd(null)
        }}
        formId={vendorFormId}
        onCreated={handleVendorCreated}
      />

      <Dialog
        open={quickAdd?.type === "product"}
        onOpenChange={(open) => {
          if (!open) setQuickAdd(null)
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add product</DialogTitle>
            <DialogDescription>
              Create a product and add it to this line item.
            </DialogDescription>
          </DialogHeader>
          <ProductQuickForm
            formId={productFormId}
            product={{ ...EMPTY_PRODUCT, sku: nextSku(products) }}
            onSubmit={handleAddProduct}
          />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setQuickAdd(null)}>
              Cancel
            </Button>
            <Button type="submit" form={productFormId}>
              Add product
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
