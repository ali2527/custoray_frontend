"use client"

import { useEffect, useState } from "react"

import {
  DEFAULT_PRODUCT_SKU_SETTINGS,
  PRODUCT_SKU_SETTINGS_EVENT,
  loadProductSkuSettings,
  saveProductSkuSettings,
  type ProductSkuMode,
  type ProductSkuSettings,
} from "@/lib/product-sku-settings"

export function useProductSkuSettings() {
  const [settings, setSettings] = useState<ProductSkuSettings>(
    DEFAULT_PRODUCT_SKU_SETTINGS
  )

  useEffect(() => {
    const sync = () => setSettings(loadProductSkuSettings())
    sync()
    window.addEventListener(PRODUCT_SKU_SETTINGS_EVENT, sync)
    window.addEventListener("storage", sync)
    return () => {
      window.removeEventListener(PRODUCT_SKU_SETTINGS_EVENT, sync)
      window.removeEventListener("storage", sync)
    }
  }, [])

  function persist(next: ProductSkuSettings) {
    const normalized: ProductSkuSettings = {
      mode: next.mode === "custom" ? "custom" : "auto",
      prefix:
        next.prefix?.trim() ||
        loadProductSkuSettings().prefix ||
        DEFAULT_PRODUCT_SKU_SETTINGS.prefix,
    }
    setSettings(normalized)
    saveProductSkuSettings(normalized)
  }

  function setMode(mode: ProductSkuMode) {
    // Read latest from storage so mode switches aren't lost to stale state.
    persist({ ...loadProductSkuSettings(), mode })
  }

  return { settings, persist, setMode }
}
