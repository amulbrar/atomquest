import {
  pgTable,
  pgEnum,
  text,
  integer,
  numeric,
  boolean,
  timestamp,
  date,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core"
import { relations, sql } from "drizzle-orm"

// ── Enums ─────────────────────────────────────────────────────────────────────

export const roleEnum = pgEnum("role", ["employee", "manager", "admin"])

export const sheetStatusEnum = pgEnum("sheet_status", [
  "draft",
  "submitted",
  "approved",
  "locked",
  "reopened",
])

export const uomTypeEnum = pgEnum("uom_type", [
  "numeric",
  "percent",
  "timeline",
  "zero",
])

export const uomDirectionEnum = pgEnum("uom_direction", ["min", "max", "na"])

export const quarterEnum = pgEnum("quarter", ["q1", "q2", "q3", "q4"])

export const checkInStatusEnum = pgEnum("checkin_status", [
  "not_started",
  "on_track",
  "completed",
])

export const escalationTriggerEnum = pgEnum("escalation_trigger", [
  "no_submit",
  "no_approve",
  "no_checkin",
])

export const escalationEventStatusEnum = pgEnum("escalation_event_status", [
  "open",
  "resolved",
])

// ── Core tables ───────────────────────────────────────────────────────────────

export const departments = pgTable("departments", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
})

export const users = pgTable(
  "users",
  {
    id: text("id").primaryKey().default(sql`gen_random_uuid()`),
    email: text("email").notNull(),
    name: text("name").notNull(),
    passwordHash: text("password_hash"),
    role: roleEnum("role").notNull().default("employee"),
    managerId: text("manager_id"),
    departmentId: text("department_id").references(() => departments.id),
    entraOid: text("entra_oid"),
    teamsWebhookUrl: text("teams_webhook_url"),
    emailNotifications: boolean("email_notifications").notNull().default(true),
    teamsNotifications: boolean("teams_notifications").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [uniqueIndex("users_email_idx").on(t.email)]
)

export const thrustAreas = pgTable("thrust_areas", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  active: boolean("active").notNull().default(true),
})

export const cycles = pgTable("cycles", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  fyLabel: text("fy_label").notNull(),
  phase1Open: date("phase1_open").notNull(),
  phase1Close: date("phase1_close").notNull(),
  q1Open: date("q1_open").notNull(),
  q1Close: date("q1_close").notNull(),
  q2Open: date("q2_open").notNull(),
  q2Close: date("q2_close").notNull(),
  q3Open: date("q3_open").notNull(),
  q3Close: date("q3_close").notNull(),
  q4Open: date("q4_open").notNull(),
  q4Close: date("q4_close").notNull(),
  isActive: boolean("is_active").notNull().default(false),
})

export const goalSheets = pgTable(
  "goal_sheets",
  {
    id: text("id").primaryKey().default(sql`gen_random_uuid()`),
    employeeId: text("employee_id")
      .notNull()
      .references(() => users.id),
    cycleId: text("cycle_id")
      .notNull()
      .references(() => cycles.id),
    status: sheetStatusEnum("status").notNull().default("draft"),
    returnComment: text("return_comment"),
    submittedAt: timestamp("submitted_at", { withTimezone: true }),
    approvedBy: text("approved_by").references(() => users.id),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("goal_sheets_emp_cycle_idx").on(t.employeeId, t.cycleId),
  ]
)

export const goals = pgTable(
  "goals",
  {
    id: text("id").primaryKey().default(sql`gen_random_uuid()`),
    sheetId: text("sheet_id")
      .notNull()
      .references(() => goalSheets.id, { onDelete: "cascade" }),
    thrustAreaId: text("thrust_area_id")
      .notNull()
      .references(() => thrustAreas.id),
    title: text("title").notNull(),
    description: text("description"),
    uomType: uomTypeEnum("uom_type").notNull(),
    uomDirection: uomDirectionEnum("uom_direction").notNull().default("min"),
    targetValue: numeric("target_value", { precision: 15, scale: 4 }),
    targetDate: date("target_date"),
    weightage: integer("weightage").notNull(),
    sourceGoalId: text("source_goal_id"),
    lockedFields: text("locked_fields")
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("goals_sheet_idx").on(t.sheetId)]
)

