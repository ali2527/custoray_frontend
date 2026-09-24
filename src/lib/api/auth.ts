import { apiFetch } from "./client";
import type { EmployeePermissions } from "@/lib/employee-permissions";

export type CompanyMembership = {
  id: string;
  name: string;
  slug: string;
  plan: string;
  planCode: string;
  role: string;
  isOwner: boolean;
  logoUrl: string;
};

export type SessionPayload = {
  user: { id: string; email: string; name: string; isOwner: boolean; totpEnabled?: boolean };
  tenant: { id: string; name: string; slug: string };
  companies: CompanyMembership[];
  subscription: {
    status: string;
    trialEndsAt: string | null;
    currentPeriodEnd: string | null;
  };
  access: { allowed: boolean; status: string };
  trialRequest: { id: string; status: "pending" } | null;
  plan: {
    code: string;
    displayName: string;
    maxStores: number;
    maxUsers: number;
    maxProducts: number;
    priceMonthly: number;
  };
  permissions: EmployeePermissions;
  stores: Array<{ id: string; storeId: string; name: string; isDefault: boolean }>;
  branches?: Array<{ id: string; storeId: string; name: string; isDefault: boolean }>;
  organization?: { id: string; name: string; slug: string };
  activeCompanyId?: string;
  delegatedAccess?: { impersonatedBy: string; mode: "impersonation" } | null;
  companySettings: { name: string; currency: string } | null;
  onboarding: { steps: Record<string, boolean>; completedAt: string | null } | null;
};

export type AuthLoginResponse = {
  accessToken?: string;
  requiresTwoFactor?: boolean;
  challengeToken?: string;
  isNewUser?: boolean;
};

export type TotpStatus = {
  enabled: boolean;
  pending: boolean;
};

export type TotpSetup = {
  secret: string;
  otpauthUrl: string;
  qrDataUrl: string;
};

export async function apiSignup(input: {
  businessName: string;
  ownerName: string;
  email: string;
  phone: string;
  country: string;
  industry: string;
  password: string;
  planCode?: string;
}) {
  return apiFetch<{ accessToken: string }>("/auth/tenant/signup", {
    method: "POST",
    body: JSON.stringify({
      ...input,
      termsVersion: "2026-01-01",
      privacyVersion: "2026-01-01",
    }),
  });
}

export async function apiLogin(email: string, password: string) {
  return apiFetch<AuthLoginResponse>("/auth/tenant/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export async function apiGoogle(input: { code?: string; idToken?: string }) {
  return apiFetch<AuthLoginResponse>("/auth/google", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function apiVerifyTwoFactor(challengeToken: string, code: string) {
  return apiFetch<{ accessToken: string }>("/auth/2fa/verify", {
    method: "POST",
    body: JSON.stringify({ challengeToken, code }),
  });
}

export async function apiTotpStatus() {
  return apiFetch<TotpStatus>("/auth/2fa");
}

export async function apiTotpSetup() {
  return apiFetch<TotpSetup>("/auth/2fa/setup", { method: "POST" });
}

export async function apiTotpEnable(code: string) {
  return apiFetch<TotpStatus>("/auth/2fa/enable", {
    method: "POST",
    body: JSON.stringify({ code }),
  });
}

export async function apiTotpDisable(code: string) {
  return apiFetch<TotpStatus>("/auth/2fa/disable", {
    method: "POST",
    body: JSON.stringify({ code }),
  });
}

export async function apiMe() {
  return apiFetch<SessionPayload>("/auth/me");
}

export async function apiPatchAccount(input: {
  name?: string
  email?: string
  password?: string
}) {
  return apiFetch<{ id: string; email: string; name: string }>("/account", {
    method: "PATCH",
    body: JSON.stringify(input),
  })
}

export async function apiSwitchCompany(companyId: string) {
  return apiFetch<SessionPayload>("/auth/switch-company", {
    method: "POST",
    body: JSON.stringify({ companyId }),
  });
}

export async function apiCreateCompany(businessName: string, planCode?: string) {
  return apiFetch<SessionPayload>("/auth/companies", {
    method: "POST",
    body: JSON.stringify({ businessName, planCode }),
  });
}

export async function apiLogout() {
  return apiFetch<null>("/auth/logout", { method: "POST" });
}

export async function apiForgotPassword(email: string) {
  return apiFetch<null>("/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

export async function apiCheckout(
  planCode: string,
  interval: "monthly" | "yearly",
  returnTo?: string
) {
  return apiFetch<{ checkoutUrl: string | null; applied: boolean }>("/billing/checkout", {
    method: "POST",
    body: JSON.stringify({ planCode, interval, returnTo }),
  });
}

export async function apiConfirmCheckout(sessionId: string) {
  return apiFetch<{ confirmed: boolean }>("/billing/confirm", {
    method: "POST",
    body: JSON.stringify({ sessionId }),
  });
}

export async function apiBillingPortal() {
  return apiFetch<{ portalUrl: string }>("/billing/portal", {
    method: "POST",
  });
}

export async function apiRequestTrial(reason: string) {
  return apiFetch<{ id: string; status: "pending"; reason: string }>("/billing/trial-request", {
    method: "POST",
    body: JSON.stringify({ reason }),
  });
}

export async function apiPublicPlans() {
  return apiFetch<
    Array<{
      code: string;
      displayName: string;
      priceMonthly: number;
      maxStores: number;
      maxUsers: number;
      maxProducts: number;
      moduleAccess: string[];
    }>
  >("/public/plans");
}

export async function apiOnboardingProgress() {
  return apiFetch<{ steps: Record<string, boolean>; completedAt: string | null }>(
    "/onboarding/progress"
  );
}

export async function apiPatchOnboarding(steps: Record<string, boolean>) {
  return apiFetch<{ steps: Record<string, boolean>; completedAt: string | null }>(
    "/onboarding/progress",
    { method: "PATCH", body: JSON.stringify({ steps }) }
  );
}

export type CompanySettingsPayload = {
  name?: string;
  tagline?: string;
  address?: string;
  phone?: string;
  email?: string;
  logoUrl?: string;
  currency?: string;
};

export async function apiGetCompanySettings() {
  return apiFetch<{
    name: string;
    tagline: string;
    address: string;
    phone: string;
    email: string;
    logoUrl: string;
    currency: string;
  } | null>("/settings/company");
}

export async function apiPatchCompanySettings(data: CompanySettingsPayload) {
  return apiFetch("/settings/company", {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function apiBillingSummary() {
  return apiFetch<{
    plan: SessionPayload["plan"];
    subscription: SessionPayload["subscription"] & {
      cancelledAt?: string | null;
      stripeSubscriptionId?: string | null;
    };
    usage: { products: number; users: number; stores: number };
    billingCustomer: { id: string } | null;
    billingEnabled: boolean;
    recentInvoices: Array<{
      id: string;
      amount: number;
      pdfUrl: string | null;
      paidAt: string | null;
      createdAt: string;
    }>;
  }>("/billing/summary");
}
