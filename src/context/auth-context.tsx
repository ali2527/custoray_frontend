"use client"

import * as React from "react"
import { usePathname, useRouter } from "next/navigation"
import { toast } from "sonner"

import {
  clearSession,
  GUEST_SESSION,
  saveSession,
  sessionToNavUser,
  type AuthSession,
  type AuthUser,
} from "@/lib/auth-session"
import {
  apiCreateCompany,
  apiGoogle,
  apiLogin,
  apiLogout,
  apiMe,
  apiSignup,
  apiSwitchCompany,
  apiVerifyTwoFactor,
  type CompanyMembership,
  type SessionPayload,
} from "@/lib/api/auth"
import {
  clearTwoFactorChallenge,
  loadTwoFactorChallenge,
  saveTwoFactorChallenge,
} from "@/lib/two-factor"
import {
  loadActiveCompanyId,
  loadLocalCompanies,
  saveActiveCompanyId,
  saveLocalCompanies,
} from "@/lib/company-memberships"
import { accessFromSession, type AccessInfo } from "@/lib/subscription-access"
import {
  canAdmin,
  canDelete,
  canEdit,
  canView,
} from "@/lib/employee-permissions"

type LoginResult =
  | { ok: true; accessAllowed: boolean; requiresTwoFactor?: false }
  | { ok: true; accessAllowed: false; requiresTwoFactor: true }
  | { ok: false; error: string }

type GoogleLoginResult =
  | { ok: true; accessAllowed: boolean; isNewUser: boolean; requiresTwoFactor?: false }
  | { ok: true; accessAllowed: false; isNewUser: false; requiresTwoFactor: true }
  | { ok: false; error: string }

type SignupInput = {
  businessName: string
  ownerName: string
  email: string
  phone: string
  country: string
  industry: string
  password: string
  planCode?: string
}

type AuthContextValue = {
  session: AuthSession | null
  activeSession: AuthSession
  isAuthenticated: boolean
  user: AuthUser
  hydrated: boolean
  companies: CompanyMembership[]
  activeCompany: CompanyMembership | null
  access: AccessInfo | null
  login: (email: string, password: string) => Promise<LoginResult>
  signup: (input: SignupInput) => Promise<LoginResult>
  loginWithGoogle: (input: { code?: string; idToken?: string }) => Promise<GoogleLoginResult>
  completeTwoFactor: (code: string) => Promise<LoginResult>
  logout: (redirectTo?: string) => void
  refreshAccess: () => Promise<AccessInfo | null>
  switchCompany: (companyId: string) => Promise<void>
  createCompany: (businessName: string) => Promise<void>
  canView: boolean
  canEdit: boolean
  canDelete: boolean
  canAdmin: boolean
}

const AuthContext = React.createContext<AuthContextValue | null>(null)

function sessionFromMe(me: SessionPayload): AuthSession {
  const membership =
    me.companies?.find((company) => company.id === me.activeCompanyId) ??
    me.companies?.find((company) => company.id === me.tenant.id) ??
    me.companies?.[0]
  return {
    userId: me.user.id,
    name: me.user.name,
    email: me.user.email,
    isAdmin: me.user.isOwner || me.permissions.admin,
    employeeId: null,
    permissions: me.permissions,
    designation: membership?.role?.trim() || (me.user.isOwner ? "Owner" : ""),
    tenantId: me.tenant.id,
  }
}

