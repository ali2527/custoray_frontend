/** True when a catalog/party row should not be duplicated. */
export function isInactiveRow(row: {
  status?: string | null
  lifecycle?: string | null
}) {
  const value = String(row.lifecycle ?? row.status ?? "")
    .trim()
    .toLowerCase()
  return value === "inactive" || value === "archived"
}
