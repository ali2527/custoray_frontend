import i18n, { type InitOptions } from "i18next"

import { loadAppearance } from "@/lib/appearance-prefs"

import {
  DEFAULT_LANGUAGE,
  DEFAULT_NS,
  I18N_NAMESPACES,
  isAppLanguage,
} from "./config"

import enCommon from "@/locales/en/common.json"
import enNav from "@/locales/en/nav.json"
import enSettings from "@/locales/en/settings.json"
import enAuth from "@/locales/en/auth.json"
import enInventory from "@/locales/en/inventory.json"
import enSales from "@/locales/en/sales.json"
import enPurchases from "@/locales/en/purchases.json"
import enCustomers from "@/locales/en/customers.json"
import enVendors from "@/locales/en/vendors.json"
import enPayments from "@/locales/en/payments.json"
import enExpenses from "@/locales/en/expenses.json"
import enDocuments from "@/locales/en/documents.json"
import enPos from "@/locales/en/pos.json"
import enEmployees from "@/locales/en/employees.json"
import enZakat from "@/locales/en/zakat.json"
import enReports from "@/locales/en/reports.json"
import enTax from "@/locales/en/tax.json"
import enStorefront from "@/locales/en/storefront.json"
import enPlans from "@/locales/en/plans.json"
import enReturns from "@/locales/en/returns.json"

import arCommon from "@/locales/ar/common.json"
import arNav from "@/locales/ar/nav.json"
import arSettings from "@/locales/ar/settings.json"
import arAuth from "@/locales/ar/auth.json"
import arInventory from "@/locales/ar/inventory.json"
import arSales from "@/locales/ar/sales.json"
import arPurchases from "@/locales/ar/purchases.json"
import arCustomers from "@/locales/ar/customers.json"
import arVendors from "@/locales/ar/vendors.json"
import arPayments from "@/locales/ar/payments.json"
import arExpenses from "@/locales/ar/expenses.json"
import arDocuments from "@/locales/ar/documents.json"
import arPos from "@/locales/ar/pos.json"
import arEmployees from "@/locales/ar/employees.json"
import arZakat from "@/locales/ar/zakat.json"
import arReports from "@/locales/ar/reports.json"
import arTax from "@/locales/ar/tax.json"
import arStorefront from "@/locales/ar/storefront.json"
import arPlans from "@/locales/ar/plans.json"
import arReturns from "@/locales/ar/returns.json"

import urCommon from "@/locales/ur/common.json"
import urNav from "@/locales/ur/nav.json"
import urSettings from "@/locales/ur/settings.json"
import urAuth from "@/locales/ur/auth.json"
import urInventory from "@/locales/ur/inventory.json"
import urSales from "@/locales/ur/sales.json"
import urPurchases from "@/locales/ur/purchases.json"
import urCustomers from "@/locales/ur/customers.json"
import urVendors from "@/locales/ur/vendors.json"
import urPayments from "@/locales/ur/payments.json"
import urExpenses from "@/locales/ur/expenses.json"
import urDocuments from "@/locales/ur/documents.json"
import urPos from "@/locales/ur/pos.json"
import urEmployees from "@/locales/ur/employees.json"
import urZakat from "@/locales/ur/zakat.json"
import urReports from "@/locales/ur/reports.json"
import urTax from "@/locales/ur/tax.json"
import urStorefront from "@/locales/ur/storefront.json"
import urPlans from "@/locales/ur/plans.json"
import urReturns from "@/locales/ur/returns.json"

const resources = {
  en: {
    common: enCommon,
    nav: enNav,
    settings: enSettings,
    auth: enAuth,
    inventory: enInventory,
    sales: enSales,
    purchases: enPurchases,
    customers: enCustomers,
    vendors: enVendors,
    payments: enPayments,
    expenses: enExpenses,
    documents: enDocuments,
    pos: enPos,
    employees: enEmployees,
    zakat: enZakat,
    reports: enReports,
    tax: enTax,
    storefront: enStorefront,
    plans: enPlans,
    returns: enReturns,
  },
  ar: {
    common: arCommon,
    nav: arNav,
    settings: arSettings,
    auth: arAuth,
    inventory: arInventory,
    sales: arSales,
    purchases: arPurchases,
    customers: arCustomers,
    vendors: arVendors,
    payments: arPayments,
    expenses: arExpenses,
    documents: arDocuments,
    pos: arPos,
    employees: arEmployees,
    zakat: arZakat,
    reports: arReports,
    tax: arTax,
    storefront: arStorefront,
    plans: arPlans,
    returns: arReturns,
  },
  ur: {
    common: urCommon,
    nav: urNav,
    settings: urSettings,
    auth: urAuth,
    inventory: urInventory,
    sales: urSales,
    purchases: urPurchases,
    customers: urCustomers,
    vendors: urVendors,
    payments: urPayments,
    expenses: urExpenses,
    documents: urDocuments,
    pos: urPos,
    employees: urEmployees,
    zakat: urZakat,
    reports: urReports,
    tax: urTax,
    storefront: urStorefront,
    plans: urPlans,
    returns: urReturns,
  },
} as const

function getInitialLanguage() {
  if (typeof window === "undefined") return DEFAULT_LANGUAGE
  const language = loadAppearance().language
  return isAppLanguage(language) ? language : DEFAULT_LANGUAGE
}

function applyResourceBundles() {
  for (const [lng, namespaces] of Object.entries(resources)) {
    for (const [ns, bundle] of Object.entries(namespaces)) {
      i18n.addResourceBundle(lng, ns, bundle, true, true)
    }
  }
}

if (!i18n.isInitialized) {
  void i18n.init({
    resources,
    lng: getInitialLanguage(),
    fallbackLng: DEFAULT_LANGUAGE,
    defaultNS: DEFAULT_NS,
    ns: [...I18N_NAMESPACES],
    interpolation: { escapeValue: false },
    returnNull: false,
    initImmediate: false,
    react: { useSuspense: false, bindI18n: "languageChanged loaded added" },
  } as InitOptions)
} else {
  applyResourceBundles()
}

export default i18n
