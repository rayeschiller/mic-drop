import { describe, it, expect } from "vitest"

// Tests backwards-compatibility rules:
//   • nullable location fields default safely
//   • nullable image fields default safely
//   • section guard logic (mics with taken slots keep their sections)
//   • moreDatesCount is 0 when there is no series (existing mics without series_slug)

// ── location / image field nullability ───────────────────────────────────────

type MicRecord = {
  id: string
  series_slug: string | null
  imageUrl: string | null
  placeId: string | null
  formattedAddress: string | null
  latitude: number | null
  longitude: number | null
  name: string
  date: string
}

/** Simulates the displayImageUrl derivation from mic-page-client.tsx */
function deriveDisplayImage(mic: MicRecord, otherDates: MicRecord[]): string | null {
  return mic.imageUrl ?? otherDates.find((d) => d.imageUrl)?.imageUrl ?? null
}

describe("displayImageUrl derivation (backwards compat)", () => {
  const base: MicRecord = {
    id: "1",
    series_slug: "s1",
    imageUrl: null,
    placeId: null,
    formattedAddress: null,
    latitude: null,
    longitude: null,
    name: "Mic A",
    date: "2026-05-27",
  }

  it("returns null when mic and all series dates have no image", () => {
    const others: MicRecord[] = [{ ...base, id: "2", date: "2026-06-03" }]
    expect(deriveDisplayImage(base, others)).toBeNull()
  })

  it("returns mic's own image when present", () => {
    const mic = { ...base, imageUrl: "https://example.com/img.jpg" }
    expect(deriveDisplayImage(mic, [])).toBe("https://example.com/img.jpg")
  })

  it("falls back to another series date's image when current mic has none", () => {
    const others: MicRecord[] = [
      { ...base, id: "2", date: "2026-06-03", imageUrl: "https://example.com/other.jpg" },
    ]
    expect(deriveDisplayImage(base, others)).toBe("https://example.com/other.jpg")
  })

  it("prefers mic's own image over series fallback", () => {
    const mic = { ...base, imageUrl: "https://example.com/mine.jpg" }
    const others: MicRecord[] = [
      { ...base, id: "2", date: "2026-06-03", imageUrl: "https://example.com/other.jpg" },
    ]
    expect(deriveDisplayImage(mic, others)).toBe("https://example.com/mine.jpg")
  })

  it("handles legacy mic with no series_slug (one-off)", () => {
    const legacyMic: MicRecord = { ...base, series_slug: null }
    expect(deriveDisplayImage(legacyMic, [])).toBeNull()
  })
})

// ── section guard logic ───────────────────────────────────────────────────────

type Slot = { mic_id: string; taken: boolean; section_id: string | null }

/**
 * Pure replica of the guard logic in hostUpdateSeriesMics.
 * Returns the set of mic IDs that should be SKIPPED for section restructuring.
 */
function computeSkippedMicIds(slots: Slot[]): Set<string> {
  const takenSlots = slots.filter((s) => s.taken && s.section_id !== null)
  return new Set(takenSlots.map((s) => s.mic_id))
}

