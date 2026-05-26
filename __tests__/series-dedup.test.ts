import { describe, it, expect } from "vitest"

// Extracted series deduplication logic from getUpcomingMicsWithLocation
// Tests the core business rules without hitting the DB

type RawMic = {
  id: string
  series_slug: string | null
  date: string
  name: string
}

function dedupSeries(mics: RawMic[]): RawMic[] {
  const seenSeries = new Set<string>()
  return mics.filter((m) => {
    if (!m.series_slug) return true
    if (seenSeries.has(m.series_slug)) return false
    seenSeries.add(m.series_slug)
    return true
  })
}

function countSeries(mics: RawMic[]): Record<string, number> {
  const counts: Record<string, number> = {}
  for (const m of mics) {
    if (m.series_slug) counts[m.series_slug] = (counts[m.series_slug] || 0) + 1
  }
  return counts
}

function moreDatesCount(mic: RawMic, seriesCount: Record<string, number>): number {
  return mic.series_slug ? (seriesCount[mic.series_slug] || 1) - 1 : 0
}

const SERIES_A = "series-a"
const SERIES_B = "series-b"

const mics: RawMic[] = [
  { id: "1", series_slug: SERIES_A, date: "2026-05-27", name: "Mic A1" },
  { id: "2", series_slug: SERIES_A, date: "2026-06-03", name: "Mic A2" },
  { id: "3", series_slug: SERIES_A, date: "2026-06-10", name: "Mic A3" },
  { id: "4", series_slug: SERIES_B, date: "2026-05-28", name: "Mic B1" },
  { id: "5", series_slug: SERIES_B, date: "2026-06-04", name: "Mic B2" },
  { id: "6", series_slug: null, date: "2026-05-29", name: "One-off" },
]

describe("series deduplication", () => {
  it("keeps only the first occurrence of each series (ascending date order)", () => {
    const deduped = dedupSeries(mics)
    const seriesAMics = deduped.filter((m) => m.series_slug === SERIES_A)
    expect(seriesAMics).toHaveLength(1)
    expect(seriesAMics[0].id).toBe("1") // earliest = first in sorted input
  })

  it("keeps all one-off mics (no series_slug)", () => {
    const deduped = dedupSeries(mics)
    const oneOffs = deduped.filter((m) => m.series_slug === null)
    expect(oneOffs).toHaveLength(1)
    expect(oneOffs[0].name).toBe("One-off")
  })

  it("reduces 6 mics (2 series + 1 one-off) to 3", () => {
    expect(dedupSeries(mics)).toHaveLength(3)
  })

  it("handles all one-off mics (no deduplication)", () => {
    const oneOffs: RawMic[] = [
      { id: "a", series_slug: null, date: "2026-05-27", name: "A" },
      { id: "b", series_slug: null, date: "2026-05-28", name: "B" },
    ]
    expect(dedupSeries(oneOffs)).toHaveLength(2)
  })

  it("handles empty input", () => {
    expect(dedupSeries([])).toEqual([])
  })

  it("handles single mic with series", () => {
    const single: RawMic[] = [{ id: "x", series_slug: "solo", date: "2026-06-01", name: "Solo" }]
    expect(dedupSeries(single)).toHaveLength(1)
  })
})

describe("moreDatesCount", () => {
  const counts = countSeries(mics)

  it("series A has 3 dates → moreDatesCount = 2", () => {
    expect(moreDatesCount(mics[0], counts)).toBe(2)
  })

  it("series B has 2 dates → moreDatesCount = 1", () => {
    expect(moreDatesCount(mics[3], counts)).toBe(1)
  })

  it("one-off mic has moreDatesCount = 0", () => {
    expect(moreDatesCount(mics[5], counts)).toBe(0)
  })

  it("series with single date has moreDatesCount = 0", () => {
    const singleSeriesMic: RawMic = { id: "s", series_slug: "solo", date: "2026-06-01", name: "Solo" }
    const singleCount = countSeries([singleSeriesMic])
    expect(moreDatesCount(singleSeriesMic, singleCount)).toBe(0)
  })
})
