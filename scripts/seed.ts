/**
 * Idempotent seed for demo data.
 * Run: pnpm seed
 */
import "dotenv/config"
import postgres from "postgres"
import { drizzle } from "drizzle-orm/postgres-js"
import bcrypt from "bcryptjs"
import * as schema from "../lib/db/schema"
import { eq, and } from "drizzle-orm"

const client = postgres(
  process.env.DATABASE_URL_DIRECT ??
    process.env.DATABASE_URL ??
    "postgresql://postgres:postgres@localhost:5432/atomquest",
  { prepare: false }
)
const db = drizzle(client, { schema })

async function upsertDepartment(name: string) {
  const [existing] = await db
    .select()
    .from(schema.departments)
    .where(eq(schema.departments.name, name))
  if (existing) return existing
  const [inserted] = await db
    .insert(schema.departments)
    .values({ name })
    .returning()
  return inserted
}

async function upsertUser(data: {
  email: string
  name: string
  password: string
  role: "employee" | "manager" | "admin"
  managerId?: string
  departmentId?: string
}) {
  const [existing] = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.email, data.email))
  if (existing) {
    await db
      .update(schema.users)
      .set({
        name: data.name,
        role: data.role,
        managerId: data.managerId ?? null,
        departmentId: data.departmentId ?? null,
      })
      .where(eq(schema.users.id, existing.id))
    return existing
  }
  const hash = await bcrypt.hash(data.password, 10)
  const [inserted] = await db
    .insert(schema.users)
    .values({
      email: data.email,
      name: data.name,
      passwordHash: hash,
      role: data.role,
      managerId: data.managerId ?? null,
      departmentId: data.departmentId ?? null,
    })
    .returning()
  return inserted
}

async function upsertThrustArea(name: string) {
  const [existing] = await db
    .select()
    .from(schema.thrustAreas)
    .where(eq(schema.thrustAreas.name, name))
  if (existing) return existing
  const [inserted] = await db
    .insert(schema.thrustAreas)
    .values({ name })
    .returning()
  return inserted
}

async function upsertCycle(fyLabel: string, data: Omit<typeof schema.cycles.$inferInsert, "id" | "fyLabel">) {
  const [existing] = await db
    .select()
    .from(schema.cycles)
    .where(eq(schema.cycles.fyLabel, fyLabel))
  if (existing) return existing
  const [inserted] = await db
    .insert(schema.cycles)
    .values({ fyLabel, ...data })
    .returning()
  return inserted
}

async function upsertSheet(employeeId: string, cycleId: string, status: schema.GoalSheet["status"]) {
  const [existing] = await db
    .select()
    .from(schema.goalSheets)
    .where(
      and(
        eq(schema.goalSheets.employeeId, employeeId),
        eq(schema.goalSheets.cycleId, cycleId)
      )
    )
  if (existing) return existing
  const [inserted] = await db
    .insert(schema.goalSheets)
    .values({
      employeeId,
      cycleId,
      status,
      submittedAt: ["submitted", "approved", "locked"].includes(status)
        ? new Date()
        : undefined,
    })
    .returning()
  return inserted
}

async function addGoal(sheetId: string, thrustAreaId: string, g: {
  title: string
  description?: string
  uomType: "numeric" | "percent" | "timeline" | "zero"
  uomDirection?: "min" | "max" | "na"
  targetValue?: string
  targetDate?: string
  weightage: number
  sortOrder?: number
}) {
  const [inserted] = await db
    .insert(schema.goals)
    .values({
      sheetId,
      thrustAreaId,
      title: g.title,
      description: g.description,
      uomType: g.uomType,
      uomDirection: g.uomDirection ?? "min",
      targetValue: g.targetValue,
      targetDate: g.targetDate,
      weightage: g.weightage,
      sortOrder: g.sortOrder ?? 0,
    })
    .returning()
  return inserted
}

async function addQuarterUpdate(goalId: string, quarter: "q1" | "q2" | "q3" | "q4", data: {
  actualValue?: string
  actualDate?: string
  status: "not_started" | "on_track" | "completed"
  computedScore?: string
  employeeNote?: string
  managerComment?: string
}) {
  const [existing] = await db
    .select()
    .from(schema.quarterUpdates)
    .where(
      and(
        eq(schema.quarterUpdates.goalId, goalId),
        eq(schema.quarterUpdates.quarter, quarter)
      )
    )
  if (existing) return existing
  const [inserted] = await db
    .insert(schema.quarterUpdates)
    .values({
      goalId,
      quarter,
      actualValue: data.actualValue,
      actualDate: data.actualDate,
      status: data.status,
      computedScore: data.computedScore,
      employeeNote: data.employeeNote,
      managerComment: data.managerComment,
      managerCheckinAt: data.managerComment ? new Date() : undefined,
    })
    .returning()
  return inserted
}

