import { db } from "@/lib/db"
import {
  escalationRules, escalationEvents, goalSheets, users, cycles, goals, quarterUpdates,
} from "@/lib/db/schema"
import { eq, and, isNull } from "drizzle-orm"
import { sendEscalationNotification } from "@/lib/notify"
import { daysSince, getActiveQuarter } from "./rules"

export { daysSince, getActiveQuarter, shouldEscalateNoSubmit } from "./rules"

async function alreadyEscalated(ruleId: string, subjectUserId: string): Promise<boolean> {
  const [ev] = await db
    .select()
    .from(escalationEvents)
    .where(
      and(
        eq(escalationEvents.ruleId, ruleId),
        eq(escalationEvents.subjectUserId, subjectUserId),
        eq(escalationEvents.status, "open")
      )
    )
    .limit(1)
  return !!ev
}

async function createEvent(ruleId: string, subjectUserId: string, targetUserId: string) {
  await db.insert(escalationEvents).values({
    ruleId,
    subjectUserId,
    targetUserId,
    status: "open",
  })
}

export async function runEscalations(): Promise<{ fired: number; errors: string[] }> {
  let fired = 0
  const errors: string[] = []

  const rules = await db
    .select()
    .from(escalationRules)
    .where(eq(escalationRules.enabled, true))

  const [activeCycle] = await db
    .select()
    .from(cycles)
    .where(eq(cycles.isActive, true))
    .limit(1)

  if (!activeCycle) return { fired: 0, errors: ["No active cycle"] }

  const activeQuarter = getActiveQuarter(activeCycle)
  const allUsers = await db.select().from(users)
  const allSheets = await db
    .select()
    .from(goalSheets)
    .where(eq(goalSheets.cycleId, activeCycle.id))

  for (const rule of rules) {
    try {
      let chain: string[] = []
      try { chain = JSON.parse(rule.chain) as string[] } catch { chain = [] }
      // chain is an array of role labels: ["employee", "manager", "hr"]
      // We use the first element as the target category. For simplicity, we escalate to the manager.

      if (rule.trigger === "no_submit") {
        // Employees who have not submitted (no sheet, or sheet in draft) for more than threshold days
        const phaseOpenDays = daysSince(new Date(activeCycle.phase1Open))
        if (phaseOpenDays < rule.thresholdDays) continue

        for (const user of allUsers.filter((u) => u.role === "employee")) {
          const sheet = allSheets.find((s) => s.employeeId === user.id)
          if (!sheet || sheet.status === "draft") {
            if (await alreadyEscalated(rule.id, user.id)) continue
            const targetId = user.managerId ?? user.id
            await createEvent(rule.id, user.id, targetId)
            const target = allUsers.find((u) => u.id === targetId)
            if (target) {
              await sendEscalationNotification(
                targetId,
                rule.id,
                user.id,
                rule.name,
                `${user.name} has not submitted their goals after ${phaseOpenDays} days.`
              ).catch(() => {})
            }
            fired++
          }
        }
      }

      if (rule.trigger === "no_approve") {
        // Sheets submitted for more than threshold days without approval
        for (const sheet of allSheets.filter((s) => s.status === "submitted")) {
          if (!sheet.submittedAt) continue
          const waitDays = daysSince(sheet.submittedAt)
          if (waitDays < rule.thresholdDays) continue
          if (await alreadyEscalated(rule.id, sheet.employeeId)) continue

          const emp = allUsers.find((u) => u.id === sheet.employeeId)
          if (!emp) continue
          const targetId = emp.managerId ?? emp.id
          await createEvent(rule.id, sheet.employeeId, targetId)
          await sendEscalationNotification(
            targetId,
            rule.id,
            sheet.employeeId,
            rule.name,
            `${emp.name}'s goals have been awaiting approval for ${waitDays} days.`
          ).catch(() => {})
          fired++
        }
      }

      if (rule.trigger === "no_checkin" && activeQuarter) {
        // Employees with locked sheets who haven't checked in for the active quarter
        const quarterCloseDate = activeCycle[`${activeQuarter}Close` as keyof typeof activeCycle] as string
        const daysIntoWindow = daysSince(new Date(activeCycle[`${activeQuarter}Open` as keyof typeof activeCycle] as string))
        if (daysIntoWindow < rule.thresholdDays) continue

        for (const sheet of allSheets.filter((s) => s.status === "locked")) {
          const emp = allUsers.find((u) => u.id === sheet.employeeId)
          if (!emp) continue

          const empGoals = await db
            .select({ id: goals.id })
            .from(goals)
            .where(eq(goals.sheetId, sheet.id))

          const updates = await db
            .select()
            .from(quarterUpdates)
            .where(eq(quarterUpdates.quarter, activeQuarter))

          const goalIds = new Set(empGoals.map((g) => g.id))
          const relevantUpdates = updates.filter((u) => goalIds.has(u.goalId))

          const noUpdate = relevantUpdates.length === 0 ||
            relevantUpdates.every((u) => u.status === "not_started")

          if (!noUpdate) continue
          if (await alreadyEscalated(rule.id, emp.id)) continue

          const targetId = emp.managerId ?? emp.id
          await createEvent(rule.id, emp.id, targetId)
          await sendEscalationNotification(
            targetId,
            rule.id,
            emp.id,
            rule.name,
            `${emp.name} has not logged any ${activeQuarter.toUpperCase()} achievements after ${daysIntoWindow} days.`
          ).catch(() => {})
          fired++
        }
      }
    } catch (e) {
      errors.push(`Rule ${rule.name}: ${String(e)}`)
    }
  }

  return { fired, errors }
}
