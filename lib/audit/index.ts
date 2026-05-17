import { db } from "@/lib/db"
import { auditLog } from "@/lib/db/schema"

export async function logAudit({
  entityType,
  entityId,
  action,
  actorId,
  before,
  after,
  reason,
}: {
  entityType: string
  entityId: string
  action: string
  actorId?: string | null
  before?: unknown
  after?: unknown
  reason?: string
}) {
  await db.insert(auditLog).values({
    entityType,
    entityId,
    action,
    actorId: actorId ?? null,
    before: before !== undefined ? JSON.stringify(before) : undefined,
    after: after !== undefined ? JSON.stringify(after) : undefined,
    reason,
  })
}
