import { redirect } from "next/navigation"

/** Legacy OTP reset UI removed — password reset uses emailed secure links. */
export default function ResetCodePage() {
  redirect("/forgetPassword")
}
