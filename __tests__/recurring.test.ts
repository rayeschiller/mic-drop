import { describe, it, expect } from "vitest"
import { calcRecurringDates } from "@/lib/recurring"

describe("calcRecurringDates", () => {
  const start = "2026-05-27" // Wednesday

  // ── weekly ────────────────────────────────────────────────────────────────
  describe("weekly", () => {
    it("generates weekly dates", () => {
      const dates = calcRecurringDates(start, "weekly", "2026-06-17")
      expect(dates).toEqual(["2026-06-03", "2026-06-10", "2026-06-17"])
    })

    it("does not include the start date", () => {
      const dates = calcRecurringDates(start, "weekly", "2026-06-03")
      expect(dates[0]).toBe("2026-06-03")
      expect(dates).not.toContain(start)
    })

    it("returns empty array when end date is before next occurrence", () => {
      const dates = calcRecurringDates(start, "weekly", "2026-05-28")
      expect(dates).toEqual([])
    })

    it("returns empty array when end date equals start date", () => {
      const dates = calcRecurringDates(start, "weekly", start)
      expect(dates).toEqual([])
    })

    it("caps at 52 dates", () => {
      const dates = calcRecurringDates(start, "weekly", "2030-01-01")
      expect(dates.length).toBeLessThanOrEqual(52)
    })

    it("includes end date if it falls on the recurrence", () => {
      // start is Wed 5/27, weekly → 6/3, 6/10…
      const dates = calcRecurringDates(start, "weekly", "2026-06-10")
      expect(dates).toContain("2026-06-10")
    })
  })

  // ── biweekly ─────────────────────────────────────────────────────────────
  describe("biweekly", () => {
    it("generates every 14 days", () => {
      const dates = calcRecurringDates(start, "biweekly", "2026-06-24")
      expect(dates).toEqual(["2026-06-10", "2026-06-24"])
    })

    it("skips the week in between", () => {
      const dates = calcRecurringDates(start, "biweekly", "2026-07-01")
      expect(dates).not.toContain("2026-06-03")
      expect(dates).not.toContain("2026-06-17")
    })
  })

  // ── monthly ───────────────────────────────────────────────────────────────
  describe("monthly", () => {
    it("generates one date per month", () => {
      const dates = calcRecurringDates(start, "monthly", "2026-08-27")
      expect(dates).toEqual(["2026-06-27", "2026-07-27", "2026-08-27"])
    })

    it("handles month-end correctly", () => {
      // Start Jan 31 — Feb doesn't have 31st, JS Date rolls to Mar 3
      const dates = calcRecurringDates("2026-01-31", "monthly", "2026-04-01")
      expect(dates.length).toBeGreaterThan(0)
      // All returned strings should be valid ISO dates
      dates.forEach((d) => expect(d).toMatch(/^\d{4}-\d{2}-\d{2}$/))
    })
  })

  // ── custom ────────────────────────────────────────────────────────────────
  describe("custom days", () => {
    it("generates Mon/Wed/Fri from a Wednesday start", () => {
      // start = 5/27 Wed; Mon=1, Wed=3, Fri=5
      const dates = calcRecurringDates(start, "custom", "2026-06-03", [1, 3, 5])
      expect(dates).toEqual(["2026-05-29", "2026-06-01", "2026-06-03"])
    })

    it("does not include the start date even if start day is selected", () => {
      const dates = calcRecurringDates(start, "custom", "2026-06-03", [3]) // Wed only
      expect(dates).not.toContain(start)
      expect(dates).toContain("2026-06-03")
    })

    it("returns empty if no days selected", () => {
      const dates = calcRecurringDates(start, "custom", "2026-06-30", [])
      expect(dates).toEqual([])
    })

    it("returns empty if customDays undefined", () => {
      const dates = calcRecurringDates(start, "custom", "2026-06-30", undefined)
      expect(dates).toEqual([])
    })

    it("caps at 365 dates", () => {
      // Select all 7 days for a long range
      const dates = calcRecurringDates(start, "custom", "2030-01-01", [0, 1, 2, 3, 4, 5, 6])
      expect(dates.length).toBeLessThanOrEqual(365)
    })

    it("respects exactly the end date boundary", () => {
      // Fri 5/29 is within range, Fri 6/5 is outside if end=6/4
      const dates = calcRecurringDates(start, "custom", "2026-06-04", [5]) // Fri
      expect(dates).toContain("2026-05-29")
      expect(dates).not.toContain("2026-06-05")
    })

    it("generates only saturdays when only saturday selected", () => {
      const dates = calcRecurringDates(start, "custom", "2026-06-20", [6]) // Sat=6
      dates.forEach((d) => {
        const day = new Date(d + "T00:00:00").getDay()
        expect(day).toBe(6)
      })
    })

    it("handles Sunday (0) correctly", () => {
      const dates = calcRecurringDates(start, "custom", "2026-06-07", [0])
      expect(dates).toContain("2026-05-31")
    })
  })

  // ── edge cases ────────────────────────────────────────────────────────────
  describe("edge cases", () => {
    it("returns only ISO date strings (no time component)", () => {
      const dates = calcRecurringDates(start, "weekly", "2026-06-10")
      dates.forEach((d) => expect(d).toMatch(/^\d{4}-\d{2}-\d{2}$/))
    })

    it("dates are in ascending order", () => {
      const dates = calcRecurringDates(start, "custom", "2026-06-30", [1, 3, 5])
      const sorted = [...dates].sort()
      expect(dates).toEqual(sorted)
    })

    it("returns empty when end date is before start date", () => {
      const dates = calcRecurringDates(start, "weekly", "2026-05-01")
      expect(dates).toEqual([])
    })
  })
})
