import { requireRole } from "@/lib/auth/guards"
import { db } from "@/lib/db"
import { goals, goalSheets, users, departments, cycles, quarterUpdates, thrustAreas } from "@/lib/db/schema"
import { eq, and } from "drizzle-orm"
import { AppLayout } from "@/components/layout/app-layout"
import { AchievementClient } from "./achievement-client"
import { EmptyState } from "@/components/layout/empty-state"
import { FileText } from "lucide-react"

export interface AchievementRow {
  goalId: string
  employeeId: string
  employeeName: string
  departmentName: string | null
  managerName: string | null
  thrustArea: string
  goalTitle: string
  uomType: string
  targetValue: string | null
  targetDate: string | null
  weightage: number
  quarter: string | null
  actualValue: string | null
  actualDate: string | null
  status: string | null
  computedScore: string | null
  employeeNote: string | null
  managerComment: string | null
}

type Quarter = "q1" | "q2" | "q3" | "q4"

function activeQuarterOf(cycle: {
  q1Open: string; q1Close: string
  q2Open: string; q2Close: string
  q3Open: string; q3Close: string
  q4Open: string; q4Close: string
}): Quarter {
  const today = new Date().toISOString().split("T")[0]
  if (today >= cycle.q1Open && today <= cycle.q1Close) return "q1"
  if (today >= cycle.q2Open && today <= cycle.q2Close) return "q2"
  if (today >= cycle.q3Open && today <= cycle.q3Close) return "q3"
  return "q4"
}

export default async function AchievementReportPage({
  searchParams,
}: {
  searchParams: Promise<{ cycleId?: string; quarter?: string }>
}) {
  const session = await requireRole("manager", "admin")
  const params = await searchParams

  const allCycles = await db.select().from(cycles).orderBy(cycles.fyLabel)
  const activeCycle = allCycles.find((c) => c.isActive) ?? allCycles[0]

  const selectedCycleId = params.cycleId ?? activeCycle?.id ?? ""
  const selectedCycle = allCycles.find((c) => c.id === selectedCycleId) ?? activeCycle
  const selectedQuarter: Quarter = (params.quarter as Quarter) ??
    (selectedCycle ? activeQuarterOf(selectedCycle) : "q1")

  if (!selectedCycle) {
    return (
      <AppLayout role={session.user.role}>
        <EmptyState
          icon={FileText}
          title="No cycles configured"
          description="An admin needs to create a performance cycle before reports can be generated."
        />
      </AppLayout>
    )
  }

  // Fetch goals with sheet + employee info
  const rawGoals = await db
    .select({
      goalId: goals.id,
      goalTitle: goals.title,
      uomType: goals.uomType,
      targetValue: goals.targetValue,
      targetDate: goals.targetDate,
      weightage: goals.weightage,
      thrustAreaId: goals.thrustAreaId,
      employeeId: users.id,
      employeeName: users.name,
      departmentId: users.departmentId,
      managerId: users.managerId,
    })
    .from(goals)
    .innerJoin(goalSheets, eq(goals.sheetId, goalSheets.id))
    .innerJoin(users, eq(goalSheets.employeeId, users.id))
    .where(
      and(
        eq(goalSheets.cycleId, selectedCycleId),
        eq(goalSheets.status, "locked")
      )
    )

  const allThrustAreas = await db.select().from(thrustAreas)
  const allDepts = await db.select().from(departments)
  const allUsers = await db.select({ id: users.id, name: users.name }).from(users)

  // Get updates for selected quarter
  const goalIds = rawGoals.map((g) => g.goalId)
  const updates = goalIds.length
    ? await db
        .select()
        .from(quarterUpdates)
        .where(eq(quarterUpdates.quarter, selectedQuarter))
    : []
  const updateMap = new Map(updates.filter((u) => goalIds.includes(u.goalId)).map((u) => [u.goalId, u]))

  const rows: AchievementRow[] = rawGoals.map((g) => {
    const u = updateMap.get(g.goalId)
    const ta = allThrustAreas.find((t) => t.id === g.thrustAreaId)
    const dept = allDepts.find((d) => d.id === g.departmentId)
    const mgr = allUsers.find((u2) => u2.id === g.managerId)
    return {
      goalId: g.goalId,
      employeeId: g.employeeId,
      employeeName: g.employeeName,
      departmentName: dept?.name ?? null,
      managerName: mgr?.name ?? null,
      thrustArea: ta?.name ?? "",
      goalTitle: g.goalTitle,
      uomType: g.uomType,
      targetValue: g.targetValue,
      targetDate: g.targetDate,
      weightage: g.weightage,
      quarter: selectedQuarter,
      actualValue: u?.actualValue ?? null,
      actualDate: u?.actualDate ?? null,
      status: u?.status ?? null,
      computedScore: u?.computedScore ?? null,
      employeeNote: u?.employeeNote ?? null,
      managerComment: u?.managerComment ?? null,
    }
  })

  if (rows.length === 0) {
    return (
      <AppLayout role={session.user.role}>
        <EmptyState
          icon={FileText}
          title="No goals to report on yet"
          description={`No locked goal sheets exist in ${selectedCycle.fyLabel} for ${selectedQuarter.toUpperCase()}. Once managers approve sheets, rows will appear here ready to export.`}
        />
      </AppLayout>
    )
  }

  return (
    <AppLayout role={session.user.role}>
      <AchievementClient
        rows={rows}
        cycles={allCycles.map((c) => ({ id: c.id, label: c.fyLabel }))}
        selectedCycleId={selectedCycleId}
        selectedQuarter={selectedQuarter}
      />
    </AppLayout>
  )
}
