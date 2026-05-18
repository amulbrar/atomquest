import { describe, it, expect } from "vitest"
import {
  scoreMin,
  scoreMax,
  scoreTimeline,
  scoreZero,
  computeScore,
} from "./index"

describe("scoreMin", () => {
  it("returns 1 when actual equals target", () => {
    expect(scoreMin(100, 100)).toBe(1)
  })
  it("returns < 1 when actual < target", () => {
    expect(scoreMin(80, 100)).toBeCloseTo(0.8)
  })
  it("clamps overachievement to 1.5", () => {
    expect(scoreMin(200, 100)).toBe(1.5)
  })
  it("returns 0 for negative actual", () => {
    expect(scoreMin(-10, 100)).toBe(0)
  })
  it("handles zero target gracefully", () => {
    expect(scoreMin(0, 0)).toBe(1)
  })
})

describe("scoreMax", () => {
  it("returns 1 when actual equals target", () => {
    expect(scoreMax(24, 24)).toBe(1)
  })
  it("returns > 1 when actual < target (lower is better)", () => {
    expect(scoreMax(12, 24)).toBeCloseTo(1.5)
  })
  it("returns < 1 when actual > target", () => {
    expect(scoreMax(36, 24)).toBeCloseTo(0.667, 2)
  })
  it("returns 1.5 for zero actual (no time taken at all)", () => {
    expect(scoreMax(0, 24)).toBe(1.5)
  })
  it("returns 0 for zero target", () => {
    expect(scoreMax(10, 0)).toBe(0)
  })
})

describe("scoreTimeline", () => {
  it("returns 1 when completed on deadline", () => {
    expect(scoreTimeline("2025-09-30", "2025-09-30")).toBe(1)
  })
  it("returns 1 when completed before deadline", () => {
    expect(scoreTimeline("2025-09-01", "2025-09-30")).toBe(1)
  })
  it("returns 0 when 90+ days late", () => {
    expect(scoreTimeline("2025-12-31", "2025-09-30")).toBe(0)
  })
  it("returns partial score when moderately late", () => {
    const score = scoreTimeline("2025-10-30", "2025-09-30")
    expect(score).toBeGreaterThan(0)
    expect(score).toBeLessThan(1)
  })
})

describe("scoreZero", () => {
  it("returns 1 for zero actual", () => {
    expect(scoreZero(0)).toBe(1)
  })
  it("returns 0 for any positive actual", () => {
    expect(scoreZero(1)).toBe(0)
    expect(scoreZero(100)).toBe(0)
  })
})

describe("computeScore", () => {
  it("handles zero-based goal", () => {
    expect(
      computeScore({ uomType: "zero", uomDirection: "na", actualValue: "0" })
    ).toBe(1)
  })
  it("handles timeline goal on time", () => {
    expect(
      computeScore({
        uomType: "timeline",
        uomDirection: "na",
        targetDate: "2025-12-31",
        actualDate: "2025-12-30",
      })
    ).toBe(1)
  })
  it("returns null for missing actuals", () => {
    expect(
      computeScore({ uomType: "numeric", uomDirection: "min", targetValue: "100" })
    ).toBeNull()
  })
  it("handles numeric min", () => {
    expect(
      computeScore({
        uomType: "numeric",
        uomDirection: "min",
        targetValue: "100",
        actualValue: "75",
      })
    ).toBeCloseTo(0.75)
  })
  it("handles numeric max (lower is better)", () => {
    expect(
      computeScore({
        uomType: "numeric",
        uomDirection: "max",
        targetValue: "8",
        actualValue: "6",
      })
    ).toBeCloseTo(1.333, 2)
  })
  it("returns null when actual or target is non-numeric", () => {
    expect(
      computeScore({
        uomType: "numeric",
        uomDirection: "min",
        targetValue: "100",
        actualValue: "abc",
      })
    ).toBeNull()
    expect(
      computeScore({
        uomType: "percent",
        uomDirection: "max",
        targetValue: "not-a-number",
        actualValue: "50",
      })
    ).toBeNull()
  })
  it("clamps overachievement at 1.5", () => {
    expect(
      computeScore({
        uomType: "numeric",
        uomDirection: "min",
        targetValue: "100",
        actualValue: "500",
      })
    ).toBe(1.5)
  })
})
