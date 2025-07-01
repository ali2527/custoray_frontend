"use client"
import Image from "next/image"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useTheme } from "next-themes"
import { use } from "react"

export function LoginForm({ className, ...props }: React.ComponentProps<"div">) {
      const { resolvedTheme } = useTheme()


  return (
    <div className={cn("flex justify-center items-center min-h-screen px-4", className)} {...props}>
      <Card className="w-full max-w-5xl shadow-lg p-4">
        <div className="grid grid-cols-1 md:grid-cols-2">
          {/* Left: Form Section */}
          <div className="p-8 md:px-10 md:pl-8">
             <Image
      src={resolvedTheme === "dark" ? "/assets/logo-3.png" : "/assets/logo-2.png"}
              alt="logo"
              height={50}
              width={150}
              className="ml-[-10px] mb-8 "
            />
            <CardHeader className="p-0 mb-6">
            
              <CardTitle className="text-2xl">   Login to your account</CardTitle>
              <CardDescription>
                Enter your email below to log in
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <form className="flex flex-col gap-6">
                <div className="grid gap-3">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" placeholder="you@example.com" required />
                </div>
                <div className="grid gap-3">
                  <div className="flex items-center">
                    <Label htmlFor="password">Password</Label>
                    <a href="#" className="ml-auto text-sm underline-offset-4 hover:underline">
                      Forgot password?
                    </a>
                  </div>
                  <Input id="password" type="password" required />
                </div>
                <div className="flex flex-col gap-3">
                  <Button type="submit" className="w-full">Login</Button>
                </div>
                <div className="mt-4 text-center text-sm">
                  Don&apos;t have an account?{" "}
                  <a href="#" className="underline underline-offset-4">Sign up</a>
                </div>
              </form>
            </CardContent>
          </div>

          {/* Right: Image Section */}
          <div className="hidden md:block relative">
            <Image
              src="/assets/stock.jpg" // Change this path to your image
              alt="inventory Illustration"
              fill
              className="object-cover rounded-lg shadow"
            />
          </div>
        </div>
      </Card>
    </div>
  )
}
