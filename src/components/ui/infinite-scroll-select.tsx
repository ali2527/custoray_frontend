"use client"

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import { IconChevronDown, IconPlus, IconSearch } from "@tabler/icons-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"

export type InfiniteScrollSelectOption = {
  value: string
  label: string
  description?: string
  trailing?: string
}

type InfiniteScrollSelectProps = {
  value: string
  onValueChange: (value: string) => void
  options: InfiniteScrollSelectOption[]
  placeholder?: string
  searchPlaceholder?: string
  emptyMessage?: string
  pageSize?: number
  onAddNew?: () => void
  addNewLabel?: string
  id?: string
  disabled?: boolean
  className?: string
  leadingIcon?: ReactNode
  "aria-invalid"?: boolean
  /** `remote` skips local filtering; parent owns results via `onSearchChange`. */
  searchMode?: "local" | "remote"
  /** Controlled search text when `searchMode` is `remote`. */
  searchValue?: string
  onSearchChange?: (query: string) => void
  searchLoading?: boolean
  onOpenChange?: (open: boolean) => void
}

const SCROLL_LOAD_THRESHOLD_PX = 24

export function InfiniteScrollSelect({
  value,
  onValueChange,
  options,
  placeholder = "Select…",
  searchPlaceholder = "Search…",
  emptyMessage = "No results found.",
  pageSize = 10,
  onAddNew,
  addNewLabel = "Add new",
  id,
  disabled,
  className,
  leadingIcon,
  "aria-invalid": ariaInvalid,
  searchMode = "local",
  searchValue,
  onSearchChange,
  searchLoading = false,
  onOpenChange,
}: InfiniteScrollSelectProps) {
  const [open, setOpen] = useState(false)
  const [localSearch, setLocalSearch] = useState("")
  const [visibleCount, setVisibleCount] = useState(pageSize)
  const listRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const isRemote = searchMode === "remote"
  const search = isRemote ? (searchValue ?? "") : localSearch

  const setOpenState = useCallback(
    (next: boolean) => {
      setOpen(next)
      onOpenChange?.(next)
    },
    [onOpenChange]
  )

  const selected = useMemo(
    () => options.find((option) => option.value === value),
    [options, value]
  )

  const filtered = useMemo(() => {
    if (isRemote) return options
    const query = search.trim().toLowerCase()
    if (!query) return options
    return options.filter(
      (option) =>
        option.label.toLowerCase().includes(query) ||
        option.description?.toLowerCase().includes(query) ||
        option.trailing?.toLowerCase().includes(query)
    )
  }, [options, search, isRemote])

  const visibleOptions = filtered.slice(0, visibleCount)
  const hasMore = visibleCount < filtered.length

  useEffect(() => {
    if (!open) return
    setVisibleCount(pageSize)
    if (!isRemote) setLocalSearch("")
  }, [open, pageSize, isRemote])

  useEffect(() => {
    setVisibleCount(pageSize)
  }, [search, pageSize])

  const loadMore = useCallback(() => {
    setVisibleCount((count) => Math.min(count + pageSize, filtered.length))
  }, [filtered.length, pageSize])

  const handleListScroll = useCallback(() => {
    const el = listRef.current
    if (!el || !hasMore) return
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight
    if (distanceFromBottom <= SCROLL_LOAD_THRESHOLD_PX) {
      loadMore()
    }
  }, [hasMore, loadMore])

  useEffect(() => {
    if (!open) return
    const frame = requestAnimationFrame(() => {
      searchInputRef.current?.focus()
    })
    return () => cancelAnimationFrame(frame)
  }, [open])

  const handleSelect = (nextValue: string) => {
    onValueChange(nextValue)
    setOpenState(false)
  }

  const handleSearchChange = (next: string) => {
    if (isRemote) onSearchChange?.(next)
    else setLocalSearch(next)
  }

  return (
    <Popover open={open} onOpenChange={setOpenState} modal>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-invalid={ariaInvalid}
          disabled={disabled}
          className={cn(
            "border-input bg-background hover:bg-background dark:bg-input/30 dark:hover:bg-input/30 relative flex h-9 w-full items-center justify-start gap-2 pe-8 ps-3 font-normal shadow-xs",
            !selected && "text-muted-foreground",
            className
          )}
        >
          {leadingIcon ? (
            <span className="text-muted-foreground flex shrink-0 items-center [&>svg]:size-4">
              {leadingIcon}
            </span>
          ) : null}
          <span className="min-w-0 flex-1 truncate text-start">
            {selected?.label ?? placeholder}
          </span>
          <IconChevronDown className="text-muted-foreground pointer-events-none absolute end-2.5 top-1/2 size-4 -translate-y-1/2 opacity-60" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        portalled
        className="z-[200] w-[var(--radix-popover-trigger-width)] p-0"
        align="start"
        onOpenAutoFocus={(e) => e.preventDefault()}
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
        <div className="border-border/60 border-b p-2">
          <div className="relative">
            <IconSearch className="text-muted-foreground pointer-events-none absolute top-1/2 start-2.5 size-4 -translate-y-1/2" />
            <Input
              ref={searchInputRef}
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              onKeyDown={(e) => {
                e.stopPropagation()
                if (e.key === "Escape") {
                  setOpenState(false)
                }
              }}
              placeholder={searchPlaceholder}
              className="pointer-events-auto h-8 ps-9"
            />
          </div>
        </div>
        <div
          ref={listRef}
          className="pointer-events-auto max-h-60 overflow-y-auto overscroll-contain p-1"
          onWheel={(e) => e.stopPropagation()}
          onTouchMove={(e) => e.stopPropagation()}
          onScroll={handleListScroll}
        >
          {visibleOptions.length === 0 ? (
            <p className="text-muted-foreground px-2 py-6 text-center text-sm">
              {searchLoading ? "Searching…" : emptyMessage}
            </p>
          ) : (
            visibleOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                className={cn(
                  "hover:bg-accent hover:text-accent-foreground flex w-full items-start gap-2 rounded-sm px-2 py-2 text-left text-sm transition-colors",
                  option.value === value && "bg-accent text-accent-foreground"
                )}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => handleSelect(option.value)}
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{option.label}</span>
                  {option.description ? (
                    <span className="text-muted-foreground block truncate text-xs">
                      {option.description}
                    </span>
                  ) : null}
                </span>
                {option.trailing ? (
                  <span className="text-muted-foreground shrink-0 text-xs tabular-nums">
                    {option.trailing}
                  </span>
                ) : null}
              </button>
            ))
          )}
          {hasMore ? (
            <p className="text-muted-foreground py-2 text-center text-xs">Scroll for more…</p>
          ) : null}
        </div>
        {onAddNew ? (
          <div className="border-border/60 border-t p-1">
            <button
              type="button"
              className="text-primary hover:bg-accent flex w-full items-center gap-2 rounded-sm px-2 py-2 text-left text-sm font-medium transition-colors"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                setOpenState(false)
                onAddNew()
              }}
            >
              <IconPlus className="size-4" />
              {addNewLabel}
            </button>
          </div>
        ) : null}
      </PopoverContent>
    </Popover>
  )
}
