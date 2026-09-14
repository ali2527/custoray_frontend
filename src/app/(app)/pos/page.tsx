import { PosTerminal } from "@/components/pos/pos-terminal"
import { PosViewport } from "@/components/pos/pos-viewport"

export default function PosPage() {
  return (
    <PosViewport>
      <div data-tour="welcome-pos-page" className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <PosTerminal />
      </div>
    </PosViewport>
  )
}
