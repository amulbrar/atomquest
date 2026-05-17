/**
 * Pure UoM scoring functions.
 * Results are clamped to [0, 1.5] to allow slight overachievement.
 * Scores are stored as snapshots so historic values don't shift.
 */

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

/**
 * Min (numeric/percent): Higher actual is better — e.g. Sales Revenue, NPS.
 * Formula: actual / target, clamped to [0, 1.5]
 */
export function scoreMin(actual: number, target: number): number {
  if (target === 0) return actual >= 0 ? 1 : 0
  return clamp(actual / target, 0, 1.5)
}

/**
 * Max (numeric/percent): Lower actual is better — e.g. TAT, Cost, Error rate.
 * Formula: target / actual, clamped to [0, 1.5]
 */
export function scoreMax(actual: number, target: number): number {
  if (actual === 0) return 1.5
  if (target === 0) return 0
  return clamp(target / actual, 0, 1.5)
}

/**
 * Timeline: Date-based completion.
 * Score = 1 if completed on or before deadline.
 * Linear decay for late completion: 0.5 at 30 days late, 0 at 90+ days late.
 */
export function scoreTimeline(
  completedDate: string,
  deadline: string
): number {
  const completed = new Date(completedDate).getTime()
  const due = new Date(deadline).getTime()
  const diffDays = (completed - due) / (1000 * 60 * 60 * 24)
  if (diffDays <= 0) return 1.0
  if (diffDays >= 90) return 0
  return clamp(1 - diffDays / 90, 0, 1)
}

/**
 * Zero-based: Zero = Success (e.g. Safety incidents, Bug escapes).
 * Score = 1 if actual is 0, else 0.
 */
export function scoreZero(actual: number): number {
  return actual === 0 ? 1 : 0
}

/**
 * Compute score for a goal based on its UoM type and direction.
 */
export function computeScore(params: {
  uomType: "numeric" | "percent" | "timeline" | "zero"
  uomDirection: "min" | "max" | "na"
  targetValue?: string | null
  targetDate?: string | null
  actualValue?: string | null
  actualDate?: string | null
}): number | null {
  const { uomType, uomDirection, targetValue, targetDate, actualValue, actualDate } = params

  if (uomType === "zero") {
    if (actualValue === null || actualValue === undefined) return null
    return scoreZero(Number(actualValue))
  }

  if (uomType === "timeline") {
    if (!actualDate || !targetDate) return null
    return scoreTimeline(actualDate, targetDate)
  }

  // numeric / percent
  if (actualValue === null || actualValue === undefined) return null
  if (targetValue === null || targetValue === undefined) return null
  const actual = Number(actualValue)
  const target = Number(targetValue)
  if (isNaN(actual) || isNaN(target)) return null

  return uomDirection === "max"
    ? scoreMax(actual, target)
    : scoreMin(actual, target)
}
