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
import { ProductSearchSelect } from "@/components/inventory/product-search-select"
import { InfiniteScrollSelect } from "@/components/ui/infinite-scroll-select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useCustomers } from "@/context/customers-context"
import { useMoneyFormat } from "@/context/money-format-context"
import { usePosSettings } from "@/context/pos-settings-context"
import { useProducts } from "@/context/products-context"
import { useDocumentNumberSettings } from "@/hooks/use-document-number-settings"
import { usePaymentMethods } from "@/hooks/use-payment-methods"
import { formatGroupedMoney } from "@/lib/money-format-settings"
import {
  computeLineTotal,
  computeOrderTotal,
  formatMoney,
  parseMoney,
  type OrderLineRow,
  type OrderRow,
} from "@/lib/orders"
import type { SearchProductRow } from "@/lib/product-search"
import {
  EMPTY_PRODUCT,
  nextSku,
  productFromFormData,
  type ProductRow,
} from "@/lib/products"

const OVERSELL_MAX_QTY = 999_999

function sameProductLine(
  line: OrderLineRow,
  product: { id?: number; name: string; apiId?: string },
  resolveApiId?: (productId: number) => string | undefined
) {
  const apiId =
    product.apiId?.trim() ||
    (product.id != null ? resolveApiId?.(product.id)?.trim() : undefined)
  if (apiId && line.productApiId?.trim() === apiId) return true
  return line.productName.trim() === product.name.trim()
}

