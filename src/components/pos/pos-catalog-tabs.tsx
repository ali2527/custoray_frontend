"use client"

import * as React from "react"
import { useTranslation } from "react-i18next"

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"

type PosCatalogTabsProps = {
  brand: string
  onBrandChange: (value: string) => void
  brands: string[]
  className?: string
}

const tabTriggerClass =
  "text-muted-foreground hover:text-foreground data-[state=active]:text-primary relative mx-1 h-auto shrink-0 flex-none rounded-none border-0 border-b-2 border-transparent bg-transparent px-4 py-2.5 text-sm font-medium whitespace-nowrap shadow-none transition-colors first:ml-0 last:mr-0 data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:font-semibold data-[state=active]:shadow-none"

const tabListClass =
  "bg-transparent text-muted-foreground -mb-px inline-flex h-auto w-max min-w-full flex-nowrap items-center justify-start gap-x-1 rounded-none border-0 px-1 py-0 shadow-none"

export function PosCatalogTabs({
  brand,
  onBrandChange,
  brands,
  className,
}: PosCatalogTabsProps) {
  const { t } = useTranslation("common")
  const scrollRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    const container = scrollRef.current
    if (!container) return
    const active = container.querySelector<HTMLElement>('[data-state="active"]')
    active?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" })
  }, [brand])

  const handleWheel = React.useCallback((event: React.WheelEvent<HTMLDivElement>) => {
    const container = scrollRef.current
    if (!container) return
    if (container.scrollWidth <= container.clientWidth) return
    if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return
    container.scrollLeft += event.deltaY
    event.preventDefault()
  }, [])

  if (brands.length <= 1) return null

  return (
    <div className={cn("border-border min-w-0 border-b pb-1", className)}>
      <Tabs value={brand} onValueChange={onBrandChange} className="min-w-0">
        <div
          ref={scrollRef}
          onWheel={handleWheel}
          className="snap-x snap-mandatory overflow-x-auto overscroll-x-contain scroll-smooth px-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          <TabsList className={tabListClass}>
            {brands.map((item) => (
              <TabsTrigger
                key={item}
                value={item}
                className={cn(tabTriggerClass, "snap-start")}
              >
                {item === "all" ? t("tabs.all") : item}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
      </Tabs>
    </div>
  )
}
