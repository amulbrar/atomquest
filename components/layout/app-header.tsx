import { auth, signOut } from "@/lib/auth/config"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { RoleSwitcher } from "./role-switcher"
import { LogOut } from "lucide-react"
import { db } from "@/lib/db"
import { cycles } from "@/lib/db/schema"
import { eq } from "drizzle-orm"

const ROLE_BADGE = {
  admin: "destructive",
  manager: "secondary",
  employee: "outline",
} as const

export async function AppHeader() {
  const session = await auth()
  if (!session?.user) return null

  const [activeCycle] = await db
    .select({ fyLabel: cycles.fyLabel })
    .from(cycles)
    .where(eq(cycles.isActive, true))
    .limit(1)

  const initials = session.user.name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)

  const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE === "true"

  return (
    <header className="h-14 border-b flex items-center justify-between px-4 bg-background shrink-0">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="font-bold text-sm">AtomQuest Portal</span>
          {activeCycle && (
            <Badge variant="secondary" className="text-xs">
              {activeCycle.fyLabel}
            </Badge>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        {isDemoMode && <RoleSwitcher currentEmail={session.user.email!} />}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full size-8">
              <Avatar className="size-8">
                <AvatarFallback className="text-xs">{initials}</AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuLabel className="flex flex-col gap-0.5">
              <span className="font-medium text-sm">{session.user.name}</span>
              <span className="text-xs text-muted-foreground font-normal">
                {session.user.email}
              </span>
              <Badge
                variant={ROLE_BADGE[session.user.role]}
                className="w-fit mt-1 text-xs"
              >
                {session.user.role}
              </Badge>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <form
                action={async () => {
                  "use server"
                  await signOut({ redirectTo: "/login" })
                }}
              >
                <button type="submit" className="flex items-center gap-2 w-full text-sm">
                  <LogOut className="size-3.5" />
                  Sign out
                </button>
              </form>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
