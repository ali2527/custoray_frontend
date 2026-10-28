import type { SortingState, VisibilityState } from "@tanstack/react-table"

export type DataTableLayoutView = "list" | "grid"

export type StoredTableSettings = {
  columnVisibility?: VisibilityState
  layoutView?: DataTableLayoutView
  sorting?: SortingState
}

const STORAGE_PREFIX = "custoray-table-settings-v1:"

export function tableSettingsStorageKey(id: string) {
  return `${STORAGE_PREFIX}${id}`
}

function parseSorting(value: unknown): SortingState | undefined {
  if (!Array.isArray(value)) return undefined
  const sorting: SortingState = []
  for (const entry of value) {
    if (!entry || typeof entry !== "object") continue
    const id = "id" in entry ? String((entry as { id?: unknown }).id ?? "") : ""
    if (!id) continue
    sorting.push({
      id,
      desc: Boolean((entry as { desc?: unknown }).desc),
    })
  }
  return sorting
}

export function loadTableSettings(id: string): StoredTableSettings {
  if (typeof window === "undefined") return {}
  try {
    const raw = window.localStorage.getItem(tableSettingsStorageKey(id))
    if (!raw) return {}
    const parsed = JSON.parse(raw) as StoredTableSettings
    const layoutView =
      parsed.layoutView === "grid" || parsed.layoutView === "list"
        ? parsed.layoutView
        : undefined
    const columnVisibility =
      parsed.columnVisibility && typeof parsed.columnVisibility === "object"
        ? parsed.columnVisibility
        : undefined
    const sorting = parseSorting(parsed.sorting)
    return { columnVisibility, layoutView, sorting }
  } catch {
    return {}
  }
}

export function saveTableSettings(id: string, next: StoredTableSettings) {
  if (typeof window === "undefined") return
  const current = loadTableSettings(id)
  window.localStorage.setItem(
    tableSettingsStorageKey(id),
    JSON.stringify({
      columnVisibility: next.columnVisibility ?? current.columnVisibility,
      layoutView: next.layoutView ?? current.layoutView,
      sorting: next.sorting ?? current.sorting,
    })
  )
}
