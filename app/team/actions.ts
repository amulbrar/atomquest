"use server"

import { revalidatePath } from "next/cache"
import { requireManager } from "@/lib/auth/guards"
import { db } from "@/lib/db"
import { goalSheets, goals, users } from "@/lib/db/schema"
import { eq, and } from "drizzle-orm"
import { logAudit } from "@/lib/audit"
import { sendGoalApprovedNotification, sendGoalReturnedNotification } from "@/lib/notify"

export async function approveGoalSheet(sheetId: string) {
  const session = await requireManager()
  const managerId = session.user.id

  const [sheet] = await db
    .select()
    .from(goalSheets)
    .where(eq(goalSheets.id, sheetId))
  if (!sheet || sheet.status !== "submitted") {
    return { error: "Sheet not found or not in submitted state" }
  }

  // Verify the manager manages this employee
  const [emp] = await db
    .select({ managerId: users.managerId })
    .from(users)
    .where(eq(users.id, sheet.employeeId))
  if (emp?.managerId !== managerId && session.user.role !== "admin") {
    return { error: "Not authorised" }
  }

  await db
    .update(goalSheets)
    .set({
      status: "locked",
      approvedBy: managerId,
      approvedAt: new Date(),
      returnComment: null,
    })
    .where(eq(goalSheets.id, sheetId))

  await logAudit({
    entityType: "goal_sheet",
    entityId: sheetId,
    action: "approved",
    actorId: managerId,
    before: { status: sheet.status },
    after: { status: "locked" },
  })

  let warning: string | undefined
  try {
    await sendGoalApprovedNotification(sheet.employeeId, sheetId)
  } catch {
    warning = "Approved — but notification to the employee could not be sent."
  }

  revalidatePath("/team")
  revalidatePath(`/team/${sheet.employeeId}`)
  return { success: true, warning }
}

export async function returnGoalSheet(sheetId: string, comment: string) {
  const session = await requireManager()
  const managerId = session.user.id

  if (!comment?.trim()) {
    return { error: "Please provide a reason for returning the sheet" }
  }

  const [sheet] = await db
    .select()
    .from(goalSheets)
    .where(eq(goalSheets.id, sheetId))
  if (!sheet || sheet.status !== "submitted") {
    return { error: "Sheet not found or not in submitted state" }
  }

  const [emp] = await db
    .select({ managerId: users.managerId })
    .from(users)
    .where(eq(users.id, sheet.employeeId))
  if (emp?.managerId !== managerId && session.user.role !== "admin") {
    return { error: "Not authorised" }
  }

  await db
    .update(goalSheets)
    .set({ status: "reopened", returnComment: comment.trim() })
    .where(eq(goalSheets.id, sheetId))

  await logAudit({
    entityType: "goal_sheet",
    entityId: sheetId,
    action: "returned",
    actorId: managerId,
    before: { status: sheet.status },
    after: { status: "reopened", comment },
  })

  let warning: string | undefined
  try {
    await sendGoalReturnedNotification(sheet.employeeId, sheetId, comment)
  } catch {
    warning = "Returned — but notification to the employee could not be sent."
  }

  revalidatePath("/team")
  revalidatePath(`/team/${sheet.employeeId}`)
  return { success: true, warning }
}

export async function managerEditGoal(
  goalId: string,
  updates: { targetValue?: string; targetDate?: string; weightage?: number }
) {
  const session = await requireManager()
  const managerId = session.user.id

  const [goal] = await db
    .select()
    .from(goals)
    .where(eq(goals.id, goalId))
  if (!goal) return { error: "Goal not found" }

  const [sheet] = await db
    .select()
    .from(goalSheets)
    .where(eq(goalSheets.id, goal.sheetId))
  if (!sheet || sheet.status !== "submitted") {
    return { error: "Can only edit goals on submitted sheets" }
  }

  const [emp] = await db
    .select({ managerId: users.managerId })
    .from(users)
    .where(eq(users.id, sheet.employeeId))
  if (emp?.managerId !== managerId && session.user.role !== "admin") {
    return { error: "Not authorised" }
  }

  const before = {
    targetValue: goal.targetValue,
    targetDate: goal.targetDate,
    weightage: goal.weightage,
  }

  await db
    .update(goals)
    .set({
      ...(updates.targetValue !== undefined && { targetValue: updates.targetValue }),
      ...(updates.targetDate !== undefined && { targetDate: updates.targetDate }),
      ...(updates.weightage !== undefined && { weightage: updates.weightage }),
    })
    .where(eq(goals.id, goalId))

  await logAudit({
    entityType: "goal",
    entityId: goalId,
    action: "manager_edit",
    actorId: managerId,
    before,
    after: updates,
  })

  revalidatePath(`/team/${sheet.employeeId}`)
  return { success: true }
}
