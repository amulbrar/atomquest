import { requireRole } from "@/lib/auth/guards"
import { db } from "@/lib/db"
import { auditLog, users } from "@/lib/db/schema"
import { eq, desc, and, like, gte, lte } from "drizzle-orm"
import { AppLayout } from "@/components/layout/app-layout"
import { AuditClient } from "./audit-client"

export interface AuditEntry {
  id: string
  entityType: string
  entityId: string
  action: string
  actorId: string | null
  actorName: string | null
  before: string | null
  after: string | null
  reason: string | null
  createdAt: string
}

const PAGE_SIZE = 50

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<{ entityType?: string; actorId?: string; from?: string; to?: string; page?: string }>
}) {
  const session = await requireRole("admin")
  const params = await searchParams
  const page = Math.max(1, Number(params.page ?? 1))
  const offset = (page - 1) * PAGE_SIZE

  const allUsers = await db.select({ id: users.id, name: users.name }).from(users)

  const conditions = []
  if (params.entityType) conditions.push(like(auditLog.entityType, `%${params.entityType}%`))
  if (params.actorId) conditions.push(eq(auditLog.actorId, params.actorId))
  if (params.from) conditions.push(gte(auditLog.createdAt, new Date(params.from)))
  if (params.to) conditions.push(lte(auditLog.createdAt, new Date(params.to + "T23:59:59Z")))

  const entries = await db
    .select()
    .from(auditLog)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(auditLog.createdAt))
    .limit(PAGE_SIZE)
    .offset(offset)

  const rows: AuditEntry[] = entries.map((e) => ({
    id: e.id,
    entityType: e.entityType,
    entityId: e.entityId,
    action: e.action,
    actorId: e.actorId,
    actorName: allUsers.find((u) => u.id === e.actorId)?.name ?? null,
    before: e.before,
    after: e.after,
    reason: e.reason,
    createdAt: e.createdAt.toISOString(),
  }))

  return (
    <AppLayout role={session.user.role}>
      <AuditClient
        rows={rows}
        page={page}
        hasMore={entries.length === PAGE_SIZE}
        users={allUsers}
        filters={{
          entityType: params.entityType ?? "",
          actorId: params.actorId ?? "",
          from: params.from ?? "",
          to: params.to ?? "",
        }}
      />
    </AppLayout>
  )
}