export const quarterUpdates = pgTable(
  "quarter_updates",
  {
    id: text("id").primaryKey().default(sql`gen_random_uuid()`),
    goalId: text("goal_id")
      .notNull()
      .references(() => goals.id, { onDelete: "cascade" }),
    quarter: quarterEnum("quarter").notNull(),
    actualValue: numeric("actual_value", { precision: 15, scale: 4 }),
    actualDate: date("actual_date"),
    status: checkInStatusEnum("status").notNull().default("not_started"),
    computedScore: numeric("computed_score", { precision: 8, scale: 4 }),
    employeeNote: text("employee_note"),
    managerComment: text("manager_comment"),
    managerCheckinAt: timestamp("manager_checkin_at", { withTimezone: true }),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("quarter_updates_goal_quarter_idx").on(t.goalId, t.quarter),
  ]
)

export const auditLog = pgTable(
  "audit_log",
  {
    id: text("id").primaryKey().default(sql`gen_random_uuid()`),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id").notNull(),
    action: text("action").notNull(),
    actorId: text("actor_id").references(() => users.id),
    before: text("before"),
    after: text("after"),
    reason: text("reason"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("audit_log_entity_idx").on(t.entityType, t.entityId)]
)

export const escalationRules = pgTable("escalation_rules", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  trigger: escalationTriggerEnum("trigger").notNull(),
  thresholdDays: integer("threshold_days").notNull(),
  chain: text("chain").notNull().default("[]"),
  enabled: boolean("enabled").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
})

export const escalationEvents = pgTable(
  "escalation_events",
  {
    id: text("id").primaryKey().default(sql`gen_random_uuid()`),
    ruleId: text("rule_id")
      .notNull()
      .references(() => escalationRules.id),
    subjectUserId: text("subject_user_id")
      .notNull()
      .references(() => users.id),
    targetUserId: text("target_user_id")
      .notNull()
      .references(() => users.id),
    triggeredAt: timestamp("triggered_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    status: escalationEventStatusEnum("status").notNull().default("open"),
  },
  (t) => [index("esc_events_subject_idx").on(t.subjectUserId)]
)

export const notifications = pgTable(
  "notifications",
  {
    id: text("id").primaryKey().default(sql`gen_random_uuid()`),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    type: text("type").notNull(),
    payload: text("payload").notNull().default("{}"),
    emailSentAt: timestamp("email_sent_at", { withTimezone: true }),
    teamsSentAt: timestamp("teams_sent_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("notifications_user_idx").on(t.userId)]
)

// ── Relations ─────────────────────────────────────────────────────────────────

export const usersRelations = relations(users, ({ one, many }) => ({
  department: one(departments, {
    fields: [users.departmentId],
    references: [departments.id],
  }),
  manager: one(users, {
    fields: [users.managerId],
    references: [users.id],
    relationName: "reports",
  }),
  reports: many(users, { relationName: "reports" }),
  goalSheets: many(goalSheets),
  notifications: many(notifications),
}))

export const goalSheetsRelations = relations(goalSheets, ({ one, many }) => ({
  employee: one(users, {
    fields: [goalSheets.employeeId],
    references: [users.id],
  }),
  cycle: one(cycles, {
    fields: [goalSheets.cycleId],
    references: [cycles.id],
  }),
  approver: one(users, {
    fields: [goalSheets.approvedBy],
    references: [users.id],
  }),
  goals: many(goals),
}))

export const goalsRelations = relations(goals, ({ one, many }) => ({
  sheet: one(goalSheets, {
    fields: [goals.sheetId],
    references: [goalSheets.id],
  }),
  thrustArea: one(thrustAreas, {
    fields: [goals.thrustAreaId],
    references: [thrustAreas.id],
  }),
  quarterUpdates: many(quarterUpdates),
}))

export const quarterUpdatesRelations = relations(quarterUpdates, ({ one }) => ({
  goal: one(goals, {
    fields: [quarterUpdates.goalId],
    references: [goals.id],
  }),
}))

// ── Types ─────────────────────────────────────────────────────────────────────

export type User = typeof users.$inferSelect
export type Department = typeof departments.$inferSelect
export type ThrustArea = typeof thrustAreas.$inferSelect
export type Cycle = typeof cycles.$inferSelect
export type GoalSheet = typeof goalSheets.$inferSelect
export type Goal = typeof goals.$inferSelect
export type QuarterUpdate = typeof quarterUpdates.$inferSelect
export type AuditLog = typeof auditLog.$inferSelect
export type EscalationRule = typeof escalationRules.$inferSelect
export type EscalationEvent = typeof escalationEvents.$inferSelect
export type Notification = typeof notifications.$inferSelect
