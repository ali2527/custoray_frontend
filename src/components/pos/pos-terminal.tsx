"use client"

import * as React from "react"
import {
  IconRotateClockwise,
  IconSearch,
  IconSettings,
  IconShoppingCart,
} from "@tabler/icons-react"
import { toast } from "sonner"
import { useTranslation } from "react-i18next"
import Link from "next/link"

import { CustomerQuickAddSheet } from "@/components/customers/customer-quick-add-sheet"
import { downloadInvoicePdf } from "@/components/invoices/invoice-pdf-button"
import { PosCartPanel } from "@/components/pos/pos-cart-panel"
import { applyPosDiscount } from "@/components/pos/pos-cart-checkout"
import { PosCatalogTabs } from "@/components/pos/pos-catalog-tabs"
import { PosCustomerSelect } from "@/components/pos/pos-customer-select"
import { PosInvoicePanel } from "@/components/pos/pos-invoice-panel"
import { PosReturnPanel } from "@/components/pos/pos-return-panel"
import { PosProductCard } from "@/components/pos/pos-product-card"
import { SearchInput } from "@/components/ui/search-input"
import { useCustomers } from "@/context/customers-context"
import { useOrders } from "@/context/orders-context"
import { usePosSettings } from "@/context/pos-settings-context"
import { catalogGridClass } from "@/lib/pos-settings"
import { useProducts } from "@/context/products-context"
import { useReturns } from "@/context/returns-context"
import { confirmPosSaleAction, confirmReturnAction } from "@/lib/confirm-action"
import { formatMoney } from "@/lib/customers"
import { type OrderRow } from "@/lib/orders"
import {
  buildPosReturnFromCart,
  isPosReturn,
  nextReturnNumber,
  type ReturnRow,
} from "@/lib/returns"
import {
  buildPosOrderFromCart,
  cartSubtotal,
  computePosTotals,
  isPosOrder,
  nextPosInvoiceNumber,
  posCatalogProducts,
  posReturnCatalogProducts,
  type PosCartLine,
} from "@/lib/pos"
import type { CustomerRow } from "@/lib/customers"
import type { ProductRow } from "@/lib/products"
import { cn } from "@/lib/utils"

function formatPosMoney(value: string) {
  return formatMoney(value).replace(/^\$/, "Rs ")
}

function formatPosReturnMoney(value: string) {
  const amount = Number(value)
  if (!Number.isFinite(amount) || Math.abs(amount) < 0.005) {
    return formatPosMoney("0.00")
  }
  return `−${formatPosMoney(Math.abs(amount).toFixed(2))}`
}

const WALK_IN_CUSTOMER_ID = "walk-in"
const RETURN_MAX_QTY = 9999

const panelClass =
  "rounded-xl bg-card shadow-sm shadow-black/[0.04] ring-1 ring-border/40"

const searchInputClass =
  "h-10 rounded-full text-sm shadow-sm focus-visible:ring-0 focus-visible:ring-offset-0 hover:ring-0 focus:ring-0 focus:outline-none min-w-0 flex-1"

