import { ApiClientError } from "@/lib/api/client"
import type { ApiCatalogItem } from "@/lib/api/business"
import { matchCatalogOption } from "@/lib/inventory-product-rows"

export type CatalogStatus = "active" | "inactive" | "archived"

export type CatalogRow = {
  id: string
  srNo: number
  name: string
  description: string
  products: number
  status: CatalogStatus
}

export const CATALOG_STATUS_OPTIONS = ["active", "inactive"] as const
export const BRAND_STATUS_OPTIONS = ["active", "inactive", "archived"] as const
export const catalogTabValues = ["all", "active", "inactive"] as const
export const brandTabValues = ["all", "active", "inactive", "archived"] as const

export function catalogTabFilter(row: CatalogRow, tab: string) {
  if (tab === "all") return true
  return row.status === tab
}

export function filterCatalogRows(
  rows: CatalogRow[],
  tab: string,
  search = ""
) {
  const query = search.trim().toLowerCase()
  return rows.filter((row) => {
    if (!catalogTabFilter(row, tab)) return false
    if (!query) return true
    return [row.name, row.description, row.status].some((value) =>
      String(value).toLowerCase().includes(query)
    )
  })
}

export const CATALOG_IMPORT_COLUMNS = ["name", "description", "status"] as const

export const BRAND_IMPORT_SAMPLE_ROW = {
  name: "Acme",
  description: "Premium electronics brand",
  status: "active",
}

export const CATEGORY_IMPORT_SAMPLE_ROW = {
  name: "Electronics",
  description: "Devices and electronic goods",
  status: "active",
}

export const VARIANT_IMPORT_SAMPLE_ROW = {
  name: "Genuine",
  description: "Original branded product",
  status: "active",
}

export function parseCatalogStatus(
  raw: string | undefined,
  options: readonly string[] = CATALOG_STATUS_OPTIONS
): CatalogStatus | "" {
  const matched = matchCatalogOption(raw, [...options]).value.toLowerCase()
  if (matched === "inactive" || matched === "archived" || matched === "active") {
    return matched
  }
  return ""
}

export function mapApiCatalogToRow(
  item: ApiCatalogItem,
  index: number
): CatalogRow {
  const status = parseCatalogStatus(item.status, BRAND_STATUS_OPTIONS) || "active"
  return {
    id: item.id,
    srNo: index + 1,
    name: item.name,
    description: item.description ?? "",
    products: Number(item.products) || 0,
    status,
  }
}

export function mapImportedCatalogWrite(
  row: Record<string, string>,
  statusOptions: readonly string[] = CATALOG_STATUS_OPTIONS
): { name: string; description: string; status: CatalogStatus } | null {
  const name = (row.name ?? "").trim()
  if (!name) return null
  const description = (row.description ?? "").trim()
  const parsedStatus = parseCatalogStatus(row.status, statusOptions)
  if ((row.status ?? "").trim() && !parsedStatus) return null
  return {
    name,
    description,
    status: parsedStatus || "active",
  }
}

export function catalogErrorMessage(error: unknown, fallback: string) {
  if (error instanceof ApiClientError) return error.message
  if (error instanceof Error) return error.message
  return fallback
}
