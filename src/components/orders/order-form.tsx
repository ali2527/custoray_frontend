"use client"

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react"
import { IconPlus, IconTrash } from "@tabler/icons-react"
import { toast } from "sonner"

import { CustomerQuickAddSheet } from "@/components/customers/customer-quick-add-sheet"
import { DocumentNumberField } from "@/components/document-number-field"
import { ProductQuickForm } from "@/components/inventory/product-quick-form"
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
import { useCustomers } from "@/context/customers-context"
import { useProducts } from "@/context/products-context"
import { useDocumentNumberSettings } from "@/hooks/use-document-number-settings"
import { formatMoney } from "@/lib/customers"
import {
  computeLineTotal,
  computeOrderTotal,
  type OrderLineRow,
  type OrderRow,
} from "@/lib/orders"
import { EMPTY_PRODUCT, nextSku, productFromFormData } from "@/lib/products"

type OrderFormProps = {
  formId: string
  order: OrderRow
  isNew?: boolean
  onSubmit: (e: FormEvent<HTMLFormElement>) => void
}

type QuickAddState =
  | { type: "customer" }
  | { type: "product"; lineIndex: number }
  | null

function emptyLine(id: number): OrderLineRow {
  return {
    id,
    productName: "",
    quantity: 1,
    unitPrice: "0",
    lineTotal: "0.00",
  }
}

function resolveCustomerId(customers: { id: number; name: string }[], name: string) {
  const normalized = name.trim()
  if (!normalized || normalized === "—") return ""
  const match = customers.find((customer) => customer.name === normalized)
  return match ? String(match.id) : ""
}

function resolveProductId(products: { id: number; name: string }[], name: string) {
  const normalized = name.trim()
  if (!normalized) return ""
  const match = products.find((product) => product.name === normalized)
  return match ? String(match.id) : ""
}

export function OrderForm({ formId, order, isNew = false, onSubmit }: OrderFormProps) {
  const { settings: numberSettings } = useDocumentNumberSettings()
  const { customers } = useCustomers()
  const { products, addProduct } = useProducts()

  const initialCustomerName = order.customerName === "—" ? "" : order.customerName
  const [customerId, setCustomerId] = useState(() =>
    resolveCustomerId(customers, initialCustomerName)
  )
  const [lines, setLines] = useState<OrderLineRow[]>(
    order.lines.length > 0 ? order.lines : [emptyLine(1)]
  )
  const [quickAdd, setQuickAdd] = useState<QuickAddState>(null)

  useEffect(() => {
    if (customerId) return
    const resolved = resolveCustomerId(customers, initialCustomerName)
    if (resolved) setCustomerId(resolved)
  }, [customers, initialCustomerName, customerId])

  const customerName = useMemo(() => {
    if (!customerId) return ""
    const customer = customers.find((item) => String(item.id) === customerId)
    return customer?.name ?? ""
  }, [customerId, customers])

  const orderTotal = useMemo(() => computeOrderTotal(lines), [lines])

  const customerOptions = useMemo(
    () =>
      customers.map((customer) => ({
        value: String(customer.id),
        label: customer.name,
        description: customer.phone !== "—" ? customer.phone : customer.description,
      })),
    [customers]
  )

  const productOptions = useMemo(
    () =>
      products.map((product) => ({
        value: String(product.id),
        label: product.name,
        description: product.sku,
        trailing: formatMoney(product.salePrice),
      })),
    [products]
  )

  const updateLine = useCallback(
    (index: number, patch: Partial<OrderLineRow>) => {
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
        unitPrice: product.salePrice,
      })
    },
    [products, updateLine]
  )

  const handleCustomerCreated = useCallback((created: { id: number }) => {
    setCustomerId(String(created.id))
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
          unitPrice: created.salePrice,
        })
        setQuickAdd(null)
        toast.success("Product added.")
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not save product.")
      }
    },
    [addProduct, products, quickAdd, updateLine]
  )

  const customerFormId = `${formId}-add-customer`
  const productFormId = `${formId}-add-product`

  return (
    <>
      <form id={formId} className="flex flex-col gap-4 text-sm" onSubmit={onSubmit}>
        <input type="hidden" name="paymentMethod" value={order.paymentMethod} />
        <input type="hidden" name="customerName" value={customerName} required />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor={`${formId}-invoiceNumber`}>Invoice number</Label>
            <Input
              id={`${formId}-invoiceNumber`}
              name="invoiceNumber"
              defaultValue={order.invoiceNumber}
              placeholder="INV-1006"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor={`${formId}-orderDate`}>Order date</Label>
            <Input
              id={`${formId}-orderDate`}
              name="orderDate"
              type="date"
              defaultValue={order.orderDate}
              required
            />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor={`${formId}-customer`}>Customer</Label>
          <InfiniteScrollSelect
            id={`${formId}-customer`}
            value={customerId}
            onValueChange={setCustomerId}
            options={customerOptions}
            placeholder="Select customer"
            searchPlaceholder="Search customers…"
            emptyMessage="No customers found."
            pageSize={10}
            onAddNew={() => setQuickAdd({ type: "customer" })}
            addNewLabel="Add customer"
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor={`${formId}-description`}>Notes</Label>
          <Input
            id={`${formId}-description`}
            name="description"
            defaultValue={order.description === "—" ? "" : order.description}
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
                <input type="hidden" name={`lines[${index}].productName`} value={line.productName} />
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
            Order total: <span className="text-foreground font-medium">{orderTotal}</span>
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor={`${formId}-paidAmount`}>Paid amount</Label>
            <Input
              id={`${formId}-paidAmount`}
              name="paidAmount"
              defaultValue={order.paidAmount}
              placeholder="0.00"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor={`${formId}-status`}>Status</Label>
            <select
              id={`${formId}-status`}
              name="status"
              defaultValue={order.status}
              className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm shadow-xs outline-none focus-visible:ring-ring/50 focus-visible:ring-[3px]"
            >
              <option value="pending">Pending</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>
      </form>

      <CustomerQuickAddSheet
        open={quickAdd?.type === "customer"}
        onOpenChange={(open) => {
          if (!open) setQuickAdd(null)
        }}
        formId={customerFormId}
        onCreated={handleCustomerCreated}
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
