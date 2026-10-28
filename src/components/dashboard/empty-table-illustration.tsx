import { cn } from "@/lib/utils"

/** Soft empty-state art for data tables with no rows. */
export function EmptyTableIllustration({
  className,
}: {
  className?: string
}) {
  return (
    <svg
      viewBox="0 0 160 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("text-muted-foreground/80", className)}
      aria-hidden
    >
      <ellipse cx="80" cy="104" rx="52" ry="7" className="fill-muted/60" />

      {/* Table frame */}
      <rect
        x="28"
        y="18"
        width="104"
        height="76"
        rx="10"
        className="fill-card stroke-border"
        strokeWidth="1.5"
      />

      {/* Header */}
      <rect x="28" y="18" width="104" height="18" rx="10" className="fill-muted/45" />
      <rect x="28" y="28" width="104" height="8" className="fill-muted/45" />
      <rect x="40" y="24" width="18" height="4" rx="2" className="fill-border" />
      <rect x="70" y="24" width="28" height="4" rx="2" className="fill-border" />
      <rect x="112" y="24" width="10" height="4" rx="2" className="fill-border" />

      {/* Rows */}
      <rect x="40" y="46" width="22" height="4" rx="2" className="fill-border/90" />
      <rect x="72" y="46" width="36" height="4" rx="2" className="fill-border/70" />
      <rect x="118" y="46" width="4" height="4" rx="2" className="fill-border/50" />

      <rect x="40" y="60" width="18" height="4" rx="2" className="fill-border/80" />
      <rect x="72" y="60" width="30" height="4" rx="2" className="fill-border/60" />
      <rect x="118" y="60" width="4" height="4" rx="2" className="fill-border/40" />

      <rect x="40" y="74" width="24" height="4" rx="2" className="fill-border/70" />
      <rect x="72" y="74" width="26" height="4" rx="2" className="fill-border/50" />
      <rect x="118" y="74" width="4" height="4" rx="2" className="fill-border/35" />

      {/* Soft accent chip */}
      <g transform="translate(108 78)">
        <circle
          cx="16"
          cy="16"
          r="14"
          className="fill-primary/15 stroke-primary/30"
          strokeWidth="1.2"
        />
        <path
          d="M10 16 H22 M16 10 V22"
          className="stroke-primary/55"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      </g>
    </svg>
  )
}
