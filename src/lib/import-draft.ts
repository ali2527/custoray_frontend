export type ImportDraftRow = {
  id: string
  cells: Record<string, string>
}

export type ImportDraft = {
  step: 1 | 2 | 3
  uploadName: string
  previewKeys: string[]
  previewRows: ImportDraftRow[]
  selectedIds: string[]
  savedAt: number
}

const PREFIX = "custoray-import-draft-v1:"

export function importDraftStorageKey(id: string) {
  return `${PREFIX}${id}`
}

export function loadImportDraft(id: string): ImportDraft | null {
  if (typeof window === "undefined" || !id) return null
  try {
    const raw = window.sessionStorage.getItem(importDraftStorageKey(id))
    if (!raw) return null
    const parsed = JSON.parse(raw) as ImportDraft
    if (!parsed || typeof parsed !== "object") return null
    const step = parsed.step === 2 || parsed.step === 3 ? parsed.step : 1
    return {
      step,
      uploadName: typeof parsed.uploadName === "string" ? parsed.uploadName : "",
      previewKeys: Array.isArray(parsed.previewKeys)
        ? parsed.previewKeys.map(String)
        : [],
      previewRows: Array.isArray(parsed.previewRows)
        ? parsed.previewRows
            .filter((row) => row && typeof row === "object")
            .map((row) => ({
              id: String((row as ImportDraftRow).id ?? ""),
              cells:
                (row as ImportDraftRow).cells &&
                typeof (row as ImportDraftRow).cells === "object"
                  ? (row as ImportDraftRow).cells
                  : {},
            }))
            .filter((row) => row.id)
        : [],
      selectedIds: Array.isArray(parsed.selectedIds)
        ? parsed.selectedIds.map(String)
        : [],
      savedAt: Number(parsed.savedAt) || Date.now(),
    }
  } catch {
    return null
  }
}

export function saveImportDraft(id: string, draft: Omit<ImportDraft, "savedAt">) {
  if (typeof window === "undefined" || !id) return false
  try {
    const payload: ImportDraft = { ...draft, savedAt: Date.now() }
    window.sessionStorage.setItem(
      importDraftStorageKey(id),
      JSON.stringify(payload)
    )
    return true
  } catch {
    return false
  }
}

export function clearImportDraft(id: string) {
  if (typeof window === "undefined" || !id) return
  try {
    window.sessionStorage.removeItem(importDraftStorageKey(id))
  } catch {
    /* ignore */
  }
}

export function hasImportDraft(id: string) {
  return loadImportDraft(id) != null
}
