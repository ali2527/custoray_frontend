"use client"

import { toast } from "sonner"

import i18n from "@/i18n"

export type BulkProgressKind = "import" | "delete" | "update"

export type BulkProgressState = {
  kind: BulkProgressKind
  done: number
  total: number
}

const PROGRESS_THRESHOLD = 5

let current: BulkProgressState | null = null
const listeners = new Set<() => void>()

export function getBulkProgress(): BulkProgressState | null {
  return current
}

export function subscribeBulkProgress(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

function notify() {
  for (const listener of listeners) listener()
}

function progressTitle(kind: BulkProgressKind, done: number, total: number) {
  const key =
    kind === "delete"
      ? "bulkProgress.deleting"
      : kind === "update"
        ? "bulkProgress.updating"
        : "bulkProgress.importing"
  return i18n.t(key, { done, total })
}

/**
 * Shows a live toast (and publishes state for in-dialog bars) while a bulk
 * operation runs. No-ops when `total` is below the threshold.
 */
export function startBulkProgress(
  kind: BulkProgressKind,
  total: number,
  options?: { threshold?: number; silent?: boolean }
): {
  update: (done: number) => void
  finish: () => void
} {
  const threshold = options?.threshold ?? PROGRESS_THRESHOLD
  if (options?.silent || total < threshold) {
    return {
      update: () => undefined,
      finish: () => undefined,
    }
  }

  const toastId = `bulk-progress-${kind}`
  current = { kind, done: 0, total }
  notify()
  toast.loading(progressTitle(kind, 0, total), {
    id: toastId,
    description: i18n.t("bulkProgress.keepOpen"),
    duration: Infinity,
  })

  return {
    update(done: number) {
      const next = Math.min(Math.max(0, done), total)
      current = { kind, done: next, total }
      notify()
      toast.loading(progressTitle(kind, next, total), {
        id: toastId,
        description: i18n.t("bulkProgress.keepOpen"),
        duration: Infinity,
      })
    },
    finish() {
      toast.dismiss(toastId)
      if (current?.kind === kind) {
        current = null
        notify()
      }
    },
  }
}
