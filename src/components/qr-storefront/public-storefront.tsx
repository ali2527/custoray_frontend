"use client"

import * as React from "react"
import { useSearchParams } from "next/navigation"
import { IconArrowLeft, IconSearch, IconShoppingBag } from "@tabler/icons-react"
import { toast } from "sonner"
import { useTranslation } from "react-i18next"

import { StorefrontProductCard } from "@/components/qr-storefront/storefront-product-card"
import {
  sfBtnLg,
  sfInputLg,
  sfListRow,
  sfPanel,
  sfStepEnter,
} from "@/components/qr-storefront/storefront-ui"
import { Button } from "@/components/ui/button"
import { PageLoader } from "@/components/ui/page-loader"
import { SearchInput } from "@/components/ui/search-input"
import { useCustomers } from "@/context/customers-context"
import { useOrders } from "@/context/orders-context"
import { useProducts } from "@/context/products-context"
import {
  DEFAULT_COMPANY_SETTINGS,
  loadCompanySettings,
  type CompanySettings,
} from "@/lib/company-settings"
import type { CustomerRow } from "@/lib/customers"
import {
  buildStorefrontOrderFromCart,
  cartItemCount,
  cartLineTotal,
  cartSubtotal,
  filterStorefrontCatalog,
  formatStorefrontMoney,
  loadStorefrontSettings,
  nextStorefrontInvoiceNumber,
  parseStorefrontPrefillFromSearch,
  storefrontCatalogProducts,
  type StorefrontCartLine,
} from "@/lib/storefront"
import type { ProductRow } from "@/lib/products"

type Step = "who" | "shop" | "review"

type PlacedOrder = {
  invoiceNumber: string
  customerName: string
  totalAmount: string
}

