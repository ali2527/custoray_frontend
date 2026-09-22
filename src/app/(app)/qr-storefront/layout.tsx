import { ComingSoonOverlay } from "@/components/coming-soon-overlay"

export default function QrStorefrontSectionLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <ComingSoonOverlay>{children}</ComingSoonOverlay>
}
