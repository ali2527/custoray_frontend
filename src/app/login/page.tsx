import { LoginForm } from "@/components/login-form"
import { ToggleButton } from "@/components/ui/toggleButton"

export default function Page() {
  return (
    <div className="flex min-h-svh w-full items-center justify-center px-0 py-4 md:p-10">
      <ToggleButton />
      <div className="w-full max-w-4xl">
        <LoginForm />
      </div>
    </div>
  )
}
