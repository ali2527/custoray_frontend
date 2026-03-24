"use client"

import * as React from "react"
import {
  type FiscalTermsPersisted,
  type InventoryCloseSnapshot,
  type TermListEntry,
  FISCAL_TERMS_STORAGE_KEY,
  closeActiveTerm as closeActiveTermPure,
  createInitialPersisted,
  getViewingEntry,
  listTermsFromState,
  parsePersisted,
  clampTenureMonths,
  addMonthsIso,
} from "@/lib/fiscal-terms"

type FiscalTermContextValue = {
  state: FiscalTermsPersisted
  termsList: TermListEntry[]
  viewing: TermListEntry | undefined
  plannedEndIso: string
  updateActiveTenure: (months: number) => void
  setViewingTermId: (id: string) => void
  closeActiveTerm: (snapshot?: InventoryCloseSnapshot, nextTenureMonths?: number) => void
}

const FiscalTermContext = React.createContext<FiscalTermContextValue | null>(null)

export function FiscalTermProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = React.useState<FiscalTermsPersisted>(() =>
    createInitialPersisted()
  )
  const [hydrated, setHydrated] = React.useState(false)

  React.useEffect(() => {
    const saved = parsePersisted(
      typeof window !== "undefined"
        ? window.localStorage.getItem(FISCAL_TERMS_STORAGE_KEY)
        : null
    )
    if (saved) {
      setState(saved)
    }
    setHydrated(true)
  }, [])

  React.useEffect(() => {
    if (!hydrated || typeof window === "undefined") return
    window.localStorage.setItem(FISCAL_TERMS_STORAGE_KEY, JSON.stringify(state))
  }, [state, hydrated])

  const termsList = React.useMemo(() => listTermsFromState(state), [state])
  const viewing = React.useMemo(() => getViewingEntry(state), [state])

  const plannedEndIso = React.useMemo(
    () => addMonthsIso(state.active.startedAt, state.active.tenureMonths),
    [state.active.startedAt, state.active.tenureMonths]
  )

  const updateActiveTenure = React.useCallback((months: number) => {
    const m = clampTenureMonths(months)
    setState((s) => ({
      ...s,
      active: { ...s.active, tenureMonths: m },
    }))
  }, [])

  const setViewingTermId = React.useCallback((id: string) => {
    setState((s) => ({ ...s, viewingTermId: id }))
  }, [])

  const closeActiveTermFn = React.useCallback(
    (snapshot?: InventoryCloseSnapshot, nextTenureMonths?: number) => {
      setState((s) => closeActiveTermPure(s, snapshot, nextTenureMonths))
    },
    []
  )

  const value = React.useMemo(
    () => ({
      state,
      termsList,
      viewing,
      plannedEndIso,
      updateActiveTenure,
      setViewingTermId,
      closeActiveTerm: closeActiveTermFn,
    }),
    [
      state,
      termsList,
      viewing,
      plannedEndIso,
      updateActiveTenure,
      setViewingTermId,
      closeActiveTermFn,
    ]
  )

  return (
    <FiscalTermContext.Provider value={value}>
      {children}
    </FiscalTermContext.Provider>
  )
}

export function useFiscalTerms() {
  const ctx = React.useContext(FiscalTermContext)
  if (!ctx) {
    throw new Error("useFiscalTerms must be used within FiscalTermProvider")
  }
  return ctx
}
