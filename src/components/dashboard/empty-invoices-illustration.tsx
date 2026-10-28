import { cn } from "@/lib/utils"

/** Soft empty-state art for periods with no invoices. */
export function EmptyInvoicesIllustration({
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

      {/* Invoice sheet */}
      <path
        d="M52 16 H100 L116 32 V94 C116 98.418 112.418 102 108 102 H52 C47.582 102 44 98.418 44 94 V24 C44 19.582 47.582 16 52 16 Z"
        className="fill-card stroke-border"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M100 16 V28 C100 30.209 101.791 32 104 32 H116"
        className="fill-muted/40 stroke-border"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />

      {/* Header band */}
      <rect x="54" y="28" width="42" height="8" rx="2" className="fill-primary/20" />

      {/* Line items */}
      <rect x="54" y="46" width="48" height="4" rx="2" className="fill-border" />
      <rect x="54" y="56" width="36" height="4" rx="2" className="fill-border/80" />
      <rect x="54" y="66" width="42" height="4" rx="2" className="fill-border/70" />
      <rect x="54" y="76" width="28" height="4" rx="2" className="fill-border/60" />

      {/* Total rule */}
      <rect x="54" y="88" width="48" height="1.5" rx="0.75" className="fill-border" />
      <rect x="78" y="92" width="24" height="5" rx="2.5" className="fill-primary/35" />

      {/* Soft receipt badge */}
      <g transform="translate(104 62)">
        <circle
          cx="18"
          cy="18"
          r="16"
          className="fill-primary/15 stroke-primary/30"
          strokeWidth="1.2"
        />
        <path
          d="M11 18.5 L16 23.5 L26 13.5"
          className="stroke-primary/60"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
    </svg>
  )
}
