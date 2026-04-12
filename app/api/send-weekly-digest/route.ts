import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { sendWeeklyDigestEmail } from "@/lib/email"

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization")
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const adminEmail = process.env.ADMIN_DIGEST_EMAIL
  if (!adminEmail) {
    return NextResponse.json({ error: "ADMIN_DIGEST_EMAIL not set" }, { status: 500 })
  }

  const admin = createAdminClient()
  const now = new Date()
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const oneWeekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
  const today = now.toISOString().split("T")[0]

  // Total mics
  const { count: totalMics } = await admin
    .from("mics")
    .select("id", { count: "exact", head: true })

  // Mics created this week
  const { count: micsThisWeek } = await admin
    .from("mics")
    .select("id", { count: "exact", head: true })
    .gte("created_at", oneWeekAgo)

  // Total sign-ups (taken slots)
  const { count: totalSignups } = await admin
    .from("slots")
    .select("id", { count: "exact", head: true })
    .eq("taken", true)

  // Sign-ups this week
  const { count: signupsThisWeek } = await admin
    .from("slots")
    .select("id", { count: "exact", head: true })
    .eq("taken", true)
    .gte("updated_at", oneWeekAgo)

  // Performers with email
  const { count: totalWithEmail } = await admin
    .from("slots")
    .select("id", { count: "exact", head: true })
    .eq("taken", true)
    .not("performer_email", "is", null)

  // Total waitlist entries
  const { count: totalWaitlist } = await admin
    .from("waitlist")
    .select("id", { count: "exact", head: true })

  // Upcoming mics in the next 7 days
  const { data: upcomingRaw } = await admin
    .from("mics")
    .select("id, slug, name, venue, date, start_time, total_slots")
    .gte("date", today)
    .lte("date", oneWeekFromNow)
    .order("date", { ascending: true })
    .order("start_time", { ascending: true })

  // For each upcoming mic, count taken slots
  const upcomingMics = await Promise.all(
    (upcomingRaw ?? []).map(async (mic) => {
      const { count: slotsTaken } = await admin
        .from("slots")
        .select("id", { count: "exact", head: true })
        .eq("mic_id", mic.id)
        .eq("taken", true)

      return {
        name: mic.name,
        venue: mic.venue,
        date: mic.date,
        startTime: mic.start_time,
        slug: mic.slug,
        slotsTaken: slotsTaken ?? 0,
        totalSlots: mic.total_slots,
      }
    })
  )

  await sendWeeklyDigestEmail({
    to: adminEmail,
    stats: {
      totalMics: totalMics ?? 0,
      micsThisWeek: micsThisWeek ?? 0,
      totalSignups: totalSignups ?? 0,
      signupsThisWeek: signupsThisWeek ?? 0,
      totalWithEmail: totalWithEmail ?? 0,
      totalWaitlist: totalWaitlist ?? 0,
    },
    upcomingMics,
  })

  return NextResponse.json({ ok: true })
}
