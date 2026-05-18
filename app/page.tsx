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
import { Target, CheckCircle2, AlertCircle, ArrowRight, Users as UsersIcon, FileCheck2, Activity } from "lucide-react"
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
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
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
        <PageHeader
          eyebrow={`${activeCycle.fyLabel} · Performance Cycle`}
          title={`Welcome back, ${session.user.name?.split(" ")[0]}.`}
          subtitle="A summary of where your goals stand and what to do next."
        />

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 mt-10">
          <Card className="col-span-1 sm:col-span-2 lg:col-span-2 relative overflow-hidden">
            <div className="absolute top-0 right-0 size-32 -translate-y-12 translate-x-12 rounded-full bg-primary/[0.04] blur-2xl" />
            <CardHeader className="relative pb-3">
              <CardDescription>Goal Sheet · {activeCycle.fyLabel}</CardDescription>
              <div className="flex items-baseline gap-3 mt-1">
                <CardTitle className="text-3xl">
                  {sheet ? SHEET_STATUS_LABEL[sheet.status] : "Not started"}
                </CardTitle>
                {sheet?.status === "locked" && (
                  <Badge>Active</Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="relative">
              {sheet ? (
                <div className="space-y-5">
                  <div className="grid grid-cols-2 gap-6 pt-2">
                    <Metric label="Goals" value={`${goalCount}`} suffix="/ 8" />
                    <Metric
                      label="Weightage"
                      value={`${weightageSum}`}
                      suffix="%"
                      tone={weightageSum === 100 ? "primary" : "neutral"}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Progress value={Math.min(weightageSum, 100)} className="h-[3px]" />
                    <p className="text-[11px] text-muted-foreground">
                      {weightageSum === 100 ? "Balanced — ready to submit" : `${100 - weightageSum}% remaining`}
                    </p>
                  </div>
                  <Button asChild className="gap-2 group">
                    <Link href="/goals">
                      {sheet.status === "draft" ? "Continue editing" : "View goals"}
                      <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                    </Link>
                  </Button>
                </div>
              ) : (
                <div className="space-y-4 pt-2">
                  <p className="text-sm text-muted-foreground max-w-sm">
                    Start by defining 3 – 8 goals across the five thrust areas.
                    Weightages must sum to 100%.
                  </p>
                  <Button asChild className="gap-2 group">
                    <Link href="/goals">
                      Create goals
                      <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                    </Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Quick actions</CardDescription>
              <CardTitle className="text-lg mt-1">Next steps</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <QuickLink href="/goals" icon={Target} label="Manage my goals" />
              <QuickLink href="/checkin" icon={CheckCircle2} label="Quarterly check-in" />
            </CardContent>
          </Card>
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
        <PageHeader
          eyebrow={`${activeCycle.fyLabel} · ${subordinates.length} direct reports`}
          title={`Hello, ${session.user.name?.split(" ")[0]}.`}
          subtitle="Approvals waiting on you and the team at a glance."
        />

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 mt-10">
          <BigStatCard
            label="Pending approvals"
            value={pendingCount}
            href="/team"
            cta="Review team"
            icon={FileCheck2}
            highlight={pendingCount > 0}
          />
          <BigStatCard
            label="Team size"
            value={subordinates.length}
            href="/team/checkin"
            cta="Team check-ins"
            icon={UsersIcon}
          />
          <BigStatCard
            label="Analytics"
            value="—"
            valueLabel="Quarter-over-quarter"
            href="/analytics"
            cta="Open dashboard"
            icon={Activity}
            secondary
          />
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

  const completionRate = sheetCount.c > 0 ? Math.round((lockedCount.c / sheetCount.c) * 100) : 0

  return (
    <AppLayout role={role}>
      <PageHeader
        eyebrow={`${activeCycle.fyLabel} · Cycle in progress`}
        title="Administrator overview."
        subtitle="Health metrics across users, sheets and completion."
      />

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4 mt-10">
        <StatBlock label="Total users" value={userCount.c} />
        <StatBlock label="Goal sheets" value={sheetCount.c} />
        <StatBlock label="Approved & locked" value={lockedCount.c} />
        <StatBlock label="Completion rate" value={`${completionRate}%`} accent />
      </div>

      <div className="mt-8 flex gap-3 flex-wrap">
        <Button asChild className="gap-2">
          <Link href="/admin">Admin panel <ArrowRight className="size-4" /></Link>
        </Button>
        <Button asChild variant="outline"><Link href="/reports">Reports</Link></Button>
        <Button asChild variant="outline"><Link href="/analytics">Analytics</Link></Button>
      </div>
    </AppLayout>
  )
}

/* ── Composable bits ──────────────────────────────────────────────────────── */

function PageHeader({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow: string
  title: string
  subtitle?: string
}) {
  return (
    <div className="space-y-3 max-w-2xl">
      <p className="eyebrow">{eyebrow}</p>
      <h1 className="font-serif text-4xl md:text-[2.75rem] leading-[1.05] tracking-tight">
        {title}
      </h1>
      {subtitle && (
        <p className="text-[15px] text-muted-foreground leading-relaxed max-w-xl">
          {subtitle}
        </p>
      )}
    </div>
  )
}

function Metric({
  label,
  value,
  suffix,
  tone = "neutral",
}: {
  label: string
  value: string
  suffix?: string
  tone?: "neutral" | "primary"
}) {
  return (
    <div>
      <p className="text-[10.5px] uppercase tracking-[0.14em] text-muted-foreground font-medium mb-1.5">
        {label}
      </p>
      <p className="flex items-baseline gap-1.5">
        <span className={"num-display text-3xl " + (tone === "primary" ? "text-primary" : "text-foreground")}>
          {value}
        </span>
        {suffix && (
          <span className="text-sm text-muted-foreground tabular">{suffix}</span>
        )}
      </p>
    </div>
  )
}

function QuickLink({
  href,
  icon: Icon,
  label,
}: {
  href: string
  icon: React.ElementType
  label: string
}) {
  return (
    <Link
      href={href}
      className="group flex items-center justify-between gap-3 rounded-sm border border-border/70 px-3.5 py-2.5 text-sm hover:border-primary/50 hover:bg-accent/40 transition-colors"
    >
      <span className="flex items-center gap-2.5">
        <Icon className="size-4 text-muted-foreground group-hover:text-primary transition-colors" />
        {label}
      </span>
      <ArrowRight className="size-3.5 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
    </Link>
  )
}

function BigStatCard({
  label,
  value,
  valueLabel,
  href,
  cta,
  icon: Icon,
  highlight = false,
  secondary = false,
}: {
  label: string
  value: number | string
  valueLabel?: string
  href: string
  cta: string
  icon: React.ElementType
  highlight?: boolean
  secondary?: boolean
}) {
  return (
    <Card className="relative overflow-hidden group">
      {highlight && (
        <div className="absolute top-0 right-0 size-24 -translate-y-8 translate-x-8 rounded-full bg-primary/[0.06] blur-2xl" />
      )}
      <CardHeader className="pb-3 relative">
        <div className="flex items-start justify-between">
          <CardDescription>{label}</CardDescription>
          <Icon className="size-4 text-muted-foreground/60" />
        </div>
        <div className="flex items-baseline gap-2 mt-2">
          <span className={"num-display text-[2.75rem] leading-none " + (highlight ? "text-primary" : "")}>
            {value}
          </span>
        </div>
        {valueLabel && (
          <span className="text-[11px] text-muted-foreground mt-1">{valueLabel}</span>
        )}
      </CardHeader>
      <CardContent className="relative">
        <Button asChild variant={secondary ? "outline" : "default"} size="sm" className="w-full gap-2 group/btn">
          <Link href={href}>
            {cta}
            <ArrowRight className="size-3.5 transition-transform group-hover/btn:translate-x-0.5" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  )
}

function StatBlock({
  label,
  value,
  accent = false,
}: {
  label: string
  value: number | string
  accent?: boolean
}) {
  return (
    <Card>
      <CardHeader className="pb-4">
        <CardDescription>{label}</CardDescription>
        <span className={"num-display text-[2.75rem] leading-none mt-2 " + (accent ? "text-primary" : "")}>
          {value}
        </span>
      </CardHeader>
    </Card>
  )
}
