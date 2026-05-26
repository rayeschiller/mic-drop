import { describe, it, expect } from "vitest"

// Extracted from nearby-mics.tsx — pure math, no React dependency
function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function toMiles(km: number) {
  return km * 0.621371
}

describe("haversineKm", () => {
  it("returns 0 for the same point", () => {
    expect(haversineKm(40.7128, -74.006, 40.7128, -74.006)).toBe(0)
  })

  it("NYC to LA is ~3940 km", () => {
    const km = haversineKm(40.7128, -74.006, 34.0522, -118.2437)
    expect(km).toBeGreaterThan(3900)
    expect(km).toBeLessThan(3980)
  })

  it("NYC to London is ~5570 km", () => {
    const km = haversineKm(40.7128, -74.006, 51.5074, -0.1278)
    expect(km).toBeGreaterThan(5550)
    expect(km).toBeLessThan(5600)
  })

  it("is symmetric — A→B equals B→A", () => {
    const a = haversineKm(40.7128, -74.006, 34.0522, -118.2437)
    const b = haversineKm(34.0522, -118.2437, 40.7128, -74.006)
    expect(Math.abs(a - b)).toBeLessThan(0.0001)
  })

  it("handles negative latitudes (southern hemisphere)", () => {
    // Sydney to Auckland
    const km = haversineKm(-33.8688, 151.2093, -36.8485, 174.7633)
    expect(km).toBeGreaterThan(2100)
    expect(km).toBeLessThan(2200)
  })

  it("handles crossing the antimeridian (180°/-180° boundary)", () => {
    // Fiji to Samoa — should be short, not circumnavigation
    const km = haversineKm(-17.7134, 178.065, -13.759, -172.1046)
    expect(km).toBeLessThan(1500)
  })
})

describe("toMiles", () => {
  it("converts 0 km to 0 miles", () => {
    expect(toMiles(0)).toBe(0)
  })

  it("converts 1 km to ~0.621 miles", () => {
    expect(toMiles(1)).toBeCloseTo(0.621371, 4)
  })

  it("converts 100 km to ~62.1 miles", () => {
    expect(toMiles(100)).toBeCloseTo(62.1371, 2)
  })

  it("NYC to LA is ~2447 miles", () => {
    const miles = toMiles(haversineKm(40.7128, -74.006, 34.0522, -118.2437))
    expect(miles).toBeGreaterThan(2430)
    expect(miles).toBeLessThan(2470)
  })
})
