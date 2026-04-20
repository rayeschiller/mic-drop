import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { sendWaitlistConfirmationEmail, sendWaitlistPromotionEmail } from "@/lib/email"

export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization")
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { type, mic_slug, performer_email } = await request.json()

  if (!type || !mic_slug || !performer_email) {
    return NextResponse.json({ error: "type, mic_slug, and performer_email are required" }, { status: 400 })
  }

  const admin = createAdminClient()

  const { data: mic } = await admin
    .from("mics")
    .select("id, name, slug, venue, date, start_time")
    .eq("slug", mic_slug)
    .single()

  if (!mic) return NextResponse.json({ error: "Mic not found" }, { status: 404 })

  if (type === "waitlist-confirmation") {
    const { data: entries } = await admin
      .from("waitlist_entries")
      .select("performer_name, performer_email")
      .eq("mic_id", mic.id)
      .order("created_at", { ascending: true })

    const position = entries?.findIndex((e) => e.performer_email === performer_email) ?? -1
    if (position === -1) return NextResponse.json({ error: "Performer not found in waitlist" }, { status: 404 })

    const entry = entries![position]
    await sendWaitlistConfirmationEmail({
      to: entry.performer_email,
      performerName: entry.performer_name,
      micName: mic.name,
      micSlug: mic.slug,
      venue: mic.venue,
      date: mic.date,
      startTime: mic.start_time,
      position: position + 1,
    })

    return NextResponse.json({ ok: true, to: entry.performer_email, position: position + 1 })
  }

  if (type === "waitlist-promotion") {
    const { data: slot } = await admin
      .from("slots")
      .select("performer_name, performer_email")
      .eq("mic_id", mic.id)
      .eq("performer_email", performer_email)
      .single()

    if (!slot) return NextResponse.json({ error: "Slot not found for performer" }, { status: 404 })

    await sendWaitlistPromotionEmail({
      to: slot.performer_email!,
      performerName: slot.performer_name!,
      micName: mic.name,
      micSlug: mic.slug,
      venue: mic.venue,
      date: mic.date,
      startTime: mic.start_time,
    })

    return NextResponse.json({ ok: true, to: slot.performer_email })
  }

  return NextResponse.json({ error: "Invalid type" }, { status: 400 })
}
