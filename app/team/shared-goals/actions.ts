"use server"

import { revalidatePath } from "next/cache"
import { requireManager } from "@/lib/auth/guards"
import { db } from "@/lib/db"
import { goals, goalSheets, users, cycles } from "@/lib/db/schema"
import { eq, and, count } from "drizzle-orm"
import { logAudit } from "@/lib/audit"

export async function pushSharedGoal(data: {
  title: string
  description: string
  thrustAreaId: string
  uomType: "numeric" | "percent" | "timeline" | "zero"
  uomDirection: "min" | "max" | "na"
  targetValue?: string
  targetDate?: string
  recipientIds: string[]
  weightage: number
}) {
  const session = await requireManager()
  const managerId = session.user.id

  if (!data.recipientIds.length) {
    return { error: "Select at least one recipient" }
  }
  if (data.weightage < 10 || data.weightage > 100) {
    return { error: "Weightage must be between 10% and 100%" }
  }
  if (!data.title.trim()) {
    return { error: "Title is required" }
  }

  const [activeCycle] = await db
    .select()
    .from(cycles)
    .where(eq(cycles.isActive, true))
    .limit(1)
  if (!activeCycle) return { error: "No active cycle" }

  // Verify all recipients report to this manager
  const reports = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.managerId, managerId))
  const reportIds = new Set(reports.map((r) => r.id))

  for (const rid of data.recipientIds) {
    if (!reportIds.has(rid) && session.user.role !== "admin") {
      return { error: `User ${rid} is not your direct report` }
    }
  }

  // Create the "source" goal on the first recipient's sheet (primary owner)
  const [primaryId] = data.recipientIds

  let results = []

  for (const recipientId of data.recipientIds) {
    // Get or create a sheet for this employee in the active cycle
    let [sheet] = await db
      .select()
      .from(goalSheets)
      .where(
        and(
          eq(goalSheets.employeeId, recipientId),
          eq(goalSheets.cycleId, activeCycle.id)
        )
      )
      .limit(1)

    if (!sheet) {
      const [created] = await db
        .insert(goalSheets)
        .values({ employeeId: recipientId, cycleId: activeCycle.id, status: "draft" })
        .returning()
      sheet = created
    }

    if (!["draft", "reopened"].includes(sheet.status)) {
      return { error: `Cannot add shared goal to ${recipientId}'s locked sheet` }
    }

    // Check goal limit
    const [cnt] = await db
      .select({ c: count() })
      .from(goals)
      .where(eq(goals.sheetId, sheet.id))
    if ((cnt?.c ?? 0) >= 8) {
      return { error: `Employee already has 8 goals` }
    }

    const isPrimary = recipientId === primaryId
    const [inserted] = await db
      .insert(goals)
      .values({
        sheetId: sheet.id,
        thrustAreaId: data.thrustAreaId,
        title: data.title,
        description: data.description,
        uomType: data.uomType,
        uomDirection: data.uomDirection,
        targetValue: data.targetValue ?? null,
        targetDate: data.targetDate ?? null,
        weightage: data.weightage,
        sourceGoalId: null, // will update non-primary below
        lockedFields: isPrimary
          ? []
          : ["title", "description", "uom_type", "uom_direction", "target_value", "target_date"],
        sortOrder: cnt?.c ?? 0,
      })
      .returning()

    results.push({ recipientId, isPrimary, goalId: inserted.id })
  }

  // Set sourceGoalId for non-primary recipients
  const primaryGoal = results.find((r) => r.isPrimary)
  if (primaryGoal) {
    for (const r of results) {
      if (!r.isPrimary) {
        await db
          .update(goals)
          .set({ sourceGoalId: primaryGoal.goalId })
          .where(eq(goals.id, r.goalId))
      }
    }
  }

  await logAudit({
    entityType: "shared_goal",
    entityId: primaryGoal?.goalId ?? "unknown",
    action: "pushed",
    actorId: managerId,
    after: {
      title: data.title,
      recipients: data.recipientIds,
      weightage: data.weightage,
    },
  })

  revalidatePath("/team")
  return { success: true, count: results.length }
}
