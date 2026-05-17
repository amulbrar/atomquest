import { requireRole } from "@/lib/auth/guards"
import { db } from "@/lib/db"
import { goalSheets, users, cycles } from "@/lib/db/schema"
import { eq, and, inArray } from "drizzle-orm"
import { AppLayout } from "@/components/layout/app-layout"
import { UnlockClient } from "./unlock-client"

export default async function UnlockPage() {
  const session = await requireRole("admin")

  const [activeCycle] = await db
    .select()
    .from(cycles)
    .where(eq(cycles.isActive, true))
    .limit(1)

  const lockedSheets = activeCycle
    ? await db
        .select({
          id: goalSheets.id,
          employeeId: goalSheets.employeeId,
          status: goalSheets.status,
        })
        .from(goalSheets)
        .where(
          and(
            eq(goalSheets.cycleId, activeCycle.id),
            inArray(goalSheets.status, ["locked", "approved"])
          )
        )
    : []

  const empIds = lockedSheets.map((s) => s.employeeId)
  const empUsers = empIds.length
    ? await db.select({ id: users.id, name: users.name }).from(users)
        .where(inArray(users.id, empIds))
    : []

  const sheets = lockedSheets.map((s) => ({
    id: s.id,
    status: s.status,
    employeeName: empUsers.find((u) => u.id === s.employeeId)?.name ?? s.employeeId,
  }))

  return (
    <AppLayout role={session.user.role}>
      <UnlockClient sheets={sheets} cycleLabel={activeCycle?.fyLabel ?? "No active cycle"} />
    </AppLayout>
  )
}