export function PublicStorefront({ storeId }: { storeId: string }) {
  const { t } = useTranslation("storefront")
  const { products, getProduct, updateProduct } = useProducts()
  const { customers } = useCustomers()
  const { orders, addOrder } = useOrders()
  const searchParams = useSearchParams()
  const qrPrefill = React.useMemo(
    () => parseStorefrontPrefillFromSearch(searchParams),
    [searchParams]
  )

  const [hydrated, setHydrated] = React.useState(false)
  const [storeOk, setStoreOk] = React.useState(false)
  const [storeEnabled, setStoreEnabled] = React.useState(true)
  const [company, setCompany] = React.useState<CompanySettings>(DEFAULT_COMPANY_SETTINGS)
  const [step, setStep] = React.useState<Step>(qrPrefill.customerId ? "shop" : "who")
  const [nameQuery, setNameQuery] = React.useState("")
  const [search, setSearch] = React.useState("")
  const [cart, setCart] = React.useState<StorefrontCartLine[]>([])
  const [customerId, setCustomerId] = React.useState(qrPrefill.customerId)
  const [processing, setProcessing] = React.useState(false)
  const [placed, setPlaced] = React.useState<PlacedOrder | null>(null)

  React.useEffect(() => {
    const settings = loadStorefrontSettings()
    setCompany(loadCompanySettings())
    setStoreOk(Boolean(settings && settings.storeId === storeId))
    setStoreEnabled(settings?.enabled ?? false)
    setHydrated(true)
  }, [storeId])

  React.useEffect(() => {
    setCustomerId(qrPrefill.customerId)
    setStep(qrPrefill.customerId ? "shop" : "who")
  }, [qrPrefill.customerId])

  const shoppers = React.useMemo(
    () =>
      customers.filter(
        (customer) =>
          customer.status === "active" || String(customer.id) === qrPrefill.customerId
      ),
    [customers, qrPrefill.customerId]
  )
  const selectedCustomer = shoppers.find((customer) => String(customer.id) === customerId)
  const catalog = React.useMemo(
    () =>
      filterStorefrontCatalog(products, {
        brand: qrPrefill.brand,
        category: qrPrefill.category,
        variant: qrPrefill.variant,
      }),
    [products, qrPrefill.brand, qrPrefill.category, qrPrefill.variant]
  )
  const filteredProducts = React.useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return catalog
    return catalog.filter(
      (product) =>
        product.name.toLowerCase().includes(query) ||
        product.brand.toLowerCase().includes(query)
    )
  }, [catalog, search])
  const namedShoppers = React.useMemo(() => {
    const query = nameQuery.trim().toLowerCase()
    if (!query) return shoppers
    return shoppers.filter((customer) => customer.name.toLowerCase().includes(query))
  }, [nameQuery, shoppers])

  const subtotal = React.useMemo(() => cartSubtotal(cart), [cart])
  const itemCount = React.useMemo(() => cartItemCount(cart), [cart])
  const qtyByProduct = React.useMemo(() => {
    const map = new Map<number, number>()
    for (const line of cart) map.set(line.productId, line.quantity)
    return map
  }, [cart])

  const addToCart = React.useCallback((product: ProductRow) => {
    if (product.stock <= 0) {
      toast.error(t("outOfStock"))
      return
    }
    setCart((prev) => {
      const existing = prev.find((line) => line.productId === product.id)
      if (existing) {
        if (existing.quantity >= product.stock) return prev
        return prev.map((line) =>
          line.productId === product.id
            ? { ...line, quantity: line.quantity + 1 }
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
          maxStock: product.stock,
        },
      ]
    })
  }, [t])

  const setQuantity = React.useCallback((productId: number, quantity: number) => {
    setCart((prev) => {
      if (quantity <= 0) return prev.filter((line) => line.productId !== productId)
      return prev.map((line) =>
        line.productId === productId
          ? { ...line, quantity: Math.min(quantity, line.maxStock) }
          : line
      )
    })
  }, [])

  const placeOrder = React.useCallback(async () => {
    if (!selectedCustomer || cart.length === 0) return
    for (const line of cart) {
      const product = getProduct(line.productId)
      if (!product || product.stock < line.quantity) {
        toast.error(t("notEnoughStock", { name: line.productName }))
        return
      }
    }
    setProcessing(true)
    try {
      const created = addOrder(
        buildStorefrontOrderFromCart(cart, {
          customerName: selectedCustomer.name,
          invoiceNumber: nextStorefrontInvoiceNumber(orders),
          brand: qrPrefill.brand,
          category: qrPrefill.category,
          variant: qrPrefill.variant,
        })
      )
      for (const line of cart) {
        const product = getProduct(line.productId)
        if (product) {
          updateProduct(line.productId, {
            stock: Math.max(0, product.stock - line.quantity),
            orders: product.orders + line.quantity,
          })
        }
      }
      setPlaced({
        invoiceNumber: created.invoiceNumber,
        customerName: selectedCustomer.name,
        totalAmount: created.totalAmount,
      })
      setCart([])
    } finally {
      setProcessing(false)
    }
  }, [
    addOrder,
    cart,
    getProduct,
    orders,
    qrPrefill.brand,
    qrPrefill.category,
    qrPrefill.variant,
    selectedCustomer,
    t,
    updateProduct,
  ])

  if (!hydrated) return <PageLoader fullScreen message={t("openingStore")} />
  if (!storeOk) {
    return (
      <div className="mx-auto flex min-h-svh max-w-sm flex-col justify-center px-4 text-center">
        <h1 className="text-xl font-semibold tracking-tight">{t("storeNotFound")}</h1>
        <p className="text-muted-foreground mt-2 text-sm">{t("scanQr")}</p>
      </div>
    )
  }
  if (!storeEnabled) {
    return (
      <div className="mx-auto flex min-h-svh max-w-sm flex-col justify-center px-4 text-center">
        <h1 className="text-xl font-semibold tracking-tight">
          {t("isClosed", { name: company.name })}
        </h1>
        <p className="text-muted-foreground mt-2 text-sm">{t("tryLater")}</p>
      </div>
    )
  }

  if (placed) {
    return (
      <Centered
        title={t("orderPlaced")}
        body={t("thanks", { name: placed.customerName })}
        extra={
          <>
            <p className="mt-5 text-base font-semibold tabular-nums">{placed.invoiceNumber}</p>
            <p className="text-muted-foreground text-base tabular-nums">
              {formatStorefrontMoney(placed.totalAmount)}
            </p>
            <Button
              type="button"
              variant="outline"
              className={`${sfBtnLg} mt-8 px-8`}
              onClick={() => {
                setPlaced(null)
                setSearch("")
                setCustomerId(qrPrefill.customerId)
                setStep(qrPrefill.customerId ? "shop" : "who")
              }}
            >
              {t("newOrder")}
            </Button>
          </>
        }
      />
    )
  }

  return (
    <div className="bg-muted/20 min-h-svh">
      <header className="sticky top-0 z-20 border-b border-border/40 bg-background/95 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-lg items-center gap-3 px-4">
          {step !== "who" && !(step === "shop" && qrPrefill.customerId) ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-11 shrink-0 rounded-xl"
              onClick={() => setStep(step === "review" ? "shop" : "who")}
            >
              <IconArrowLeft className="size-5" />
            </Button>
          ) : (
            <div className="bg-muted/50 size-11 shrink-0 overflow-hidden rounded-xl">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={company.logoUrl.trim() || "/assets/logo-2.png"}
                alt=""
                className="size-full object-contain p-1.5"
              />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-semibold">
              {step === "who"
                ? t("whosOrdering")
                : step === "review"
                  ? t("confirmOrder")
                  : company.name}
            </p>
            {step === "shop" && selectedCustomer ? (
              <p className="text-muted-foreground truncate text-sm">{selectedCustomer.name}</p>
            ) : null}
          </div>
          <StepDots current={step} skippedWho={Boolean(qrPrefill.customerId)} />
        </div>
      </header>

      <div key={step} className={sfStepEnter}>
        {step === "who" ? (
          <NameStep
            query={nameQuery}
            onQueryChange={setNameQuery}
            customers={namedShoppers}
            onPick={(id) => {
              setCustomerId(id)
              setStep("shop")
            }}
          />
        ) : null}

        {step === "shop" ? (
          <ShopStep
            search={search}
            onSearchChange={setSearch}
            products={filteredProducts}
            empty={storefrontCatalogProducts(products).length === 0}
            qtyByProduct={qtyByProduct}
            itemCount={itemCount}
            subtotal={subtotal}
            onAdd={addToCart}
            onQuantityChange={setQuantity}
            onContinue={() => {
              if (itemCount === 0) {
                toast.error(t("addProductFirst"))
                return
              }
              setStep("review")
            }}
          />
        ) : null}

        {step === "review" ? (
          <ReviewStep
            customerName={selectedCustomer?.name ?? "—"}
            cart={cart}
            subtotal={subtotal}
            processing={processing}
            onPlaceOrder={placeOrder}
          />
        ) : null}
      </div>
    </div>
  )
}

