import { requireManager } from "@/lib/auth/guards"
import { db } from "@/lib/db"
import { users, goalSheets, goals, thrustAreas, cycles } from "@/lib/db/schema"
import { eq, and } from "drizzle-orm"
import { AppLayout } from "@/components/layout/app-layout"
import { notFound } from "next/navigation"
import { TeamMemberReviewClient } from "./team-member-review-client"

export default async function TeamMemberPage({
  params,
}: {
  params: Promise<{ empId: string }>
}) {
  const session = await requireManager()
  const { empId } = await params

  const [emp] = await db
    .select()
    .from(users)
    .where(eq(users.id, empId))
  if (!emp) notFound()

  // Verify manager relationship (or admin)
  if (emp.managerId !== session.user.id && session.user.role !== "admin") {
    notFound()
  }

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

  const [sheet] = await db
    .select()
    .from(goalSheets)
    .where(
      and(
        eq(goalSheets.employeeId, empId),
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
        })
        .from(goals)
        .where(eq(goals.sheetId, sheet.id))
        .orderBy(goals.sortOrder)
    : []

  const allThrustAreas = await db.select().from(thrustAreas)

  return (
    <AppLayout role={session.user.role}>
      <TeamMemberReviewClient
        emp={{ id: emp.id, name: emp.name, email: emp.email }}
        sheet={sheet ?? null}
        goals={goalList}
        thrustAreas={allThrustAreas}
        cycleLabel={activeCycle.fyLabel}
      />
    </AppLayout>
  )
}
