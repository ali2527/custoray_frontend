const GSI_SRC = "https://accounts.google.com/gsi/client"

/** Public OAuth web client ID (safe in the browser). Override with NEXT_PUBLIC_GOOGLE_CLIENT_ID. */
const DEFAULT_GOOGLE_CLIENT_ID =
  "443586063307-al3jbtkvpr7sjinm545i5vt4jjjilbjv.apps.googleusercontent.com"

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

export function getGoogleClientId() {
  return (process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || DEFAULT_GOOGLE_CLIENT_ID).trim()
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
