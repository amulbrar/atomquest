"use client"

import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ChevronDown, Loader2 } from "lucide-react"
import { useState } from "react"

// Demo only — passwords are intentionally in the client bundle
const DEMO_USERS = [
  { email: "admin@atomquest.demo", name: "Admin User", role: "admin" as const, password: "Admin@1234" },
  { email: "priya.sharma@atomquest.demo", name: "Priya Sharma", role: "manager" as const, password: "Manager@1234" },
  { email: "arjun.mehta@atomquest.demo", name: "Arjun Mehta", role: "manager" as const, password: "Manager@1234" },
  { email: "ananya.iyer@atomquest.demo", name: "Ananya Iyer", role: "employee" as const, password: "Employee@1234" },
  { email: "rohan.gupta@atomquest.demo", name: "Rohan Gupta", role: "employee" as const, password: "Employee@1234" },
  { email: "karan.singh@atomquest.demo", name: "Karan Singh", role: "employee" as const, password: "Employee@1234" },
]

const ROLE_COLORS = {
  admin: "destructive",
  manager: "secondary",
  employee: "outline",
} as const

interface RoleSwitcherProps {
  currentEmail: string
}

export function RoleSwitcher({ currentEmail }: RoleSwitcherProps) {
  const router = useRouter()
  const [switching, setSwitching] = useState(false)

  async function switchTo(user: (typeof DEMO_USERS)[number]) {
    setSwitching(true)
    try {
      await signIn("credentials", {
        email: user.email,
        password: user.password,
        redirect: false,
      })
      router.push("/")
      router.refresh()
    } finally {
      setSwitching(false)
    }
  }

  const current = DEMO_USERS.find((u) => u.email === currentEmail)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5" disabled={switching}>
          {switching ? (
            <Loader2 className="size-3 animate-spin" />
          ) : (
            <span className="text-xs font-normal text-muted-foreground">Demo</span>
          )}
          <Badge variant={ROLE_COLORS[current?.role ?? "employee"]} className="text-xs">
            {current?.role ?? "?"}
          </Badge>
          <ChevronDown className="size-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="text-xs text-muted-foreground">
          Switch user (demo mode)
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {DEMO_USERS.map((user) => (
          <DropdownMenuItem
            key={user.email}
            onSelect={() => switchTo(user)}
            className="flex items-center justify-between gap-2 cursor-pointer"
            disabled={user.email === currentEmail}
          >
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-medium">{user.name}</span>
              <span className="text-xs text-muted-foreground truncate">
                {user.email}
              </span>
            </div>
            <Badge variant={ROLE_COLORS[user.role]} className="text-xs shrink-0">
              {user.role}
            </Badge>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
