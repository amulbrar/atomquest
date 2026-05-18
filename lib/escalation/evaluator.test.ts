import { describe, it, expect } from "vitest"
import {
  daysSince,
  getActiveQuarter,
  shouldEscalateNoSubmit,
} from "./rules"

const cycle = {
  q1Open: "2026-07-01", q1Close: "2026-07-31",
  q2Open: "2026-10-01", q2Close: "2026-10-31",
  q3Open: "2027-01-01", q3Close: "2027-01-31",
  q4Open: "2027-03-01", q4Close: "2027-04-30",
}

describe("daysSince", () => {
  it("returns 0 for the same instant", () => {
    const t = new Date("2026-05-18T12:00:00Z")
    expect(daysSince(t, t)).toBe(0)
  })
  it("returns N for N×24h elapsed", () => {
    const past = new Date("2026-05-10T00:00:00Z")
    const now = new Date("2026-05-18T00:00:00Z")
    expect(daysSince(past, now)).toBe(8)
  })
  it("floors partial days down", () => {
    const past = new Date("2026-05-17T12:00:00Z")
    const now = new Date("2026-05-18T00:00:00Z")
    expect(daysSince(past, now)).toBe(0)
  })
})

describe("getActiveQuarter", () => {
  it("returns null between windows", () => {
    expect(getActiveQuarter(cycle, "2026-05-18")).toBeNull()
    expect(getActiveQuarter(cycle, "2026-08-15")).toBeNull()
  })
  it("returns q1 inside the July window", () => {
    expect(getActiveQuarter(cycle, "2026-07-01")).toBe("q1")
    expect(getActiveQuarter(cycle, "2026-07-15")).toBe("q1")
    expect(getActiveQuarter(cycle, "2026-07-31")).toBe("q1")
  })
  it("returns q2 inside October", () => {
    expect(getActiveQuarter(cycle, "2026-10-12")).toBe("q2")
  })
  it("returns q3 inside January", () => {
    expect(getActiveQuarter(cycle, "2027-01-15")).toBe("q3")
  })
  it("returns q4 inside March/April", () => {
    expect(getActiveQuarter(cycle, "2027-03-10")).toBe("q4")
    expect(getActiveQuarter(cycle, "2027-04-30")).toBe("q4")
  })
})

describe("shouldEscalateNoSubmit", () => {
  it("returns false when threshold not yet reached", () => {
    expect(
      shouldEscalateNoSubmit({
        phaseOpenDays: 3,
        thresholdDays: 7,
        sheetStatus: null,
        alreadyEscalated: false,
      })
    ).toBe(false)
  })
  it("returns true when threshold passed and no sheet exists", () => {
    expect(
      shouldEscalateNoSubmit({
        phaseOpenDays: 10,
        thresholdDays: 7,
        sheetStatus: null,
        alreadyEscalated: false,
      })
    ).toBe(true)
  })
  it("returns true when threshold passed and sheet still draft", () => {
    expect(
      shouldEscalateNoSubmit({
        phaseOpenDays: 10,
        thresholdDays: 7,
        sheetStatus: "draft",
        alreadyEscalated: false,
      })
    ).toBe(true)
  })
  it("returns false once the sheet is submitted", () => {
    expect(
      shouldEscalateNoSubmit({
        phaseOpenDays: 10,
        thresholdDays: 7,
        sheetStatus: "submitted",
        alreadyEscalated: false,
      })
    ).toBe(false)
  })
  it("returns false when an open event already exists", () => {
    expect(
      shouldEscalateNoSubmit({
        phaseOpenDays: 10,
        thresholdDays: 7,
        sheetStatus: "draft",
        alreadyEscalated: true,
      })
    ).toBe(false)
  })
})
