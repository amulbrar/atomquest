"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { ArrowRight, Eye, EyeOff } from "lucide-react"

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

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
    <div className="min-h-screen grid md:grid-cols-[1.1fr_1fr] bg-background">
      {/* ── Editorial column ─────────────────────────────────────────────── */}
      <aside className="relative hidden md:flex flex-col justify-between p-12 lg:p-16 bg-primary text-primary-foreground overflow-hidden">
        {/* Layered atmosphere */}
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              "radial-gradient(circle at 80% 10%, oklch(0.55 0.12 50 / 0.35), transparent 55%), radial-gradient(circle at 10% 90%, oklch(0.28 0.05 200 / 0.4), transparent 55%)",
          }}
        />
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.04] mix-blend-overlay"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence baseFrequency='0.9' /%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' /%3E%3C/svg%3E\")",
          }}
        />

        <div className="relative flex items-center gap-3">
          <Mark />
          <span className="font-serif text-lg tracking-tight">AtomQuest</span>
        </div>

        <div className="relative max-w-md space-y-8">
          <p className="eyebrow text-primary-foreground/70">Performance · FY26</p>
          <h2 className="font-serif text-5xl lg:text-6xl leading-[1.02] tracking-tight">
            What gets <em className="italic font-normal text-primary-foreground/95">measured</em>, gets refined.
          </h2>
          <p className="text-primary-foreground/75 text-[15px] leading-relaxed max-w-sm">
            Set deliberate goals. Review them quarterly. See your year take
            shape — line by line, quarter by quarter.
          </p>
        </div>

        <div className="relative grid grid-cols-3 gap-6 text-sm">
          <Stat n="8" label="Goals per cycle" />
          <Stat n="100%" label="Weightage balance" />
          <Stat n="4" label="Quarterly check-ins" />
        </div>
      </aside>

      {/* ── Form column ──────────────────────────────────────────────────── */}
      <section className="flex items-center justify-center p-6 md:p-10">
        <div className="w-full max-w-sm">
          <div className="md:hidden flex items-center gap-2 mb-10">
            <Mark className="text-primary" dark />
            <span className="font-serif text-lg tracking-tight">AtomQuest</span>
          </div>

          <div className="space-y-1.5 mb-8">
            <p className="eyebrow">Sign in</p>
            <h1 className="font-serif text-3xl tracking-tight">
              Welcome back.
            </h1>
            <p className="text-sm text-muted-foreground">
              Use your organisation email and password to continue.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-xs uppercase tracking-[0.12em] text-muted-foreground font-medium">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="you@atomquest.demo"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-11 bg-card border-border/80 focus-visible:ring-1 focus-visible:ring-ring focus-visible:border-ring"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-xs uppercase tracking-[0.12em] text-muted-foreground font-medium">
                Password
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-11 bg-card border-border/80 pr-10 focus-visible:ring-1 focus-visible:ring-ring focus-visible:border-ring"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-muted-foreground transition-colors cursor-pointer"
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-11 gap-2 group"
              disabled={loading}
            >
              {loading ? "Signing in…" : "Continue"}
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
            </Button>
          </form>

          {hasEntra && (
            <>
              <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
                <span className="h-px flex-1 bg-border" />
                <span className="uppercase tracking-[0.18em]">or</span>
                <span className="h-px flex-1 bg-border" />
              </div>
              <Button
                variant="outline"
                className="w-full h-11"
                onClick={() => signIn("microsoft-entra-id")}
              >
                Continue with Microsoft
              </Button>
            </>
          )}

          <div className="mt-10 pt-6 border-t border-border/70 text-xs text-muted-foreground space-y-1">
            <p className="eyebrow !text-[0.6rem]">Demo access</p>
            <p className="font-mono tabular text-[11px]">
              admin@atomquest.demo · Admin@1234
            </p>
            <p className="font-mono tabular text-[11px]">
              priya.sharma@atomquest.demo · Manager@1234
            </p>
            <p className="font-mono tabular text-[11px]">
              ananya.iyer@atomquest.demo · Employee@1234
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}

function Mark({ className = "", dark = false }: { className?: string; dark?: boolean }) {
  return (
    <span
      className={
        "inline-flex items-center justify-center size-9 rounded-sm font-serif text-base font-medium " +
        (dark
          ? "bg-primary text-primary-foreground "
          : "bg-primary-foreground/10 text-primary-foreground ring-1 ring-primary-foreground/20 ") +
        className
      }
    >
      AQ
    </span>
  )
}

function Stat({ n, label }: { n: string; label: string }) {
  return (
    <div className="space-y-1">
      <div className="num-display text-3xl text-primary-foreground/95">{n}</div>
      <div className="text-[11px] uppercase tracking-[0.14em] text-primary-foreground/55">
        {label}
      </div>
    </div>
  )
}
