import { requireManager } from "@/lib/auth/guards"
import { db } from "@/lib/db"
import { users, goalSheets, goals, cycles } from "@/lib/db/schema"
import { eq, and, sum, count } from "drizzle-orm"
import { AppLayout } from "@/components/layout/app-layout"
import { EmptyState } from "@/components/layout/empty-state"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import Link from "next/link"
import { User, Clock, Users as UsersIcon } from "lucide-react"

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

  // Single query: users LEFT JOIN sheets (active cycle) LEFT JOIN goals,
  // grouped per employee so we get counts + weightage in one round-trip
  // instead of the previous 1 + 2N pattern. Without an active cycle the
  // joins resolve to NULLs and we still get one row per direct report.
  const rows = await db
    .select({
      empId: users.id,
      empName: users.name,
      empEmail: users.email,
      sheetId: goalSheets.id,
      sheetStatus: goalSheets.status,
      goalCount: count(goals.id),
      weightage: sum(goals.weightage),
    })
    .from(users)
    .leftJoin(
      goalSheets,
      activeCycle
        ? and(
            eq(goalSheets.employeeId, users.id),
            eq(goalSheets.cycleId, activeCycle.id)
          )
        : eq(goalSheets.id, users.id) // never matches → no sheets joined
    )
    .leftJoin(goals, eq(goals.sheetId, goalSheets.id))
    .where(eq(users.managerId, managerId))
    .groupBy(users.id, users.name, users.email, goalSheets.id, goalSheets.status)
    .orderBy(users.name)

  const teamData = rows.map((r) => ({
    empId: r.empId,
    empName: r.empName,
    empEmail: r.empEmail,
    sheet: r.sheetId
      ? { id: r.sheetId, status: r.sheetStatus as string }
      : null,
    goalCount: Number(r.goalCount ?? 0),
    weightage: Number(r.weightage ?? 0),
  }))

  if (teamData.length === 0) {
    return (
      <AppLayout role={session.user.role}>
        <EmptyState
          icon={UsersIcon}
          title="No direct reports"
          description="You don't have any team members assigned yet. Ask an admin to update reporting lines if this is unexpected."
        />
      </AppLayout>
    )
  }

  const pendingCount = teamData.filter((d) => d.sheet?.status === "submitted").length

  return (
    <AppLayout role={session.user.role}>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold">My Team</h1>
            <p className="text-muted-foreground">
              {activeCycle?.fyLabel ?? "No active cycle"} · {teamData.length} direct reports
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
          {teamData.map(({ empId, empName, empEmail, sheet, goalCount, weightage }) => (
            <Card key={empId} className={sheet?.status === "submitted" ? "border-orange-300" : ""}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      <User className="size-4 text-muted-foreground" />
                      {empName}
                    </CardTitle>
                    <CardDescription className="text-xs mt-0.5">{empEmail}</CardDescription>
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
                      <span>{goalCount} goals</span>
                      <span className={weightage === 100 ? "text-green-600 font-medium" : ""}>
                        {weightage}% weightage
                      </span>
                    </div>
                    <Button asChild size="sm" className="w-full" variant={sheet.status === "submitted" ? "default" : "outline"}>
                      <Link href={`/team/${empId}`}>
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
