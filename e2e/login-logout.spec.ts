import { expect, test, type Page, type Response } from "@playwright/test"

const API = process.env.E2E_API_URL ?? "http://localhost:3034/api/v1"
const OWNER_PASSWORD = "LogoutFlow1"
const SECOND_PASSWORD = "LogoutFlow2"
let ownerEmail = ""

test.beforeAll(async ({ request }) => {
  ownerEmail = "e2e-login-flow@mailinator.com"
  const existing = await request.post(`${API}/auth/tenant/login`, {
    data: { email: ownerEmail, password: OWNER_PASSWORD },
  })
  if (existing.status() === 200) return

  const response = await request.post(`${API}/auth/tenant/signup`, {
    data: {
      businessName: "Login Flow Co",
      ownerName: "Login Flow",
      email: ownerEmail,
      phone: "03001234567",
      country: "Pakistan",
      industry: "Retail",
      password: OWNER_PASSWORD,
      termsVersion: "2026-01-01",
      privacyVersion: "2026-01-01",
    },
  })
  expect([201, 409]).toContain(response.status())
})

test.beforeEach(async ({ page }) => {
  await page.goto("/")
  await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible()
})

test("blank email and password stay on the login page", async ({ page }) => {
  await showCase(page, "1. Blank email and password")
  await page.getByRole("button", { name: "Log in" }).click()
  await expect(page).toHaveURL(/\/$/)
  const message = await page.locator("#email").evaluate((el: HTMLInputElement) => el.validationMessage)
  expect(message.length).toBeGreaterThan(0)
})

test("a malformed email is blocked before any request", async ({ page }) => {
  await showCase(page, "2. Malformed email")
  await page.locator("#email").fill("not-an-email")
  await page.locator("#password").fill("whatever")
  await page.getByRole("button", { name: "Log in" }).click()
  await expect(page).toHaveURL(/\/$/)
  const message = await page.locator("#email").evaluate((el: HTMLInputElement) => el.validationMessage)
  expect(message.length).toBeGreaterThan(0)
})

test("an unknown account shows account not found", async ({ page }) => {
  await showCase(page, "3. Unknown account")
  await page.locator("#email").fill(`missing-${Date.now().toString(36)}@mailinator.com`)
  await page.locator("#password").fill("whatever-password")
  const response = await submitLogin(page)
  expect(response.status()).toBe(404)
  await expect(page.getByText("User account not found")).toBeVisible()
  await expect(page).toHaveURL(/\/$/)
})

test("a wrong password shows invalid credentials", async ({ page }) => {
  await showCase(page, "4. Wrong password")
  await page.locator("#email").fill(ownerEmail)
  await page.locator("#password").fill("not-the-password")
  const response = await submitLogin(page)
  expect(response.status()).toBe(401)
  await expect(page.getByText("Invalid credentials")).toBeVisible()
  await expect(page).toHaveURL(/\/$/)
})

test("a valid login keeps the token only in an httpOnly cookie and opens home", async ({ page }) => {
  await showCase(page, "5. Valid login")
  const response = page.waitForResponse(
    (item) => item.url().includes("/auth/tenant/login") && item.request().method() === "POST"
  )
  await loginAs(page, ownerEmail, OWNER_PASSWORD)
  const body = (await (await response).json()) as { data?: { accessToken?: string } }
  expect(body.data?.accessToken).toBeUndefined()

  expect(await page.evaluate(() => document.cookie.includes("accessToken"))).toBe(false)
  const access = await accessCookie(page)
  expect(access.httpOnly).toBe(true)
  const ttlSeconds = access.expires - Date.now() / 1000
  expect(ttlSeconds).toBeGreaterThan(60)
  expect(ttlSeconds).toBeLessThan(20 * 60)

  await page.getByRole("button", { name: "Account menu" }).click()
  await expect(page.getByText(ownerEmail)).toBeVisible()
})

test("an open session visiting login returns to home", async ({ page }) => {
  await showCase(page, "6. Already signed in")
  await loginAs(page, ownerEmail, OWNER_PASSWORD)
  await page.goto("/")
  await expect(page).toHaveURL(/\/home/, { timeout: 20_000 })
})

test("logout clears both cookies and returns to login", async ({ page }) => {
  await showCase(page, "7. Logout")
  await loginAs(page, ownerEmail, OWNER_PASSWORD)
  await page.getByRole("button", { name: "Account menu" }).click()
  await page.getByRole("menuitem", { name: "Log out" }).click()
  await page.waitForURL(/\/$/)
  await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible()
  expect(await page.evaluate(() => document.cookie.includes("accessToken"))).toBe(false)
  const names = (await page.context().cookies()).map((cookie) => cookie.name)
  expect(names).not.toContain("accessToken")
  expect(names).not.toContain("refreshToken")
  const me = await page.evaluate(async (api) => {
    const res = await fetch(`${api}/auth/me`, { credentials: "include" })
    return res.status
  }, API)
  expect(me).toBe(401)
})

