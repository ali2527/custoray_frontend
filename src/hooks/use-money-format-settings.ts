"use client"

import { useEffect, useState } from "react"

import {
  DEFAULT_MONEY_FORMAT_SETTINGS,
  MONEY_FORMAT_EVENT,
  loadMoneyFormatSettings,
  saveMoneyFormatSettings,
  type MoneyFormatSettings,
  type MoneyFormatVariant,
} from "@/lib/money-format-settings"

export function useMoneyFormatSettings() {
  const [settings, setSettings] = useState<MoneyFormatSettings>(
    DEFAULT_MONEY_FORMAT_SETTINGS
  )

  useEffect(() => {
    const sync = () => setSettings(loadMoneyFormatSettings())
    sync()
    window.addEventListener(MONEY_FORMAT_EVENT, sync)
    window.addEventListener("storage", sync)
    return () => {
      window.removeEventListener(MONEY_FORMAT_EVENT, sync)
      window.removeEventListener("storage", sync)
    }
  }, [])

  function persist(next: MoneyFormatSettings) {
    setSettings(next)
    saveMoneyFormatSettings(next)
  }

  function setVariant(variant: MoneyFormatVariant) {
    persist({ variant })
  }

  return { settings, persist, setVariant }
}
