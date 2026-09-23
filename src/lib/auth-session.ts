import type { EmployeePermissions } from "@/lib/employee-permissions"
import { FULL_PERMISSIONS, normalizePermissions } from "@/lib/employee-permissions"
import {
  EMPLOYEES_STORAGE_KEY,
  findEmployeeByPortalLogin,
  parsePersistedEmployees,
} from "@/lib/employees"

export const AUTH_SESSION_KEY = "custoray-auth-session-v1"

export type AuthSession = {
  userId: string
  name: string
  email: string
  isAdmin: boolean
  employeeId: number | null
  permissions: EmployeePermissions
  designation?: string
  tenantId?: string
}

/** Full-access demo session when no one is signed in. */
export const GUEST_SESSION: AuthSession = {
  userId: "guest",
  name: "Demo Admin",
  email: "Browse without signing in",
  isAdmin: true,
  employeeId: null,
  permissions: FULL_PERMISSIONS,
}

export type AuthUser = Pick<AuthSession, "name" | "email"> & {
  avatar: string
  isAdmin: boolean
  permissions: EmployeePermissions
  designation: string
}

export function loadSession(): AuthSession | null {
  if (typeof window === "undefined") return null
  try {
    const raw = window.localStorage.getItem(AUTH_SESSION_KEY)
    if (!raw) return null
    return JSON.parse(raw) as AuthSession
  } catch {
    return null
  }
}

export function saveSession(session: AuthSession): void {
  if (typeof window === "undefined") return
  window.localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(session))
}

export function clearSession(): void {
  if (typeof window === "undefined") return
  window.localStorage.removeItem(AUTH_SESSION_KEY)
}

export function sessionToNavUser(session: AuthSession): AuthUser {
  return {
    name: session.name,
    email: session.email,
    avatar: "",
    isAdmin: session.isAdmin,
    permissions: session.permissions,
    designation: session.designation?.trim() ?? "",
  }
}

export function authenticateCredentials(
  email: string,
  password: string
): AuthSession | null {
  const normalized = email.trim().toLowerCase()

  const employees =
    parsePersistedEmployees(
      typeof window !== "undefined"
        ? window.localStorage.getItem(EMPLOYEES_STORAGE_KEY)
        : null
    ) ??
    parsePersistedEmployees(
      typeof window !== "undefined"
        ? window.localStorage.getItem("custoray-employees-v1")
        : null
    ) ??
    []

  const employee = findEmployeeByPortalLogin(employees, normalized, password)
  if (!employee) return null

  return {
    userId: `employee-${employee.id}`,
    name: employee.name,
    email: employee.portalEmail,
    isAdmin: normalizePermissions(employee.permissions).admin,
    employeeId: employee.id,
    permissions: normalizePermissions(employee.permissions),
    designation:
      employee.designation.trim() && employee.designation !== "—"
        ? employee.designation.trim()
        : "",
  }
}
