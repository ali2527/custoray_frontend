/** Name shared by the open sign-in / signup tab and the verification email link. */
export const AUTH_TAB_NAME = "custoray-auth"

const CHANNEL_NAME = "custoray-auth"
const BEAT_KEY = "custoray:auth-tab"

/** Mark this tab as the one an email link should come back to. */
export function claimAuthTab() {
  window.name = AUTH_TAB_NAME
  const beat = () => {
    try {
      localStorage.setItem(BEAT_KEY, String(Date.now()))
    } catch {
      /* ignore quota / private mode */
    }
  }
  beat()
  const id = window.setInterval(beat, 1500)
  const channel = new BroadcastChannel(CHANNEL_NAME)
  channel.onmessage = (event: MessageEvent) => {
    if (event.data?.type === "focus") window.focus()
  }
  const stop = () => {
    window.clearInterval(id)
    channel.close()
    try {
      localStorage.removeItem(BEAT_KEY)
    } catch {
      /* ignore */
    }
  }
  window.addEventListener("pagehide", stop)
  return () => {
    window.removeEventListener("pagehide", stop)
    stop()
  }
}

export function authTabIsOpen() {
  let last = 0
  try {
    last = Number(localStorage.getItem(BEAT_KEY) || 0)
  } catch {
    return false
  }
  return last > 0 && Date.now() - last < 4000
}

/**
 * Load this verification link in the already-open sign-in / signup tab and focus it.
 * A tab this call creates is closed again so sign-in stays on the original tab.
 */
export function focusAuthTab(url: string) {
  if (!authTabIsOpen()) return false
  const land = new URL(url, window.location.origin)
  land.searchParams.set("land", "1")
  const app = window.open(land.toString(), AUTH_TAB_NAME)
  if (!app || app.closed || app === window) return false
  let openedByUs = false
  try {
    openedByUs = app.opener === window
  } catch {
    openedByUs = false
  }
  if (openedByUs) {
    app.close()
    return false
  }
  app.focus()
  const channel = new BroadcastChannel(CHANNEL_NAME)
  channel.postMessage({ type: "focus" })
  channel.close()
  return true
}
