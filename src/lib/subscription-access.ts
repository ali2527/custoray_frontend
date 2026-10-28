import type { SessionPayload } from "@/lib/api/auth"

export type AccessInfo = {
  allowed: boolean
  status: string
  trialEndsAt: string | null
  currentPeriodStart: string | null
  currentPeriodEnd: string | null
  subscriptionCreatedAt: string | null
  isOwner: boolean
  planCode: string
  planName: string
  trialRequestPending: boolean
}

export function accessFromSession(me: SessionPayload): AccessInfo {
  const trialEndsAt = me.subscription?.trialEndsAt ?? null
  const currentPeriodStart = me.subscription?.currentPeriodStart ?? null
  const currentPeriodEnd = me.subscription?.currentPeriodEnd ?? null
  const subscriptionCreatedAt = me.subscription?.createdAt ?? null
  const allowed =
    me.access?.allowed ??
    (me.subscription?.status === "ACTIVE" ||
      (me.subscription?.status === "TRIAL" &&
        (!trialEndsAt || new Date(trialEndsAt).getTime() > Date.now())))

  return {
    allowed,
    status: me.access?.status ?? me.subscription?.status ?? "EXPIRED",
    trialEndsAt,
    currentPeriodStart,
    currentPeriodEnd,
    subscriptionCreatedAt,
    isOwner: me.user.isOwner,
    planCode: me.plan.code,
    planName: me.plan.displayName,
    trialRequestPending: me.trialRequest?.status === "pending",
  }
}

const DAY_MS = 24 * 60 * 60 * 1000

function startOfLocalDay(ms: number) {
  const d = new Date(ms)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

/** Real trial/period window from subscription start → end timestamps. */
export function planPeriodProgress(input: {
  endsAt: string | null | undefined
  startsAt?: string | null | undefined
  fallbackDays: number
  now?: number
}) {
  const now = input.now ?? Date.now()
  const endMs = input.endsAt ? new Date(input.endsAt).getTime() : NaN
  if (!Number.isFinite(endMs)) {
    return {
      spanDays: input.fallbackDays,
      daysLeft: 0,
      dayNumber: 1,
      remainingPct: 0,
      elapsedPct: 100,
      startsAt: null as string | null,
      endsAt: null as string | null,
    }
  }

  const startFromApi = input.startsAt ? new Date(input.startsAt).getTime() : NaN
  const startMs = Number.isFinite(startFromApi)
    ? startFromApi
    : endMs - input.fallbackDays * DAY_MS

  // Inclusive calendar-day span in the user's local timezone.
  const spanDays = Math.max(
    1,
    Math.round((startOfLocalDay(endMs) - startOfLocalDay(startMs)) / DAY_MS) ||
      Math.round((endMs - startMs) / DAY_MS)
  )
  const daysLeft = Math.max(0, Math.ceil((endMs - now) / DAY_MS))
  const elapsedMs = Math.min(Math.max(now - startMs, 0), Math.max(endMs - startMs, 1))
  const spanMs = Math.max(endMs - startMs, 1)
  const dayNumber = Math.min(
    spanDays,
    Math.max(1, Math.floor((startOfLocalDay(now) - startOfLocalDay(startMs)) / DAY_MS) + 1)
  )
  const elapsedPct = Math.min(100, Math.max(0, (elapsedMs / spanMs) * 100))
  const remainingPct = Math.min(100, Math.max(0, 100 - elapsedPct))

  return {
    spanDays,
    daysLeft,
    dayNumber,
    remainingPct,
    elapsedPct,
    startsAt: new Date(startMs).toISOString(),
    endsAt: new Date(endMs).toISOString(),
  }
}

export function formatTrialEndDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

export const FALLBACK_PLANS = [
  {
    code: "starter",
    displayName: "Starter",
    priceMonthly: 2999,
    maxStores: 1,
    maxUsers: 3,
    maxProducts: 500,
    moduleAccess: [] as string[],
  },
  {
    code: "business",
    displayName: "Business",
    priceMonthly: 7999,
    maxStores: 3,
    maxUsers: 10,
    maxProducts: 2000,
    moduleAccess: [] as string[],
  },
  {
    code: "professional",
    displayName: "Professional",
    priceMonthly: 14999,
    maxStores: 5,
    maxUsers: 25,
    maxProducts: 10000,
    moduleAccess: [] as string[],
  },
  {
    code: "enterprise",
    displayName: "Enterprise",
    priceMonthly: 29999,
    maxStores: 10,
    maxUsers: 50,
    maxProducts: 999999,
    moduleAccess: [] as string[],
  },
]
