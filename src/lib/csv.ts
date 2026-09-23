export function escapeCsvCell(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

export function rowsToCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return ""
  const keys = Object.keys(rows[0])
  const lines = [
    keys.map((k) => escapeCsvCell(k)).join(","),
    ...rows.map((row) =>
      keys.map((k) => escapeCsvCell(String(row[k] ?? ""))).join(",")
    ),
  ]
  return lines.join("\r\n")
}

export function pickObjectKeys(
  row: Record<string, unknown>,
  columns: string[]
): Record<string, unknown> {
  const next: Record<string, unknown> = {}
  for (const column of columns) {
    next[column] = row[column] ?? ""
  }
  return next
}

export function projectCsvRecord(
  cells: Record<string, string>,
  columns: string[]
): Record<string, string> {
  const lookup = new Map<string, string>()
  for (const [key, value] of Object.entries(cells)) {
    lookup.set(key.trim().toLowerCase(), value)
  }
  const next: Record<string, string> = {}
  for (const column of columns) {
    next[column] = lookup.get(column.toLowerCase()) ?? ""
  }
  return next
}

export function parseCsvLine(line: string): string[] {
  const out: string[] = []
  let cur = ""
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const c = line[i]
    if (c === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (c === "," && !inQuotes) {
      out.push(cur)
      cur = ""
    } else {
      cur += c
    }
  }
  out.push(cur)
  return out
}

export function splitCsvLines(text: string): string[] {
  const raw = text.trim()
  if (!raw) return []
  return raw.split(/\r?\n/).filter((l) => l.length > 0)
}

export function csvRecordFromLine(
  line: string,
  headers: string[]
): Record<string, string> {
  const vals = parseCsvLine(line)
  const row: Record<string, string> = {}
  headers.forEach((h, j) => {
    row[h] = vals[j]?.trim() ?? ""
  })
  return row
}

export function parseCsv(text: string): Record<string, string>[] {
  const lines = splitCsvLines(text)
  if (lines.length < 2) return []
  const headers = parseCsvLine(lines[0]).map((h) => h.trim())
  const rows: Record<string, string>[] = []
  for (let i = 1; i < lines.length; i++) {
    rows.push(csvRecordFromLine(lines[i], headers))
  }
  return rows
}

export function buildSampleCsv(
  keys: string[],
  exampleRow?: Record<string, unknown>
): string {
  if (keys.length === 0) return ""
  const headerLine = keys.map(escapeCsvCell).join(",")
  const example = keys.map((k) => {
    const v = exampleRow?.[k]
    if (v === undefined || v === null) return ""
    return String(v)
  })
  const exampleLine = example.map(escapeCsvCell).join(",")
  return `${headerLine}\r\n${exampleLine}`
}

export function rowsToJson(rows: Record<string, unknown>[]): string {
  return JSON.stringify(rows, null, 2)
}

export function rowsToTsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return ""
  const keys = Object.keys(rows[0])
  const esc = (s: string) =>
    String(s).replace(/\t/g, " ").replace(/\r?\n/g, " ")
  const header = keys.map(esc).join("\t")
  const body = rows.map((row) =>
    keys.map((k) => esc(String(row[k] ?? ""))).join("\t")
  )
  return [header, ...body].join("\r\n")
}

export function exportFilenameBase(filename: string): string {
  const t = filename.trim()
  if (!t) return "export"
  return t.replace(/\.[^/.]+$/, "") || "export"
}

export function downloadTextFile(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime })
  downloadBlob(filename, blob)
}

export function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
