export const FISCAL_TERMS_STORAGE_KEY = "custoray-fiscal-terms-v1"

export type InventoryCloseSnapshot = {
  totalLineItems: number
  totalStockUnits: number
  capturedAt: string
}

export type ClosedFiscalTerm = {
  id: string
  sequence: number
  startedAt: string
  closedAt: string
  tenureMonths: number
  label: string
  snapshot?: InventoryCloseSnapshot
}

export type ActiveFiscalTerm = {
  id: string
  sequence: number
  startedAt: string
  tenureMonths: number
}

export type FiscalTermsPersisted = {
  active: ActiveFiscalTerm
  closed: ClosedFiscalTerm[]
  viewingTermId: string
}

export type TermListEntry = {
  id: string
  sequence: number
  isActive: boolean
  startedAt: string
  tenureMonths: number
  closedAt?: string
  label: string
}

function newId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return `term-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export function createInitialPersisted(): FiscalTermsPersisted {
  const now = new Date().toISOString()
  const active: ActiveFiscalTerm = {
    id: newId(),
    sequence: 1,
    startedAt: now,
    tenureMonths: 12,
  }
  return {
    active,
    closed: [],
    viewingTermId: active.id,
  }
}

export function addMonthsIso(isoStart: string, months: number): string {
  const d = new Date(isoStart)
  const day = d.getUTCDate()
  d.setUTCMonth(d.getUTCMonth() + months)
  if (d.getUTCDate() < day) {
    d.setUTCDate(0)
  }
  return d.toISOString()
}

export function formatShortDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(new Date(iso))
  } catch {
    return iso
  }
}

export function buildClosedLabel(
  sequence: number,
  startedAt: string,
  closedAt: string
): string {
  return `Term ${sequence} · ${formatShortDate(startedAt)} – ${formatShortDate(closedAt)}`
}

export function buildActiveLabel(sequence: number): string {
  return `Term ${sequence}`
}

export function clampTenureMonths(n: number): number {
  if (!Number.isFinite(n)) return 12
  return Math.min(120, Math.max(1, Math.round(n)))
}

export function listTermsFromState(state: FiscalTermsPersisted): TermListEntry[] {
  const activeEntry: TermListEntry = {
    id: state.active.id,
    sequence: state.active.sequence,
    isActive: true,
    startedAt: state.active.startedAt,
    tenureMonths: state.active.tenureMonths,
    label: buildActiveLabel(state.active.sequence),
  }
  const closedEntries: TermListEntry[] = [...state.closed]
    .reverse()
    .map((c) => ({
      id: c.id,
      sequence: c.sequence,
      isActive: false,
      startedAt: c.startedAt,
      tenureMonths: c.tenureMonths,
      closedAt: c.closedAt,
      label: c.label,
    }))
  return [activeEntry, ...closedEntries]
}

export function getViewingEntry(
  state: FiscalTermsPersisted
): TermListEntry | undefined {
  const list = listTermsFromState(state)
  const match = list.find((t) => t.id === state.viewingTermId)
  if (match) return match
  return list.find((t) => t.isActive)
}

export function parsePersisted(raw: string | null): FiscalTermsPersisted | null {
  if (!raw) return null
  try {
    const v = JSON.parse(raw) as FiscalTermsPersisted
    if (!v?.active?.id || !v.active.startedAt || typeof v.active.tenureMonths !== "number") {
      return null
    }
    if (!Array.isArray(v.closed)) return null
    return {
      active: v.active,
      closed: v.closed,
      viewingTermId: v.viewingTermId ?? v.active.id,
    }
  } catch {
    return null
  }
}

export function closeActiveTerm(
  state: FiscalTermsPersisted,
  snapshot?: InventoryCloseSnapshot,
  nextTenureMonths?: number
): FiscalTermsPersisted {
  const closedAt = new Date().toISOString()
  const tenure = clampTenureMonths(
    nextTenureMonths ?? state.active.tenureMonths
  )
  const closed: ClosedFiscalTerm = {
    id: state.active.id,
    sequence: state.active.sequence,
    startedAt: state.active.startedAt,
    closedAt,
    tenureMonths: state.active.tenureMonths,
    label: buildClosedLabel(state.active.sequence, state.active.startedAt, closedAt),
    snapshot,
  }
  const nextActive: ActiveFiscalTerm = {
    id: newId(),
    sequence: state.active.sequence + 1,
    startedAt: closedAt,
    tenureMonths: tenure,
  }
  return {
    active: nextActive,
    closed: [...state.closed, closed],
    viewingTermId: nextActive.id,
  }
}
