"use client"

import * as React from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { useFiscalTerms } from "@/context/fiscal-term-context"
import {
  addMonthsIso,
  formatShortDate,
} from "@/lib/fiscal-terms"

export default function TermDetailPage() {
  const params = useParams()
  const raw = params.termId
  const termId = typeof raw === "string" ? decodeURIComponent(raw) : ""
  const { state } = useFiscalTerms()

  const detail = React.useMemo(() => {
    if (!termId) return null
    if (state.active.id === termId) {
      const plannedEnd = addMonthsIso(
        state.active.startedAt,
        state.active.tenureMonths
      )
      return {
        kind: "active" as const,
        id: state.active.id,
        sequence: state.active.sequence,
        label: `Term ${state.active.sequence}`,
        startedAt: state.active.startedAt,
        tenureMonths: state.active.tenureMonths,
        plannedEnd,
      }
    }
    const closed = state.closed.find((c) => c.id === termId)
    if (closed) {
      return {
        kind: "closed" as const,
        id: closed.id,
        sequence: closed.sequence,
        label: closed.label,
        startedAt: closed.startedAt,
        closedAt: closed.closedAt,
        tenureMonths: closed.tenureMonths,
        snapshot: closed.snapshot,
      }
    }
    return null
  }, [termId, state.active, state.closed])

  if (!termId) {
    return null
  }

  if (!detail) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Term not found</CardTitle>
          <CardDescription>
            This term may have been removed or the link is invalid.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" asChild>
            <Link href="/dashboard/inventory">Back to inventory</Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold tracking-tight">Term details</h2>
          <p className="text-muted-foreground mt-0.5 text-xs">{detail.label}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/dashboard/inventory">Inventory</Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href="/dashboard/inventory/year-closing">Year closing</Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">
            {detail.kind === "active" ? "Active term" : "Closed term"}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-muted-foreground space-y-2 text-xs">
          <p>
            <span className="text-foreground font-medium">Sequence: </span>
            {detail.sequence}
          </p>
          <p>
            <span className="text-foreground font-medium">Started: </span>
            {formatShortDate(detail.startedAt)}
          </p>
          <p>
            <span className="text-foreground font-medium">Tenure: </span>
            {detail.tenureMonths} month{detail.tenureMonths === 1 ? "" : "s"}
          </p>
          {detail.kind === "active" ? (
            <p>
              <span className="text-foreground font-medium">Planned end: </span>
              {formatShortDate(detail.plannedEnd)}
            </p>
          ) : (
            <>
              <p>
                <span className="text-foreground font-medium">Closed: </span>
                {formatShortDate(detail.closedAt)}
              </p>
              {detail.snapshot ? (
                <p>
                  <span className="text-foreground font-medium">
                    Inventory at close:{" "}
                  </span>
                  {detail.snapshot.totalLineItems} line items,{" "}
                  {detail.snapshot.totalStockUnits} stock units (
                  {formatShortDate(detail.snapshot.capturedAt)})
                </p>
              ) : null}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
