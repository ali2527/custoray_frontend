"use client"

import * as React from "react"
import Link from "next/link"
import { Check, PartyPopper } from "lucide-react"
import { useTranslation } from "react-i18next"

import {
  loadSetupProgress,
  setupCompletedCount,
  SETUP_PROGRESS_EVENT,
  type SetupMilestoneId,
  type SetupProgress,
  type SetupProgressEventDetail,
} from "@/lib/setup-progress"
import { requestWelcomeFlow } from "@/lib/welcome-flow"
import { cn } from "@/lib/utils"

const EMPTY_PROGRESS: SetupProgress = {
  settings: false,
  product: false,
  customer: false,
  invoice: false,
}

const STEP_IDS: SetupMilestoneId[] = ["settings", "product", "customer", "invoice"]

const STEP_HREFS: Record<SetupMilestoneId, string> = {
  settings: "/settings",
  product: "/inventory/products",
  customer: "/customers",
  invoice: "/invoices",
}

const CONFETTI_COLORS = ["#92c720", "#b8e05c", "#6ea30f", "#f4d35e", "#ffffff"]

function burstConfetti(originX: number, originY: number) {
  if (typeof window === "undefined") return
  const canvas = document.createElement("canvas")
  canvas.setAttribute("aria-hidden", "true")
  canvas.style.cssText =
    "position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:9999"
  document.body.appendChild(canvas)
  const ctx = canvas.getContext("2d")
  if (!ctx) {
    canvas.remove()
    return
  }

  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  const width = window.innerWidth
  const height = window.innerHeight
  canvas.width = width * dpr
  canvas.height = height * dpr
  ctx.scale(dpr, dpr)

  const pieces = Array.from({ length: 70 }, () => {
    const angle = Math.random() * Math.PI * 2
    const speed = 3.5 + Math.random() * 7.5
    return {
      x: originX + (Math.random() - 0.5) * 8,
      y: originY + (Math.random() - 0.5) * 8,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 2.4,
      w: 4 + Math.random() * 5,
      h: 6 + Math.random() * 7,
      rot: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 0.4,
      color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)]!,
    }
  })

  const started = performance.now()
  const duration = 1600

  function frame(now: number) {
    if (!ctx) return
    const elapsed = now - started
    ctx.clearRect(0, 0, width, height)
    for (const piece of pieces) {
      piece.vy += 0.28
      piece.vx *= 0.995
      piece.x += piece.vx
      piece.y += piece.vy
      piece.rot += piece.vr
      ctx.save()
      ctx.translate(piece.x, piece.y)
      ctx.rotate(piece.rot)
      ctx.globalAlpha = Math.max(0, 1 - elapsed / duration)
      ctx.fillStyle = piece.color
      ctx.fillRect(-piece.w / 2, -piece.h / 2, piece.w, piece.h)
      ctx.restore()
    }
    if (elapsed < duration) {
      requestAnimationFrame(frame)
      return
    }
    canvas.remove()
  }

  requestAnimationFrame(frame)
}

const CONGRATS_KEY: Record<SetupMilestoneId, string> = {
  settings: "dashboard.setup.congratsSettings",
  product: "dashboard.setup.congratsProduct",
  customer: "dashboard.setup.congratsCustomer",
  invoice: "dashboard.setup.congratsInvoice",
}

/** Temporary preview — turn off after reviewing the animation. */
const PREVIEW_CONFETTI_LOOP = false

