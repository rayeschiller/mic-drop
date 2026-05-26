import { describe, it, expect } from "vitest"

// Copied from mic-page-client.tsx — pure formatters
function formatDate(dateString: string): string {
  const date = new Date(dateString + "T00:00:00")
  return date.toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric", year: "numeric",
  })
}

function formatDayAbbr(dateString: string): string {
  return new Date(dateString + "T00:00:00")
    .toLocaleDateString("en-US", { weekday: "short" })
    .toUpperCase()
}

function formatMonthDay(dateString: string): string {
  const d = new Date(dateString + "T00:00:00")
  return `${d.getMonth() + 1}/${d.getDate()}`
}

// Copied from nearby-mics.tsx
function formatNearbyDate(dateStr: string) {
  const [y, m, d] = dateStr.split("-").map(Number)
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    weekday: "short", month: "short", day: "numeric",
  })
}

function formatTime(timeStr: string) {
  const [h, m] = timeStr.split(":").map(Number)
  const ampm = h >= 12 ? "PM" : "AM"
  const hour = h % 12 || 12
  return `${hour}:${String(m).padStart(2, "0")} ${ampm}`
}

describe("formatDayAbbr", () => {
  it("Wednesday 5/27 → WED", () => {
    expect(formatDayAbbr("2026-05-27")).toBe("WED")
  })

  it("Monday → MON", () => {
    expect(formatDayAbbr("2026-06-01")).toBe("MON")
  })

  it("Sunday → SUN", () => {
    expect(formatDayAbbr("2026-06-07")).toBe("SUN")
  })
})

describe("formatMonthDay", () => {
  it("2026-05-27 → 5/27", () => {
    expect(formatMonthDay("2026-05-27")).toBe("5/27")
  })

  it("2026-01-01 → 1/1", () => {
    expect(formatMonthDay("2026-01-01")).toBe("1/1")
  })

  it("2026-12-31 → 12/31", () => {
    expect(formatMonthDay("2026-12-31")).toBe("12/31")
  })

  it("no leading zeros in month", () => {
    expect(formatMonthDay("2026-06-03")).toBe("6/3")
  })
})

describe("formatTime", () => {
  it("19:00 → 7:00 PM", () => {
    expect(formatTime("19:00")).toBe("7:00 PM")
  })

  it("07:00 → 7:00 AM", () => {
    expect(formatTime("07:00")).toBe("7:00 AM")
  })

  it("12:00 → 12:00 PM (noon)", () => {
    expect(formatTime("12:00")).toBe("12:00 PM")
  })

  it("00:00 → 12:00 AM (midnight)", () => {
    expect(formatTime("00:00")).toBe("12:00 AM")
  })

  it("13:30 → 1:30 PM", () => {
    expect(formatTime("13:30")).toBe("1:30 PM")
  })

  it("pads minutes with zero", () => {
    expect(formatTime("09:05")).toBe("9:05 AM")
  })
})

describe("formatDate (long form)", () => {
  it("includes weekday, month, day, year", () => {
    const result = formatDate("2026-05-27")
    expect(result).toContain("Wednesday")
    expect(result).toContain("May")
    expect(result).toContain("27")
    expect(result).toContain("2026")
  })
})

describe("formatNearbyDate", () => {
  it("returns abbreviated weekday and date", () => {
    const result = formatNearbyDate("2026-05-27")
    expect(result).toContain("Wed")
    expect(result).toContain("May")
    expect(result).toContain("27")
  })

  it("no year in output", () => {
    const result = formatNearbyDate("2026-05-27")
    expect(result).not.toContain("2026")
  })
})
