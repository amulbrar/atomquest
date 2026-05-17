"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner"

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      })
      if (result?.error) {
        toast.error("Invalid email or password")
      } else {
        router.push("/")
        router.refresh()
      }
    } finally {
      setLoading(false)
    }
  }

  const hasEntra =
    typeof window !== "undefined" &&
    process.env.NEXT_PUBLIC_DEMO_MODE !== "true"

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/40 p-4">
      <div className="w-full max-w-md space-y-4">
        {/* Logo / branding */}
        <div className="text-center space-y-1">
          <div className="inline-flex items-center justify-center size-12 rounded-xl bg-primary text-primary-foreground font-bold text-xl">
            AQ
          </div>
          <h1 className="text-2xl font-bold">AtomQuest</h1>
          <p className="text-sm text-muted-foreground">
            Goal Setting &amp; Tracking Portal
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Sign in</CardTitle>
            <CardDescription>
              Use your organisation email and password
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@atomquest.demo"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Signing in…" : "Sign in"}
              </Button>
            </form>

            {hasEntra && (
              <>
                <div className="relative">
                  <Separator />
                  <span className="absolute inset-0 flex items-center justify-center">
                    <span className="bg-card px-2 text-xs text-muted-foreground">
                      or
                    </span>
                  </span>
                </div>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => signIn("microsoft-entra-id")}
                >
                  Continue with Microsoft
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        {/* Demo credentials hint */}
        <p className="text-center text-xs text-muted-foreground">
          Demo: admin@atomquest.demo · Manager@1234
        </p>
      </div>
    </div>
  )
}
