"use client"

import { useEffect, useState, type FormEvent, type ReactNode } from "react"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"

import { Monitor, Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useAppearance } from "@/components/theme/appearance-provider"
import { useFiscalTerms } from "@/context/fiscal-term-context"
import { useProducts } from "@/context/products-context"
import {
  ACCENT_PRESETS,
  LANGUAGES,
  type AppLanguage,
  type FontSizeKey,
} from "@/lib/appearance-prefs"
import {
  INVENTORY_PRODUCTS_STORAGE_KEY,
  productFromFormData,
  productSchema,
  type ProductRow,
} from "@/lib/products"
import { addMonthsIso, formatShortDate } from "@/lib/fiscal-terms"
import { cn } from "@/lib/utils"

export const WELCOME_SETUP_STEPS = 4
export const WELCOME_PRODUCT_FORM_ID = "welcome-first-product"

const TENURE_OPTIONS = [6, 12, 24] as const
const FONT_OPTIONS: FontSizeKey[] = ["sm", "base", "lg", "xl"]
const PRESET_I18N_KEY: Record<string, "green" | "red" | "blue" | "purple" | "navy"> = {
  green: "green",
  red: "red",
  blue: "blue",
  purple: "purple",
  violet: "navy",
}

function Pill({
  selected,
  children,
  onClick,
}: {
  selected: boolean
  children: ReactNode
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "h-8 rounded-full border px-3 text-[12.5px] font-medium transition-colors",
        selected
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-background text-foreground hover:bg-muted/60"
      )}
    >
      {children}
    </button>
  )
}

function persistInventoryProduct(product: ProductRow) {
  if (typeof window === "undefined") return
  try {
    const raw = window.localStorage.getItem(INVENTORY_PRODUCTS_STORAGE_KEY)
    let list: ProductRow[] = []
    if (raw) {
      const parsed = productSchema.array().safeParse(JSON.parse(raw))
      if (parsed.success) list = parsed.data
    }
    if (list.some((item) => item.sku === product.sku || item.name === product.name)) {
      list = list.map((item) =>
        item.sku === product.sku || item.name === product.name ? product : item
      )
    } else {
      list = [...list, product]
    }
    window.localStorage.setItem(INVENTORY_PRODUCTS_STORAGE_KEY, JSON.stringify(list))
  } catch {
    /* ignore */
  }
}

