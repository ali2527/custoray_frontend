"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { IconChevronDown, IconSearch } from "@tabler/icons-react"
import { useTranslation } from "react-i18next"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  dialPrefix,
  flagEmoji,
  PHONE_COUNTRIES,
  phoneCountryOption,
} from "@/lib/phone-mask"
import { cn } from "@/lib/utils"

export function PhoneCodeSelect({
  value,
  onValueChange,
  invalid,
}: {
  value: string
  onValueChange: (country: string) => void
  invalid?: boolean
}) {
  const { t } = useTranslation("auth")
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")
  const searchInputRef = useRef<HTMLInputElement>(null)
  const selected = value ? phoneCountryOption(value) : null

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return PHONE_COUNTRIES
    return PHONE_COUNTRIES.filter((country) => {
      const dial = `+${country.dial}`
      return (
        country.name.toLowerCase().includes(query) ||
        country.iso2.toLowerCase().includes(query) ||
        country.dial.includes(query.replace(/^\+/, "")) ||
        dial.includes(query)
      )
    })
  }, [search])

  useEffect(() => {
    if (!open) {
      setSearch("")
      return
    }
    const frame = requestAnimationFrame(() => searchInputRef.current?.focus())
    return () => cancelAnimationFrame(frame)
  }, [open])

  return (
    <Popover open={open} onOpenChange={setOpen} modal>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          aria-label={t("signup.phoneCodePlaceholder")}
          aria-invalid={invalid}
          className={cn(
            "text-muted-foreground h-full min-w-[4.75rem] shrink-0 rounded-none border-0 border-r bg-transparent px-2 text-xs font-normal tabular-nums shadow-none hover:bg-transparent",
            !selected?.dial && "text-muted-foreground/80"
          )}
        >
          <span className="truncate">{selected?.dial ? dialPrefix(selected.name) : t("signup.phoneCodePlaceholder")}</span>
          <IconChevronDown className="size-3.5 opacity-60" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        portalled
        align="start"
        className="z-[200] w-72 p-0"
        onOpenAutoFocus={(event) => event.preventDefault()}
        onCloseAutoFocus={(event) => event.preventDefault()}
      >
        <div className="border-border/60 border-b p-2">
          <div className="relative">
            <IconSearch className="text-muted-foreground pointer-events-none absolute start-2.5 top-1/2 size-4 -translate-y-1/2" />
            <Input
              ref={searchInputRef}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              onKeyDown={(event) => {
                event.stopPropagation()
                if (event.key === "Escape") setOpen(false)
              }}
              placeholder={t("signup.phoneCodeSearch")}
              className="h-8 ps-9 text-xs"
            />
          </div>
        </div>
        <div className="max-h-60 overflow-y-auto overscroll-contain p-1">
          {filtered.length === 0 ? (
            <p className="text-muted-foreground px-2 py-6 text-center text-xs">
              {t("signup.phoneCodeEmpty")}
            </p>
          ) : (
            filtered.map((country) => (
              <button
                key={country.iso2}
                type="button"
                className={cn(
                  "hover:bg-accent hover:text-accent-foreground flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-xs transition-colors",
                  country.name === value && "bg-accent text-accent-foreground"
                )}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  onValueChange(country.name)
                  setOpen(false)
                }}
              >
                <span className="w-6 shrink-0 text-base leading-none" aria-hidden>
                  {flagEmoji(country.iso2)}
                </span>
                <span className="min-w-0 flex-1 truncate">{country.name}</span>
                <span className="text-muted-foreground shrink-0 tabular-nums">+{country.dial}</span>
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
