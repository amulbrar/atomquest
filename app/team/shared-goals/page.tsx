import { requireManager } from "@/lib/auth/guards"
import { db } from "@/lib/db"
import { users, thrustAreas } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { AppLayout } from "@/components/layout/app-layout"
import { SharedGoalForm } from "./shared-goal-form"

export default async function SharedGoalsPage() {
  const session = await requireManager()

  const reports = await db
    .select({ id: users.id, name: users.name, email: users.email })
    .from(users)
    .where(eq(users.managerId, session.user.id))

  const allThrustAreas = await db
    .select()
    .from(thrustAreas)
    .where(eq(thrustAreas.active, true))

  return (
    <AppLayout role={session.user.role}>
      <div className="max-w-2xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Push Shared Goal</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Define a departmental KPI and push it to one or more team members.
            Recipients can only adjust the weightage — title and target are read-only.
          </p>
        </div>
        <SharedGoalForm reports={reports} thrustAreas={allThrustAreas} />
      </div>
    </AppLayout>
  )
}
