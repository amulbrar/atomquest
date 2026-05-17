"use server"

import { revalidatePath } from "next/cache"
import { requireRole } from "@/lib/auth/guards"
import { db } from "@/lib/db"
import { goalSheets, goals, cycles, quarterUpdates } from "@/lib/db/schema"
import { eq, and } from "drizzle-orm"
import { computeScore } from "@/lib/scoring"
import { quarterUpdateSchema, type QuarterUpdateInput } from "@/lib/validation/goal"

function getActiveQuarter(
  cycle: { q1Open: string; q1Close: string; q2Open: string; q2Close: string; q3Open: string; q3Close: string; q4Open: string; q4Close: string }
): "q1" | "q2" | "q3" | "q4" | null {
  const today = new Date().toISOString().split("T")[0]
  if (today >= cycle.q1Open && today <= cycle.q1Close) return "q1"
  if (today >= cycle.q2Open && today <= cycle.q2Close) return "q2"
  if (today >= cycle.q3Open && today <= cycle.q3Close) return "q3"
  if (today >= cycle.q4Open && today <= cycle.q4Close) return "q4"
  return null
}

export async function saveQuarterUpdate(data: QuarterUpdateInput) {
  const session = await requireRole("employee", "manager", "admin")
  const userId = session.user.id

  const parsed = quarterUpdateSchema.safeParse(data)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" }
  }

  const [goal] = await db
    .select()
    .from(goals)
    .where(eq(goals.id, data.goalId))
  if (!goal) return { error: "Goal not found" }

  const [sheet] = await db
    .select()
    .from(goalSheets)
    .where(eq(goalSheets.id, goal.sheetId))
  if (!sheet) return { error: "Sheet not found" }

  // Employee can only update own goals; manager/admin can update any
  if (sheet.employeeId !== userId && session.user.role === "employee") {
    return { error: "Not authorised" }
  }

  // Shared goal: only primary owner can update achievement
  if (goal.sourceGoalId) {
    return { error: "Shared goal — update achievement via the primary owner's check-in" }
  }

  const [activeCycle] = await db
    .select()
    .from(cycles)
    .where(eq(cycles.isActive, true))
    .limit(1)
  if (!activeCycle) return { error: "No active cycle" }

  const activeQuarter = getActiveQuarter(activeCycle)
  if (!activeQuarter) {
    return { error: "No check-in window is currently open" }
  }
  if (activeQuarter !== data.quarter) {
    return { error: `Current window is ${activeQuarter.toUpperCase()}. Cannot update ${data.quarter.toUpperCase()}.` }
  }

  // Compute score snapshot
  const score = computeScore({
    uomType: goal.uomType,
    uomDirection: goal.uomDirection,
    targetValue: goal.targetValue,
    targetDate: goal.targetDate,
    actualValue: data.actualValue,
    actualDate: data.actualDate,
  })

  await db
    .insert(quarterUpdates)
    .values({
      goalId: data.goalId,
      quarter: data.quarter,
      actualValue: data.actualValue ?? null,
      actualDate: data.actualDate ?? null,
      status: data.status,
      computedScore: score !== null ? String(score.toFixed(4)) : null,
      employeeNote: data.employeeNote ?? null,
    })
    .onConflictDoUpdate({
      target: [quarterUpdates.goalId, quarterUpdates.quarter],
      set: {
        actualValue: data.actualValue ?? null,
        actualDate: data.actualDate ?? null,
        status: data.status,
        computedScore: score !== null ? String(score.toFixed(4)) : null,
        employeeNote: data.employeeNote ?? null,
        updatedAt: new Date(),
      },
    })

  revalidatePath("/checkin")
  return { success: true, score }
}

export { getActiveQuarter }