test("home after logout sends the browser back to login", async ({ page }) => {
  await showCase(page, "8. Protected page after logout")
  await loginAs(page, ownerEmail, OWNER_PASSWORD)
  await page.getByRole("button", { name: "Account menu" }).click()
  await page.getByRole("menuitem", { name: "Log out" }).click()
  await page.waitForURL(/\/$/)
  await page.goto("/home")
  await expect(page).toHaveURL(/\/$/)
  await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible()
})

test("logout with no session still succeeds", async ({ page }) => {
  await showCase(page, "9. Logout with no session")
  const status = await page.evaluate(async (api) => {
    const res = await fetch(`${api}/auth/logout`, { method: "POST", credentials: "include" })
    return res.status
  }, API)
  expect(status).toBe(200)
  await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible()
})

test("a second account replaces the previous session", async ({ page }) => {
  await showCase(page, "10. Switch accounts")
  const email = `logout-flow-${Date.now().toString(36)}@mailinator.com`
  const signup = await page.evaluate(
    async ({ api, email, password }) => {
      const res = await fetch(`${api}/auth/tenant/signup`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessName: "Logout Flow Co",
          ownerName: "Logout Flow",
          email,
          phone: "03001234567",
          country: "Pakistan",
          industry: "Retail",
          password,
          termsVersion: "2026-01-01",
          privacyVersion: "2026-01-01",
        }),
      })
      const json = await res.json()
      return { status: res.status, accessToken: json?.data?.accessToken ?? null }
    },
    { api: API, email, password: SECOND_PASSWORD }
  )
  expect(signup.status).toBe(201)
  expect(signup.accessToken).toBeNull()

  await page.evaluate(async (api) => {
    await fetch(`${api}/auth/logout`, { method: "POST", credentials: "include" })
  }, API)
  await page.goto("/")
  await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible()
  await loginAs(page, email, SECOND_PASSWORD)
  await page.getByRole("button", { name: "Account menu" }).click()
  await expect(page.getByText(email)).toBeVisible()
  await expect(page.getByText(ownerEmail)).toHaveCount(0)
  await page.getByRole("menuitem", { name: "Log out" }).click()
  await page.waitForURL(/\/$/)

  await loginAs(page, ownerEmail, OWNER_PASSWORD)
  await page.getByRole("button", { name: "Account menu" }).click()
  await expect(page.getByText(ownerEmail)).toBeVisible()
  await expect(page.getByText(email)).toHaveCount(0)
})

test("the authenticator page without a challenge returns to login", async ({ page }) => {
  await showCase(page, "11. Authenticator page with no challenge")
  await page.goto("/2fa")
  await expect(page).toHaveURL(/\/$/)
  await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible()
})

test("Google does not sign the user in by itself", async ({ page }) => {
  await showCase(page, "12. Google button")
  const google = page.getByRole("button", { name: /continue with google/i })
  await expect(google).toBeVisible()
  const popupPromise = page.waitForEvent("popup", { timeout: 8_000 }).catch(() => null)
  await google.click()
  const popup = await popupPromise
  if (popup) await popup.close()
  await expect(page).toHaveURL(/\/$/)
  await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible()
})

async function dismissWelcome(page: Page) {
  const skip = page.getByRole("button", { name: "Skip for now" })
  try {
    await skip.waitFor({ state: "visible", timeout: 8_000 })
    await skip.click()
  } catch {
    /* Welcome is already closed for this session. */
  }
}

async function loginAs(page: Page, email: string, password: string) {
  await page.locator("#email").fill(email)
  await page.locator("#password").fill(password)
  const response = await submitLogin(page)
  expect(response.status()).toBe(200)
  await expect(page).toHaveURL(/\/home/)
  await dismissWelcome(page)
}

async function submitLogin(page: Page): Promise<Response> {
  const pending = page.waitForResponse(
    (response) =>
      response.url().includes("/auth/tenant/login") && response.request().method() === "POST"
  )
  await page.locator("form").evaluate((form: HTMLFormElement) => form.requestSubmit())
  return pending
}

async function showCase(page: Page, title: string) {
  await page.evaluate((text) => {
    let banner = document.getElementById("e2e-case")
    if (!banner) {
      banner = document.createElement("div")
      banner.id = "e2e-case"
      banner.style.cssText =
        "position:fixed;bottom:0;left:0;right:0;z-index:2147483647;pointer-events:none;background:#111;color:#fff;padding:12px 16px;font:600 18px/1.3 sans-serif"
      document.body.appendChild(banner)
    }
    banner.textContent = text
  }, title)
}

async function accessCookie(page: Page) {
  const cookies = await page.context().cookies()
  const access = cookies.find((cookie) => cookie.name === "accessToken")
  expect(access).toBeTruthy()
  return access!
}
