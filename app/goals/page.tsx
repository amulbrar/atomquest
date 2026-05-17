import { requireRole } from "@/lib/auth/guards"
import { db } from "@/lib/db"
import { goalSheets, goals, cycles, thrustAreas } from "@/lib/db/schema"
import { eq, and, sum, count } from "drizzle-orm"
import { AppLayout } from "@/components/layout/app-layout"
import { GoalsClient } from "./goals-client"

export default async function GoalsPage() {
  const session = await requireRole("employee", "manager", "admin")
  const userId = session.user.id

  const [activeCycle] = await db
    .select()
    .from(cycles)
    .where(eq(cycles.isActive, true))
    .limit(1)

  const allThrustAreas = await db
    .select()
    .from(thrustAreas)
    .where(eq(thrustAreas.active, true))

  if (!activeCycle) {
    return (
      <AppLayout role={session.user.role}>
        <p className="text-muted-foreground">No active cycle. Contact your admin.</p>
      </AppLayout>
    )
  }

  const [sheet] = await db
    .select()
    .from(goalSheets)
    .where(
      and(
        eq(goalSheets.employeeId, userId),
        eq(goalSheets.cycleId, activeCycle.id)
      )
    )
    .limit(1)

  const goalList = sheet
    ? await db
        .select({
          id: goals.id,
          thrustAreaId: goals.thrustAreaId,
          title: goals.title,
          description: goals.description,
          uomType: goals.uomType,
          uomDirection: goals.uomDirection,
          targetValue: goals.targetValue,
          targetDate: goals.targetDate,
          weightage: goals.weightage,
          lockedFields: goals.lockedFields,
          sourceGoalId: goals.sourceGoalId,
          sortOrder: goals.sortOrder,
        })
        .from(goals)
        .where(eq(goals.sheetId, sheet.id))
        .orderBy(goals.sortOrder)
    : []

  const totalWeightage = goalList.reduce((acc, g) => acc + (g.weightage ?? 0), 0)
  const isEditable = !sheet || ["draft", "reopened"].includes(sheet.status)
  const isPhase1Open =
    activeCycle.phase1Open <= new Date().toISOString().split("T")[0] &&
    new Date().toISOString().split("T")[0] <= activeCycle.phase1Close

  return (
    <AppLayout role={session.user.role}>
      <GoalsClient
        cycleLabel={activeCycle.fyLabel}
        sheetStatus={sheet?.status ?? null}
        goals={goalList}
        thrustAreas={allThrustAreas}
        totalWeightage={totalWeightage}
        isEditable={isEditable && isPhase1Open}
        isPhase1Open={isPhase1Open}
        returnComment={sheet?.returnComment ?? null}
      />
    </AppLayout>
  )
}