function NameStep({
  query,
  onQueryChange,
  customers,
  onPick,
}: {
  query: string
  onQueryChange: (value: string) => void
  customers: CustomerRow[]
  onPick: (id: string) => void
}) {
  const { t } = useTranslation("storefront")
  return (
    <div className="mx-auto max-w-lg px-4 py-6">
      <SearchInput
        icon={<IconSearch className="size-5" />}
        placeholder={t("searchName")}
        value={query}
        onChange={(event) => onQueryChange(event.target.value)}
        className={`${sfInputLg} pl-12`}
      />
      <div className={`${sfPanel} mt-5 overflow-hidden`}>
        {customers.length === 0 ? (
          <p className="text-muted-foreground px-5 py-14 text-center text-base">
            {t("noNames")}
          </p>
        ) : (
          <ul className="divide-y divide-border/50">
            {customers.map((customer) => (
              <li key={customer.id}>
                <button
                  type="button"
                  onClick={() => onPick(String(customer.id))}
                  className={sfListRow}
                >
                  <span className="truncate">{customer.name}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

function ShopStep({
  search,
  onSearchChange,
  products,
  empty,
  qtyByProduct,
  itemCount,
  subtotal,
  onAdd,
  onQuantityChange,
  onContinue,
}: {
  search: string
  onSearchChange: (value: string) => void
  products: ProductRow[]
  empty: boolean
  qtyByProduct: Map<number, number>
  itemCount: number
  subtotal: string
  onAdd: (product: ProductRow) => void
  onQuantityChange: (productId: number, quantity: number) => void
  onContinue: () => void
}) {
  const { t } = useTranslation("storefront")
  return (
    <div className="mx-auto max-w-lg px-4 py-6 pb-32">
      <SearchInput
        icon={<IconSearch className="size-5" />}
        placeholder={t("searchProducts")}
        value={search}
        onChange={(event) => onSearchChange(event.target.value)}
        className={`${sfInputLg} pl-12`}
      />
      {products.length === 0 ? (
        <p className="text-muted-foreground py-20 text-center text-base">
          {empty ? t("nothingInStore") : t("noMatching")}
        </p>
      ) : (
        <div className="mt-5 grid grid-cols-2 gap-3.5">
          {products.map((product) => (
            <StorefrontProductCard
              key={product.id}
              product={product}
              inCartQty={qtyByProduct.get(product.id) ?? 0}
              formatPrice={formatStorefrontMoney}
              onAdd={onAdd}
              onQuantityChange={onQuantityChange}
            />
          ))}
        </div>
      )}
      <BottomBar>
        <Button
          type="button"
          className={`${sfBtnLg} w-full`}
          disabled={itemCount === 0}
          onClick={onContinue}
        >
          {itemCount === 0
            ? t("addProducts")
            : t("continueBar", { count: itemCount, amount: formatStorefrontMoney(subtotal) })}
        </Button>
      </BottomBar>
    </div>
  )
}

function ReviewStep({
  customerName,
  cart,
  subtotal,
  processing,
  onPlaceOrder,
}: {
  customerName: string
  cart: StorefrontCartLine[]
  subtotal: string
  processing: boolean
  onPlaceOrder: () => void
}) {
  const { t } = useTranslation("storefront")
  return (
    <div className="mx-auto max-w-lg px-4 py-6 pb-32">
      <div className={`${sfPanel} p-5`}>
        <p className="text-muted-foreground text-sm">{t("orderingAs")}</p>
        <p className="mt-1 text-lg font-semibold">{customerName}</p>
      </div>
      <ul className={`${sfPanel} mt-4 divide-y divide-border/50 overflow-hidden`}>
        {cart.map((line) => (
          <li key={line.productId} className="flex items-center justify-between gap-4 px-5 py-4">
            <div className="min-w-0">
              <p className="truncate text-base font-medium">{line.productName}</p>
              <p className="text-muted-foreground mt-0.5 text-sm">× {line.quantity}</p>
            </div>
            <p className="text-base font-semibold tabular-nums">
              {formatStorefrontMoney(cartLineTotal(line))}
            </p>
          </li>
        ))}
      </ul>
      <div className="mt-5 flex items-center justify-between px-1 text-base">
        <span className="text-muted-foreground">{t("total")}</span>
        <span className="text-lg font-semibold tabular-nums">
          {formatStorefrontMoney(subtotal)}
        </span>
      </div>
      <BottomBar>
        <Button
          type="button"
          className={`${sfBtnLg} w-full`}
          disabled={processing || cart.length === 0}
          onClick={onPlaceOrder}
        >
          {processing ? t("placing") : t("placeOrder", { amount: formatStorefrontMoney(subtotal) })}
        </Button>
      </BottomBar>
    </div>
  )
}

function StepDots({ current, skippedWho }: { current: Step; skippedWho: boolean }) {
  const steps: Step[] = skippedWho ? ["shop", "review"] : ["who", "shop", "review"]
  return (
    <div className="flex items-center gap-1.5">
      {steps.map((item) => (
        <span
          key={item}
          className={
            item === current
              ? "bg-primary h-2 w-2 rounded-full transition-all duration-300"
              : "bg-border h-1.5 w-1.5 rounded-full transition-all duration-300"
          }
        />
      ))}
    </div>
  )
}

function BottomBar({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-background/95 fixed inset-x-0 bottom-0 z-20 border-t border-border/40 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur-md">
      <div className="mx-auto max-w-lg">{children}</div>
    </div>
  )
}

function Centered({
  title,
  body,
  extra,
}: {
  title: string
  body: string
  extra?: React.ReactNode
}) {
  return (
    <div className="mx-auto flex min-h-svh max-w-sm flex-col items-center justify-center px-4 text-center">
      <div className="bg-primary/10 text-primary mb-5 flex size-16 items-center justify-center rounded-2xl">
        <IconShoppingBag className="size-8" stroke={1.5} />
      </div>
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      <p className="text-muted-foreground mt-2 text-base">{body}</p>
      {extra}
    </div>
  )
}
