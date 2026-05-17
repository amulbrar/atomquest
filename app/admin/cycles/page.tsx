import { requireRole } from "@/lib/auth/guards"
import { db } from "@/lib/db"
import { cycles } from "@/lib/db/schema"
import { AppLayout } from "@/components/layout/app-layout"
import { CyclesClient } from "./cycles-client"

export default async function CyclesPage() {
  const session = await requireRole("admin")
  const allCycles = await db.select().from(cycles).orderBy(cycles.fyLabel)
  return (
    <AppLayout role={session.user.role}>
      <CyclesClient cycles={allCycles} />
    </AppLayout>
  )
}
