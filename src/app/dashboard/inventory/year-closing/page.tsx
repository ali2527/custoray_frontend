"use client"

import * as React from "react"
import Link from "next/link"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useFiscalTerms } from "@/context/fiscal-term-context"
import {
  addMonthsIso,
  formatShortDate,
  clampTenureMonths,
} from "@/lib/fiscal-terms"
import inventoryRows from "../data.json"

const TENURE_PRESETS = [3, 6, 12, 18, 24] as const

type Row = { stock?: number }

function buildSnapshotFromInventory() {
  const rows = inventoryRows as Row[]
  const totalLineItems = rows.length
  const totalStockUnits = rows.reduce((s, r) => s + (Number(r.stock) || 0), 0)
  return {
    totalLineItems,
    totalStockUnits,
    capturedAt: new Date().toISOString(),
  }
}

export default function YearClosingPage() {
  const {
    state,
    plannedEndIso,
    updateActiveTenure,
    closeActiveTerm,
  } = useFiscalTerms()

  const [tenureSelect, setTenureSelect] = React.useState<string>("12")
  const [customTenure, setCustomTenure] = React.useState("12")
  const [nextTenureSelect, setNextTenureSelect] = React.useState<string>("12")
  const [nextCustomTenure, setNextCustomTenure] = React.useState("12")
  const [confirmOpen, setConfirmOpen] = React.useState(false)

  React.useEffect(() => {
    const m = state.active.tenureMonths
    const preset = TENURE_PRESETS.includes(m as (typeof TENURE_PRESETS)[number])
      ? String(m)
      : "custom"
    setTenureSelect(preset)
    setCustomTenure(String(m))
  }, [state.active.id, state.active.tenureMonths])

  React.useEffect(() => {
    const m = state.active.tenureMonths
    const preset = TENURE_PRESETS.includes(m as (typeof TENURE_PRESETS)[number])
      ? String(m)
      : "custom"
    setNextTenureSelect(preset)
    setNextCustomTenure(String(m))
  }, [state.active.id])

  const applyCurrentTenure = () => {
    const months =
      tenureSelect === "custom"
        ? clampTenureMonths(Number(customTenure))
        : Number(tenureSelect)
    updateActiveTenure(months)
    toast.success(`Term length set to ${months} month${months === 1 ? "" : "s"}`)
  }

  const nextTenureMonths = () =>
    nextTenureSelect === "custom"
      ? clampTenureMonths(Number(nextCustomTenure))
      : Number(nextTenureSelect)

  const handleConfirmClose = () => {
    const snapshot = buildSnapshotFromInventory()
    closeActiveTerm(snapshot, nextTenureMonths())
    setConfirmOpen(false)
    toast.success("Term closed. A new session has started.")
  }

  const closedReversed = [...state.closed].reverse()

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">Year closing</h2>
        <p className="text-muted-foreground mt-1 max-w-2xl text-sm">
          Close the current fiscal term when you are ready (for example at year-end).
          You choose how long each term runs; after closing, a new term begins immediately
          with the tenure you set for the next session. Use the header dropdown on inventory
          pages to switch between the active term and closed terms.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Current term</CardTitle>
            <CardDescription>
              Active session — you can change its planned length anytime before closing.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="text-sm">
              <p>
                <span className="text-muted-foreground">Started: </span>
                {formatShortDate(state.active.startedAt)}
              </p>
              <p>
                <span className="text-muted-foreground">Planned end: </span>
                {formatShortDate(plannedEndIso)}
              </p>
              <p>
                <span className="text-muted-foreground">Tenure: </span>
                {state.active.tenureMonths} month
                {state.active.tenureMonths === 1 ? "" : "s"}
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="tenure-current">Term length (months)</Label>
              <div className="flex flex-wrap items-end gap-2">
                <Select value={tenureSelect} onValueChange={setTenureSelect}>
                  <SelectTrigger id="tenure-current" className="w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TENURE_PRESETS.map((m) => (
                      <SelectItem key={m} value={String(m)}>
                        {m} months
                      </SelectItem>
                    ))}
                    <SelectItem value="custom">Custom…</SelectItem>
                  </SelectContent>
                </Select>
                {tenureSelect === "custom" && (
                  <Input
                    type="number"
                    min={1}
                    max={120}
                    className="w-24"
                    value={customTenure}
                    onChange={(e) => setCustomTenure(e.target.value)}
                    aria-label="Custom tenure in months"
                  />
                )}
                <Button type="button" variant="secondary" onClick={applyCurrentTenure}>
                  Apply
                </Button>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col items-stretch gap-3 border-t sm:flex-row sm:justify-between">
            <p className="text-muted-foreground text-xs">
              Closing finalizes this term and cannot be undone from the UI.
            </p>
            <Button type="button" variant="destructive" onClick={() => setConfirmOpen(true)}>
              Close term &amp; start new session
            </Button>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Next term (after closing)</CardTitle>
            <CardDescription>
              The new session starts as soon as you close the current one.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Label htmlFor="tenure-next">Tenure for the new term</Label>
            <div className="flex flex-wrap items-end gap-2">
              <Select value={nextTenureSelect} onValueChange={setNextTenureSelect}>
                <SelectTrigger id="tenure-next" className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TENURE_PRESETS.map((m) => (
                    <SelectItem key={m} value={String(m)}>
                      {m} months
                    </SelectItem>
                  ))}
                  <SelectItem value="custom">Custom…</SelectItem>
                </SelectContent>
              </Select>
              {nextTenureSelect === "custom" && (
                <Input
                  type="number"
                  min={1}
                  max={120}
                  className="w-24"
                  value={nextCustomTenure}
                  onChange={(e) => setNextCustomTenure(e.target.value)}
                  aria-label="Custom next term months"
                />
              )}
            </div>
            <p className="text-muted-foreground text-xs pt-2">
              Example: if you pick 12 months, the next term&apos;s planned end is{" "}
              {formatShortDate(
                addMonthsIso(new Date().toISOString(), nextTenureMonths())
              )}{" "}
              from whenever you close (dates are based on close time).
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Closed terms</CardTitle>
          <CardDescription>
            Historical terms and inventory snapshot at close (if captured).
          </CardDescription>
        </CardHeader>
        <CardContent>
          {closedReversed.length === 0 ? (
            <p className="text-muted-foreground text-sm">No closed terms yet.</p>
          ) : (
            <ul className="divide-border divide-y rounded-md border">
              {closedReversed.map((c) => (
                <li key={c.id} className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-medium">{c.label}</p>
                    <p className="text-muted-foreground text-xs">
                      Tenure setting: {c.tenureMonths} mo · Closed{" "}
                      {formatShortDate(c.closedAt)}
                    </p>
                  </div>
                  {c.snapshot ? (
                    <p className="text-muted-foreground text-sm">
                      Snapshot: {c.snapshot.totalLineItems} SKUs,{" "}
                      {c.snapshot.totalStockUnits} total units
                    </p>
                  ) : (
                    <p className="text-muted-foreground text-sm">No snapshot</p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
        <CardFooter>
          <Button variant="outline" asChild>
            <Link href="/dashboard/inventory">Back to inventory</Link>
          </Button>
        </CardFooter>
      </Card>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Close this term?</DialogTitle>
            <DialogDescription>
              The current term will be archived with today&apos;s date. A new term will
              start immediately with {nextTenureMonths()} month
              {nextTenureMonths() === 1 ? "" : "s"} planned tenure. An inventory summary
              from the product list will be stored with the closed term.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setConfirmOpen(false)}>
              Cancel
            </Button>
            <Button type="button" variant="destructive" onClick={handleConfirmClose}>
              Confirm close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
