import { requireRole } from "@/lib/auth/guards"
import { db } from "@/lib/db"
import { goalSheets, goals, cycles, quarterUpdates, thrustAreas } from "@/lib/db/schema"
import { eq, and } from "drizzle-orm"
import { AppLayout } from "@/components/layout/app-layout"
import { CheckinClient } from "./checkin-client"

function getActiveQuarter(cycle: {
  q1Open: string; q1Close: string
  q2Open: string; q2Close: string
  q3Open: string; q3Close: string
  q4Open: string; q4Close: string
}): { quarter: "q1" | "q2" | "q3" | "q4" | null; closedWindow?: string } {
  const today = new Date().toISOString().split("T")[0]
  const windows = [
    { q: "q1" as const, open: cycle.q1Open, close: cycle.q1Close, label: "Q1" },
    { q: "q2" as const, open: cycle.q2Open, close: cycle.q2Close, label: "Q2" },
    { q: "q3" as const, open: cycle.q3Open, close: cycle.q3Close, label: "Q3" },
    { q: "q4" as const, open: cycle.q4Open, close: cycle.q4Close, label: "Q4" },
  ]
  for (const w of windows) {
    if (today >= w.open && today <= w.close) return { quarter: w.q }
  }
  // Find most recently closed window
  const past = windows.filter((w) => today > w.close)
  if (past.length) {
    const last = past[past.length - 1]
    return { quarter: null, closedWindow: `${last.label} (closed ${last.close})` }
  }
  return { quarter: null, closedWindow: "Q1 opens " + cycle.q1Open }
}

export default async function CheckinPage() {
  const session = await requireRole("employee", "manager", "admin")
  const userId = session.user.id

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

  const { quarter, closedWindow } = getActiveQuarter(activeCycle)

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

  const goalList = sheet?.status === "locked"
    ? await db
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
    : []

  const allThrustAreas = await db.select().from(thrustAreas)

  // Load existing quarter updates for active quarter
  const updates = quarter && goalList.length
    ? await db
        .select()
        .from(quarterUpdates)
        .where(
          and(
            eq(quarterUpdates.quarter, quarter),
          )
        )
    : []

  // Filter updates to only those belonging to current goals
  const goalIds = new Set(goalList.map((g) => g.id))
  const relevantUpdates = updates.filter((u) => goalIds.has(u.goalId))

  return (
    <AppLayout role={session.user.role}>
      <CheckinClient
        cycleLabel={activeCycle.fyLabel}
        activeQuarter={quarter}
        closedWindowMsg={closedWindow ?? null}
        sheetStatus={sheet?.status ?? null}
        goals={goalList}
        thrustAreas={allThrustAreas}
        existingUpdates={relevantUpdates.map((u) => ({
          goalId: u.goalId,
          quarter: u.quarter,
          actualValue: u.actualValue,
          actualDate: u.actualDate,
          status: u.status,
          computedScore: u.computedScore,
          employeeNote: u.employeeNote,
          managerComment: u.managerComment,
        }))}
      />
    </AppLayout>
  )
}
