"use server"

import { revalidatePath } from "next/cache"
import { requireManager } from "@/lib/auth/guards"
import { db } from "@/lib/db"
import { goals, goalSheets, quarterUpdates, users, cycles } from "@/lib/db/schema"
import { eq, and, sql } from "drizzle-orm"

export async function saveManagerComment(
  goalId: string,
  quarter: "q1" | "q2" | "q3" | "q4",
  comment: string
) {
  const session = await requireManager()
  const managerId = session.user.id

  const [goal] = await db.select().from(goals).where(eq(goals.id, goalId))
  if (!goal) return { error: "Goal not found" }

  const [sheet] = await db
    .select()
    .from(goalSheets)
    .where(eq(goalSheets.id, goal.sheetId))
  if (!sheet) return { error: "Sheet not found" }

  // Verify manager relationship
  const [emp] = await db
    .select({ managerId: users.managerId })
    .from(users)
    .where(eq(users.id, sheet.employeeId))
  if (emp?.managerId !== managerId && session.user.role !== "admin") {
    return { error: "Not authorised" }
  }

  await db
    .insert(quarterUpdates)
    .values({
      goalId,
      quarter,
      status: "not_started",
      managerComment: comment,
    })
    .onConflictDoUpdate({
      target: [quarterUpdates.goalId, quarterUpdates.quarter],
      set: {
        managerComment: comment,
        managerCheckinAt: new Date(),
        updatedAt: new Date(),
      },
    })

  revalidatePath("/team/checkin")
  return { success: true }
}

export async function markManagerCheckinComplete(
  employeeId: string,
  quarter: "q1" | "q2" | "q3" | "q4"
) {
  const session = await requireManager()
  const managerId = session.user.id

  // Verify manager relationship
  const [emp] = await db
    .select({ managerId: users.managerId })
    .from(users)
    .where(eq(users.id, employeeId))
  if (emp?.managerId !== managerId && session.user.role !== "admin") {
    return { error: "Not authorised" }
  }

  const [activeCycle] = await db
    .select()
    .from(cycles)
    .where(eq(cycles.isActive, true))
    .limit(1)
  if (!activeCycle) return { error: "No active cycle" }

  const [sheet] = await db
    .select()
    .from(goalSheets)
    .where(
      and(
        eq(goalSheets.employeeId, employeeId),
        eq(goalSheets.cycleId, activeCycle.id)
      )
    )
    .limit(1)
  if (!sheet) return { error: "No goal sheet found" }

  // Set managerCheckinAt on all goals' quarter updates for this employee+quarter
  const empGoals = await db
    .select({ id: goals.id })
    .from(goals)
    .where(eq(goals.sheetId, sheet.id))

  for (const g of empGoals) {
    await db
      .insert(quarterUpdates)
      .values({
        goalId: g.id,
        quarter,
        status: "not_started",
        managerCheckinAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [quarterUpdates.goalId, quarterUpdates.quarter],
        set: {
          managerCheckinAt: new Date(),
          updatedAt: new Date(),
        },
      })
  }

  revalidatePath("/team/checkin")
  return { success: true }
}
