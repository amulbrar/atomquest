"use server"

import { revalidatePath } from "next/cache"
import { requireRole } from "@/lib/auth/guards"
import { db } from "@/lib/db"
import { escalationRules, escalationEvents } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { runEscalations } from "@/lib/escalation/evaluator"

export async function saveEscalationRule(data: {
  id?: string
  name: string
  trigger: "no_submit" | "no_approve" | "no_checkin"
  thresholdDays: number
  chain: string[]
  enabled: boolean
}) {
  await requireRole("admin")

  if (data.id) {
    await db
      .update(escalationRules)
      .set({
        name: data.name,
        trigger: data.trigger,
        thresholdDays: data.thresholdDays,
        chain: JSON.stringify(data.chain),
        enabled: data.enabled,
      })
      .where(eq(escalationRules.id, data.id))
  } else {
    await db.insert(escalationRules).values({
      name: data.name,
      trigger: data.trigger,
      thresholdDays: data.thresholdDays,
      chain: JSON.stringify(data.chain),
      enabled: data.enabled,
    })
  }

  revalidatePath("/admin/escalations")
  return { success: true }
}

export async function deleteEscalationRule(id: string) {
  await requireRole("admin")
  await db.delete(escalationRules).where(eq(escalationRules.id, id))
  revalidatePath("/admin/escalations")
  return { success: true }
}

export async function resolveEscalationEvent(eventId: string) {
  await requireRole("admin")
  await db
    .update(escalationEvents)
    .set({ status: "resolved", resolvedAt: new Date() })
    .where(eq(escalationEvents.id, eventId))
  revalidatePath("/admin/escalations")
  return { success: true }
}

export async function triggerEscalationsNow() {
  await requireRole("admin")
  const result = await runEscalations()
  revalidatePath("/admin/escalations")
  return result
}
