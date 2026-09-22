export type PublicPlan = {
  code: string
  displayName: string
  priceMonthly: number
  maxStores: number
  maxUsers: number
  maxProducts: number
  moduleAccess?: string[]
}

export type BillingInterval = "monthly" | "yearly"

export const PLAN_ORDER = ["starter", "business", "professional"] as const

export const TRIAL_DAYS = 15

/** Yearly is billed as 10 months (2 months free). */
export const YEARLY_MONTHS_CHARGED = 10

/** Extra display limits until they live on the Plan row. */
export const PLAN_VOLUME: Record<
  string,
  { maxCustomers: number; maxVendors: number; maxTemplates: number }
> = {
  starter: { maxCustomers: 200, maxVendors: 50, maxTemplates: 1 },
  business: { maxCustomers: 1000, maxVendors: 300, maxTemplates: 3 },
  professional: { maxCustomers: 10000, maxVendors: 2000, maxTemplates: 0 },
  enterprise: { maxCustomers: 0, maxVendors: 0, maxTemplates: 0 },
}

export const PLAN_BLURB: Record<string, string> = {
  starter: "One shop with the essentials to start selling.",
  business: "Multi-branch operations with POS and documents.",
  professional: "Teams, tax, and reporting for growing companies.",
}

const MODULE_LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  inventory: "Inventory & products",
  customers: "Customers",
  vendors: "Vendors",
  sales: "Sales",
  settings: "Company settings",
  purchases: "Purchases",
  returns: "Returns",
  payments: "Payments",
  expenses: "Expenses",
  documents: "Documents & invoices",
  pos: "Point of sale",
  qr_storefront: "QR storefront",
  reports: "Analytics",
  employees: "Employees & payroll",
  tax: "Tax",
  fiscal: "Fiscal year",
  zakat: "Zakat",
}

export const PLAN_INCLUDES: Record<string, string[]> = {
  starter: [
    "All modules (temporary)",
    "Dashboard",
    "Inventory, sales, purchases, payments, expenses",
    "POS, documents, employees, analytics, tax, zakat",
  ],
  business: [
    "Everything in Starter",
    "Purchases",
    "Returns",
    "Payments",
    "Expenses",
    "Documents & invoices",
    "Point of sale",
    "QR storefront",
  ],
  professional: [
    "Everything in Business",
    "Analytics",
    "Employees & payroll",
    "Tax",
    "Fiscal year",
  ],
}

export function formatPlanPrice(cents: number) {
  const amount = Math.round(cents / 100)
  return `Rs ${amount.toLocaleString()}`
}

export function yearlyFromMonthly(monthlyCents: number) {
  const yearlyCents = monthlyCents * YEARLY_MONTHS_CHARGED
  return {
    yearlyCents,
    equivalentMonthlyCents: Math.round(yearlyCents / 12),
  }
}

export function formatLimit(n: number, unlimitedAt = 999999) {
  if (n <= 0 || n >= unlimitedAt) return "Unlimited"
  return n.toLocaleString()
}

export function sortPlans<T extends { code: string; priceMonthly: number }>(plans: T[]) {
  return [...plans].sort((a, b) => {
    const ai = PLAN_ORDER.indexOf(a.code as (typeof PLAN_ORDER)[number])
    const bi = PLAN_ORDER.indexOf(b.code as (typeof PLAN_ORDER)[number])
    if (ai === -1 && bi === -1) return a.priceMonthly - b.priceMonthly
    if (ai === -1) return 1
    if (bi === -1) return -1
    return ai - bi
  })
}

export function planHighlightStats(plan: PublicPlan) {
  return [
    {
      value: formatLimit(plan.maxStores),
      label: plan.maxStores === 1 ? "Branch" : "Branches",
    },
    { value: formatLimit(plan.maxUsers), label: "Users" },
    { value: formatLimit(plan.maxProducts), label: "Products" },
  ]
}

export function planVolumeFeatures(code: string) {
  const extra = PLAN_VOLUME[code] ?? PLAN_VOLUME.starter
  return [
    `${formatLimit(extra.maxCustomers)} customers`,
    `${formatLimit(extra.maxVendors)} vendors`,
    extra.maxTemplates === 0
      ? "Unlimited invoice templates"
      : `${extra.maxTemplates} invoice template${extra.maxTemplates === 1 ? "" : "s"}`,
  ]
}

export function planIncludes(plan: PublicPlan) {
  const fromApi = (plan.moduleAccess ?? [])
    .map((id) => MODULE_LABELS[id] ?? "")
    .filter(Boolean)
  if (fromApi.length > 0 && plan.code === "starter") return fromApi
  return PLAN_INCLUDES[plan.code] ?? fromApi
}
