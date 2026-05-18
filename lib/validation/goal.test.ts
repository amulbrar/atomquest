import { describe, it, expect } from "vitest"
import { goalSchema } from "./goal"

const base = {
  thrustAreaId: "ta-1",
  title: "Reduce customer support TAT",
  uomType: "numeric" as const,
  uomDirection: "max" as const,
  targetValue: "8",
  weightage: 20,
}

describe("goalSchema — weightage", () => {
  it("rejects weightage below 10", () => {
    const r = goalSchema.safeParse({ ...base, weightage: 5 })
    expect(r.success).toBe(false)
    if (!r.success) expect(r.error.issues[0].message).toMatch(/Minimum weightage is 10%/)
  })
  it("rejects weightage above 100", () => {
    const r = goalSchema.safeParse({ ...base, weightage: 110 })
    expect(r.success).toBe(false)
  })
  it("rejects non-integer weightage", () => {
    const r = goalSchema.safeParse({ ...base, weightage: 12.5 })
    expect(r.success).toBe(false)
  })
  it("accepts weightage at the boundaries", () => {
    expect(goalSchema.safeParse({ ...base, weightage: 10 }).success).toBe(true)
    expect(goalSchema.safeParse({ ...base, weightage: 100 }).success).toBe(true)
  })
})

describe("goalSchema — title", () => {
  it("rejects titles below 3 chars", () => {
    expect(goalSchema.safeParse({ ...base, title: "ab" }).success).toBe(false)
  })
  it("accepts a 3-char title", () => {
    expect(goalSchema.safeParse({ ...base, title: "abc" }).success).toBe(true)
  })
})

describe("goalSchema — numeric / percent target", () => {
  it("rejects when targetValue is missing", () => {
    const r = goalSchema.safeParse({ ...base, targetValue: undefined })
    expect(r.success).toBe(false)
    if (!r.success) expect(r.error.issues[0].message).toMatch(/Target value is required/)
  })
  it("rejects when targetValue is empty string", () => {
    expect(goalSchema.safeParse({ ...base, targetValue: "   " }).success).toBe(false)
  })
  it("rejects when targetValue is not a number", () => {
    const r = goalSchema.safeParse({ ...base, targetValue: "abc" })
    expect(r.success).toBe(false)
    if (!r.success) expect(r.error.issues[0].message).toMatch(/must be a number/)
  })
  it("accepts a numeric percent target", () => {
    const r = goalSchema.safeParse({
      ...base,
      uomType: "percent",
      uomDirection: "min",
      targetValue: "95",
    })
    expect(r.success).toBe(true)
  })
})

describe("goalSchema — timeline target", () => {
  it("requires targetDate for timeline goals", () => {
    const r = goalSchema.safeParse({
      ...base,
      uomType: "timeline",
      uomDirection: "na",
      targetValue: undefined,
      targetDate: undefined,
    })
    expect(r.success).toBe(false)
    if (!r.success) expect(r.error.issues[0].message).toMatch(/Target date is required/)
  })
  it("accepts a timeline goal with a targetDate", () => {
    const r = goalSchema.safeParse({
      ...base,
      uomType: "timeline",
      uomDirection: "na",
      targetValue: undefined,
      targetDate: "2026-12-31",
    })
    expect(r.success).toBe(true)
  })
})

describe("goalSchema — zero-based", () => {
  it("does not require targetValue for zero-based goals", () => {
    const r = goalSchema.safeParse({
      ...base,
      uomType: "zero",
      uomDirection: "na",
      targetValue: undefined,
    })
    expect(r.success).toBe(true)
  })
})
