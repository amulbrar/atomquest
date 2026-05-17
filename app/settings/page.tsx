import { requireRole } from "@/lib/auth/guards"
import { db } from "@/lib/db"
import { users } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { AppLayout } from "@/components/layout/app-layout"
import { SettingsClient } from "./settings-client"

export default async function SettingsPage() {
  const session = await requireRole("employee", "manager", "admin")
  const [user] = await db.select().from(users).where(eq(users.id, session.user.id))

  return (
    <AppLayout role={session.user.role}>
      <SettingsClient
        emailNotifications={user?.emailNotifications ?? true}
        teamsNotifications={user?.teamsNotifications ?? false}
        teamsWebhookUrl={user?.teamsWebhookUrl ?? ""}
      />
    </AppLayout>
  )
}