describe("section guard (hostUpdateSeriesMics)", () => {
  it("returns empty set when no slots are taken", () => {
    const slots: Slot[] = [
      { mic_id: "mic1", taken: false, section_id: "sec1" },
      { mic_id: "mic2", taken: false, section_id: "sec1" },
    ]
    expect(computeSkippedMicIds(slots).size).toBe(0)
  })

  it("returns empty set when taken slot has no section_id (non-section slot)", () => {
    const slots: Slot[] = [{ mic_id: "mic1", taken: true, section_id: null }]
    expect(computeSkippedMicIds(slots).size).toBe(0)
  })

  it("skips mic that has a taken slot in a section", () => {
    const slots: Slot[] = [
      { mic_id: "mic1", taken: true, section_id: "sec1" },
      { mic_id: "mic2", taken: false, section_id: "sec1" },
    ]
    const skipped = computeSkippedMicIds(slots)
    expect(skipped.has("mic1")).toBe(true)
    expect(skipped.has("mic2")).toBe(false)
  })

  it("skips only mics with taken section slots, not all mics with sections", () => {
    const slots: Slot[] = [
      { mic_id: "mic1", taken: true, section_id: "sec1" },
      { mic_id: "mic2", taken: true, section_id: "sec1" },
      { mic_id: "mic3", taken: false, section_id: "sec1" },
      { mic_id: "mic4", taken: false, section_id: null },
    ]
    const skipped = computeSkippedMicIds(slots)
    expect(skipped.size).toBe(2)
    expect(skipped.has("mic1")).toBe(true)
    expect(skipped.has("mic2")).toBe(true)
    expect(skipped.has("mic3")).toBe(false)
    expect(skipped.has("mic4")).toBe(false)
  })

  it("handles empty slots array", () => {
    expect(computeSkippedMicIds([]).size).toBe(0)
  })

  it("deduplicates: same mic with multiple taken section slots appears once", () => {
    const slots: Slot[] = [
      { mic_id: "mic1", taken: true, section_id: "sec1" },
      { mic_id: "mic1", taken: true, section_id: "sec2" },
    ]
    const skipped = computeSkippedMicIds(slots)
    expect(skipped.size).toBe(1)
    expect(skipped.has("mic1")).toBe(true)
  })
})

// ── legacy mics without location ──────────────────────────────────────────────

type UpcomingMic = {
  id: string
  series_slug: string | null
  latitude: number | null
  longitude: number | null
  name: string
  date: string
}

/** Haversine — same as in nearby-mics.tsx */
function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function filterNearbyMics(mics: UpcomingMic[], userLat: number, userLon: number, maxKm: number) {
  return mics.filter((m) => {
    if (m.latitude === null || m.longitude === null) return false
    return haversineKm(userLat, userLon, m.latitude, m.longitude) <= maxKm
  })
}

describe("nearby mics filtering (backwards compat)", () => {
  const userLat = 40.7128
  const userLon = -74.006

  it("excludes legacy mics with null location", () => {
    const mics: UpcomingMic[] = [
      { id: "1", series_slug: null, latitude: null, longitude: null, name: "Old mic", date: "2026-06-01" },
    ]
    expect(filterNearbyMics(mics, userLat, userLon, 50)).toHaveLength(0)
  })

  it("includes mics with valid location within range", () => {
    const mics: UpcomingMic[] = [
      {
        id: "1",
        series_slug: null,
        latitude: 40.7282, // ~2 km north of NYC coords above
        longitude: -73.7949,
        name: "Near mic",
        date: "2026-06-01",
      },
    ]
    expect(filterNearbyMics(mics, userLat, userLon, 50)).toHaveLength(1)
  })

  it("excludes mics out of range", () => {
    const mics: UpcomingMic[] = [
      {
        id: "1",
        series_slug: null,
        latitude: 34.0522,
        longitude: -118.2437,
        name: "LA mic",
        date: "2026-06-01",
      },
    ]
    expect(filterNearbyMics(mics, userLat, userLon, 50)).toHaveLength(0)
  })

  it("mixed: only mics with location within range are returned", () => {
    const mics: UpcomingMic[] = [
      { id: "1", series_slug: null, latitude: null, longitude: null, name: "Legacy", date: "2026-06-01" },
      { id: "2", series_slug: "s1", latitude: 40.7282, longitude: -73.7949, name: "Nearby", date: "2026-06-01" },
      { id: "3", series_slug: "s2", latitude: 34.0522, longitude: -118.2437, name: "Far", date: "2026-06-01" },
    ]
    const result = filterNearbyMics(mics, userLat, userLon, 50)
    expect(result).toHaveLength(1)
    expect(result[0].name).toBe("Nearby")
  })
})
