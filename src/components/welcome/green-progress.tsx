"use client"

import { Check } from "lucide-react"

import { cn } from "@/lib/utils"

export function GreenTrack({
  completed,
  total,
  label,
  percentLabel,
}: {
  completed: number
  total: number
  label?: string
  percentLabel?: string
}) {
  const pct = total <= 0 ? 0 : Math.min(100, Math.round((completed / total) * 100))
  return (
    <div className="space-y-2">
      {label || percentLabel ? (
        <div className="text-muted-foreground flex items-center justify-between text-xs">
          <span>{label}</span>
          {percentLabel ? <span className="tabular-nums">{percentLabel}</span> : null}
        </div>
      ) : null}
      <div className="bg-muted h-2 overflow-hidden rounded-full">
        <div
          className="bg-primary h-full rounded-full transition-[width] duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

export type MilestoneStep = {
  id: string
  label: string
  hint?: string
  done: boolean
}

export function MilestoneStepper({ steps }: { steps: MilestoneStep[] }) {
  return (
    <ol className="flex items-start">
      {steps.map((step, index) => {
        const prevDone = index === 0 ? false : steps[index - 1]?.done
        const isLast = index === steps.length - 1
        return (
          <li key={step.id} className="flex min-w-0 flex-1 flex-col items-center">
            <div className="flex w-full items-center">
              <span
                className={cn(
                  "h-0.5 flex-1 rounded-full",
                  index === 0 ? "bg-transparent" : prevDone ? "bg-primary" : "bg-muted"
                )}
              />
              <span
                className={cn(
                  "flex size-8 shrink-0 items-center justify-center rounded-full border-2 text-xs font-semibold",
                  step.done
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background text-muted-foreground"
                )}
              >
                {step.done ? <Check className="size-3.5" strokeWidth={3} /> : index + 1}
              </span>
              <span
                className={cn(
                  "h-0.5 flex-1 rounded-full",
                  isLast ? "bg-transparent" : step.done ? "bg-primary" : "bg-muted"
                )}
              />
            </div>
            <p
              className={cn(
                "mt-2 px-1 text-center text-[12px] font-medium leading-tight",
                step.done ? "text-foreground" : "text-muted-foreground"
              )}
            >
              {step.label}
            </p>
            {step.hint ? (
              <p
                className={cn(
                  "mt-0.5 text-center text-[11px]",
                  step.done ? "text-primary" : "text-muted-foreground"
                )}
              >
                {step.hint}
              </p>
            ) : null}
          </li>
        )
      })}
    </ol>
  )
}
