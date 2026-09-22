import { ComingSoonOverlay } from "@/components/coming-soon-overlay"

export default function ZakatSectionLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <ComingSoonOverlay>{children}</ComingSoonOverlay>
}
