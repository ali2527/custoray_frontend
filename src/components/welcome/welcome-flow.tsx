"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { Button as AntButton, ConfigProvider, Tour, type TourProps } from "antd"
import { BadgeCheck } from "lucide-react"
import { useTranslation } from "react-i18next"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { WelcomeSetupBody, WELCOME_SETUP_STEPS } from "@/components/welcome/welcome-setup"
import { useSidebar } from "@/components/ui/sidebar"
import { useAuth } from "@/context/auth-context"
import { TRIAL_DAYS } from "@/lib/plans"
import { formatTrialEndDate } from "@/lib/subscription-access"
import {
  completeWelcomeFlow,
  isWelcomeFlowCompleted,
  isWelcomeFlowPending,
  ONBOARDING_TOUR_STEPS,
  pathMatches,
  queueWelcomeFlow,
  toAppPath,
  tourTarget,
  waitForTourTarget,
} from "@/lib/welcome-flow"

type Phase = "idle" | "setup" | "tour"

export function WelcomeFlow() {
  const { t, i18n } = useTranslation("common")
  const { access, hydrated, isAuthenticated, user } = useAuth()
  const { setOpen, setOpenMobile, isMobile } = useSidebar()
  const pathname = usePathname()
  const router = useRouter()
  const [phase, setPhase] = useState<Phase>("idle")
  const [setupStep, setSetupStep] = useState(0)
  const [current, setCurrent] = useState(0)
  const [spotlit, setSpotlit] = useState(false)
  const navigatingRef = useRef(false)

  const isOnTrial = access?.status === "TRIAL"
  const daysLeft = access?.trialEndsAt
    ? Math.max(
        0,
        Math.ceil((new Date(access.trialEndsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      )
    : TRIAL_DAYS
  const firstName = user?.name?.trim().split(/\s+/)[0]
  const isRtl = i18n.language === "ar" || i18n.language === "ur"
  const lastIndex = ONBOARDING_TOUR_STEPS.length - 1
  const planName = access?.planName ?? "Starter"
  const trialEndLabel = isOnTrial && access?.trialEndsAt
    ? formatTrialEndDate(access.trialEndsAt)
    : null
  const step = ONBOARDING_TOUR_STEPS[current]

  const goTo = useCallback((index: number) => {
    navigatingRef.current = true
    setSpotlit(false)
    setCurrent(index)
  }, [])

  useEffect(() => {
    if (!hydrated || !isAuthenticated || isWelcomeFlowCompleted()) return
    if (phase !== "idle") return
    if (typeof window !== "undefined") {
      const fromUrl = new URLSearchParams(window.location.search).get("welcome") === "1"
      if (fromUrl) queueWelcomeFlow()
    }
    if (isWelcomeFlowPending() || isOnTrial) {
      setPhase("setup")
      setSetupStep(0)
    }
  }, [hydrated, isAuthenticated, access?.status, phase, isOnTrial])

  useEffect(() => {
    if (phase !== "setup" && phase !== "tour") return
    for (const next of ONBOARDING_TOUR_STEPS) {
      router.prefetch(toAppPath(next.path))
    }
  }, [phase, router])

  useEffect(() => {
    if (phase !== "tour" || !step) return

    navigatingRef.current = true
    setSpotlit(false)
    setOpen(true)
    if (isMobile) setOpenMobile(true)

    if (!pathMatches(pathname, step.path)) {
      router.push(toAppPath(step.path))
      return
    }

    let cancelled = false
    const abort = new AbortController()
    void waitForTourTarget(step.target, 20000, abort.signal).then((el) => {
      if (cancelled) return
      if (el instanceof HTMLElement && el.isConnected) {
        el.scrollIntoView({ block: "center", inline: "nearest", behavior: "smooth" })
      }
      window.setTimeout(() => {
        if (cancelled) return
        navigatingRef.current = false
        setSpotlit(true)
      }, 420)
    })

    return () => {
      cancelled = true
      abort.abort()
    }
  }, [phase, current, pathname, router, setOpen, setOpenMobile, isMobile, step])

  const handleNext = useCallback(() => {
    if (current >= lastIndex) {
      navigatingRef.current = true
      completeWelcomeFlow()
      setSpotlit(false)
      setPhase("idle")
      setCurrent(0)
      return
    }
    goTo(current + 1)
  }, [current, lastIndex, goTo])

  const tourSteps = useMemo<TourProps["steps"]>(() => {
    if (!step) return []
    const side = isRtl ? "left" : "right"
    return [
      {
        title: t(`welcome.steps.${step.key}.title`),
        description: (
          <span>
            {t(`welcome.steps.${step.key}.body`)}
            <span className="text-muted-foreground mt-2 block text-[11px]">
              {t("welcome.progress", {
                current: current + 1,
                total: ONBOARDING_TOUR_STEPS.length,
              })}
            </span>
          </span>
        ),
        target: tourTarget(step.target),
        placement:
          step.placement === "right" || step.placement === "left" ? side : step.placement,
      },
    ]
  }, [step, isRtl, t, current])

  function finishTour() {
    navigatingRef.current = true
    completeWelcomeFlow()
    setSpotlit(false)
    setPhase("idle")
    setCurrent(0)
    setSetupStep(0)
  }

  function startTour() {
    navigatingRef.current = true
    setSpotlit(false)
    setCurrent(0)
    setPhase("tour")
    for (const next of ONBOARDING_TOUR_STEPS) {
      router.prefetch(toAppPath(next.path))
    }
    if (!pathMatches(pathname, "/home")) {
      router.push(toAppPath("/home"))
    }
  }

  function handleSetupContinue() {
    if (setupStep < WELCOME_SETUP_STEPS - 1) {
      setSetupStep((prev) => prev + 1)
      return
    }
    startTour()
  }

  function handleSetupSkip() {
    if (setupStep < WELCOME_SETUP_STEPS - 1) {
      setSetupStep(WELCOME_SETUP_STEPS - 1)
      return
    }
    finishTour()
    if (!pathMatches(pathname, "/home")) {
      router.push(toAppPath("/home"))
    }
  }

  const setupTitle =
    setupStep === 1
      ? t("welcome.guide.termTitle")
      : setupStep === 2
        ? t("welcome.guide.settingsTitle")
        : setupStep === 3
          ? firstName
            ? t("welcome.guide.readyTitleName", { name: firstName })
            : t("welcome.guide.readyTitle")
          : firstName
            ? t("welcome.congratulationsName", { name: firstName })
            : t("welcome.congratulations")

  const setupDescription =
    setupStep === 3
      ? t("welcome.guide.readyBody")
      : setupStep === 0
        ? t("welcome.workspaceReady")
        : null

  return (
    <>
      <Dialog open={phase === "setup"}>
        <DialogContent
          showCloseButton={false}
          overlayClassName="bg-zinc-950/45"
          className="max-h-[90vh] overflow-y-auto overflow-x-hidden rounded-2xl p-0 sm:max-w-[38rem] gap-0 font-sans [font-family:var(--font-poppins),ui-sans-serif,system-ui,sans-serif] [&_*]:[font-family:inherit]"
          onPointerDownOutside={(event) => event.preventDefault()}
          onEscapeKeyDown={(event) => event.preventDefault()}
          onInteractOutside={(event) => event.preventDefault()}
        >
          <div className="relative">
            <div className="relative h-[7.75rem] overflow-hidden bg-gradient-to-b from-primary/45 via-primary/18 to-transparent">
              <div className="pointer-events-none absolute -top-10 left-1/2 size-52 -translate-x-1/2 rounded-full bg-primary/35 blur-3xl" />
              <div className="pointer-events-none absolute left-8 top-4 size-24 rounded-full bg-primary/20 blur-2xl" />
              <div className="pointer-events-none absolute right-10 top-2 size-16 rounded-full bg-primary/25 blur-xl" />
            </div>
            <div className="relative z-10 -mt-8 flex justify-center">
              <div className="flex size-[3.75rem] items-center justify-center rounded-full bg-primary text-primary-foreground shadow-[0_10px_28px_rgba(146,199,32,0.4)]">
                <BadgeCheck className="size-8" strokeWidth={1.75} aria-hidden />
              </div>
            </div>
          </div>

          <div className="px-10 pb-9 pt-6 sm:px-12 sm:pb-10 sm:pt-7">
            <DialogHeader className="gap-2.5 text-left sm:text-left">
              <p className="text-muted-foreground text-[10px] font-medium tracking-[0.16em] uppercase">
                {t("welcome.guide.stepOf", {
                  current: setupStep + 1,
                  total: WELCOME_SETUP_STEPS,
                })}
              </p>
              <div className="flex gap-1.5 pt-0.5">
                {Array.from({ length: WELCOME_SETUP_STEPS }).map((_, index) => (
                  <span
                    key={index}
                    className={
                      index <= setupStep
                        ? "bg-primary h-1 w-7 rounded-full"
                        : "bg-muted h-1 w-7 rounded-full"
                    }
                  />
                ))}
              </div>
              <DialogTitle className="text-[1.5rem] leading-snug font-semibold tracking-tight sm:text-[1.625rem]">
                {setupTitle}
              </DialogTitle>
              {setupDescription ? (
                <DialogDescription className="max-w-[32rem] text-[13px] leading-relaxed">
                  {setupDescription}
                </DialogDescription>
              ) : null}
            </DialogHeader>

            {setupStep === 0 ? (
              <>
                <p className="text-foreground/80 mt-3.5 max-w-[32rem] text-[13px] leading-relaxed">
                  {isOnTrial
                    ? trialEndLabel
                      ? t("welcome.trialNoticeBody", {
                          plan: planName,
                          days: daysLeft,
                          date: trialEndLabel,
                        })
                      : t("welcome.trialBody", { days: daysLeft, total: TRIAL_DAYS })
                    : t("welcome.paidNoticeBody", { plan: planName })}
                </p>
                <dl
                  className={
                    isOnTrial
                      ? "border-border/70 mt-7 grid grid-cols-3 gap-6 border-t pt-5 text-left"
                      : "border-border/70 mt-7 grid grid-cols-2 gap-6 border-t pt-5 text-left"
                  }
                >
                  <div>
                    <dt className="text-muted-foreground text-[10px] font-medium tracking-[0.12em] uppercase">
                      {t("welcome.summaryPlan")}
                    </dt>
                    <dd className="mt-1 text-[13px] font-medium">{planName}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground text-[10px] font-medium tracking-[0.12em] uppercase">
                      {t("welcome.summaryAccess")}
                    </dt>
                    <dd className="mt-1 text-[13px] font-medium">
                      {isOnTrial
                        ? t("welcome.trialBadge", { days: daysLeft })
                        : t("welcome.accessFull")}
                    </dd>
                  </div>
                  {isOnTrial ? (
                    <div>
                      <dt className="text-muted-foreground text-[10px] font-medium tracking-[0.12em] uppercase">
                        {t("welcome.summaryEnds")}
                      </dt>
                      <dd className="mt-1 text-[13px] font-medium">
                        {trialEndLabel ?? "—"}
                      </dd>
                    </div>
                  ) : null}
                </dl>
              </>
            ) : null}

            {setupStep === 1 || setupStep === 2 ? (
              <div className="mt-4">
                <WelcomeSetupBody step={setupStep} />
              </div>
            ) : null}

            <div className="mt-7 flex flex-wrap items-center gap-2">
              {setupStep > 0 ? (
                <Button
                  type="button"
                  variant="ghost"
                  className="text-muted-foreground h-9 px-4 text-[13px]"
                  onClick={() => setSetupStep((prev) => prev - 1)}
                >
                  {t("welcome.back")}
                </Button>
              ) : null}
              <Button type="button" className="h-9 px-6 text-[13px]" onClick={handleSetupContinue}>
                {setupStep === WELCOME_SETUP_STEPS - 1
                  ? t("welcome.startTour")
                  : t("welcome.continue")}
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="text-muted-foreground h-9 px-4 text-[13px]"
                onClick={handleSetupSkip}
              >
                {t("welcome.skip")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {phase === "tour" && !spotlit ? (
        <div
          aria-hidden
          className="fixed inset-0 z-[1990] bg-[rgba(15,23,42,0.52)] transition-opacity duration-300"
        />
      ) : null}

      {phase === "tour" && spotlit ? (
        <ConfigProvider
          direction={isRtl ? "rtl" : "ltr"}
          getPopupContainer={() => document.body}
          theme={{
            token: {
              colorPrimary: "#92c720",
              borderRadius: 14,
              fontFamily: "inherit",
            },
          }}
        >
          <Tour
            key={step?.target ?? current}
            open
            steps={tourSteps}
            current={0}
            zIndex={2000}
            gap={{ offset: 8, radius: 12 }}
            mask={{ color: "rgba(15, 23, 42, 0.52)" }}
            animated
            disabledInteraction
            getPopupContainer={() => document.body}
            actionsRender={() => (
              <div className="flex items-center justify-end gap-2">
                <AntButton size="small" type="text" onClick={finishTour}>
                  {t("welcome.skip")}
                </AntButton>
                {current > 0 ? (
                  <AntButton size="small" onClick={() => goTo(current - 1)}>
                    {t("welcome.prevPage")}
                  </AntButton>
                ) : null}
                <AntButton size="small" type="primary" onClick={handleNext}>
                  {current === lastIndex ? t("welcome.done") : t("welcome.nextPage")}
                </AntButton>
              </div>
            )}
            onClose={() => {
              if (navigatingRef.current) return
              finishTour()
            }}
          />
        </ConfigProvider>
      ) : null}
    </>
  )
}
