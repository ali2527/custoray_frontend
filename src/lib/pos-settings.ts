import { z } from "zod"

import { PAYMENT_METHODS, type OrderRow } from "@/lib/orders"
import type { ReturnRow } from "@/lib/returns"

export const POS_SETTINGS_STORAGE_KEY = "custoray-pos-settings-v2"

const paymentMethodSchema = z.enum(["Cash", "Bank transfer", "Card", "Credit"])
const documentStatusSchema = z.enum(["pending", "completed", "cancelled"])
const registerModeSchema = z.enum(["sale", "return"])
const catalogColumnsSchema = z.union([z.literal(2), z.literal(3), z.literal(4)])

export const posSettingsSchema = z.object({
  registerName: z.string().trim().min(1).max(40),
  receiptPrefix: z
    .string()
    .trim()
    .min(2)
    .max(12)
    .regex(/^[A-Za-z0-9-]+$/),
  defaultRegisterMode: registerModeSchema,

  showSkuOnCards: z.boolean(),
  showStockOnCards: z.boolean(),
  hideOutOfStockOnSale: z.boolean(),
  catalogColumns: catalogColumnsSchema,
  lowStockThreshold: z.number().int().min(1).max(99),

  defaultPaymentMethod: paymentMethodSchema,
  defaultSaleStatus: documentStatusSchema,
  defaultReturnStatus: documentStatusSchema,
  enabledPaymentMethods: z.array(paymentMethodSchema).min(1),
  allowDiscounts: z.boolean(),
  allowLinePriceEdit: z.boolean(),
  allowPartialPayment: z.boolean(),
  maxDiscountPercent: z.number().int().min(0).max(100),

  requireCustomer: z.boolean(),
  confirmBeforeComplete: z.boolean(),

  receiptFooterNote: z.string().max(200),
  autoOpenReceiptPdf: z.boolean(),

  allowOverselling: z.boolean(),
  deductStockOnPending: z.boolean(),

  recentSalesLimit: z.number().int().min(3).max(12),
  autoFocusSearchAfterSale: z.boolean(),
})

export type PosSettings = z.infer<typeof posSettingsSchema>

export const DEFAULT_POS_SETTINGS: PosSettings = {
  registerName: "Main register",
  receiptPrefix: "POS",
  defaultRegisterMode: "sale",

  showSkuOnCards: true,
  showStockOnCards: true,
  hideOutOfStockOnSale: true,
  catalogColumns: 3,
  lowStockThreshold: 5,

  defaultPaymentMethod: "Cash",
  defaultSaleStatus: "completed",
  defaultReturnStatus: "completed",
  enabledPaymentMethods: [...PAYMENT_METHODS],
  allowDiscounts: true,
  allowLinePriceEdit: true,
  allowPartialPayment: false,
  maxDiscountPercent: 0,

  requireCustomer: false,
  confirmBeforeComplete: true,

  receiptFooterNote: "Thank you for your purchase!",
  autoOpenReceiptPdf: false,

  allowOverselling: false,
  deductStockOnPending: true,

  recentSalesLimit: 6,
  autoFocusSearchAfterSale: true,
}

export function parsePersistedPosSettings(raw: string | null): PosSettings | null {
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as unknown
    const merged =
      parsed && typeof parsed === "object"
        ? { ...DEFAULT_POS_SETTINGS, ...parsed }
        : DEFAULT_POS_SETTINGS

    const enabled = (merged as PosSettings).enabledPaymentMethods
    if (!Array.isArray(enabled) || enabled.length === 0) {
      ;(merged as PosSettings).enabledPaymentMethods = [...PAYMENT_METHODS]
    }

    const result = posSettingsSchema.safeParse(merged)
    return result.success ? result.data : null
  } catch {
    return null
  }
}

export function mergePosSettings(
  patch: Partial<PosSettings>,
  current: PosSettings = DEFAULT_POS_SETTINGS
): PosSettings {
  const next = { ...current, ...patch }
  if (next.enabledPaymentMethods.length === 0) {
    next.enabledPaymentMethods = [current.defaultPaymentMethod]
  }
  if (!next.enabledPaymentMethods.includes(next.defaultPaymentMethod)) {
    next.defaultPaymentMethod = next.enabledPaymentMethods[0]
  }
  return posSettingsSchema.parse(next)
}

export function sanitizeReceiptPrefix(value: string): string {
  const cleaned = value.trim().toUpperCase().replace(/[^A-Z0-9-]/g, "")
  return cleaned.slice(0, 12) || "POS"
}

export function isPaymentMethodEnabled(
  settings: PosSettings,
  method: OrderRow["paymentMethod"]
): boolean {
  return settings.enabledPaymentMethods.includes(method)
}

export function isValidPosPaymentMethod(
  value: string
): value is OrderRow["paymentMethod"] {
  return PAYMENT_METHODS.includes(value as OrderRow["paymentMethod"])
}

export function isValidPosDocumentStatus(
  value: string
): value is OrderRow["status"] | ReturnRow["status"] {
  return ["pending", "completed", "cancelled"].includes(value)
}

export function catalogGridClass(columns: PosSettings["catalogColumns"]): string {
  if (columns === 2) return "grid-cols-1 min-[360px]:grid-cols-2"
  if (columns === 4) return "grid-cols-1 min-[360px]:grid-cols-2 sm:grid-cols-3 xl:grid-cols-4"
  return "grid-cols-1 min-[360px]:grid-cols-2 sm:grid-cols-3"
}
