import { cn } from "@/lib/utils"

/** Soft empty-state art for periods with no purchase orders. */
export function EmptyPurchasesIllustration({
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
      <ellipse cx="80" cy="102" rx="48" ry="8" className="fill-muted/60" />

      {/* Clipboard back */}
      <rect
        x="46"
        y="18"
        width="68"
        height="78"
        rx="10"
        className="fill-card stroke-border"
        strokeWidth="1.5"
      />
      <rect
        x="52"
        y="28"
        width="56"
        height="62"
        rx="6"
        className="fill-muted/35"
      />

      {/* Clip */}
      <rect
        x="66"
        y="12"
        width="28"
        height="12"
        rx="4"
        className="fill-primary/25 stroke-primary/40"
        strokeWidth="1.2"
      />
      <rect
        x="72"
        y="15"
        width="16"
        height="6"
        rx="2"
        className="fill-primary/40"
      />

      {/* Soft line placeholders */}
      <rect x="60" y="40" width="40" height="5" rx="2.5" className="fill-border" />
      <rect x="60" y="52" width="32" height="5" rx="2.5" className="fill-border/80" />
      <rect x="60" y="64" width="36" height="5" rx="2.5" className="fill-border/70" />
      <rect x="60" y="76" width="24" height="5" rx="2.5" className="fill-border/60" />

      {/* Package badge */}
      <g transform="translate(98 68)">
        <circle cx="18" cy="18" r="16" className="fill-primary/15 stroke-primary/30" strokeWidth="1.2" />
        <path
          d="M10 16.5 L18 12 L26 16.5 V24.5 L18 29 L10 24.5 Z"
          className="fill-card stroke-primary/50"
          strokeWidth="1.2"
          strokeLinejoin="round"
        />
        <path
          d="M18 12 V29 M10 16.5 L18 21 L26 16.5"
          className="stroke-primary/50"
          strokeWidth="1.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
    </svg>
  )
}
