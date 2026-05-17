import { requireManager } from "@/lib/auth/guards"
import { db } from "@/lib/db"
import { users, goalSheets, goals, cycles } from "@/lib/db/schema"
import { eq, and, sum, count } from "drizzle-orm"
import { AppLayout } from "@/components/layout/app-layout"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import Link from "next/link"
import { User, Clock } from "lucide-react"

const SHEET_STATUS_LABEL: Record<string, string> = {
  draft: "Draft",
  submitted: "Awaiting Approval",
  approved: "Approved",
  locked: "Active",
  reopened: "Returned",
}

const SHEET_STATUS_VARIANT: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  draft: "secondary",
  submitted: "outline",
  approved: "secondary",
  locked: "default",
  reopened: "destructive",
}

export default async function TeamPage() {
  const session = await requireManager()
  const managerId = session.user.id

  const [activeCycle] = await db
    .select()
    .from(cycles)
    .where(eq(cycles.isActive, true))
    .limit(1)

  const reports = await db
    .select()
    .from(users)
    .where(eq(users.managerId, managerId))

  if (reports.length === 0) {
    return (
      <AppLayout role={session.user.role}>
        <div className="space-y-4">
          <h1 className="text-2xl font-bold">My Team</h1>
          <p className="text-muted-foreground">No direct reports assigned to you.</p>
        </div>
      </AppLayout>
    )
  }

  const teamData = await Promise.all(
    reports.map(async (emp) => {
      if (!activeCycle) return { emp, sheet: null, goalCount: 0, weightage: 0 }
      const [sheet] = await db
        .select()
        .from(goalSheets)
        .where(
          and(
            eq(goalSheets.employeeId, emp.id),
            eq(goalSheets.cycleId, activeCycle.id)
          )
        )
        .limit(1)

      if (!sheet) return { emp, sheet: null, goalCount: 0, weightage: 0 }

      const [agg] = await db
        .select({ cnt: count(), wt: sum(goals.weightage) })
        .from(goals)
        .where(eq(goals.sheetId, sheet.id))

      return {
        emp,
        sheet,
        goalCount: agg?.cnt ?? 0,
        weightage: Number(agg?.wt ?? 0),
      }
    })
  )

  const pendingCount = teamData.filter((d) => d.sheet?.status === "submitted").length

  return (
    <AppLayout role={session.user.role}>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold">My Team</h1>
            <p className="text-muted-foreground">
              {activeCycle?.fyLabel ?? "No active cycle"} · {reports.length} direct reports
              {pendingCount > 0 && (
                <span className="ml-2 inline-flex items-center gap-1 text-orange-600 font-medium">
                  <Clock className="size-3.5" />
                  {pendingCount} pending approval
                </span>
              )}
            </p>
          </div>
          {session.user.role === "manager" && (
            <Button asChild variant="outline" size="sm">
              <Link href="/team/shared-goals">Push shared goal</Link>
            </Button>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {teamData.map(({ emp, sheet, goalCount, weightage }) => (
            <Card key={emp.id} className={sheet?.status === "submitted" ? "border-orange-300" : ""}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      <User className="size-4 text-muted-foreground" />
                      {emp.name}
                    </CardTitle>
                    <CardDescription className="text-xs mt-0.5">{emp.email}</CardDescription>
                  </div>
                  {sheet ? (
                    <Badge variant={SHEET_STATUS_VARIANT[sheet.status]}>
                      {SHEET_STATUS_LABEL[sheet.status]}
                    </Badge>
                  ) : (
                    <Badge variant="secondary">No sheet</Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {sheet ? (
                  <>
                    <div className="flex gap-4 text-sm text-muted-foreground">
                      <span>{String(goalCount)} goals</span>
                      <span className={weightage === 100 ? "text-green-600 font-medium" : ""}>
                        {weightage}% weightage
                      </span>
                    </div>
                    <Button asChild size="sm" className="w-full" variant={sheet.status === "submitted" ? "default" : "outline"}>
                      <Link href={`/team/${emp.id}`}>
                        {sheet.status === "submitted" ? "Review & Approve" : "View goals"}
                      </Link>
                    </Button>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">No goals submitted.</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </AppLayout>
  )
}
