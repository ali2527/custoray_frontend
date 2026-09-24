const GSI_SRC = "https://accounts.google.com/gsi/client"

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initCodeClient: (config: {
            client_id: string
            scope: string
            ux_mode?: "popup" | "redirect"
            callback: (response: {
              code?: string
              error?: string
              error_description?: string
            }) => void
            error_callback?: (error: { type?: string; message?: string }) => void
          }) => { requestCode: () => void }
        }
      }
    }
  }
}

/**
 * Resolve Google OAuth web client ID by host.
 * app.custoray.com → PROD; localhost / 127.0.0.1 / dev-app → DEV.
 * Optional override: NEXT_PUBLIC_GOOGLE_CLIENT_ID.
 */
export function getGoogleClientId() {
  const explicit = (process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "").trim()
  if (explicit) return explicit

  const prod = (process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID_PROD ?? "").trim()
  const dev = (process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID_DEV ?? "").trim()

  if (typeof window === "undefined") {
    return dev || prod
  }

  const host = window.location.hostname
  if (host === "app.custoray.com") return prod
  return dev || prod
}

export function loadGoogleIdentityServices(): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Google Sign-In is only available in the browser"))
  }
  if (window.google?.accounts?.oauth2) return Promise.resolve()

  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${GSI_SRC}"]`)
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true })
      existing.addEventListener(
        "error",
        () => reject(new Error("Failed to load Google Sign-In")),
        { once: true }
      )
      return
    }

    const script = document.createElement("script")
    script.src = GSI_SRC
    script.async = true
    script.defer = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error("Failed to load Google Sign-In"))
    document.head.appendChild(script)
  })
}

export function requestGoogleAuthCode(clientId: string): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!window.google?.accounts?.oauth2) {
      reject(new Error("Google Sign-In is not available"))
      return
    }

    const client = window.google.accounts.oauth2.initCodeClient({
      client_id: clientId,
      scope: "openid email profile",
      ux_mode: "popup",
      callback: (response) => {
        if (response.error || !response.code) {
          reject(new Error(response.error_description || "Google sign-in was cancelled"))
          return
        }
        resolve(response.code)
      },
      error_callback: (error) => {
        if (error.type === "popup_closed") {
          reject(new Error("POPUP_CLOSED"))
          return
        }
        reject(new Error(error.message || "Google sign-in failed"))
      },
    })

    client.requestCode()
  })
}
