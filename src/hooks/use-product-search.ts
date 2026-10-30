"use client"

import { useCallback, useEffect, useState } from "react"

import { useDebouncedValue } from "@/hooks/use-debounced-value"
import { searchProducts, type SearchProductRow } from "@/lib/product-search"

export type UseProductSearchOptions = {
  /** Debounce delay for the search query. Default 300ms. */
  debounceMs?: number
  /** Page size sent to the API. Default 50. */
  limit?: number
  /** When false, skips fetching. Default true. */
  enabled?: boolean
}

export type UseProductSearchResult = {
  query: string
  setQuery: (query: string) => void
  debouncedQuery: string
  products: SearchProductRow[]
  total: number
  loading: boolean
  error: string | null
  reset: () => void
}

/**
 * Global debounced product search against `/products?search=…`.
 * Use with remote InfiniteScrollSelect / ProductSearchSelect.
 */
export function useProductSearch(
  options?: UseProductSearchOptions
): UseProductSearchResult {
  const debounceMs = options?.debounceMs ?? 300
  const limit = options?.limit ?? 50
  const enabled = options?.enabled ?? true

  const [query, setQuery] = useState("")
  const debouncedQuery = useDebouncedValue(query, debounceMs)
  const [products, setProducts] = useState<SearchProductRow[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!enabled) return

    let cancelled = false
    setLoading(true)
    setError(null)

    searchProducts(debouncedQuery, { limit })
      .then((result) => {
        if (cancelled) return
        setProducts(result.items)
        setTotal(result.total)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setProducts([])
        setTotal(0)
        setError(err instanceof Error ? err.message : "Could not search products.")
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [debouncedQuery, enabled, limit])

  const reset = useCallback(() => {
    setQuery("")
  }, [])

  return {
    query,
    setQuery,
    debouncedQuery,
    products,
    total,
    loading,
    error,
    reset,
  }
}
