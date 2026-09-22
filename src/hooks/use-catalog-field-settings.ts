"use client"

import { useEffect, useState } from "react"

import {
  CATALOG_FIELD_SETTINGS_EVENT,
  DEFAULT_CATALOG_FIELD_SETTINGS,
  loadCatalogFieldSettings,
  saveCatalogFieldSettings,
  type CatalogLink,
  type CatalogTablesSettings,
} from "@/lib/catalog-field-settings"

export function useCatalogFieldSettings() {
  const [settings, setSettings] = useState<CatalogTablesSettings>(
    DEFAULT_CATALOG_FIELD_SETTINGS
  )

  useEffect(() => {
    const sync = () => setSettings(loadCatalogFieldSettings())
    sync()
    window.addEventListener(CATALOG_FIELD_SETTINGS_EVENT, sync)
    window.addEventListener("storage", sync)
    return () => {
      window.removeEventListener(CATALOG_FIELD_SETTINGS_EVENT, sync)
      window.removeEventListener("storage", sync)
    }
  }, [])

  function persist(next: CatalogTablesSettings) {
    setSettings(next)
    saveCatalogFieldSettings(next)
  }

  function setTable(link: CatalogLink, enabled: boolean) {
    persist({ ...settings, [link]: enabled })
  }

  return { settings, persist, setTable }
}
