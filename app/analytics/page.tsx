import { requireRole } from "@/lib/auth/guards"
import { db } from "@/lib/db"
import {
  users, goals, goalSheets, cycles, quarterUpdates, thrustAreas, departments,
} from "@/lib/db/schema"
import { eq, and, avg, count } from "drizzle-orm"
import { AppLayout } from "@/components/layout/app-layout"
import { AnalyticsClient } from "./analytics-client"

export interface QoQPoint { quarter: string; score: number; label: string }
export interface ThrustSlice { name: string; count: number }
export interface UomBar { type: string; count: number }
export interface ManagerRow {
  managerName: string
  q1Done: number; q1Total: number
  q2Done: number; q2Total: number
  q3Done: number; q3Total: number
  q4Done: number; q4Total: number
}

const Q_LABELS: Record<string, string> = {
  q1: "Q1", q2: "Q2", q3: "Q3", q4: "Q4",
}

export default async function AnalyticsPage() {
  const session = await requireRole("manager", "admin")
  const isAdmin = session.user.role === "admin"

  const [activeCycle] = await db.select().from(cycles).where(eq(cycles.isActive, true)).limit(1)
  if (!activeCycle) {
    return (
      <AppLayout role={session.user.role}>
        <p className="text-muted-foreground">No active cycle.</p>
      </AppLayout>
    )
  }

  // Scope: admin → all; manager → own reports
  let scopedEmployeeIds: string[] | null = null
  if (!isAdmin) {
    const reports = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.managerId, session.user.id))
    scopedEmployeeIds = reports.map((r) => r.id)
  }

  // Locked sheets for active cycle
  const allSheets = await db.select().from(goalSheets).where(
    and(eq(goalSheets.cycleId, activeCycle.id), eq(goalSheets.status, "locked"))
  )
  const sheets = scopedEmployeeIds
    ? allSheets.filter((s) => scopedEmployeeIds!.includes(s.employeeId))
    : allSheets

  const sheetIds = sheets.map((s) => s.id)
  const employeeIds = sheets.map((s) => s.employeeId)

  // All goals for these sheets
  const allGoals = sheetIds.length
    ? await db.select().from(goals).where(
        // Drizzle doesn't have inArray directly without import; use filter in JS
        goals.sheetId
          ? undefined
          : undefined
      )
    : []

  // Fetch all goals for relevant sheets (JS filter)
  const allDbGoals = await db.select().from(goals)
  const scopedGoals = allDbGoals.filter((g) => sheetIds.includes(g.sheetId))

  const goalIds = scopedGoals.map((g) => g.id)

  // All quarter updates for scoped goals
  const allUpdates = await db.select().from(quarterUpdates)
  const scopedUpdates = allUpdates.filter((u) => goalIds.includes(u.goalId))

  const allThrustAreas = await db.select().from(thrustAreas)
  const allUsers = await db.select().from(users)
  const allDepts = await db.select().from(departments)

  // ── QoQ trend (weighted average score per quarter) ────────────────────────────
  const qoqData: QoQPoint[] = []
  for (const q of ["q1", "q2", "q3", "q4"] as const) {
    const qUpdates = scopedUpdates.filter(
      (u) => u.quarter === q && u.computedScore !== null
    )
    if (!qUpdates.length) continue
    const avgScore =
      qUpdates.reduce((sum, u) => sum + Number(u.computedScore ?? 0), 0) / qUpdates.length
    qoqData.push({ quarter: q, score: Math.round(avgScore * 100), label: Q_LABELS[q] })
  }

  // ── Thrust-area distribution ──────────────────────────────────────────────────
  const thrustCounts: Record<string, number> = {}
  for (const g of scopedGoals) {
    const ta = allThrustAreas.find((t) => t.id === g.thrustAreaId)
    const name = ta?.name ?? "Other"
    thrustCounts[name] = (thrustCounts[name] ?? 0) + 1
  }
  const thrustData: ThrustSlice[] = Object.entries(thrustCounts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)

  // ── UoM-type breakdown ────────────────────────────────────────────────────────
  const uomCounts: Record<string, number> = {}
  for (const g of scopedGoals) {
    uomCounts[g.uomType] = (uomCounts[g.uomType] ?? 0) + 1
  }
  const uomData: UomBar[] = Object.entries(uomCounts)
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count)

  // ── Manager effectiveness ─────────────────────────────────────────────────────
  const managerMap: Record<string, { name: string; empIds: string[] }> = {}
  for (const empId of employeeIds) {
    const emp = allUsers.find((u) => u.id === empId)
    if (!emp?.managerId) continue
    const mgr = allUsers.find((u) => u.id === emp.managerId)
    if (!mgr) continue
    if (!managerMap[mgr.id]) managerMap[mgr.id] = { name: mgr.name, empIds: [] }
    managerMap[mgr.id].empIds.push(empId)
  }

  const managerRows: ManagerRow[] = Object.values(managerMap).map(({ name, empIds }) => {
    const mgrSheets = sheets.filter((s) => empIds.includes(s.employeeId))
    const mgrGoals = scopedGoals.filter((g) => mgrSheets.some((s) => s.id === g.sheetId))
    const mgrGoalIds = new Set(mgrGoals.map((g) => g.id))
    const mgrUpdates = scopedUpdates.filter((u) => mgrGoalIds.has(u.goalId))

    function quarterStat(q: "q1" | "q2" | "q3" | "q4") {
      const total = empIds.length
      const done = empIds.filter((empId) => {
        const empSheets = mgrSheets.filter((s) => s.employeeId === empId)
        const empGoalIds = new Set(
          mgrGoals.filter((g) => empSheets.some((s) => s.id === g.sheetId)).map((g) => g.id)
        )
        const qUpdates = mgrUpdates.filter((u) => u.quarter === q && empGoalIds.has(u.goalId))
        return qUpdates.some((u) => u.managerCheckinAt != null)
      }).length
      return { done, total }
    }

    const q1 = quarterStat("q1")
    const q2 = quarterStat("q2")
    const q3 = quarterStat("q3")
    const q4 = quarterStat("q4")

    return {
      managerName: name,
      q1Done: q1.done, q1Total: q1.total,
      q2Done: q2.done, q2Total: q2.total,
      q3Done: q3.done, q3Total: q3.total,
      q4Done: q4.done, q4Total: q4.total,
    }
  })

  return (
    <AppLayout role={session.user.role}>
      <AnalyticsClient
        cycleLabel={activeCycle.fyLabel}
        isAdmin={isAdmin}
        qoqData={qoqData}
        thrustData={thrustData}
        uomData={uomData}
        managerRows={managerRows}
        totalGoals={scopedGoals.length}
        totalEmployees={employeeIds.length}
      />
    </AppLayout>
  )
}
