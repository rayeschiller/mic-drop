import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { geocodeVenue } from "@/lib/geocode"

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization")
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const admin = createAdminClient()

  const { searchParams } = new URL(request.url)
  const slugFilter = searchParams.get("slug")

  let query = admin.from("mics").select("id, venue").is("lat", null)
  if (slugFilter) query = query.eq("slug", slugFilter)

  const { data: mics } = await query

  if (!mics?.length) return NextResponse.json({ message: "Nothing to geocode", processed: 0 })

  let success = 0
  let failed = 0

  for (const mic of mics) {
    const coords = await geocodeVenue(mic.venue)
    if (coords) {
      await admin.from("mics").update({ lat: coords.lat, lng: coords.lng }).eq("id", mic.id)
      success++
    } else {
      failed++
    }
    // Respect Nominatim's 1 req/sec rate limit
    await new Promise((r) => setTimeout(r, 1100))
  }

  return NextResponse.json({ processed: mics.length, success, failed })
}
