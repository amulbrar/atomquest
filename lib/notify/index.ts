import { Resend } from "resend"
import { render } from "@react-email/render"
import { db } from "@/lib/db"
import { users, notifications, cycles, goalSheets } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { GoalSubmittedEmail } from "@/emails/goal-submitted"
import { GoalApprovedEmail } from "@/emails/goal-approved"
import { GoalReturnedEmail } from "@/emails/goal-returned"
import { CheckinReminderEmail } from "@/emails/checkin-reminder"
import { EscalationEmail } from "@/emails/escalation"
import {
  sendTeamsCard,
  goalSubmittedCard,
  goalApprovedCard,
  goalReturnedCard,
  escalationCard,
} from "./teams"

let _resend: import("resend").Resend | null = null
function getResend() {
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY ?? "placeholder")
  return _resend
}
const FROM = process.env.EMAIL_FROM ?? "AtomQuest Portal <onboarding@resend.dev>"
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"

async function getUser(id: string) {
  const [u] = await db.select().from(users).where(eq(users.id, id))
  return u ?? null
}

async function send({
  to,
  subject,
  html,
  userId,
  type,
  payload,
}: {
  to: string
  subject: string
  html: string
  userId: string
  type: string
  payload: Record<string, unknown>
}) {
  const notifId = crypto.randomUUID()
  await db.insert(notifications).values({
    id: notifId,
    userId,
    type,
    payload: JSON.stringify(payload),
  })

  const { error } = await getResend().emails.send({ from: FROM, to, subject, html })

  if (!error) {
    await db
      .update(notifications)
      .set({ emailSentAt: new Date() })
      .where(eq(notifications.id, notifId))
  }
}

export async function sendGoalSubmittedNotification(
  employeeId: string,
  sheetId: string
): Promise<void> {
  if (!process.env.RESEND_API_KEY) return

  const emp = await getUser(employeeId)
  if (!emp?.managerId) return
  const mgr = await getUser(emp.managerId)
  if (!mgr) return

  const [sheet] = await db.select().from(goalSheets).where(eq(goalSheets.id, sheetId))
  const [cycle] = sheet
    ? await db.select({ fyLabel: cycles.fyLabel }).from(cycles).where(eq(cycles.id, sheet.cycleId))
    : []

  const html = await render(
    GoalSubmittedEmail({
      managerName: mgr.name,
      employeeName: emp.name,
      cycleLabel: cycle?.fyLabel ?? "",
      goalCount: 0,
      reviewUrl: `${APP_URL}/team/${employeeId}`,
    })
  )

  await send({
    to: mgr.email,
    subject: `${emp.name} submitted goals for review`,
    html,
    userId: mgr.id,
    type: "goal_submitted",
    payload: { employeeId, sheetId },
  })

  if (mgr.teamsWebhookUrl && mgr.teamsNotifications) {
    sendTeamsCard(mgr.teamsWebhookUrl, goalSubmittedCard(emp.name, cycle?.fyLabel ?? "", employeeId)).catch(() => {})
  }
}

export async function sendGoalApprovedNotification(
  employeeId: string,
  sheetId: string
): Promise<void> {
  if (!process.env.RESEND_API_KEY) return

  const emp = await getUser(employeeId)
  if (!emp) return
  if (!emp.emailNotifications) return

  const [sheet] = await db.select().from(goalSheets).where(eq(goalSheets.id, sheetId))
  const [cycle] = sheet
    ? await db.select({ fyLabel: cycles.fyLabel }).from(cycles).where(eq(cycles.id, sheet.cycleId))
    : []
  const mgr = emp.managerId ? await getUser(emp.managerId) : null

  const html = await render(
    GoalApprovedEmail({
      employeeName: emp.name,
      managerName: mgr?.name ?? "your manager",
      cycleLabel: cycle?.fyLabel ?? "",
      checkinUrl: `${APP_URL}/checkin`,
    })
  )

  await send({
    to: emp.email,
    subject: "Your goals have been approved",
    html,
    userId: emp.id,
    type: "goal_approved",
    payload: { sheetId },
  })

  if (emp.teamsWebhookUrl && emp.teamsNotifications) {
    sendTeamsCard(emp.teamsWebhookUrl, goalApprovedCard(cycle?.fyLabel ?? "")).catch(() => {})
  }
}

