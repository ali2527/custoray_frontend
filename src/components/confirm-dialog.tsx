"use client"

import * as React from "react"
import {
  IconAlertTriangle,
  IconHelpCircle,
  IconInfoCircle,
} from "@tabler/icons-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  registerConfirmDialog,
  type ConfirmDialogRequest,
  type ConfirmDialogResult,
  type ConfirmTone,
} from "@/lib/confirm-dialog"
import { cn } from "@/lib/utils"

const toneStyles: Record<
  ConfirmTone,
  { wrap: string; icon: typeof IconHelpCircle }
> = {
  danger: {
    wrap: "bg-destructive/10 text-destructive",
    icon: IconAlertTriangle,
  },
  question: {
    wrap: "bg-primary/10 text-primary",
    icon: IconHelpCircle,
  },
  info: {
    wrap: "bg-muted text-muted-foreground",
    icon: IconInfoCircle,
  },
}

export function ConfirmDialogHost() {
  const [open, setOpen] = React.useState(false)
  const [request, setRequest] = React.useState<ConfirmDialogRequest | null>(null)
  const [value, setValue] = React.useState("1")
  const [error, setError] = React.useState("")
  const resolverRef = React.useRef<((result: ConfirmDialogResult) => void) | null>(
    null
  )

  const settle = React.useCallback((result: ConfirmDialogResult) => {
    resolverRef.current?.(result)
    resolverRef.current = null
    setOpen(false)
  }, [])

  React.useEffect(() => {
    registerConfirmDialog((next) => {
      if (resolverRef.current) {
        resolverRef.current({ confirmed: false })
        resolverRef.current = null
      }
      return new Promise<ConfirmDialogResult>((resolve) => {
        resolverRef.current = resolve
        setRequest(next)
        setValue(String(next.input?.defaultValue ?? 1))
        setError("")
        setOpen(true)
      })
    })
    return () => registerConfirmDialog(null)
  }, [])

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) settle({ confirmed: false })
    else setOpen(true)
  }

  const handleConfirm = () => {
    if (!request) return
    if (request.input?.type === "number") {
      const qty = Number(value)
      if (!Number.isInteger(qty) || qty < request.input.min) {
        setError(request.input.invalidMin || `Enter a quantity of at least ${request.input.min}.`)
        return
      }
      if (qty > request.input.max) {
        setError(request.input.invalidMax || `Quantity cannot exceed ${request.input.max}.`)
        return
      }
      settle({ confirmed: true, value: qty })
      return
    }
    settle({ confirmed: true })
  }

  const tone = request?.tone ?? (request?.variant === "destructive" ? "danger" : "question")
  const ToneIcon = toneStyles[tone].icon

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        showCloseButton={false}
        overlayClassName="z-[80]"
        data-confirm-dialog=""
        className="z-[80] gap-5 rounded-xl sm:max-w-[26rem]"
        onOpenAutoFocus={(event) => {
          if (request?.input) return
          event.preventDefault()
          const targetId =
            request?.variant === "destructive"
              ? "app-confirm-cancel"
              : "app-confirm-action"
          document.getElementById(targetId)?.focus()
        }}
      >
        {request ? (
          <>
            <DialogHeader className="sm:text-left">
              <div className="flex items-start gap-3">
                <div
                  className={cn(
                    "flex size-10 shrink-0 items-center justify-center rounded-xl",
                    toneStyles[tone].wrap
                  )}
                >
                  <ToneIcon className="size-5" stroke={1.75} />
                </div>
                <div className="min-w-0 space-y-1.5">
                  <DialogTitle className="text-base leading-snug">
                    {request.title}
                  </DialogTitle>
                  <DialogDescription className="text-sm leading-relaxed">
                    {request.description}
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            {request.input ? (
              <div className="space-y-2">
                <Label htmlFor="app-confirm-input">{request.input.label}</Label>
                <Input
                  id="app-confirm-input"
                  type="number"
                  min={request.input.min}
                  max={request.input.max}
                  step={1}
                  value={value}
                  onChange={(event) => {
                    setValue(event.target.value)
                    setError("")
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault()
                      handleConfirm()
                    }
                  }}
                  className="h-10"
                />
                {request.input.hint ? (
                  <p className="text-muted-foreground text-xs">{request.input.hint}</p>
                ) : null}
                {error ? (
                  <p className="text-destructive text-xs">{error}</p>
                ) : null}
              </div>
            ) : null}

            <DialogFooter className="gap-2 sm:justify-end">
              <Button
                id="app-confirm-cancel"
                type="button"
                variant="outline"
                onClick={() => settle({ confirmed: false })}
              >
                {request.cancelLabel}
              </Button>
              <Button
                id="app-confirm-action"
                type="button"
                variant={request.variant === "destructive" ? "destructive" : "default"}
                onClick={handleConfirm}
              >
                {request.confirmLabel}
              </Button>
            </DialogFooter>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
