import { auth } from "@/lib/auth/config"
import { RoleSwitcher } from "./role-switcher"
import { UserMenu } from "./user-menu"
import { db } from "@/lib/db"
import { cycles } from "@/lib/db/schema"
import { eq } from "drizzle-orm"

export async function AppHeader() {
  const session = await auth()
  if (!session?.user) return null

  const [activeCycle] = await db
    .select({ fyLabel: cycles.fyLabel })
    .from(cycles)
    .where(eq(cycles.isActive, true))
    .limit(1)

  const initials =
    session.user.name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) ?? ""

  const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE === "true"

  return (
    <header className="h-16 border-b border-border/70 flex items-center justify-between px-5 md:px-8 bg-background/80 backdrop-blur-md shrink-0 sticky top-0 z-30">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2.5">
          <span className="inline-flex items-center justify-center size-7 rounded-sm bg-primary text-primary-foreground font-serif text-[13px] tracking-tight">
            AQ
          </span>
          <span className="font-serif text-[15px] tracking-tight">
            AtomQuest
          </span>
        </div>
        {activeCycle && (
          <>
            <span className="h-4 w-px bg-border/80" />
            <span className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
              <span className="size-1.5 rounded-full bg-primary pulse-dot" />
              {activeCycle.fyLabel} · Active
            </span>
          </>
        )}
      </div>

      <div className="flex items-center gap-3">
        {isDemoMode && <RoleSwitcher currentEmail={session.user.email!} />}

        <UserMenu
          name={session.user.name ?? ""}
          email={session.user.email ?? ""}
          role={session.user.role}
          initials={initials}
        />
      </div>
    </header>
  )
}
