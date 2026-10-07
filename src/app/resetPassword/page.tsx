import { redirect } from "next/navigation"

/** Canonical route is /reset-password (matches emailed reset links). */
export default async function ResetPasswordLegacyRedirect({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>
}) {
  const params = await searchParams
  const token = params.token?.trim()
  if (token) {
    redirect(`/reset-password?token=${encodeURIComponent(token)}`)
  }
  redirect("/forgetPassword")
}
