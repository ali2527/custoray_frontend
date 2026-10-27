"use client"

import { useRef, type PointerEvent } from "react"
import { Check, Pipette } from "lucide-react"
import { useTranslation } from "react-i18next"

import { ACCENT_PRESETS } from "@/lib/appearance-prefs"
import { cn } from "@/lib/utils"

type AccentColorPickerProps = {
  colorTheme: string
  customColor: string
  onChange: (next: { colorTheme: string; customColor: string }) => void
  className?: string
}

export function AccentColorPicker({
  colorTheme,
  customColor,
  onChange,
  className,
}: AccentColorPickerProps) {
  const { t } = useTranslation("settings")
  const scrollerRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef({
    active: false,
    dragging: false,
    moved: false,
    startX: 0,
    scrollLeft: 0,
  })
  const isCustom = colorTheme === "custom"
  const selectedPreset = ACCENT_PRESETS.find((item) => item.id === colorTheme)
  const activeHex = isCustom
    ? customColor
    : selectedPreset?.color ?? customColor
  const activeLabel = isCustom
    ? t("appearance.customColor")
    : t(`appearance.presets.${selectedPreset?.id ?? "green"}`, {
        defaultValue: selectedPreset?.label ?? "Green",
      })

  function onPointerDown(event: PointerEvent<HTMLDivElement>) {
    if (event.pointerType === "touch") return
    const el = scrollerRef.current
    if (!el) return
    // Defer capture until the pointer actually moves so clicks still select colors.
    dragRef.current = {
      active: true,
      dragging: false,
      moved: false,
      startX: event.clientX,
      scrollLeft: el.scrollLeft,
    }
  }

  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    const el = scrollerRef.current
    const drag = dragRef.current
    if (!el || !drag.active) return
    const delta = event.clientX - drag.startX
    if (!drag.dragging) {
      if (Math.abs(delta) <= 4) return
      drag.dragging = true
      drag.moved = true
      el.setPointerCapture(event.pointerId)
      el.classList.add("cursor-grabbing")
    }
    el.scrollLeft = drag.scrollLeft - delta
  }

  function endDrag(event: PointerEvent<HTMLDivElement>) {
    const el = scrollerRef.current
    const drag = dragRef.current
    if (!el || !drag.active) return
    if (drag.dragging) {
      try {
        el.releasePointerCapture(event.pointerId)
      } catch {
        /* already released */
      }
      el.classList.remove("cursor-grabbing")
    }
    drag.active = false
    drag.dragging = false
  }

  function selectColor(next: { colorTheme: string; customColor: string }) {
    if (dragRef.current.moved) {
      dragRef.current.moved = false
      return
    }
    onChange(next)
  }

  return (
    <div className={cn("space-y-3", className)}>
      <div
        ref={scrollerRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        className="hide-scrollbar flex cursor-grab gap-3 overflow-x-auto py-1 touch-pan-x select-none active:cursor-grabbing"
      >
        {ACCENT_PRESETS.map((item) => {
          const selected = !isCustom && colorTheme === item.id
          const label = t(`appearance.presets.${item.id}`, { defaultValue: item.label })
          return (
            <button
              key={item.id}
              type="button"
              title={label}
              aria-label={label}
              aria-pressed={selected}
              onClick={() => selectColor({ colorTheme: item.id, customColor: item.color })}
              className="flex w-12 shrink-0 flex-col items-center gap-1.5"
            >
              <span
                className={cn(
                  "pointer-events-none relative flex size-9 items-center justify-center rounded-full transition-[box-shadow,transform]",
                  selected
                    ? "ring-2 ring-foreground/25 ring-offset-2 ring-offset-background"
                    : "hover:ring-1 hover:ring-border hover:ring-offset-2 hover:ring-offset-background"
                )}
                style={{ backgroundColor: item.color }}
              >
                {selected ? <Check className="size-3.5 text-white drop-shadow-sm" strokeWidth={3} /> : null}
              </span>
              <span
                className={cn(
                  "w-full truncate text-center text-[10px] leading-tight",
                  selected ? "font-medium text-foreground" : "text-muted-foreground"
                )}
              >
                {label}
              </span>
            </button>
          )
        })}

        <label
          className="flex w-12 shrink-0 cursor-pointer flex-col items-center gap-1.5"
          onClick={(event) => {
            if (dragRef.current.moved) {
              event.preventDefault()
              dragRef.current.moved = false
            }
          }}
        >
          <span
            className={cn(
              "relative flex size-9 items-center justify-center overflow-hidden rounded-full border border-dashed border-border bg-background transition-[box-shadow,transform]",
              isCustom
                ? "border-solid ring-2 ring-foreground/25 ring-offset-2 ring-offset-background"
                : "hover:ring-1 hover:ring-border hover:ring-offset-2 hover:ring-offset-background"
            )}
            style={isCustom ? { backgroundColor: customColor } : undefined}
          >
            {isCustom ? (
              <Check className="pointer-events-none size-3.5 text-white drop-shadow-sm" strokeWidth={3} />
            ) : (
              <Pipette className="text-muted-foreground pointer-events-none size-3.5" strokeWidth={1.75} />
            )}
            <input
              type="color"
              value={/^#([0-9a-fA-F]{6})$/.test(customColor) ? customColor : "#92c720"}
              onChange={(event) =>
                onChange({ colorTheme: "custom", customColor: event.target.value })
              }
              onPointerDown={(event) => event.stopPropagation()}
              className="absolute inset-0 cursor-pointer opacity-0"
              aria-label={t("appearance.customAccentHex")}
            />
          </span>
          <span
            className={cn(
              "w-full truncate text-center text-[10px] leading-tight",
              isCustom ? "font-medium text-foreground" : "text-muted-foreground"
            )}
          >
            {t("appearance.customColor")}
          </span>
        </label>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-2.5 rounded-xl border border-border/80 bg-background px-3 py-2.5 text-center">
        <span
          className="size-5 shrink-0 rounded-full border border-border/80"
          style={{ backgroundColor: activeHex }}
        />
        <p className="text-sm font-medium tracking-tight">
          {activeLabel}
          <span className="text-muted-foreground ms-2 font-mono text-[11px] font-normal uppercase">
            {activeHex}
          </span>
        </p>
        {isCustom ? (
          <input
            value={customColor}
            onChange={(event) => {
              const value = event.target.value
              onChange({
                customColor: value,
                colorTheme: /^#([0-9a-fA-F]{6})$/.test(value) ? "custom" : colorTheme,
              })
            }}
            className="border-input h-8 w-full max-w-[6.5rem] rounded-md border bg-background px-2 text-center font-mono text-xs outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
            spellCheck={false}
            aria-label={t("appearance.customAccentHex")}
          />
        ) : null}
      </div>
    </div>
  )
}
