/**
 * Pure decision helpers for the escalation engine.
 *
 * Kept free of DB / notification imports so they can be unit-tested
 * in isolation. The orchestrator in `evaluator.ts` re-exports these
 * for ergonomic imports elsewhere.
 */

export function daysSince(date: Date, now: Date = new Date()): number {
  return Math.floor((now.getTime() - date.getTime()) / 86_400_000)
}

export interface CycleWindow {
  q1Open: string; q1Close: string
  q2Open: string; q2Close: string
  q3Open: string; q3Close: string
  q4Open: string; q4Close: string
}

export function getActiveQuarter(
  cycle: CycleWindow,
  today: string = new Date().toISOString().split("T")[0]
): "q1" | "q2" | "q3" | "q4" | null {
  if (today >= cycle.q1Open && today <= cycle.q1Close) return "q1"
  if (today >= cycle.q2Open && today <= cycle.q2Close) return "q2"
  if (today >= cycle.q3Open && today <= cycle.q3Close) return "q3"
  if (today >= cycle.q4Open && today <= cycle.q4Close) return "q4"
  return null
}

export type SheetStatus = "draft" | "submitted" | "approved" | "locked" | "reopened"

export function shouldEscalateNoSubmit(args: {
  phaseOpenDays: number
  thresholdDays: number
  sheetStatus: SheetStatus | null
  alreadyEscalated: boolean
}): boolean {
  if (args.alreadyEscalated) return false
  if (args.phaseOpenDays < args.thresholdDays) return false
  return args.sheetStatus === null || args.sheetStatus === "draft"
}
