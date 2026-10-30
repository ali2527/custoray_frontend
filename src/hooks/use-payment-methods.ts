"use client"

import { useCallback, useEffect, useState } from "react"

import {
  DEFAULT_PAYMENT_METHODS,
  DEFAULT_PAYMENT_METHODS_SETTINGS,
  PAYMENT_METHODS_EVENT,
  addPaymentMethod,
  loadPaymentMethodsSettings,
  removePaymentMethod,
  savePaymentMethodsSettings,
  type PaymentMethodsSettings,
} from "@/lib/payment-methods-settings"

export function usePaymentMethods() {
  const [settings, setSettings] = useState<PaymentMethodsSettings>(
    DEFAULT_PAYMENT_METHODS_SETTINGS
  )

  useEffect(() => {
    const sync = () => setSettings(loadPaymentMethodsSettings())
    sync()
    window.addEventListener(PAYMENT_METHODS_EVENT, sync)
    window.addEventListener("storage", sync)
    return () => {
      window.removeEventListener(PAYMENT_METHODS_EVENT, sync)
      window.removeEventListener("storage", sync)
    }
  }, [])

  const persist = useCallback((next: PaymentMethodsSettings) => {
    savePaymentMethodsSettings(next)
    setSettings(loadPaymentMethodsSettings())
  }, [])

  const add = useCallback((name: string) => {
    const next = addPaymentMethod(name)
    setSettings(next)
    return next
  }, [])

  const remove = useCallback((name: string) => {
    const next = removePaymentMethod(name)
    setSettings(next)
    return next
  }, [])

  return {
    methods: settings.methods,
    defaults: DEFAULT_PAYMENT_METHODS,
    settings,
    persist,
    add,
    remove,
  }
}
