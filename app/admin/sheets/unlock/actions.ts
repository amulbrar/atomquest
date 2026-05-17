"use server"

import { revalidatePath } from "next/cache"
import { requireRole } from "@/lib/auth/guards"
import { db } from "@/lib/db"
import { goalSheets, goals } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { logAudit } from "@/lib/audit"

export async function unlockSheet(sheetId: string, reason: string) {
  const session = await requireRole("admin")
  if (!reason.trim()) return { error: "Reason is required" }

  const [sheet] = await db.select().from(goalSheets).where(eq(goalSheets.id, sheetId))
  if (!sheet) return { error: "Sheet not found" }
  if (sheet.status === "draft" || sheet.status === "submitted") {
    return { error: "Sheet is not in a locked state" }
  }

  const before = { status: sheet.status }

  await db
    .update(goalSheets)
    .set({ status: "reopened", updatedAt: new Date() })
    .where(eq(goalSheets.id, sheetId))

  await logAudit({
    entityType: "goal_sheet",
    entityId: sheetId,
    action: "admin_unlock",
    actorId: session.user.id,
    before: JSON.stringify(before),
    after: JSON.stringify({ status: "reopened" }),
    reason: reason.trim(),
  })

  revalidatePath("/admin/sheets/unlock")
  return { success: true }
}