export function PosTerminal() {
  const { t } = useTranslation("pos")
  const { products, getProduct, updateProduct } = useProducts()
  const { customers } = useCustomers()
  const { orders, addOrder } = useOrders()
  const { returns, addReturn } = useReturns()
  const { settings, hydrated } = usePosSettings()
  const searchInputRef = React.useRef<HTMLInputElement>(null)

  const [mode, setMode] = React.useState<"sale" | "return">("sale")
  const [search, setSearch] = React.useState("")
  const [brand, setBrand] = React.useState<string>("all")
  const [cart, setCart] = React.useState<PosCartLine[]>([])
  const [selectedProductId, setSelectedProductId] = React.useState<number | null>(null)
  const [discountAmount, setDiscountAmount] = React.useState("0.00")
  const [discountDraft, setDiscountDraft] = React.useState("")
  const [customerId, setCustomerId] = React.useState(WALK_IN_CUSTOMER_ID)
  const [customerQuickAddOpen, setCustomerQuickAddOpen] = React.useState(false)
  const [paymentMethod, setPaymentMethod] =
    React.useState<OrderRow["paymentMethod"]>("Cash")
  const [documentStatus, setDocumentStatus] =
    React.useState<OrderRow["status"]>("completed")
  const [lastSale, setLastSale] = React.useState<OrderRow | null>(null)
  const [lastReturn, setLastReturn] = React.useState<ReturnRow | null>(null)
  const [processing, setProcessing] = React.useState(false)
  const [paidAmountDraft, setPaidAmountDraft] = React.useState("")

  const isSale = mode === "sale"

  React.useEffect(() => {
    if (!hydrated) return
    setMode(settings.defaultRegisterMode)
    setPaymentMethod(settings.defaultPaymentMethod)
    setDocumentStatus(
      settings.defaultRegisterMode === "sale"
        ? settings.defaultSaleStatus
        : settings.defaultReturnStatus
    )
  }, [hydrated, settings.defaultPaymentMethod, settings.defaultRegisterMode, settings.defaultReturnStatus, settings.defaultSaleStatus])

  const catalog = React.useMemo(
    () =>
      isSale
        ? posCatalogProducts(products, {
            hideOutOfStock: settings.hideOutOfStockOnSale,
          })
        : posReturnCatalogProducts(products),
    [isSale, products, settings.hideOutOfStockOnSale]
  )

  const customerName = React.useMemo(() => {
    if (customerId === WALK_IN_CUSTOMER_ID) return t("walkIn")
    const customer = customers.find((item) => String(item.id) === customerId)
    return customer?.name ?? t("walkIn")
  }, [customerId, customers, t])

  const customerOptions = React.useMemo(
    () => [
      { value: WALK_IN_CUSTOMER_ID, label: t("walkIn"), description: t("noCustomerRecord") },
      ...customers.map((customer) => ({
        value: String(customer.id),
        label: customer.name,
        description: customer.phone !== "—" ? customer.phone : customer.description,
      })),
    ],
    [customers, t]
  )

  const cartQtyByProductId = React.useMemo(() => {
    const map = new Map<number, number>()
    for (const line of cart) {
      map.set(line.productId, line.quantity)
    }
    return map
  }, [cart])

  const brands = React.useMemo(() => {
    const set = new Set(
      catalog
        .map((product) => product.brand)
        .filter((name) => Boolean(name) && name !== "—")
    )
    return ["all", ...Array.from(set).sort()]
  }, [catalog])

  const filteredProducts = React.useMemo(() => {
    const query = search.trim().toLowerCase()
    return catalog.filter((product) => {
      if (brand !== "all" && product.brand !== brand) return false
      if (!query) return true
      return (
        product.name.toLowerCase().includes(query) ||
        product.sku.toLowerCase().includes(query) ||
        product.brand.toLowerCase().includes(query) ||
        product.category.toLowerCase().includes(query)
      )
    })
  }, [brand, catalog, search])

  const subtotal = React.useMemo(() => cartSubtotal(cart), [cart])
  const checkoutTotals = React.useMemo(
    () => computePosTotals(subtotal, discountAmount),
    [discountAmount, subtotal]
  )

  React.useEffect(() => {
    if (settings.allowPartialPayment && isSale) {
      setPaidAmountDraft(checkoutTotals.total)
    }
  }, [checkoutTotals.total, isSale, settings.allowPartialPayment])

  const posOrders = React.useMemo(() => {
    return orders
      .filter(isPosOrder)
      .sort((a, b) => {
        const dateCompare = b.orderDate.localeCompare(a.orderDate)
        if (dateCompare !== 0) return dateCompare
        return b.id - a.id
      })
  }, [orders])

  const nextInvoice = React.useMemo(
    () => nextPosInvoiceNumber(orders, settings.receiptPrefix),
    [orders, settings.receiptPrefix]
  )

  const lastCreatedInvoice = posOrders[0] ?? null

  const nextReturn = React.useMemo(
    () => nextReturnNumber(returns, "sales"),
    [returns]
  )

  const posReturns = React.useMemo(() => {
    return returns
      .filter(isPosReturn)
      .sort((a, b) => {
        const dateCompare = b.returnDate.localeCompare(a.returnDate)
        if (dateCompare !== 0) return dateCompare
        return b.id - a.id
      })
  }, [returns])

  const lastCreatedReturn = posReturns[0] ?? null

  const formatRegisterMoney = isSale ? formatPosMoney : formatPosReturnMoney

  const addToCart = React.useCallback(
    (product: ProductRow) => {
      if (isSale) {
        const canOversell = settings.allowOverselling
        if (!canOversell && product.stock <= 0) {
          toast.error(t("toasts.outOfStock", { name: product.name }))
          return
        }

        const maxStock = canOversell ? RETURN_MAX_QTY : product.stock

        setCart((prev) => {
          const existing = prev.find((line) => line.productId === product.id)
          if (existing) {
            if (!canOversell && existing.quantity >= product.stock) {
              toast.error(t("toasts.onlyInStock", { count: product.stock, name: product.name }))
              return prev
            }
            return prev.map((line) =>
              line.productId === product.id
                ? { ...line, quantity: line.quantity + 1, maxStock }
                : line
            )
          }
          return [
            ...prev,
            {
              productId: product.id,
              productName: product.name,
              sku: product.sku,
              quantity: 1,
              unitPrice: product.salePrice,
              maxStock,
            },
          ]
        })
      } else {
        setCart((prev) => {
          const existing = prev.find((line) => line.productId === product.id)
          if (existing) {
            return prev.map((line) =>
              line.productId === product.id
                ? {
                    ...line,
                    quantity: line.quantity + 1,
                    maxStock: RETURN_MAX_QTY,
                  }
                : line
            )
          }
          return [
            ...prev,
            {
              productId: product.id,
              productName: product.name,
              sku: product.sku,
              quantity: 1,
              unitPrice: product.salePrice,
              maxStock: RETURN_MAX_QTY,
            },
          ]
        })
      }
      setSelectedProductId(product.id)
    },
    [isSale, settings.allowOverselling]
  )

  const setLineQuantity = React.useCallback(
    (productId: number, quantity: number) => {
      setCart((prev) =>
        prev
          .map((line) => {
            if (line.productId !== productId) return line
            if (quantity <= 0) return null
            if (
              isSale &&
              !settings.allowOverselling &&
              quantity > line.maxStock
            ) {
              toast.error(t("toasts.onlyInStockGeneric", { count: line.maxStock }))
              return line
            }
            return { ...line, quantity }
          })
          .filter((line): line is PosCartLine => line !== null)
      )
    },
    [isSale, settings.allowOverselling]
  )

  const setLineFinalPrice = React.useCallback(
    (productId: number, finalLineTotal: string | undefined) => {
      if (!settings.allowLinePriceEdit) return
      setCart((prev) =>
        prev.map((line) =>
          line.productId === productId ? { ...line, finalLineTotal } : line
        )
      )
    },
    [settings.allowLinePriceEdit]
  )

  const removeFromCart = React.useCallback((productId: number) => {
    setCart((prev) => {
      const next = prev.filter((line) => line.productId !== productId)
      setSelectedProductId((current) => {
        if (current !== productId) return current
        return next[next.length - 1]?.productId ?? null
      })
      return next
    })
  }, [])

  const clearCart = React.useCallback(() => {
    setCart([])
    setSelectedProductId(null)
    setDiscountAmount("0.00")
    setDiscountDraft("")
  }, [])

  const clearCustomer = React.useCallback(() => {
    setCustomerId(WALK_IN_CUSTOMER_ID)
  }, [])

  const resetRegister = React.useCallback(() => {
    setCart([])
    setSelectedProductId(null)
    setDiscountAmount("0.00")
    setDiscountDraft("")
    setCustomerId(WALK_IN_CUSTOMER_ID)
    setPaymentMethod(settings.defaultPaymentMethod)
    setDocumentStatus(
      isSale ? settings.defaultSaleStatus : settings.defaultReturnStatus
    )
    setPaidAmountDraft("")
  }, [
    isSale,
    settings.defaultPaymentMethod,
    settings.defaultReturnStatus,
    settings.defaultSaleStatus,
  ])

  const switchMode = React.useCallback(
    (nextMode: "sale" | "return") => {
      if (nextMode === mode) return
      clearCart()
      setSearch("")
      setBrand("all")
      setDocumentStatus(
        nextMode === "sale"
          ? settings.defaultSaleStatus
          : settings.defaultReturnStatus
      )
      setMode(nextMode)
    },
    [
      clearCart,
      mode,
      settings.defaultReturnStatus,
      settings.defaultSaleStatus,
    ]
  )

  const applyDiscount = React.useCallback(() => {
    let applied = applyPosDiscount(subtotal, discountDraft)
    if (settings.maxDiscountPercent > 0) {
      const cap =
        Number(subtotal) * (settings.maxDiscountPercent / 100)
      applied = Math.min(Number(applied), cap).toFixed(2)
    }
    setDiscountAmount(applied)
    setDiscountDraft(applied === "0.00" ? "" : applied)
  }, [discountDraft, settings.maxDiscountPercent, subtotal])

  const clearDiscount = React.useCallback(() => {
    setDiscountAmount("0.00")
    setDiscountDraft("")
  }, [])

  const handleCustomerCreated = React.useCallback((customer: CustomerRow) => {
    setCustomerId(String(customer.id))
  }, [])

  const restoreStockFromCart = React.useCallback(
    (lines: PosCartLine[]) => {
      for (const line of lines) {
        const product = getProduct(line.productId)
        if (product) {
          updateProduct(line.productId, {
            stock: product.stock + line.quantity,
          })
        }
      }
    },
    [getProduct, updateProduct]
  )

  const completeSale = React.useCallback(async () => {
    if (cart.length === 0) {
      toast.error(t("toasts.addProduct"))
      return
    }

    if (settings.requireCustomer && customerId === WALK_IN_CUSTOMER_ID) {
      toast.error(t("toasts.selectCustomerSale"))
      return
    }

    const shouldDeductStock =
      documentStatus === "completed" ||
      (documentStatus === "pending" && settings.deductStockOnPending)
    const adjustStock = documentStatus !== "cancelled" && shouldDeductStock

    if (adjustStock && !settings.allowOverselling) {
      for (const line of cart) {
        const product = getProduct(line.productId)
        if (!product || product.stock < line.quantity) {
          toast.error(t("toasts.notEnoughStock", { name: line.productName }))
          return
        }
      }
    }

    const invoiceNumber = nextPosInvoiceNumber(orders, settings.receiptPrefix)

    if (settings.confirmBeforeComplete) {
      const confirmed = await confirmPosSaleAction({
        invoiceNumber,
        totalAmount: formatPosMoney(checkoutTotals.total),
        customerName,
        status: documentStatus,
      })
      if (!confirmed) return
    }

    setProcessing(true)
    try {
      const paidAmount = settings.allowPartialPayment
        ? Math.min(
            Number(checkoutTotals.total),
            Math.max(0, Number(paidAmountDraft) || 0)
          ).toFixed(2)
        : documentStatus === "completed"
          ? checkoutTotals.total
          : "0.00"

      const payload = buildPosOrderFromCart(cart, {
        customerName,
        paymentMethod,
        invoiceNumber,
        discountAmount: checkoutTotals.discount,
        status: documentStatus,
        paidAmount,
      })
      const created = addOrder(payload)

      if (adjustStock) {
        for (const line of cart) {
          const product = getProduct(line.productId)
          if (product) {
            updateProduct(line.productId, {
              stock: Math.max(0, product.stock - line.quantity),
            })
          }
        }
      }

      setLastSale(created)
      resetRegister()

      if (settings.autoOpenReceiptPdf && documentStatus === "completed") {
        try {
          await downloadInvoicePdf(created)
        } catch {
          toast.error(t("toasts.receiptFailed"))
        }
      }

      if (settings.autoFocusSearchAfterSale) {
        searchInputRef.current?.focus()
      }

      toast.success(
        documentStatus === "completed"
          ? `Sale ${created.invoiceNumber} completed.`
          : `Sale ${created.invoiceNumber} saved as ${documentStatus}.`
      )
    } finally {
      setProcessing(false)
    }
  }, [
    addOrder,
    cart,
    checkoutTotals.discount,
    checkoutTotals.total,
    customerId,
    documentStatus,
    resetRegister,
    customerName,
    getProduct,
    orders,
    paymentMethod,
    settings.allowOverselling,
    settings.allowPartialPayment,
    settings.autoFocusSearchAfterSale,
    settings.autoOpenReceiptPdf,
    settings.confirmBeforeComplete,
    settings.deductStockOnPending,
    settings.receiptPrefix,
    settings.requireCustomer,
    paidAmountDraft,
    updateProduct,
  ])

  const completeReturn = React.useCallback(async () => {
    if (cart.length === 0) {
      toast.error(t("toasts.addReturnProduct"))
      return
    }

    if (settings.requireCustomer && customerId === WALK_IN_CUSTOMER_ID) {
      toast.error(t("toasts.selectCustomerReturn"))
      return
    }

    const returnNumber = nextReturnNumber(returns, "sales")

    if (settings.confirmBeforeComplete) {
      if (
        !(await confirmReturnAction({
          scope: "invoice",
          itemName: returnNumber,
          referenceNumber: returnNumber,
          totalAmount: checkoutTotals.total,
          refundDue: checkoutTotals.total,
        }))
      ) {
        return
      }
    }

    setProcessing(true)
    try {
      const payload = buildPosReturnFromCart(cart, {
        customerName,
        returnNumber,
        discountAmount: checkoutTotals.discount,
        status: documentStatus,
      })
      const created = addReturn({ ...payload, status: documentStatus })

      if (documentStatus === "completed") {
        restoreStockFromCart(cart)
      }

      setLastReturn(created)
      resetRegister()
      toast.success(
        documentStatus === "completed"
          ? `Return ${created.returnNumber} completed.`
          : `Return ${created.returnNumber} saved as ${documentStatus}.`
      )
    } finally {
      setProcessing(false)
    }
  }, [
    addReturn,
    cart,
    checkoutTotals.discount,
    checkoutTotals.total,
    customerId,
    customerName,
    documentStatus,
    resetRegister,
    restoreStockFromCart,
    returns,
    settings.confirmBeforeComplete,
    settings.requireCustomer,
  ])

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden p-3">
      <CustomerQuickAddSheet
        open={customerQuickAddOpen}
        onOpenChange={setCustomerQuickAddOpen}
        formId="pos-customer-quick-add"
        onCreated={handleCustomerCreated}
      />

      <div className="grid min-h-0 flex-1 grid-cols-1 grid-rows-[minmax(0,1fr)] gap-3 lg:grid-cols-[minmax(0,1fr)_400px]">
          <div className={cn(panelClass, "flex h-full min-h-0 flex-col overflow-hidden")}>
            <div className="border-border/40 flex flex-col gap-2 border-b px-3 py-2.5 lg:flex-row lg:items-center">
              <div className="bg-muted/70 inline-flex shrink-0 self-start rounded-full p-0.5 ring-1 ring-border/40">
                {(
                  [
                    { value: "sale", label: t("newSale"), icon: IconShoppingCart },
                    { value: "return", label: t("returns"), icon: IconRotateClockwise },
                  ] as const
                ).map(({ value, label, icon: Icon }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => switchMode(value)}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                      mode === value
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <Icon className="size-3.5" stroke={1.75} />
                    {label}
                  </button>
                ))}
              </div>
              <div className="flex min-w-0 flex-1 items-center gap-2">
                <PosCustomerSelect
                  customerId={customerId}
                  customerName={customerName}
                  onCustomerChange={setCustomerId}
                  onClearCustomer={clearCustomer}
                  onAddCustomer={() => setCustomerQuickAddOpen(true)}
                  customerOptions={customerOptions}
                  walkInCustomerId={WALK_IN_CUSTOMER_ID}
                  className="w-full shrink-0 sm:w-[220px] lg:w-[240px]"
                />
                <SearchInput
                  ref={searchInputRef}
                  placeholder={t("searchCatalog")}
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  icon={<IconSearch className="size-4" />}
                  className={cn(searchInputClass, "min-w-0 flex-1")}
                />
              </div>
              <p className="text-muted-foreground hidden shrink-0 px-1 text-xs tabular-nums xl:block">
                {filteredProducts.length}{" "}
                {filteredProducts.length === 1 ? t("product") : t("products")}
              </p>
              <Link
                href="/pos/settings"
                aria-label={t("openPosSettings")}
                className="text-muted-foreground hover:bg-muted hover:text-foreground inline-flex size-9 shrink-0 items-center justify-center rounded-full"
              >
                <IconSettings className="size-4" stroke={1.75} />
              </Link>
            </div>

            <PosCatalogTabs
              brand={brand}
              onBrandChange={setBrand}
              brands={brands}
              className="px-3"
            />

            {filteredProducts.length > 0 ? (
              <div className="bg-muted/20 min-h-[18rem] flex-1 overflow-y-auto p-3">
                <div className={cn("grid auto-rows-fr gap-3", catalogGridClass(settings.catalogColumns))}>
                  {filteredProducts.map((product) => (
                    <PosProductCard
                      key={product.id}
                      product={product}
                      inCartQty={cartQtyByProductId.get(product.id) ?? 0}
                      formatPrice={formatRegisterMoney}
                      onAdd={addToCart}
                      disableWhenOutOfStock={
                        isSale ? !settings.allowOverselling : false
                      }
                      showSku={settings.showSkuOnCards}
                      showStock={settings.showStockOnCards}
                      lowStockThreshold={settings.lowStockThreshold}
                    />
                  ))}
                </div>
              </div>
            ) : (
              <div className="bg-muted/20 flex flex-1 flex-col items-center justify-center gap-2 px-4 py-16 text-center">
                <div className="bg-muted/60 text-muted-foreground flex size-12 items-center justify-center rounded-2xl">
                  {isSale ? (
                    <IconShoppingCart className="size-5" />
                  ) : (
                    <IconRotateClockwise className="size-5" />
                  )}
                </div>
                <p className="text-sm font-medium">{t("noProductsMatch")}</p>
                <p className="text-muted-foreground max-w-xs text-sm">
                  {isSale
                    ? settings.hideOutOfStockOnSale
                      ? t("emptySaleInStock")
                      : t("emptySaleAll")
                    : t("emptyReturn")}
                </p>
                <Link
                  href="/pos/settings"
                  className="text-primary mt-1 text-xs font-medium underline underline-offset-2"
                >
                  {t("openPosSettings")}
                </Link>
              </div>
            )}
          </div>

          <div
            className={cn(
              panelClass,
              "flex h-full min-h-0 flex-col overflow-hidden"
            )}
          >
            {isSale ? (
              <PosInvoicePanel
                nextInvoiceNumber={nextInvoice}
                lastCreated={lastCreatedInvoice}
                justCreated={lastSale}
                formatMoney={formatPosMoney}
                onDismissJustCreated={() => setLastSale(null)}
                className="rounded-none shadow-none ring-0 border-b border-border/40"
              />
            ) : (
              <PosReturnPanel
                nextReturnNumber={nextReturn}
                lastCreated={lastCreatedReturn}
                justCreated={lastReturn}
                formatMoney={formatPosReturnMoney}
                onDismissJustCreated={() => setLastReturn(null)}
                className="rounded-none shadow-none ring-0 border-b border-border/40"
              />
            )}

            <PosCartPanel
              className="min-h-0 flex-1 rounded-none shadow-none ring-0"
              cart={cart}
              selectedProductId={selectedProductId}
              onSelectLine={setSelectedProductId}
              onQuantityChange={setLineQuantity}
              onFinalPriceChange={setLineFinalPrice}
              onRemoveLine={removeFromCart}
              onClearCart={clearCart}
              formatMoney={formatRegisterMoney}
              paymentMethod={paymentMethod}
              onPaymentMethodChange={setPaymentMethod}
              status={documentStatus}
              onStatusChange={setDocumentStatus}
              discountDraft={discountDraft}
              onDiscountDraftChange={setDiscountDraft}
              onApplyDiscount={applyDiscount}
              onClearDiscount={clearDiscount}
              appliedDiscount={checkoutTotals.discount}
              subtotal={checkoutTotals.subtotal}
              total={checkoutTotals.total}
              disabled={cart.length === 0}
              processing={processing}
              onCompleteSale={isSale ? completeSale : completeReturn}
              variant={isSale ? "sale" : "return"}
              enabledPaymentMethods={settings.enabledPaymentMethods}
              allowDiscounts={settings.allowDiscounts}
              allowLinePriceEdit={settings.allowLinePriceEdit}
              allowPartialPayment={settings.allowPartialPayment}
              paidAmountDraft={paidAmountDraft}
              onPaidAmountDraftChange={setPaidAmountDraft}
            />
          </div>
        </div>
    </div>
  )
}
