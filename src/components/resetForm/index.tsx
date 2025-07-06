"use client"
import { cn } from "@/lib/utils"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import {
  Card, CardContent, CardDescription,
  CardTitle,
} from "@/components/ui/card"
import { PasswordInput } from "@/components/ui/password-input"
import Link from 'next/link'
import { Input } from "@/components/ui/input" 
import { Label } from "@/components/ui/label"
import { useTheme } from "next-themes"

export function ResetForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const { resolvedTheme } = useTheme()


  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card className="overflow-hidden p-0">
        <CardContent className="grid p-0 md:grid-cols-2">
          <form className="p-6 md:p-8">
            <div className="flex flex-col justify-center gap-6 min-h-100">
               
              <div className="flex flex-col">
                <CardTitle className="text-lg">Reset Password</CardTitle>
              <CardDescription className="text-xs">
Enter your new password to reset your password.              </CardDescription>


              </div>
           
              <div className="grid gap-3">
                <div className="flex items-center">
                  <Label htmlFor="password">New Password</Label>
                </div>
                <PasswordInput
					id="current_password"
					autoComplete="current-password"
          placeholder="***********"
				/>
              </div>
               <div className="grid gap-3">
                <div className="flex items-center">
                  <Label htmlFor="password">Confirm Password</Label>
                </div>
                <PasswordInput
					id="current_password"
					autoComplete="current-password"
          placeholder="***********"
				/>
              </div>
              <Button type="submit" className="w-full bg-[#8cc91a] hover:bg-[black] text-white">
                Reset Password
              </Button>

              <div className="text-center text-sm">
                Already have an account?{" "}
                <a href="#" className="underline underline-offset-4">
                  Sign In
                </a>
              </div>
            </div>
          </form>
          <div className="bg-muted relative hidden flex flex-col justify-center md:flex">
            {resolvedTheme ? <Image
                src={resolvedTheme == "dark" ? "/assets/logo-3.png" : "/assets/logo-2.png"}
                alt="logo"
                height={50}
                width={140}
                className="absolute bottom-0 right-0 p-4 z-10"
              /> : <div className="h-10 w-32 bg-transparent animate-pulse rounded-md mb-12"></div>}
            <Image
              src="/assets/resetPassword.png" // Change this path to your image
              alt="reset password Illustration"
              height={500}
              width={500}
              className="cover "
            />
          </div>
        </CardContent>
      </Card>
      <div className="text-muted-foreground *:[a]:hover:text-primary text-center text-xs text-balance *:[a]:underline *:[a]:underline-offset-4">
        By clicking continue, you agree to our <a href="#">Terms of Service</a>{" "}
        and <a href="#">Privacy Policy</a>.
      </div>
    </div>
  )
}
