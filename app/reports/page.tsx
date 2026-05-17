import { requireRole } from "@/lib/auth/guards"
import { AppLayout } from "@/components/layout/app-layout"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { BarChart3, CheckSquare } from "lucide-react"

export default async function ReportsPage() {
  const session = await requireRole("manager", "admin")
  return (
    <AppLayout role={session.user.role}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Reports</h1>
          <p className="text-muted-foreground">Export and analyse goal data</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <BarChart3 className="size-4" />
                Achievement Report
              </CardTitle>
              <CardDescription>
                Per-goal actuals, scores, and manager comments. Export to CSV or XLSX.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild size="sm">
                <Link href="/reports/achievement">Open report</Link>
              </Button>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <CheckSquare className="size-4" />
                Completion Dashboard
              </CardTitle>
              <CardDescription>
                Live grid of check-in completion across employees and quarters.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild size="sm">
                <Link href="/reports/completion">Open dashboard</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  )
}
