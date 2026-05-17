import { requireAuth } from "@/lib/auth/guards"
import { db } from "@/lib/db"
import { goalSheets, goals, cycles, users } from "@/lib/db/schema"
import { eq, and, count, sum, sql } from "drizzle-orm"
import { AppLayout } from "@/components/layout/app-layout"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Target, CheckCircle2, AlertCircle } from "lucide-react"
import { Progress } from "@/components/ui/progress"

const SHEET_STATUS_LABEL: Record<string, string> = {
  draft: "Draft",
  submitted: "Pending Approval",
  approved: "Approved",
  locked: "Active",
  reopened: "Reopened",
}

export default async function HomePage() {
  const session = await requireAuth()
  const { id: userId, role } = session.user

  const [activeCycle] = await db
    .select()
    .from(cycles)
    .where(eq(cycles.isActive, true))
    .limit(1)

  if (!activeCycle) {
    return (
      <AppLayout role={role}>
        <div className="flex flex-col items-center justify-center min-h-64 gap-4">
          <AlertCircle className="size-10 text-muted-foreground" />
          <p className="text-muted-foreground">No active cycle configured.</p>
          {role === "admin" && (
            <Button asChild>
              <Link href="/admin/cycles">Configure Cycles</Link>
            </Button>
          )}
        </div>
      </AppLayout>
    )
  }

  // ── Employee dashboard ───────────────────────────────────────────────────

  if (role === "employee") {
    const [sheet] = await db
      .select()
      .from(goalSheets)
      .where(
        and(
          eq(goalSheets.employeeId, userId),
          eq(goalSheets.cycleId, activeCycle.id)
        )
      )
      .limit(1)

    const goalCount = sheet
      ? ((await db.select({ c: count() }).from(goals).where(eq(goals.sheetId, sheet.id)))[0]?.c ?? 0)
      : 0

    const weightageSum = sheet
      ? Number((await db.select({ s: sum(goals.weightage) }).from(goals).where(eq(goals.sheetId, sheet.id)))[0]?.s ?? 0)
      : 0

    return (
      <AppLayout role={role}>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold">
              Welcome, {session.user.name?.split(" ")[0]}
            </h1>
            <p className="text-muted-foreground">
              Active cycle: <strong>{activeCycle.fyLabel}</strong>
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Goal Sheet</CardDescription>
                <CardTitle className="text-lg flex items-center justify-between">
                  {activeCycle.fyLabel}
                  {sheet && (
                    <Badge variant="secondary">
                      {SHEET_STATUS_LABEL[sheet.status]}
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {sheet ? (
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Goals</span>
                      <span className="font-medium">{String(goalCount)} / 8</span>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Weightage</span>
                        <span className={weightageSum === 100 ? "text-green-600 font-medium" : "font-medium"}>
                          {weightageSum}%
                        </span>
                      </div>
                      <Progress value={Math.min(weightageSum, 100)} className="h-1.5" />
                    </div>
                    <Button asChild size="sm" className="w-full">
                      <Link href="/goals">
                        {sheet.status === "draft" ? "Continue editing" : "View goals"}
                      </Link>
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      No goals submitted yet.
                    </p>
                    <Button asChild size="sm" className="w-full">
                      <Link href="/goals">Create goals</Link>
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Quick actions</CardDescription>
                <CardTitle className="text-lg">Next steps</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button asChild variant="outline" size="sm" className="w-full justify-start gap-2">
                  <Link href="/goals">
                    <Target className="size-4" />
                    Manage my goals
                  </Link>
                </Button>
                <Button asChild variant="outline" size="sm" className="w-full justify-start gap-2">
                  <Link href="/checkin">
                    <CheckCircle2 className="size-4" />
                    Quarterly check-in
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </AppLayout>
    )
  }

  // ── Manager dashboard ────────────────────────────────────────────────────

  if (role === "manager") {
    const subordinates = await db
      .select({ id: users.id, name: users.name })
      .from(users)
      .where(eq(users.managerId, userId))

    const subIds = subordinates.map((s) => s.id)

    let pendingCount = 0
    if (subIds.length > 0) {
      const rows = await db
        .select({ c: count() })
        .from(goalSheets)
        .where(
          and(
            eq(goalSheets.cycleId, activeCycle.id),
            eq(goalSheets.status, "submitted"),
            sql`${goalSheets.employeeId} = ANY(ARRAY[${sql.join(
              subIds.map((id) => sql`${id}::text`),
              sql`, `
            )}])`
          )
        )
      pendingCount = rows[0]?.c ?? 0
    }

    return (
      <AppLayout role={role}>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold">
              Hello, {session.user.name?.split(" ")[0]}
            </h1>
            <p className="text-muted-foreground">
              {activeCycle.fyLabel} · {subordinates.length} direct reports
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader className="pb-1">
                <CardDescription>Pending approvals</CardDescription>
                <CardTitle className="text-4xl font-bold">{pendingCount}</CardTitle>
              </CardHeader>
              <CardContent>
                <Button asChild size="sm" className="w-full">
                  <Link href="/team">Review team</Link>
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-1">
                <CardDescription>Team size</CardDescription>
                <CardTitle className="text-4xl font-bold">{subordinates.length}</CardTitle>
              </CardHeader>
              <CardContent>
                <Button asChild size="sm" variant="outline" className="w-full">
                  <Link href="/team/checkin">Team check-ins</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </AppLayout>
    )
  }

  // ── Admin dashboard ──────────────────────────────────────────────────────

  const [userCount] = await db.select({ c: count() }).from(users)
  const [sheetCount] = await db
    .select({ c: count() })
    .from(goalSheets)
    .where(eq(goalSheets.cycleId, activeCycle.id))
  const [lockedCount] = await db
    .select({ c: count() })
    .from(goalSheets)
    .where(and(eq(goalSheets.cycleId, activeCycle.id), eq(goalSheets.status, "locked")))

  return (
    <AppLayout role={role}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Admin Dashboard</h1>
          <p className="text-muted-foreground">Active cycle: <strong>{activeCycle.fyLabel}</strong></p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-1">
              <CardDescription>Total users</CardDescription>
              <CardTitle className="text-4xl">{userCount.c}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-1">
              <CardDescription>Goal sheets</CardDescription>
              <CardTitle className="text-4xl">{sheetCount.c}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-1">
              <CardDescription>Approved</CardDescription>
              <CardTitle className="text-4xl">{lockedCount.c}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-1">
              <CardDescription>Completion rate</CardDescription>
              <CardTitle className="text-4xl">
                {sheetCount.c > 0
                  ? Math.round((lockedCount.c / sheetCount.c) * 100)
                  : 0}%
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        <div className="flex gap-3 flex-wrap">
          <Button asChild><Link href="/admin">Admin panel</Link></Button>
          <Button asChild variant="outline"><Link href="/reports">Reports</Link></Button>
          <Button asChild variant="outline"><Link href="/analytics">Analytics</Link></Button>
        </div>
      </div>
    </AppLayout>
  )
}