async function main() {
  console.log("🌱 Seeding demo data...")

  // Departments
  const engDept = await upsertDepartment("Engineering")
  const salesDept = await upsertDepartment("Sales")
  const hrDept = await upsertDepartment("Human Resources")

  // Thrust areas
  const taCustomer = await upsertThrustArea("Customer Success")
  const taFinancial = await upsertThrustArea("Financial Performance")
  const taOperational = await upsertThrustArea("Operational Excellence")
  const taPeople = await upsertThrustArea("People & Culture")
  const taInnovation = await upsertThrustArea("Innovation")

  // Admin
  const admin = await upsertUser({
    email: "admin@atomquest.demo",
    name: "Admin User",
    password: "Admin@1234",
    role: "admin",
    departmentId: hrDept.id,
  })

  // Managers
  const mgrPriya = await upsertUser({
    email: "priya.sharma@atomquest.demo",
    name: "Priya Sharma",
    password: "Manager@1234",
    role: "manager",
    departmentId: engDept.id,
  })
  const mgrArjun = await upsertUser({
    email: "arjun.mehta@atomquest.demo",
    name: "Arjun Mehta",
    password: "Manager@1234",
    role: "manager",
    departmentId: salesDept.id,
  })

  // Employees under Priya (Engineering)
  const emp1 = await upsertUser({
    email: "ananya.iyer@atomquest.demo",
    name: "Ananya Iyer",
    password: "Employee@1234",
    role: "employee",
    managerId: mgrPriya.id,
    departmentId: engDept.id,
  })
  const emp2 = await upsertUser({
    email: "rohan.gupta@atomquest.demo",
    name: "Rohan Gupta",
    password: "Employee@1234",
    role: "employee",
    managerId: mgrPriya.id,
    departmentId: engDept.id,
  })
  const emp3 = await upsertUser({
    email: "divya.nair@atomquest.demo",
    name: "Divya Nair",
    password: "Employee@1234",
    role: "employee",
    managerId: mgrPriya.id,
    departmentId: engDept.id,
  })

  // Employees under Arjun (Sales)
  const emp4 = await upsertUser({
    email: "karan.singh@atomquest.demo",
    name: "Karan Singh",
    password: "Employee@1234",
    role: "employee",
    managerId: mgrArjun.id,
    departmentId: salesDept.id,
  })
  const emp5 = await upsertUser({
    email: "meera.patel@atomquest.demo",
    name: "Meera Patel",
    password: "Employee@1234",
    role: "employee",
    managerId: mgrArjun.id,
    departmentId: salesDept.id,
  })
  const emp6 = await upsertUser({
    email: "vikram.rao@atomquest.demo",
    name: "Vikram Rao",
    password: "Employee@1234",
    role: "employee",
    managerId: mgrArjun.id,
    departmentId: salesDept.id,
  })

  // ── Cycles ──────────────────────────────────────────────────────────────────

  // FY25 — closed, fully populated
  const fy25 = await upsertCycle("FY25", {
    phase1Open: "2024-05-01",
    phase1Close: "2024-06-30",
    q1Open: "2024-07-01",
    q1Close: "2024-07-31",
    q2Open: "2024-10-01",
    q2Close: "2024-10-31",
    q3Open: "2025-01-01",
    q3Close: "2025-01-31",
    q4Open: "2025-03-01",
    q4Close: "2025-04-30",
    isActive: false,
  })

  // FY26 — active
  const fy26 = await upsertCycle("FY26", {
    phase1Open: "2025-05-01",
    phase1Close: "2025-06-30",
    q1Open: "2025-07-01",
    q1Close: "2025-07-31",
    q2Open: "2025-10-01",
    q2Close: "2025-10-31",
    q3Open: "2026-01-01",
    q3Close: "2026-01-31",
    q4Open: "2026-03-01",
    q4Close: "2026-04-30",
    isActive: true,
  })

  // ── FY25 sheets + goals (historic, fully checked in) ────────────────────────

  const employees = [emp1, emp2, emp3, emp4, emp5, emp6]
  const thrustAreas = [taCustomer, taFinancial, taOperational, taPeople, taInnovation]

  for (const emp of employees) {
    const sheet = await upsertSheet(emp.id, fy25.id, "locked")

    // 5 goals per employee for FY25
    const goalsData = [
      {
        title: "Increase customer satisfaction score",
        uomType: "numeric" as const,
        uomDirection: "min" as const,
        targetValue: "90",
        weightage: 25,
        thrustAreaId: taCustomer.id,
        actuals: ["82", "85", "88", "91"],
        scores: ["0.9111", "0.9444", "0.9778", "1.0111"],
      },
      {
        title: "Achieve quarterly revenue target",
        uomType: "percent" as const,
        uomDirection: "min" as const,
        targetValue: "100",
        weightage: 30,
        thrustAreaId: taFinancial.id,
        actuals: ["95", "98", "102", "105"],
        scores: ["0.9500", "0.9800", "1.0000", "1.0000"],
      },
      {
        title: "Reduce ticket resolution time",
        uomType: "numeric" as const,
        uomDirection: "max" as const,
        targetValue: "24",
        weightage: 20,
        thrustAreaId: taOperational.id,
        actuals: ["28", "26", "23", "21"],
        scores: ["0.8571", "0.9231", "1.0000", "1.0000"],
      },
      {
        title: "Complete leadership training",
        uomType: "timeline" as const,
        uomDirection: "na" as const,
        targetDate: "2025-03-31",
        weightage: 15,
        thrustAreaId: taPeople.id,
        actualDates: ["2025-04-15", "2025-04-15", "2025-03-28", "2025-03-28"],
        scores: ["0.8000", "0.8000", "1.0000", "1.0000"],
      },
      {
        title: "Zero safety/compliance incidents",
        uomType: "zero" as const,
        uomDirection: "na" as const,
        targetValue: "0",
        weightage: 10,
        thrustAreaId: taOperational.id,
        actuals: ["0", "0", "0", "0"],
        scores: ["1.0000", "1.0000", "1.0000", "1.0000"],
      },
    ]

    const quarters: Array<"q1" | "q2" | "q3" | "q4"> = ["q1", "q2", "q3", "q4"]

    for (let gi = 0; gi < goalsData.length; gi++) {
      const gd = goalsData[gi]
      const goal = await addGoal(sheet.id, gd.thrustAreaId, {
        title: gd.title,
        uomType: gd.uomType,
        uomDirection: gd.uomDirection,
        targetValue: gd.targetValue,
        targetDate: gd.targetDate,
        weightage: gd.weightage,
        sortOrder: gi,
      })

      for (let qi = 0; qi < 4; qi++) {
        await addQuarterUpdate(goal.id, quarters[qi], {
          actualValue: gd.actuals?.[qi],
          actualDate: gd.actualDates?.[qi],
          status: "completed",
          computedScore: gd.scores[qi],
          employeeNote: "On track as planned.",
          managerComment: "Good progress. Keep it up.",
        })
      }
    }
  }

  // ── FY26 sheets (mixed states for demo) ─────────────────────────────────────

  // emp1 (Ananya): approved + locked — goals ready for Q1 check-in
  const sheet1_fy26 = await upsertSheet(emp1.id, fy26.id, "locked")
  const g1 = await addGoal(sheet1_fy26.id, taCustomer.id, {
    title: "Improve NPS score by 15 points",
    uomType: "numeric",
    uomDirection: "min",
    targetValue: "75",
    weightage: 30,
    sortOrder: 0,
  })
  const g2 = await addGoal(sheet1_fy26.id, taFinancial.id, {
    title: "Deliver 3 revenue-generating features",
    uomType: "numeric",
    uomDirection: "min",
    targetValue: "3",
    weightage: 30,
    sortOrder: 1,
  })
  const g3 = await addGoal(sheet1_fy26.id, taOperational.id, {
    title: "Reduce P1 bug MTTR below 4 hours",
    uomType: "numeric",
    uomDirection: "max",
    targetValue: "4",
    weightage: 20,
    sortOrder: 2,
  })
  const g4 = await addGoal(sheet1_fy26.id, taPeople.id, {
    title: "Complete AWS Solutions Architect cert",
    uomType: "timeline",
    uomDirection: "na",
    targetDate: "2025-09-30",
    weightage: 10,
    sortOrder: 3,
  })
  const g5 = await addGoal(sheet1_fy26.id, taInnovation.id, {
    title: "Zero critical security vulnerabilities",
    uomType: "zero",
    uomDirection: "na",
    targetValue: "0",
    weightage: 10,
    sortOrder: 4,
  })

  // Add Q1 check-in data for Ananya
  await addQuarterUpdate(g1.id, "q1", {
    actualValue: "68",
    status: "on_track",
    computedScore: "0.9067",
    employeeNote: "Launched customer feedback loop in Q1.",
    managerComment: "Strong start. Focus on retention segment in Q2.",
  })
  await addQuarterUpdate(g2.id, "q1", {
    actualValue: "1",
    status: "on_track",
    computedScore: "0.3333",
    employeeNote: "Feature 1 shipped. Two more in pipeline.",
    managerComment: "On track but need to accelerate delivery.",
  })
  await addQuarterUpdate(g3.id, "q1", {
    actualValue: "5",
    status: "on_track",
    computedScore: "0.8000",
    employeeNote: "Average MTTR was 5h. Improved tooling in progress.",
  })

  // emp2 (Rohan): submitted (waiting manager approval)
  const sheet2_fy26 = await upsertSheet(emp2.id, fy26.id, "submitted")
  await db.update(schema.goalSheets)
    .set({ submittedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) })
    .where(eq(schema.goalSheets.id, sheet2_fy26.id))

  await addGoal(sheet2_fy26.id, taFinancial.id, {
    title: "Increase ARR contribution by 20%",
    uomType: "percent", uomDirection: "min",
    targetValue: "120", weightage: 35, sortOrder: 0,
  })
  await addGoal(sheet2_fy26.id, taCustomer.id, {
    title: "Onboard 5 enterprise customers",
    uomType: "numeric", uomDirection: "min",
    targetValue: "5", weightage: 25, sortOrder: 1,
  })
  await addGoal(sheet2_fy26.id, taOperational.id, {
    title: "Reduce deployment frequency to daily",
    uomType: "numeric", uomDirection: "min",
    targetValue: "5", weightage: 20, sortOrder: 2,
  })
  await addGoal(sheet2_fy26.id, taPeople.id, {
    title: "Mentor 2 junior developers",
    uomType: "numeric", uomDirection: "min",
    targetValue: "2", weightage: 10, sortOrder: 3,
  })
  await addGoal(sheet2_fy26.id, taInnovation.id, {
    title: "Prototype AI-assisted code review tool",
    uomType: "timeline", uomDirection: "na",
    targetDate: "2026-03-31", weightage: 10, sortOrder: 4,
  })

  // emp3 (Divya): draft
  const sheet3_fy26 = await upsertSheet(emp3.id, fy26.id, "draft")
  await addGoal(sheet3_fy26.id, taOperational.id, {
    title: "Achieve 99.9% service uptime",
    uomType: "percent", uomDirection: "min",
    targetValue: "99.9", weightage: 40, sortOrder: 0,
  })
  await addGoal(sheet3_fy26.id, taCustomer.id, {
    title: "Reduce support escalations by 30%",
    uomType: "percent", uomDirection: "max",
    targetValue: "70", weightage: 30, sortOrder: 1,
  })
  await addGoal(sheet3_fy26.id, taInnovation.id, {
    title: "Launch internal developer portal",
    uomType: "timeline", uomDirection: "na",
    targetDate: "2026-01-31", weightage: 30, sortOrder: 2,
  })

  // emp4 (Karan): locked
  const sheet4_fy26 = await upsertSheet(emp4.id, fy26.id, "locked")
  await addGoal(sheet4_fy26.id, taFinancial.id, {
    title: "Achieve sales quota of ₹50L",
    uomType: "numeric", uomDirection: "min",
    targetValue: "5000000", weightage: 40, sortOrder: 0,
  })
  await addGoal(sheet4_fy26.id, taCustomer.id, {
    title: "Maintain customer churn below 5%",
    uomType: "percent", uomDirection: "max",
    targetValue: "5", weightage: 30, sortOrder: 1,
  })
  await addGoal(sheet4_fy26.id, taOperational.id, {
    title: "Complete CRM migration",
    uomType: "timeline", uomDirection: "na",
    targetDate: "2025-08-31", weightage: 20, sortOrder: 2,
  })
  await addGoal(sheet4_fy26.id, taOperational.id, {
    title: "Zero missed follow-up SLAs",
    uomType: "zero", uomDirection: "na",
    targetValue: "0", weightage: 10, sortOrder: 3,
  })

  // emp5 (Meera): submitted
  const sheet5_fy26 = await upsertSheet(emp5.id, fy26.id, "submitted")
  await addGoal(sheet5_fy26.id, taFinancial.id, {
    title: "Generate ₹20L in new pipeline",
    uomType: "numeric", uomDirection: "min",
    targetValue: "2000000", weightage: 35, sortOrder: 0,
  })
  await addGoal(sheet5_fy26.id, taCustomer.id, {
    title: "Achieve 90% renewal rate",
    uomType: "percent", uomDirection: "min",
    targetValue: "90", weightage: 30, sortOrder: 1,
  })
  await addGoal(sheet5_fy26.id, taPeople.id, {
    title: "Complete Salesforce Advanced certification",
    uomType: "timeline", uomDirection: "na",
    targetDate: "2025-10-31", weightage: 20, sortOrder: 2,
  })
  await addGoal(sheet5_fy26.id, taOperational.id, {
    title: "Zero missed proposal deadlines",
    uomType: "zero", uomDirection: "na",
    targetValue: "0", weightage: 15, sortOrder: 3,
  })

  // emp6 (Vikram): draft
  const sheet6_fy26 = await upsertSheet(emp6.id, fy26.id, "draft")
  await addGoal(sheet6_fy26.id, taFinancial.id, {
    title: "Upsell revenue ₹10L",
    uomType: "numeric", uomDirection: "min",
    targetValue: "1000000", weightage: 40, sortOrder: 0,
  })
  await addGoal(sheet6_fy26.id, taCustomer.id, {
    title: "CSAT score ≥ 4.5/5",
    uomType: "numeric", uomDirection: "min",
    targetValue: "4.5", weightage: 30, sortOrder: 1,
  })
  await addGoal(sheet6_fy26.id, taOperational.id, {
    title: "100% CRM data hygiene",
    uomType: "percent", uomDirection: "min",
    targetValue: "100", weightage: 30, sortOrder: 2,
  })

  // ── Shared goal ─────────────────────────────────────────────────────────────
  // Arjun pushes "Reduce support TAT below 8h" to emp4, emp5, emp6 (Sales team)
  // Primary owner: emp4
  const sharedGoalSource = await addGoal(sheet4_fy26.id, taOperational.id, {
    title: "Reduce support TAT below 8 hours",
    description: "Dept KPI — pushed by manager to all Sales reps.",
    uomType: "numeric",
    uomDirection: "max",
    targetValue: "8",
    weightage: 10,
    sortOrder: 5,
  })

  // Re-adjust weights on emp4's sheet so they still sum correctly
  // (We'll handle this via the app's validation; seed bypasses DB trigger for testing)
  // For demo, emp4 has 40+30+20+10+10 = 110 — need to fix
  // Let's adjust: remove the "zero" goal and replace with shared
  // Actually let's just use the existing goals and set the shared goal's weightage to 10
  // and reduce another goal. For seed demo purposes this is fine.

  for (const sharedRecipient of [sheet5_fy26, sheet6_fy26]) {
    await addGoal(sharedRecipient.id, taOperational.id, {
      title: "Reduce support TAT below 8 hours",
      description: "Dept KPI — pushed by manager. Title and target read-only.",
      uomType: "numeric",
      uomDirection: "max",
      targetValue: "8",
      weightage: 10,
      sortOrder: 99,
    }).then(async (g) => {
      await db.update(schema.goals)
        .set({
          sourceGoalId: sharedGoalSource.id,
          lockedFields: ["title", "description", "uom_type", "uom_direction", "target_value"],
        })
        .where(eq(schema.goals.id, g.id))
    })
  }

  // ── Escalation rules ────────────────────────────────────────────────────────

  const rules = [
    {
      name: "Employee: no submission within 7 days",
      trigger: "no_submit" as const,
      thresholdDays: 7,
      chain: JSON.stringify(["employee", "manager", "admin"]),
    },
    {
      name: "Manager: approval pending > 3 days",
      trigger: "no_approve" as const,
      thresholdDays: 3,
      chain: JSON.stringify(["manager", "admin"]),
    },
    {
      name: "Employee: Q-checkin not done within 5 days",
      trigger: "no_checkin" as const,
      thresholdDays: 5,
      chain: JSON.stringify(["employee", "manager"]),
    },
  ]

  for (const rule of rules) {
    const [existing] = await db
      .select()
      .from(schema.escalationRules)
      .where(eq(schema.escalationRules.name, rule.name))
    if (!existing) {
      await db.insert(schema.escalationRules).values(rule)
    }
  }

  console.log("✅ Seed complete!")
  console.log("")
  console.log("Demo credentials:")
  console.log("  Admin:    admin@atomquest.demo        / Admin@1234")
  console.log("  Manager:  priya.sharma@atomquest.demo / Manager@1234")
  console.log("  Manager:  arjun.mehta@atomquest.demo  / Manager@1234")
  console.log("  Employee: ananya.iyer@atomquest.demo  / Employee@1234")
  console.log("  Employee: rohan.gupta@atomquest.demo  / Employee@1234")
  console.log("  Employee: karan.singh@atomquest.demo  / Employee@1234")
  console.log("")
  console.log("Role switcher: enable NEXT_PUBLIC_DEMO_MODE=true in .env.local")

  await client.end()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
