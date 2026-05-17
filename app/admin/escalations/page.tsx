import { requireRole } from "@/lib/auth/guards"
import { db } from "@/lib/db"
import { escalationRules, escalationEvents, users } from "@/lib/db/schema"
import { eq, desc } from "drizzle-orm"
import { AppLayout } from "@/components/layout/app-layout"
import { EscalationsClient } from "./escalations-client"

export default async function EscalationsPage() {
  const session = await requireRole("admin")

  const rules = await db.select().from(escalationRules).orderBy(escalationRules.createdAt)
  const events = await db
    .select()
    .from(escalationEvents)
    .orderBy(desc(escalationEvents.triggeredAt))
    .limit(100)

  const allUsers = await db.select({ id: users.id, name: users.name }).from(users)

  return (
    <AppLayout role={session.user.role}>
      <EscalationsClient
        rules={rules.map((r) => ({
          id: r.id,
          name: r.name,
          trigger: r.trigger,
          thresholdDays: r.thresholdDays,
          chain: (() => { try { return JSON.parse(r.chain) as string[] } catch { return [] } })(),
          enabled: r.enabled,
        }))}
        events={events.map((e) => ({
          id: e.id,
          ruleId: e.ruleId,
          ruleName: rules.find((r) => r.id === e.ruleId)?.name ?? "Unknown",
          subjectName: allUsers.find((u) => u.id === e.subjectUserId)?.name ?? e.subjectUserId,
          targetName: allUsers.find((u) => u.id === e.targetUserId)?.name ?? e.targetUserId,
          triggeredAt: e.triggeredAt.toISOString(),
          resolvedAt: e.resolvedAt?.toISOString() ?? null,
          status: e.status,
        }))}
      />
    </AppLayout>
  )
}