export function WelcomeSetupBody({
  step,
  onProductCreated,
}: {
  step: number
  onProductCreated?: () => void
}) {
  const { t } = useTranslation("common")
  const { t: tSettings } = useTranslation("settings")
  const { state, updateActiveTenure } = useFiscalTerms()
  const { prefs, update: updateAppearance } = useAppearance()
  const { products, addProduct } = useProducts()
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [tenure, setTenure] = useState(state.active.tenureMonths || 12)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    setTenure(state.active.tenureMonths || 12)
  }, [state.active.tenureMonths])

  const plannedEnd = formatShortDate(addMonthsIso(state.active.startedAt, tenure))
  const fontLabels: Record<FontSizeKey, string> = {
    sm: tSettings("language.fontSizeSm"),
    base: tSettings("language.fontSizeBase"),
    lg: tSettings("language.fontSizeLg"),
    xl: tSettings("language.fontSizeXl"),
  }

  function handleProductSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const fd = new FormData(event.currentTarget)
    const name = String(fd.get("name") ?? "").trim()
    if (!name) {
      toast.error(t("welcome.guide.productNameRequired"))
      return
    }
    const parsed = productFromFormData(fd, 0, products)
    const created = addProduct({
      sku: parsed.sku,
      name: parsed.name,
      brand: parsed.brand,
      category: parsed.category,
      variant: parsed.variant,
      status: parsed.status,
      productStatus: parsed.productStatus,
      stock: parsed.stock,
      orders: parsed.orders,
      costPrice: parsed.costPrice,
      salePrice: parsed.salePrice,
      lifecycle: parsed.lifecycle,
      imageUrls: parsed.imageUrls,
    })
    persistInventoryProduct(created)
    onProductCreated?.()
  }

  if (step === 1) {
    return (
      <div className="space-y-4">
        <p className="text-foreground/80 text-[13px] leading-relaxed">
          {t("welcome.guide.termBody")}
        </p>
        <div>
          <p className="text-[13px] font-medium">{t("welcome.guide.termLength")}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {TENURE_OPTIONS.map((months) => (
              <Pill
                key={months}
                selected={tenure === months}
                onClick={() => {
                  setTenure(months)
                  updateActiveTenure(months)
                }}
              >
                {t("welcome.guide.termMonths", { months })}
              </Pill>
            ))}
          </div>
          <p className="text-muted-foreground mt-2 text-[12px]">
            {t("welcome.guide.termEnds", { date: plannedEnd })}
          </p>
          <p className="text-muted-foreground mt-1 text-[12px]">
            {t("welcome.guide.termHint")}
          </p>
        </div>
      </div>
    )
  }

  if (step === 2) {
    const mode = mounted ? (theme ?? "system") : "system"
    const themeChoices = [
      { id: "light", label: tSettings("appearance.lightMode"), icon: Sun },
      { id: "dark", label: tSettings("appearance.darkMode"), icon: Moon },
      { id: "system", label: tSettings("appearance.systemPreferences"), icon: Monitor },
    ] as const

    return (
      <div className="space-y-5">
        <div className="space-y-2">
          <Label className="text-[12.5px]">{t("welcome.guide.themeModeLabel")}</Label>
          <div className="grid grid-cols-3 gap-2">
            {themeChoices.map((choice) => {
              const Icon = choice.icon
              const selected = mode === choice.id
              return (
                <button
                  key={choice.id}
                  type="button"
                  onClick={() => setTheme(choice.id)}
                  className={cn(
                    "flex flex-col items-center gap-1.5 rounded-xl border px-2 py-3 text-[12px] font-medium transition-colors",
                    selected
                      ? "border-primary bg-primary/8 text-foreground"
                      : "border-border bg-background text-muted-foreground hover:bg-muted/50"
                  )}
                >
                  <Icon className={cn("size-4", selected && "text-primary")} />
                  {choice.label}
                </button>
              )
            })}
          </div>
        </div>
        <div className="space-y-2">
          <Label className="text-[12.5px]">{t("welcome.guide.themeLabel")}</Label>
          <div className="flex flex-wrap items-center gap-3">
            {ACCENT_PRESETS.map((item) => {
              const selected = prefs.colorTheme === item.id
              const label = tSettings(
                `appearance.presets.${PRESET_I18N_KEY[item.id] ?? item.id}`
              )
              return (
                <button
                  key={item.id}
                  type="button"
                  title={label}
                  aria-label={label}
                  onClick={() =>
                    updateAppearance({ colorTheme: item.id, customColor: item.color })
                  }
                  className={cn(
                    "size-8 rounded-full ring-2 ring-offset-2 ring-offset-background transition-shadow",
                    selected ? "ring-primary" : "ring-transparent hover:ring-border"
                  )}
                  style={{ backgroundColor: item.color }}
                />
              )
            })}
          </div>
        </div>
        <div className="space-y-2">
          <Label className="text-[12.5px]">{t("welcome.guide.languageLabel")}</Label>
          <Select
            value={prefs.language}
            onValueChange={(value) =>
              updateAppearance({ language: value as AppLanguage })
            }
          >
            <SelectTrigger className="h-10 w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LANGUAGES.map((lang) => (
                <SelectItem key={lang.value} value={lang.value}>
                  {lang.nativeLabel}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label className="text-[12.5px]">{t("welcome.guide.fontLabel")}</Label>
          <Select
            value={prefs.fontSize}
            onValueChange={(value) =>
              updateAppearance({ fontSize: value as FontSizeKey })
            }
          >
            <SelectTrigger className="h-10 w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FONT_OPTIONS.map((size) => (
                <SelectItem key={size} value={size}>
                  {fontLabels[size]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    )
  }

  if (step === 3) {
    return (
      <form
        id={WELCOME_PRODUCT_FORM_ID}
        className="space-y-4"
        onSubmit={handleProductSubmit}
      >
        <p className="text-foreground/80 text-[13px] leading-relaxed">
          {t("welcome.guide.productBody")}
        </p>
        <div className="flex flex-col gap-2">
          <Label htmlFor={`${WELCOME_PRODUCT_FORM_ID}-name`} className="text-[12.5px]">
            {t("welcome.guide.productName")}
          </Label>
          <Input
            id={`${WELCOME_PRODUCT_FORM_ID}-name`}
            name="name"
            required
            placeholder={t("welcome.guide.productNamePlaceholder")}
          />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor={`${WELCOME_PRODUCT_FORM_ID}-sku`} className="text-[12.5px]">
              {t("welcome.guide.productSku")}
            </Label>
            <Input
              id={`${WELCOME_PRODUCT_FORM_ID}-sku`}
              name="sku"
              placeholder={t("welcome.guide.productSkuPlaceholder")}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor={`${WELCOME_PRODUCT_FORM_ID}-salePrice`} className="text-[12.5px]">
              {t("welcome.guide.productPrice")}
            </Label>
            <Input
              id={`${WELCOME_PRODUCT_FORM_ID}-salePrice`}
              name="salePrice"
              required
              inputMode="decimal"
              placeholder="100.00"
            />
          </div>
        </div>
      </form>
    )
  }

  return null
}
