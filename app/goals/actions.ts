"use server"

import { revalidatePath } from "next/cache"
import { requireRole } from "@/lib/auth/guards"
import { db } from "@/lib/db"
import { goalSheets, goals, cycles, thrustAreas } from "@/lib/db/schema"
import { eq, and, sum, count } from "drizzle-orm"
import { goalSchema, type GoalInput } from "@/lib/validation/goal"
import { logAudit } from "@/lib/audit"
import { sendGoalSubmittedNotification } from "@/lib/notify"

// ── Helpers ───────────────────────────────────────────────────────────────────

async function getOrCreateSheet(employeeId: string, cycleId: string) {
  const [existing] = await db
    .select()
    .from(goalSheets)
    .where(
      and(
        eq(goalSheets.employeeId, employeeId),
        eq(goalSheets.cycleId, cycleId)
      )
    )
    .limit(1)

  if (existing) return existing

  const [created] = await db
    .insert(goalSheets)
    .values({ employeeId, cycleId, status: "draft" })
    .returning()
  return created
}

async function getActiveCycle() {
  const [cycle] = await db
    .select()
    .from(cycles)
    .where(eq(cycles.isActive, true))
    .limit(1)
  if (!cycle) throw new Error("No active cycle")
  return cycle
}

// ── Add/Edit goal ──────────────────────────────────────────────────────────────

export async function saveGoal(data: GoalInput & { goalId?: string }) {
  const session = await requireRole("employee", "manager", "admin")
  const userId = session.user.id

  const parsed = goalSchema.safeParse(data)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" }
  }

  const cycle = await getActiveCycle()
  const sheet = await getOrCreateSheet(userId, cycle.id)

  // Only draft / reopened sheets can be edited
  if (!["draft", "reopened"].includes(sheet.status)) {
    return { error: "Goals are locked. Contact admin to unlock." }
  }

  const { goalId, ...values } = data

  if (goalId) {
    // Edit existing goal — verify it belongs to this sheet
    const [existing] = await db
      .select()
      .from(goals)
      .where(and(eq(goals.id, goalId), eq(goals.sheetId, sheet.id)))

    if (!existing) return { error: "Goal not found" }

    // Check locked fields for shared goals
    if (existing.lockedFields?.length) {
      const lockedFieldsMsg = ["title", "description", "uom_type", "uom_direction", "target_value", "target_date"]
        .filter((f) => existing.lockedFields.includes(f))
      if (lockedFieldsMsg.length) {
        return { error: `Cannot edit locked fields: ${lockedFieldsMsg.join(", ")}` }
      }
    }

    await db
      .update(goals)
      .set({
        thrustAreaId: values.thrustAreaId,
        title: values.title,
        description: values.description,
        uomType: values.uomType,
        uomDirection: values.uomDirection,
        targetValue: values.targetValue ?? null,
        targetDate: values.targetDate ?? null,
        weightage: values.weightage,
      })
      .where(eq(goals.id, goalId))

    revalidatePath("/goals")
    return { success: true }
  }

  // Add new goal
  const [goalCount] = await db
    .select({ c: count() })
    .from(goals)
    .where(eq(goals.sheetId, sheet.id))

  if ((goalCount?.c ?? 0) >= 8) {
    return { error: "Maximum 8 goals allowed per goal sheet" }
  }

  await db.insert(goals).values({
    sheetId: sheet.id,
    thrustAreaId: values.thrustAreaId,
    title: values.title,
    description: values.description,
    uomType: values.uomType,
    uomDirection: values.uomDirection,
    targetValue: values.targetValue ?? null,
    targetDate: values.targetDate ?? null,
    weightage: values.weightage,
    sortOrder: goalCount?.c ?? 0,
  })

  revalidatePath("/goals")
  return { success: true }
}

// ── Delete goal ────────────────────────────────────────────────────────────────

export async function deleteGoal(goalId: string) {
  const session = await requireRole("employee", "manager", "admin")

  const [goal] = await db
    .select({ sheetId: goals.sheetId })
    .from(goals)
    .where(eq(goals.id, goalId))
  if (!goal) return { error: "Goal not found" }

  const [sheet] = await db
    .select()
    .from(goalSheets)
    .where(eq(goalSheets.id, goal.sheetId))
  if (!sheet) return { error: "Sheet not found" }

  if (sheet.employeeId !== session.user.id && session.user.role !== "admin") {
    return { error: "Not authorised" }
  }

  if (!["draft", "reopened"].includes(sheet.status)) {
    return { error: "Goals are locked" }
  }

  await db.delete(goals).where(eq(goals.id, goalId))
  revalidatePath("/goals")
  return { success: true }
}

// ── Submit sheet ───────────────────────────────────────────────────────────────

export async function submitGoalSheet() {
  const session = await requireRole("employee", "manager", "admin")
  const userId = session.user.id

  const cycle = await getActiveCycle()
  const sheet = await getOrCreateSheet(userId, cycle.id)

  if (!["draft", "reopened"].includes(sheet.status)) {
    return { error: "Sheet already submitted" }
  }

  // Validate total weightage = 100
  const [result] = await db
    .select({ total: sum(goals.weightage), cnt: count() })
    .from(goals)
    .where(eq(goals.sheetId, sheet.id))

  const total = Number(result?.total ?? 0)
  const cnt = result?.cnt ?? 0

  if (cnt === 0) {
    return { error: "Add at least one goal before submitting" }
  }
  if (total !== 100) {
    return { error: `Total weightage must equal 100% (currently ${total}%)` }
  }

  await db
    .update(goalSheets)
    .set({ status: "submitted", submittedAt: new Date() })
    .where(eq(goalSheets.id, sheet.id))

  await logAudit({
    entityType: "goal_sheet",
    entityId: sheet.id,
    action: "submitted",
    actorId: userId,
    after: { status: "submitted" },
  })

  // Notify manager (best-effort — never blocks the submission, but
  // surfaces a warning to the UI if email/Teams dispatch fails so the
  // user knows their manager may not have been pinged).
  let warning: string | undefined
  try {
    await sendGoalSubmittedNotification(userId, sheet.id)
  } catch {
    warning = "Submitted — but notification to your manager could not be sent."
  }

  revalidatePath("/goals")
  revalidatePath("/")
  return { success: true, warning }
}