export async function sendGoalReturnedNotification(
  employeeId: string,
  sheetId: string,
  comment: string
): Promise<void> {
  if (!process.env.RESEND_API_KEY) return

  const emp = await getUser(employeeId)
  if (!emp) return
  if (!emp.emailNotifications) return

  const [sheet] = await db.select().from(goalSheets).where(eq(goalSheets.id, sheetId))
  const [cycle] = sheet
    ? await db.select({ fyLabel: cycles.fyLabel }).from(cycles).where(eq(cycles.id, sheet.cycleId))
    : []
  const mgr = emp.managerId ? await getUser(emp.managerId) : null

  const html = await render(
    GoalReturnedEmail({
      employeeName: emp.name,
      managerName: mgr?.name ?? "your manager",
      cycleLabel: cycle?.fyLabel ?? "",
      comment,
      goalsUrl: `${APP_URL}/goals`,
    })
  )

  await send({
    to: emp.email,
    subject: "Your goals need revision",
    html,
    userId: emp.id,
    type: "goal_returned",
    payload: { sheetId, comment },
  })

  if (emp.teamsWebhookUrl && emp.teamsNotifications) {
    sendTeamsCard(emp.teamsWebhookUrl, goalReturnedCard(comment, cycle?.fyLabel ?? "")).catch(() => {})
  }
}

export async function sendCheckinReminderNotification(
  employeeId: string,
  quarter: string,
  daysLeft = 3
): Promise<void> {
  if (!process.env.RESEND_API_KEY) return

  const emp = await getUser(employeeId)
  if (!emp) return
  if (!emp.emailNotifications) return

  const [activeCycle] = await db
    .select({ fyLabel: cycles.fyLabel })
    .from(cycles)
    .where(eq(cycles.isActive, true))
    .limit(1)

  const QUARTER_LABELS: Record<string, string> = {
    q1: "Q1 (July)", q2: "Q2 (October)", q3: "Q3 (January)", q4: "Q4 (March–April)",
  }

  const html = await render(
    CheckinReminderEmail({
      employeeName: emp.name,
      quarter: QUARTER_LABELS[quarter] ?? quarter.toUpperCase(),
      cycleLabel: activeCycle?.fyLabel ?? "",
      daysLeft,
      checkinUrl: `${APP_URL}/checkin`,
    })
  )

  await send({
    to: emp.email,
    subject: `Reminder: ${quarter.toUpperCase()} check-in closes in ${daysLeft} day${daysLeft !== 1 ? "s" : ""}`,
    html,
    userId: emp.id,
    type: "checkin_reminder",
    payload: { quarter, daysLeft },
  })
}

export async function sendEscalationNotification(
  targetUserId: string,
  ruleId: string,
  subjectUserId: string,
  ruleName: string,
  message: string
): Promise<void> {
  if (!process.env.RESEND_API_KEY) return

  const target = await getUser(targetUserId)
  if (!target) return
  const subject = await getUser(subjectUserId)
  if (!subject) return

  const html = await render(
    EscalationEmail({
      targetName: target.name,
      subjectName: subject.name,
      ruleName,
      message,
      portalUrl: `${APP_URL}/admin/escalations`,
    })
  )

  await send({
    to: target.email,
    subject: `Action required: ${ruleName} — ${subject.name}`,
    html,
    userId: target.id,
    type: "escalation",
    payload: { ruleId, subjectUserId, ruleName },
  })

  if (target.teamsWebhookUrl && target.teamsNotifications) {
    sendTeamsCard(target.teamsWebhookUrl, escalationCard(subject.name, ruleName, message)).catch(() => {})
  }
}
