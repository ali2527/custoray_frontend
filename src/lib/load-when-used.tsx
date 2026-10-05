"use client"

import * as React from "react"

/** Starts a provider's network load only after one of its hooks is used. */
export function createLoadGate() {
  const EnableContext = React.createContext<() => void>(() => {})

  function LoadGate({
    children,
  }: {
    children: (active: boolean) => React.ReactNode
  }) {
    const [active, setActive] = React.useState(false)
    const enable = React.useCallback(() => {
      setActive((current) => current || true)
    }, [])
    return (
      <EnableContext.Provider value={enable}>{children(active)}</EnableContext.Provider>
    )
  }

  function useMarkNeeded() {
    const enable = React.useContext(EnableContext)
    React.useLayoutEffect(() => {
      enable()
    }, [enable])
  }

  return { LoadGate, useMarkNeeded }
}
