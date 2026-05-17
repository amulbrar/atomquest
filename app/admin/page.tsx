import { requireRole } from "@/lib/auth/guards"
import { AppLayout } from "@/components/layout/app-layout"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Settings, Users, Bell, ScrollText, RefreshCw } from "lucide-react"

export default async function AdminPage() {
  const session = await requireRole("admin")
  return (
    <AppLayout role={session.user.role}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Admin</h1>
          <p className="text-muted-foreground">Manage cycles, users, escalations, and audit logs</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Settings className="size-4" /> Cycles
              </CardTitle>
              <CardDescription>Manage performance cycles and check-in windows.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild size="sm"><Link href="/admin/cycles">Manage cycles</Link></Button>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Users className="size-4" /> Users
              </CardTitle>
              <CardDescription>View and manage user accounts and reporting lines.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild size="sm"><Link href="/admin/users">Manage users</Link></Button>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <ScrollText className="size-4" /> Audit Log
              </CardTitle>
              <CardDescription>Track all changes with before/after diffs.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild size="sm"><Link href="/admin/audit">View audit log</Link></Button>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Bell className="size-4" /> Escalations
              </CardTitle>
              <CardDescription>Configure and monitor escalation rules.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild size="sm"><Link href="/admin/escalations">Manage escalations</Link></Button>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <RefreshCw className="size-4" /> Unlock Sheets
              </CardTitle>
              <CardDescription>Unlock approved goal sheets for employee revision.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild size="sm"><Link href="/admin/sheets/unlock">Unlock sheets</Link></Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  )
}
