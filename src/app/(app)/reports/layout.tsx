import { ComingSoonOverlay } from "@/components/coming-soon-overlay"

export default function ReportsSectionLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <ComingSoonOverlay>{children}</ComingSoonOverlay>
}
