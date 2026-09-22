"use client"

import { IconTrendingDown, IconTrendingUp } from "@tabler/icons-react"

import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export type DashboardStat = {
  key: string
  label: string
  value: string
  trend?: number | null
  footerTitle: string
  footerHint: string
}

function formatTrend(value: number | null | undefined): string | null {
  if (value == null || !Number.isFinite(value)) return null
  const sign = value > 0 ? "+" : ""
  return `${sign}${value.toFixed(1)}%`
}

export function SectionCards({ stats }: { stats: DashboardStat[] }) {
  return (
    <div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 gap-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
      {stats.map((stat) => {
        const trendLabel = formatTrend(stat.trend)
        const hasTrend = trendLabel != null
        const positive = (stat.trend ?? 0) >= 0
        const TrendIcon = positive ? IconTrendingUp : IconTrendingDown

        return (
          <Card key={stat.key} className="@container/card">
            <CardHeader>
              <CardDescription>{stat.label}</CardDescription>
              <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
                {stat.value}
              </CardTitle>
              {hasTrend ? (
                <CardAction>
                  <Badge variant="outline">
                    <TrendIcon />
                    {trendLabel}
                  </Badge>
                </CardAction>
              ) : null}
            </CardHeader>
            <CardFooter className="flex-col items-start gap-1.5 text-sm">
              <div className="line-clamp-1 flex gap-2 font-medium">
                {stat.footerTitle}
                {hasTrend ? <TrendIcon className="size-4" /> : null}
              </div>
              <div className="text-muted-foreground">{stat.footerHint}</div>
            </CardFooter>
          </Card>
        )
      })}
    </div>
  )
}
