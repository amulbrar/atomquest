import { requireManager } from "@/lib/auth/guards"
import { db } from "@/lib/db"
import { users, goalSheets, goals, cycles, quarterUpdates, thrustAreas } from "@/lib/db/schema"
import { eq, and } from "drizzle-orm"
import { AppLayout } from "@/components/layout/app-layout"
import { ManagerCheckinClient } from "./checkin-client"

function getActiveQuarter(cycle: {
  q1Open: string; q1Close: string
  q2Open: string; q2Close: string
  q3Open: string; q3Close: string
  q4Open: string; q4Close: string
}): "q1" | "q2" | "q3" | "q4" | null {
  const today = new Date().toISOString().split("T")[0]
  if (today >= cycle.q1Open && today <= cycle.q1Close) return "q1"
  if (today >= cycle.q2Open && today <= cycle.q2Close) return "q2"
  if (today >= cycle.q3Open && today <= cycle.q3Close) return "q3"
  if (today >= cycle.q4Open && today <= cycle.q4Close) return "q4"
  return null
}

export default async function ManagerCheckinPage() {
  const session = await requireManager()
  const managerId = session.user.id

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

  const activeQuarter = getActiveQuarter(activeCycle)

  const reports = await db
    .select()
    .from(users)
    .where(eq(users.managerId, managerId))

  const allThrustAreas = await db.select().from(thrustAreas)

  const teamData = await Promise.all(
    reports.map(async (emp) => {
      const [sheet] = await db
        .select()
        .from(goalSheets)
        .where(
          and(
            eq(goalSheets.employeeId, emp.id),
            eq(goalSheets.cycleId, activeCycle.id)
          )
        )
        .limit(1)

      if (!sheet || sheet.status !== "locked") {
        return { emp, goals: [], updates: [], hasLockedSheet: false }
      }

      const goalList = await db
        .select({
          id: goals.id,
          title: goals.title,
          description: goals.description,
          uomType: goals.uomType,
          uomDirection: goals.uomDirection,
          targetValue: goals.targetValue,
          targetDate: goals.targetDate,
          weightage: goals.weightage,
          thrustAreaId: goals.thrustAreaId,
          sourceGoalId: goals.sourceGoalId,
        })
        .from(goals)
        .where(eq(goals.sheetId, sheet.id))
        .orderBy(goals.sortOrder)

      const updates = goalList.length && activeQuarter
        ? await db
            .select()
            .from(quarterUpdates)
            .where(eq(quarterUpdates.quarter, activeQuarter))
        : []

      const goalIds = new Set(goalList.map((g) => g.id))
      const relevantUpdates = updates.filter((u) => goalIds.has(u.goalId))

      return { emp, goals: goalList, updates: relevantUpdates, hasLockedSheet: true }
    })
  )

  return (
    <AppLayout role={session.user.role}>
      <ManagerCheckinClient
        cycleLabel={activeCycle.fyLabel}
        activeQuarter={activeQuarter}
        teamData={teamData.map(({ emp, goals: goalList, updates, hasLockedSheet }) => ({
          employee: { id: emp.id, name: emp.name, email: emp.email },
          hasLockedSheet,
          goals: goalList,
          updates: updates.map((u) => ({
            goalId: u.goalId,
            quarter: u.quarter,
            actualValue: u.actualValue,
            actualDate: u.actualDate,
            status: u.status,
            computedScore: u.computedScore,
            employeeNote: u.employeeNote,
            managerComment: u.managerComment,
            managerCheckinAt: u.managerCheckinAt?.toISOString() ?? null,
          })),
        }))}
        thrustAreas={allThrustAreas}
      />
    </AppLayout>
  )
}
