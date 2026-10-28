export default function OfflinePage() {
  return (
    <main className="bg-background text-foreground flex min-h-svh flex-col items-center justify-center gap-3 px-6 text-center">
      <h1 className="text-xl font-semibold tracking-tight">You&apos;re offline</h1>
      <p className="text-muted-foreground max-w-sm text-sm">
        Custoray needs a connection for live data. Reconnect and try again.
      </p>
    </main>
  )
}
