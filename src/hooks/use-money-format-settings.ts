"use client"

import { useMoneyFormat } from "@/context/money-format-context"

/** Settings UI + any consumer that needs persist/setVariant. */
export function useMoneyFormatSettings() {
  const { settings, persist, setVariant, formatMoney } = useMoneyFormat()
  return { settings, persist, setVariant, formatMoney }
}
