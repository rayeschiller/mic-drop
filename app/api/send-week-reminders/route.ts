import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { sendWeekReminderEmails } from "@/lib/email"

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization")
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const admin = createAdminClient()

  // Fetch mics with reminders enabled and week reminder not yet sent
  const { data: mics, error } = await admin
    .from("mics")
    .select("id, slug, name, venue, date, start_time")
    .eq("week_reminder_sent", false)
    .eq("send_reminders", true)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Mics whose event is within ±12 hours of exactly 7 days from now.
  // Cron runs daily so a ±12h window guarantees every mic is caught exactly once.
  const now = Date.now()
  const ONE_WEEK = 7 * 24 * 60 * 60 * 1000
  const WINDOW = 12 * 60 * 60 * 1000

  const dueMics = (mics ?? []).filter((mic) => {
    const startMs = new Date(`${mic.date}T${mic.start_time}Z`).getTime()
    const diff = startMs - now
    return diff >= ONE_WEEK - WINDOW && diff <= ONE_WEEK + WINDOW
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
      await sendWeekReminderEmails({
        performers,
        micName: mic.name,
        micSlug: mic.slug,
        venue: mic.venue,
        date: mic.date,
        startTime: mic.start_time,
      })
      totalSent += performers.length
    }

    await admin.from("mics").update({ week_reminder_sent: true }).eq("id", mic.id)
  }

  return NextResponse.json({ processed: dueMics.length, sent: totalSent })
}
