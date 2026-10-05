import { ComingSoonOverlay } from "@/components/coming-soon-overlay"
import { ZakatProvider } from "@/context/zakat-context"

export default function ZakatSectionLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ZakatProvider>
      <ComingSoonOverlay>{children}</ComingSoonOverlay>
    </ZakatProvider>
  )
}
