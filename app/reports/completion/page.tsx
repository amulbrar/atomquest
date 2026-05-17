import { requireRole } from "@/lib/auth/guards"
import { db } from "@/lib/db"
import { users, goalSheets, goals, cycles, quarterUpdates, departments } from "@/lib/db/schema"
import { eq, and, count, sql } from "drizzle-orm"
import { AppLayout } from "@/components/layout/app-layout"
import { CompletionClient } from "./completion-client"

export interface EmployeeCompletion {
  employeeId: string
  employeeName: string
  departmentName: string | null
  managerName: string | null
  goalCount: number
  quarters: {
    q1: "none" | "partial" | "manager_done"
    q2: "none" | "partial" | "manager_done"
    q3: "none" | "partial" | "manager_done"
    q4: "none" | "partial" | "manager_done"
  }
}

export default async function CompletionPage() {
  const session = await requireRole("manager", "admin")

  const [activeCycle] = await db
    .select()
    .from(cycles)
    .where(eq(cycles.isActive, true))
    .limit(1)

  if (!activeCycle) {
    return (
      <AppLayout role={session.user.role}>
        <p className="text-muted-foreground">No active cycle.</p>
      </AppLayout>
    )
  }

  // Get all employees with locked sheets
  const lockedSheets = await db
    .select({
      sheetId: goalSheets.id,
      employeeId: goalSheets.employeeId,
    })
    .from(goalSheets)
    .where(
      and(
        eq(goalSheets.cycleId, activeCycle.id),
        eq(goalSheets.status, "locked")
      )
    )

  const allUsers = await db.select().from(users)
  const allDepts = await db.select().from(departments)

  const employeeCompletions: EmployeeCompletion[] = await Promise.all(
    lockedSheets.map(async ({ sheetId, employeeId }) => {
      const emp = allUsers.find((u) => u.id === employeeId)!
      const dept = allDepts.find((d) => d.id === emp.departmentId)
      const mgr = allUsers.find((u) => u.id === emp.managerId)

      const goalList = await db
        .select({ id: goals.id })
        .from(goals)
        .where(eq(goals.sheetId, sheetId))

      const goalIds = goalList.map((g) => g.id)

      if (!goalIds.length) {
        return {
          employeeId,
          employeeName: emp.name,
          departmentName: dept?.name ?? null,
          managerName: mgr?.name ?? null,
          goalCount: 0,
          quarters: { q1: "none", q2: "none", q3: "none", q4: "none" } as EmployeeCompletion["quarters"],
        }
      }

      // For each quarter, get update stats
      const quarterStatus = async (q: "q1" | "q2" | "q3" | "q4") => {
        const updates = await db
          .select({
            goalId: quarterUpdates.goalId,
            managerCheckinAt: quarterUpdates.managerCheckinAt,
          })
          .from(quarterUpdates)
          .where(eq(quarterUpdates.quarter, q))

        const relevantUpdates = updates.filter((u) => goalIds.includes(u.goalId))
        if (!relevantUpdates.length) return "none" as const
        const managerDone = relevantUpdates.every((u) => u.managerCheckinAt != null)
        return managerDone ? "manager_done" : "partial"
      }

      const [q1, q2, q3, q4] = await Promise.all([
        quarterStatus("q1"),
        quarterStatus("q2"),
        quarterStatus("q3"),
        quarterStatus("q4"),
      ])

      return {
        employeeId,
        employeeName: emp.name,
        departmentName: dept?.name ?? null,
        managerName: mgr?.name ?? null,
        goalCount: goalIds.length,
        quarters: { q1, q2, q3, q4 },
      }
    })
  )

  return (
    <AppLayout role={session.user.role}>
      <CompletionClient
        cycleLabel={activeCycle.fyLabel}
        employees={employeeCompletions}
        supabaseUrl={process.env.NEXT_PUBLIC_SUPABASE_URL ?? ""}
        supabaseAnonKey={process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ""}
      />
    </AppLayout>
  )
}
