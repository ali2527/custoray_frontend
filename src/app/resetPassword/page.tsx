import { ResetForm  } from "@/components/resetForm"
import { ToggleButton } from "@/components/ui/toggleButton"

export default function ResetPassword() {
  return (
     <div className=" flex min-h-svh flex-col items-center justify-center p-6 md:p-10">
         <div className="w-full max-w-sm md:max-w-3xl">
         <ToggleButton />
           <ResetForm />
         </div>
       </div>
  )
}
