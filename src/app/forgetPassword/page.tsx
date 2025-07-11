import { EmailForm  } from "@/components/emailForm"
import { ToggleButton } from "@/components/ui/toggleButton"

export default function ForgetPassword() {
  return (
      <div className=" flex min-h-svh flex-col items-center justify-center p-6 md:p-10">
            <div className="w-full max-w-sm md:max-w-3xl">
            <ToggleButton />
              <EmailForm />
            </div>
          </div>
  )
}
