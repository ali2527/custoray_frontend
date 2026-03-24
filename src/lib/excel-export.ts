import * as XLSX from "xlsx"

import { downloadBlob } from "@/lib/csv"

/** Download rows as Excel 97–2004 (.xls / BIFF8) */
export function downloadRowsAsXls(
  rows: Record<string, unknown>[],
  filename: string
) {
  if (rows.length === 0) return
  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.json_to_sheet(rows)
  XLSX.utils.book_append_sheet(wb, ws, "Data")
  const out = XLSX.write(wb, { type: "array", bookType: "xls" })
  const blob = new Blob([out], { type: "application/vnd.ms-excel" })
  downloadBlob(filename, blob)
}
