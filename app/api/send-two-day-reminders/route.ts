import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { sendTwoDayReminderEmails } from "@/lib/email"
import { micStartMs } from "@/lib/time"

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization")
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const admin = createAdminClient()

  const { data: mics, error } = await admin
    .from("mics")
    .select("id, slug, name, venue, date, start_time, timezone")
    .eq("two_day_reminder_sent", false)
    .eq("send_two_day_reminder", true)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Mics whose event is within ±12 hours of exactly 2 days from now,
  // evaluated in the mic's own timezone (see lib/time.ts).
  const now = Date.now()
  const TWO_DAYS = 2 * 24 * 60 * 60 * 1000
  const WINDOW = 12 * 60 * 60 * 1000

  const dueMics = (mics ?? []).filter((mic) => {
    const startMs = micStartMs(mic.date, mic.start_time, mic.timezone)
    const diff = startMs - now
    return diff >= TWO_DAYS - WINDOW && diff <= TWO_DAYS + WINDOW
  })

  let totalSent = 0

  for (const mic of dueMics) {
    const { data: slots } = await admin
      .from("slots")
      .select("performer_name, performer_email")
      .eq("mic_id", mic.id)
      .eq("taken", true)
      .not("performer_email", "is", null)

    const performers = (slots ?? [])
      .filter((s) => s.performer_email)
      .map((s) => ({ name: s.performer_name ?? "Performer", email: s.performer_email! }))

    if (performers.length > 0) {
      await sendTwoDayReminderEmails({
        performers,
        micName: mic.name,
        micSlug: mic.slug,
        venue: mic.venue,
        date: mic.date,
        startTime: mic.start_time,
      })
      totalSent += performers.length
    }

    await admin.from("mics").update({ two_day_reminder_sent: true }).eq("id", mic.id)
  }

  return NextResponse.json({ processed: dueMics.length, sent: totalSent })
}