function companiesFromMe(me: SessionPayload): CompanyMembership[] {
  if (me.companies?.length) return me.companies
  return [
    {
      id: me.activeCompanyId || me.tenant.id,
      name: me.companySettings?.name || me.tenant.name,
      slug: me.tenant.slug,
      plan: me.plan.displayName,
      planCode: me.plan.code,
      role: me.user.isOwner ? "Owner" : "Member",
      isOwner: me.user.isOwner,
      logoUrl: "",
    },
  ]
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [session, setSession] = React.useState<AuthSession | null>(null)
  const [companies, setCompanies] = React.useState<CompanyMembership[]>([])
  const [activeCompanyId, setActiveCompanyId] = React.useState<string | null>(null)
  const [access, setAccess] = React.useState<AccessInfo | null>(null)
  const [hydrated, setHydrated] = React.useState(false)

  const applyRemoteSession = React.useCallback((me: SessionPayload) => {
    const nextSession = sessionFromMe(me)
    const nextCompanies = companiesFromMe(me)
    const nextAccess = accessFromSession(me)
    saveSession(nextSession)
    setSession(nextSession)
    setCompanies(nextCompanies)
    const nextCompanyId =
      me.activeCompanyId && nextCompanies.some((company) => company.id === me.activeCompanyId)
        ? me.activeCompanyId
        : nextCompanies[0]?.id ?? me.tenant.id
    setActiveCompanyId(nextCompanyId)
    saveActiveCompanyId(nextCompanyId)
    setAccess(nextAccess)
    return nextAccess
  }, [])

  React.useEffect(() => {
    apiMe()
      .then((me) => applyRemoteSession(me))
      .catch(() => {
        clearSession()
        setSession(null)
        setAccess(null)
      })
      .finally(() => setHydrated(true))
  }, [applyRemoteSession])

  const logout = React.useCallback(
    async (redirectTo?: string) => {
      const path = typeof redirectTo === "string" && redirectTo.startsWith("/") ? redirectTo : "/"
      try {
        await apiLogout()
      } catch {
        /* ignore */
      }
      clearSession()
      clearTwoFactorChallenge()
      setSession(null)
      setAccess(null)
      const localCompanies = loadLocalCompanies()
      setCompanies(localCompanies)
      setActiveCompanyId(loadActiveCompanyId(localCompanies))
      router.push(path)
    },
    [router]
  )

  const logoutExpired = React.useCallback(() => {
    toast.error("Your trial has ended. Sign in to continue.")
    void logout("/?expired=1")
  }, [logout])

  React.useEffect(() => {
    if (!access?.allowed || access.status !== "TRIAL" || !access.trialEndsAt) return
    const ms = new Date(access.trialEndsAt).getTime() - Date.now()
    if (ms <= 0) return
    const id = window.setTimeout(logoutExpired, ms)
    return () => window.clearTimeout(id)
  }, [access, logoutExpired])

  React.useEffect(() => {
    const onBlocked = () => {
      if (pathname === "/trial-ended" || pathname?.startsWith("/trial-ended")) return
      if (pathname === "/" || pathname === "/signup") return
      logoutExpired()
    }
    const onSessionExpired = () => {
      clearSession()
      clearTwoFactorChallenge()
      setSession(null)
      setAccess(null)
      const stay =
        pathname === "/" ||
        pathname === "/signup" ||
        pathname === "/2fa" ||
        pathname === "/pricing" ||
        pathname === "/forgetPassword" ||
        pathname === "/resetCode" ||
        pathname === "/resetPassword" ||
        Boolean(pathname?.startsWith("/legal"))
      if (!stay) router.replace("/")
    }
    window.addEventListener("custoray:access-blocked", onBlocked)
    window.addEventListener("custoray:session-expired", onSessionExpired)
    return () => {
      window.removeEventListener("custoray:access-blocked", onBlocked)
      window.removeEventListener("custoray:session-expired", onSessionExpired)
    }
  }, [pathname, logoutExpired, router])

  const login = React.useCallback(
    async (email: string, password: string): Promise<LoginResult> => {
      const trimmedEmail = email.trim()
      if (!trimmedEmail || !password) {
        return { ok: false, error: "Email and password are required." }
      }

      try {
        const data = await apiLogin(trimmedEmail, password)
        if (data.requiresTwoFactor) {
          if (!data.challengeToken) {
            return { ok: false, error: "Authenticator challenge missing. Try again." }
          }
          clearSession()
          setSession(null)
          setAccess(null)
          saveTwoFactorChallenge(data.challengeToken)
          return { ok: true, accessAllowed: false, requiresTwoFactor: true }
        }
        const me = await apiMe()
        const nextAccess = applyRemoteSession(me)
        return { ok: true, accessAllowed: nextAccess.allowed }
      } catch (err) {
        return {
          ok: false,
          error: err instanceof Error ? err.message : "Login failed",
        }
      }
    },
    [applyRemoteSession]
  )

  const signup = React.useCallback(
    async (input: SignupInput): Promise<LoginResult> => {
      try {
        await apiSignup(input)
        const me = await apiMe()
        const nextAccess = applyRemoteSession(me)
        return { ok: true, accessAllowed: nextAccess.allowed }
      } catch (err) {
        return {
          ok: false,
          error: err instanceof Error ? err.message : "Signup failed",
        }
      }
    },
    [applyRemoteSession]
  )

  const loginWithGoogle = React.useCallback(
    async (input: { code?: string; idToken?: string }): Promise<GoogleLoginResult> => {
      try {
        const data = await apiGoogle(input)
        if (data.requiresTwoFactor) {
          if (!data.challengeToken) {
            return { ok: false, error: "Authenticator challenge missing. Try again." }
          }
          clearSession()
          setSession(null)
          setAccess(null)
          saveTwoFactorChallenge(data.challengeToken)
          return {
            ok: true,
            accessAllowed: false,
            isNewUser: false,
            requiresTwoFactor: true,
          }
        }
        const me = await apiMe()
        const nextAccess = applyRemoteSession(me)
        return {
          ok: true,
          accessAllowed: nextAccess.allowed,
          isNewUser: Boolean(data.isNewUser),
        }
      } catch (err) {
        return {
          ok: false,
          error: err instanceof Error ? err.message : "Google sign-in failed",
        }
      }
    },
    [applyRemoteSession]
  )

  const completeTwoFactor = React.useCallback(
    async (code: string): Promise<LoginResult> => {
      const challengeToken = loadTwoFactorChallenge()
      if (!challengeToken) {
        return { ok: false, error: "Authenticator session expired. Sign in again." }
      }
      try {
        await apiVerifyTwoFactor(challengeToken, code)
        clearTwoFactorChallenge()
        const me = await apiMe()
        const nextAccess = applyRemoteSession(me)
        return { ok: true, accessAllowed: nextAccess.allowed }
      } catch (err) {
        return {
          ok: false,
          error: err instanceof Error ? err.message : "Invalid authenticator code",
        }
      }
    },
    [applyRemoteSession]
  )

  const refreshAccess = React.useCallback(async () => {
    try {
      const me = await apiMe()
      return applyRemoteSession(me)
    } catch {
      return access
    }
  }, [access, applyRemoteSession])

  const switchCompany = React.useCallback(
    async (companyId: string) => {
      if (!session) return
      const me = await apiSwitchCompany(companyId)
      const nextAccess = applyRemoteSession(me)
      window.location.assign(nextAccess.allowed ? "/home" : "/trial-ended")
    },
    [session, applyRemoteSession]
  )

  const createCompany = React.useCallback(
    async (businessName: string) => {
      const name = businessName.trim()
      if (!name) throw new Error("Company name is required.")
      if (!session) throw new Error("Sign in required.")

      const me = await apiCreateCompany(name)
      const nextAccess = applyRemoteSession(me)
      window.location.assign(nextAccess.allowed ? "/home" : "/trial-ended")
    },
    [session, applyRemoteSession]
  )

  const activeSession = session ?? GUEST_SESSION
  const permissions = activeSession.permissions
  const isAuthenticated = session !== null
  const activeCompany =
    companies.find((company) => company.id === activeCompanyId) ?? companies[0] ?? null

  const value = React.useMemo<AuthContextValue>(
    () => ({
      session,
      activeSession,
      isAuthenticated,
      user: sessionToNavUser(activeSession),
      hydrated,
      companies,
      activeCompany,
      access,
      login,
      signup,
      loginWithGoogle,
      completeTwoFactor,
      logout,
      refreshAccess,
      switchCompany,
      createCompany,
      canView: canView(permissions),
      canEdit: canEdit(permissions),
      canDelete: canDelete(permissions),
      canAdmin: canAdmin(permissions),
    }),
    [
      session,
      activeSession,
      isAuthenticated,
      hydrated,
      companies,
      activeCompany,
      access,
      login,
      signup,
      loginWithGoogle,
      completeTwoFactor,
      logout,
      refreshAccess,
      switchCompany,
      createCompany,
      permissions,
    ]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = React.useContext(AuthContext)
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider")
  }
  return ctx
}