function clampSaleQuantity(raw: number, max: number) {
  if (!Number.isFinite(raw)) return 1
  return Math.min(Math.max(1, Math.floor(raw)), Math.max(1, max))
}

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
  const { settings: moneySettings } = useMoneyFormat()
  const { settings: posSettings } = usePosSettings()
  const { methods: paymentMethods } = usePaymentMethods()
  const { customers } = useCustomers()
  const { products, addProduct, getApiProductId } = useProducts()
  const allowOverselling = posSettings.allowOverselling

  const initialCustomerName = order.customerName === "—" ? "" : order.customerName
  const [customerId, setCustomerId] = useState(() =>
    resolveCustomerId(customers, initialCustomerName)
  )
  const [paymentMethod, setPaymentMethod] = useState(() => {
    const current = order.paymentMethod?.trim()
    if (current) return current
    return paymentMethods[0] ?? "Cash"
  })
  const [lines, setLines] = useState<OrderLineRow[]>(
    order.lines.length > 0 ? order.lines : [emptyLine(1)]
  )
  const [quickAdd, setQuickAdd] = useState<QuickAddState>(null)
  const [priceFocusedIndex, setPriceFocusedIndex] = useState<number | null>(null)

  useEffect(() => {
    if (paymentMethods.includes(paymentMethod)) return
    setPaymentMethod(paymentMethods[0] ?? "Cash")
  }, [paymentMethods, paymentMethod])

  useEffect(() => {
    if (customerId) return
    const resolved = resolveCustomerId(customers, initialCustomerName)
    if (resolved) setCustomerId(resolved)
  }, [customers, initialCustomerName, customerId])

  const selectedCustomer = useMemo(
    () => customers.find((item) => String(item.id) === customerId) ?? null,
    [customerId, customers]
  )
  const customerName = selectedCustomer?.name ?? ""
  const buyerApiId = selectedCustomer?.apiId?.trim() ?? ""

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

  const findProductForLine = useCallback(
    (line: OrderLineRow) => {
      const apiId = line.productApiId?.trim()
      if (apiId) {
        const byApi = products.find(
          (product) => getApiProductId(product.id)?.trim() === apiId
        )
        if (byApi) return byApi
      }
      return products.find((product) => product.name === line.productName) ?? null
    },
    [getApiProductId, products]
  )

  const availableStockForLine = useCallback(
    (lineIndex: number, product: ProductRow, currentLines: OrderLineRow[]) => {
      if (allowOverselling) return OVERSELL_MAX_QTY
      let available = Number(product.stock) || 0
      // Completed sales already deducted stock — credit this order’s original lines back.
      if (order.status === "completed") {
        for (const original of order.lines) {
          if (sameProductLine(original, product, getApiProductId)) {
            available += Math.max(0, original.quantity)
          }
        }
      }
      for (let i = 0; i < currentLines.length; i++) {
        if (i === lineIndex) continue
        if (sameProductLine(currentLines[i], product, getApiProductId)) {
          available -= Math.max(0, currentLines[i].quantity)
        }
      }
      return Math.max(0, available)
    },
    [allowOverselling, getApiProductId, order.lines, order.status]
  )

  const updateLine = useCallback(
    (index: number, patch: Partial<OrderLineRow>) => {
      setLines((prev) =>
        prev.map((line, i) => {
          if (i !== index) return line
          const next = { ...line, ...patch }
          const price = patch.unitPrice ?? line.unitPrice
          let qty = patch.quantity ?? line.quantity
          if (patch.quantity != null) {
            const product = findProductForLine(next)
            if (product && !allowOverselling) {
              const max = availableStockForLine(index, product, prev)
              if (max <= 0) {
                toast.error(`${product.name} is out of stock.`)
                qty = line.quantity
              } else if (qty > max) {
                toast.error(`Only ${max} in stock for ${product.name}.`)
                qty = max
              } else {
                qty = clampSaleQuantity(qty, max)
              }
            } else {
              qty = clampSaleQuantity(qty, OVERSELL_MAX_QTY)
            }
          }
          return {
            ...next,
            quantity: qty,
            lineTotal: computeLineTotal(qty, price),
          }
        })
      )
    },
    [allowOverselling, availableStockForLine, findProductForLine]
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
    (index: number, product: SearchProductRow | (ProductRow & { apiId?: string })) => {
      const stock = Number(product.stock) || 0
      if (!allowOverselling && stock <= 0) {
        toast.error(`${product.name} is out of stock.`)
        return
      }
      const salePrice = parseMoney(product.salePrice)
      setLines((prev) => {
        const max = allowOverselling
          ? OVERSELL_MAX_QTY
          : availableStockForLine(index, product, prev.map((line, i) =>
              i === index
                ? {
                    ...line,
                    productName: product.name,
                    productApiId:
                      product.apiId?.trim() || getApiProductId(product.id) || "",
                  }
                : line
            ))
        if (!allowOverselling && max <= 0) {
          toast.error(`${product.name} is out of stock.`)
          return prev
        }
        const quantity = clampSaleQuantity(prev[index]?.quantity ?? 1, Math.max(1, max))
        return prev.map((line, i) => {
          if (i !== index) return line
          return {
            ...line,
            productName: product.name,
            unitPrice: salePrice,
            listPrice: salePrice,
            productApiId: product.apiId?.trim() || getApiProductId(product.id) || "",
            quantity,
            lineTotal: computeLineTotal(quantity, salePrice),
          }
        })
      })
    },
    [allowOverselling, availableStockForLine, getApiProductId]
  )

  const handleCustomerCreated = useCallback((created: { id: number; apiId?: string }) => {
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
        const stock = Number(created.stock) || 0
        if (!allowOverselling && stock <= 0) {
          toast.error(`${created.name} is out of stock.`)
          setQuickAdd(null)
          return
        }
        const salePrice = parseMoney(created.salePrice)
        updateLine(quickAdd.lineIndex, {
          productName: created.name,
          unitPrice: salePrice,
          listPrice: salePrice,
          productApiId: getApiProductId(created.id) ?? "",
          quantity: 1,
        })
        setQuickAdd(null)
        toast.success("Product added.")
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not save product.")
      }
    },
    [addProduct, allowOverselling, getApiProductId, products, quickAdd, updateLine]
  )

  const customerFormId = `${formId}-add-customer`
  const productFormId = `${formId}-add-product`

  return (
    <>
      <form id={formId} className="flex flex-col gap-4 text-sm" onSubmit={onSubmit}>
        <input type="hidden" name="paymentMethod" value={paymentMethod} />
        <input type="hidden" name="customerName" value={customerName} required />
        <input type="hidden" name="buyerId" value={buyerApiId} />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <DocumentNumberField
            id={`${formId}-invoiceNumber`}
            name="invoiceNumber"
            label="Invoice number"
            value={order.invoiceNumber}
            settings={numberSettings.sales}
            isNew={isNew}
            placeholder="INV-1006"
            autoHint="Auto-generated"
          />
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
          <Label>Line items</Label>
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
                <input
                  type="hidden"
                  name={`lines[${index}].productApiId`}
                  value={line.productApiId ?? ""}
                />
                <input
                  type="hidden"
                  name={`lines[${index}].listPrice`}
                  value={line.listPrice ?? line.unitPrice}
                />
                <div className="flex flex-col gap-2">
                  <Label htmlFor={`${formId}-product-${index}`}>Product</Label>
                  <ProductSearchSelect
                    id={`${formId}-product-${index}`}
                    value={resolveProductId(products, line.productName)}
                    selectedProduct={
                      products.find((product) => product.name === line.productName) ?? null
                    }
                    onSelect={(product) => handleProductSelect(index, product)}
                    priceField="salePrice"
                    onAddNew={() => setQuickAdd({ type: "product", lineIndex: index })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  <div className="flex flex-col gap-1">
                    <Label htmlFor={`${formId}-qty-${index}`}>Qty</Label>
                    {(() => {
                      const product = findProductForLine(line)
                      const maxQty = product
                        ? availableStockForLine(index, product, lines)
                        : OVERSELL_MAX_QTY
                      return (
                        <>
                          <Input
                            id={`${formId}-qty-${index}`}
                            name={`lines[${index}].quantity`}
                            type="number"
                            min={1}
                            max={allowOverselling ? undefined : Math.max(1, maxQty)}
                            value={line.quantity}
                            onChange={(e) => {
                              const raw = e.target.value
                              if (raw.trim() === "") {
                                updateLine(index, { quantity: 1 })
                                return
                              }
                              updateLine(index, {
                                quantity: clampSaleQuantity(Number(raw), maxQty),
                              })
                            }}
                          />
                          {product && !allowOverselling ? (
                            <span className="text-muted-foreground text-xs">
                              {maxQty <= 0
                                ? "Out of stock"
                                : `In stock: ${maxQty}`}
                            </span>
                          ) : null}
                        </>
                      )
                    })()}
                  </div>
                  <div className="flex flex-col gap-1">
                    <Label htmlFor={`${formId}-price-${index}`}>Unit price</Label>
                    <Input
                      id={`${formId}-price-${index}`}
                      name={`lines[${index}].unitPrice`}
                      inputMode="decimal"
                      className="tabular-nums"
                      value={
                        priceFocusedIndex === index
                          ? line.unitPrice
                          : formatGroupedMoney(line.unitPrice, moneySettings)
                      }
                      onFocus={() => setPriceFocusedIndex(index)}
                      onBlur={() => {
                        setPriceFocusedIndex(null)
                        updateLine(index, { unitPrice: parseMoney(line.unitPrice) })
                      }}
                      onChange={(e) =>
                        updateLine(index, { unitPrice: e.target.value.replace(/[^0-9.-]/g, "") })
                      }
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <Label>Line total</Label>
                    <div className="text-foreground flex h-9 items-center tabular-nums">
                      {formatMoney(line.lineTotal)}
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
          <Button
            type="button"
            variant="outline"
            size="lg"
            className="h-12 w-full text-base"
            onClick={addLine}
          >
            <IconPlus className="size-5" />
            Add line
          </Button>
          <p className="text-muted-foreground text-right text-sm tabular-nums">
            Order total:{" "}
            <span className="text-foreground font-medium">{formatMoney(orderTotal)}</span>
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
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
              <option value="draft">Draft</option>
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="processing">Processing</option>
              <option value="on_hold">On hold</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
              <option value="refunded">Refunded</option>
            </select>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor={`${formId}-paymentMethod`}>Payment method</Label>
            <select
              id={`${formId}-paymentMethod`}
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm shadow-xs outline-none focus-visible:ring-ring/50 focus-visible:ring-[3px]"
            >
              {paymentMethods.map((method) => (
                <option key={method} value={method}>
                  {method}
                </option>
              ))}
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