export function SetupProgressBar() {
  const { t, i18n } = useTranslation("common")
  const [progress, setProgress] = React.useState<SetupProgress>(EMPTY_PROGRESS)
  const [justDone, setJustDone] = React.useState<SetupMilestoneId | null>(null)
  const [fillingTo, setFillingTo] = React.useState<SetupMilestoneId | null>(null)
  const [celebrate, setCelebrate] = React.useState(false)
  const hydratedRef = React.useRef(false)
  const previousRef = React.useRef<SetupProgress>(EMPTY_PROGRESS)
  const stepRefs = React.useRef<Partial<Record<SetupMilestoneId, HTMLElement | null>>>({})
  const celebrationTimer = React.useRef<number>(0)

  function fireFromStep(id: SetupMilestoneId) {
    const el = stepRefs.current[id]
    const rect = el?.getBoundingClientRect()
    const x = rect ? rect.left + rect.width / 2 : window.innerWidth * 0.72
    const y = rect ? rect.top + rect.height / 2 : 56
    requestAnimationFrame(() => burstConfetti(x, y))
  }

  function playCelebration(id: SetupMilestoneId) {
    window.clearTimeout(celebrationTimer.current)
    setFillingTo(id)
    setJustDone(null)
    setCelebrate(false)
    const delay = STEP_IDS.indexOf(id) <= 0 ? 80 : 620
    celebrationTimer.current = window.setTimeout(() => {
      setJustDone(id)
      setCelebrate(true)
      fireFromStep(id)
    }, delay)
  }

  React.useEffect(() => {
    function applyNext(next: SetupProgress, newlyCompleted?: SetupMilestoneId) {
      const previous = previousRef.current
      previousRef.current = next
      setProgress(next)

      if (!hydratedRef.current) {
        hydratedRef.current = true
        return
      }

      const id =
        newlyCompleted ??
        STEP_IDS.find((stepId) => next[stepId] && !previous[stepId])
      if (!id) return

      playCelebration(id)
    }

    function refresh(event?: Event) {
      const detail =
        event instanceof CustomEvent
          ? (event.detail as SetupProgressEventDetail | undefined)
          : undefined
      applyNext(
        loadSetupProgress(),
        detail?.newlyCompleted ? detail.id : undefined
      )
    }

    refresh()
    window.addEventListener(SETUP_PROGRESS_EVENT, refresh)
    window.addEventListener("storage", refresh)
    return () => {
      window.removeEventListener(SETUP_PROGRESS_EVENT, refresh)
      window.removeEventListener("storage", refresh)
    }
  }, [])

  React.useEffect(() => {
    if (!PREVIEW_CONFETTI_LOOP) return
    let stepIndex = 0
    function play() {
      const id = STEP_IDS[stepIndex % STEP_IDS.length]!
      stepIndex += 1
      playCelebration(id)
    }
    play()
    const interval = window.setInterval(play, 4000)
    return () => {
      window.clearInterval(interval)
      window.clearTimeout(celebrationTimer.current)
    }
  }, [])

  React.useEffect(() => {
    if (!celebrate) return
    const timeout = window.setTimeout(() => {
      setCelebrate(false)
      setJustDone(null)
      setFillingTo(null)
    }, 2800)
    return () => window.clearTimeout(timeout)
  }, [celebrate, justDone])

  const completed = setupCompletedCount(progress)
  const total = 4
  if (completed >= total && !celebrate && !PREVIEW_CONFETTI_LOOP) return null

  const steps: { id: SetupMilestoneId; label: string }[] = [
    { id: "settings", label: t("dashboard.setup.settings") },
    { id: "product", label: t("dashboard.setup.product") },
    { id: "customer", label: t("dashboard.setup.customer") },
    { id: "invoice", label: t("dashboard.setup.invoice") },
  ]
  const headline = celebrate
    ? completed >= total
      ? t("dashboard.setup.congratsAll")
      : t(CONGRATS_KEY[justDone ?? "settings"])
    : t("dashboard.setup.headline", {
        defaultValue: "Make progress and grow your business!",
      })

  return (
    <div
      key={i18n.language}
      className={cn(
        "bg-primary/15 flex h-12 shrink-0 items-center justify-between gap-6 overflow-x-auto px-4 transition-colors duration-500 lg:px-6",
        celebrate && "bg-primary/25"
      )}
    >
      <div className="flex min-w-0 shrink-0 items-center gap-4">
        <div className="flex items-center gap-2">
          <PartyPopper
            className={cn(
              "size-4 shrink-0 text-primary",
              celebrate && "setup-step-pop"
            )}
          />
          <p
            className={cn(
              "text-[11px] font-medium tracking-tight whitespace-nowrap text-black [font-family:var(--font-poppins),ui-sans-serif,system-ui,sans-serif] transition-colors duration-300",
              celebrate && "text-primary"
            )}
          >
            {headline}
          </p>
        </div>
      </div>

      <ol className="ms-auto flex shrink-0 items-center">
        {steps.map((step, index) => {
          const done = progress[step.id]
          const popped = justDone === step.id
          const className =
            "flex shrink-0 items-center gap-1.5 text-foreground/70 hover:text-foreground/90"
          const content = (
            <>
              <span
                ref={(node) => {
                  stepRefs.current[step.id] = node
                }}
                className={cn(
                  "flex size-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold transition-colors duration-300",
                  done
                    ? "bg-primary text-primary-foreground"
                    : "bg-white text-foreground/70 ring-1 ring-primary/25 dark:bg-zinc-950",
                  popped && "setup-step-pop"
                )}
              >
                {done ? <Check className="size-3.5" strokeWidth={3} /> : index + 1}
              </span>
              <span className="text-[12px] font-medium whitespace-nowrap">{step.label}</span>
            </>
          )
          return (
            <li key={step.id} className="flex shrink-0 items-center">
              {index > 0 ? (
                <span className="relative mx-2.5 h-1 w-8 shrink-0 overflow-hidden rounded-full bg-zinc-300/80 dark:bg-zinc-600">
                  <span
                    key={fillingTo === step.id ? `fill-${step.id}` : "rest"}
                    className={cn(
                      "absolute inset-0 origin-left rounded-full bg-primary rtl:origin-right",
                      fillingTo === step.id
                        ? "scale-x-0 setup-connector-run"
                        : progress[step.id]
                          ? "scale-x-100"
                          : "scale-x-0"
                    )}
                  />
                </span>
              ) : null}
              {step.id === "settings" && !done ? (
                <button type="button" className={className} onClick={() => requestWelcomeFlow()}>
                  {content}
                </button>
              ) : (
                <Link href={STEP_HREFS[step.id]} className={className}>
                  {content}
                </Link>
              )}
            </li>
          )
        })}
      </ol>
    </div>
  )
}
