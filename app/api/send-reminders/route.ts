import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { sendPerformerReminderEmails } from "@/lib/email"
import { micStartMs, reminderDayLabel } from "@/lib/time"

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization")
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const admin = createAdminClient()

  // Fetch all mics that haven't had reminders sent yet
  const { data: mics, error } = await admin
    .from("mics")
    .select("id, slug, name, venue, date, start_time, timezone")
    .eq("reminders_sent", false)
    .eq("send_reminders", true)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Filter to mics whose start time is within the 6-hour window (±30 min).
  // `mic.timezone` is the host's IANA zone at mic creation (e.g. America/New_York);
  // micStartMs converts (date + start_time) in that zone to real UTC millis.
  const now = Date.now()
  const SIX_HOURS = 6 * 60 * 60 * 1000
  const WINDOW = 30 * 60 * 1000

  const dueMics = (mics ?? []).filter((mic) => {
    const startMs = micStartMs(mic.date, mic.start_time, mic.timezone)
    const diff = startMs - now
    return diff >= SIX_HOURS - WINDOW && diff <= SIX_HOURS + WINDOW
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
      await sendPerformerReminderEmails({
        performers,
        micName: mic.name,
        micSlug: mic.slug,
        venue: mic.venue,
        date: mic.date,
        startTime: mic.start_time,
        // "today" for evening mics, "tomorrow" for very early morning mics
        // whose 6h window crosses the prior local day.
        timeLabel: reminderDayLabel(mic.date, mic.timezone, now),
      })
      totalSent += performers.length
    }

    await admin.from("mics").update({ reminders_sent: true }).eq("id", mic.id)
  }

  return NextResponse.json({ processed: dueMics.length, sent: totalSent })
}
