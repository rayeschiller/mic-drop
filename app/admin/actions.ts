"use server"

import { createAdminClient } from "@/lib/supabase/admin"
import { sendPerformerReminderEmails, sendWaitlistReminderEmails } from "@/lib/email"
import { micStartMs, reminderDayLabel } from "@/lib/time"
import { cookies } from "next/headers"
import crypto from "crypto"

function adminToken(): string {
  const password = process.env.ADMIN_PASSWORD ?? ""
  return crypto.createHash("sha256").update(password + "mic-drop-admin").digest("hex")
}

export async function adminLogin(
  password: string
): Promise<{ success: boolean; error?: string }> {
  if (!process.env.ADMIN_PASSWORD) return { success: false, error: "Admin not configured." }
  if (password !== process.env.ADMIN_PASSWORD) return { success: false, error: "Wrong password." }

  const cookieStore = await cookies()
  cookieStore.set("admin-token", adminToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: "/",
  })

  return { success: true }
}

export async function adminLogout() {
  const cookieStore = await cookies()
  cookieStore.delete("admin-token")
}

export async function checkAdminAuth(): Promise<boolean> {
  if (!process.env.ADMIN_PASSWORD) return false
  const cookieStore = await cookies()
  const token = cookieStore.get("admin-token")?.value
  return token === adminToken()
}

export async function getAllMics() {
  const admin = createAdminClient()

  const { data: mics, error } = await admin
    .from("mics")
    .select("id, slug, name, venue, date, start_time, end_time, total_slots, created_at, host_email, image_url")
    .order("created_at", { ascending: false })

  if (error || !mics) return []

  const [{ data: takenSlots }, { data: waitlistEntries }] = await Promise.all([
    admin.from("slots").select("mic_id").eq("taken", true),
    admin.from("waitlist_entries").select("mic_id"),
  ])

  return mics.map((mic) => {
    const filledSlots = (takenSlots ?? []).filter((s) => s.mic_id === mic.id).length
    const waitlistCount = (waitlistEntries ?? []).filter((w) => w.mic_id === mic.id).length
    return {
      id: mic.id,
      slug: mic.slug,
      name: mic.name,
      venue: mic.venue,
      date: mic.date,
      startTime: mic.start_time,
      endTime: mic.end_time,
      totalSlots: mic.total_slots,
      filledSlots,
      waitlistCount,
      createdAt: mic.created_at,
      hostEmail: mic.host_email,
      imageUrl: mic.image_url,
    }
  })
}

export async function deleteMic(slug: string): Promise<{ success: boolean; error?: string }> {
  const admin = createAdminClient()
  const { error } = await admin.from("mics").delete().eq("slug", slug)
  if (error) return { success: false, error: error.message }
  return { success: true }
}

// Returns a natural-language label that reads correctly after "is":
//   "today", "tomorrow", "in 2 days", "in 23 hours", "soon"
function getReminderTimeLabel(date: string, startTime: string, timezone: string | null): string {
  const startMs = micStartMs(date, startTime, timezone)
  const diffMs = startMs - Date.now()
  const diffHours = Math.round(diffMs / (1000 * 60 * 60))
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24))
  if (diffMs <= 0) return reminderDayLabel(date, timezone)
  if (diffDays >= 2) return `in ${diffDays} days`
  if (diffHours >= 24) return reminderDayLabel(date, timezone) // "today" / "tomorrow"
  if (diffHours >= 1) return `in ${diffHours} hours`
  return reminderDayLabel(date, timezone)
}

async function getMicAndPerformers(slug: string) {
  const admin = createAdminClient()

  const { data: mic } = await admin
    .from("mics")
    .select("id, slug, name, venue, date, start_time, timezone")
    .eq("slug", slug)
    .single()

  if (!mic) return null

  const [{ data: slots }, { data: waitlistEntries }] = await Promise.all([
    admin.from("slots").select("performer_name, performer_email").eq("mic_id", mic.id).eq("taken", true).not("performer_email", "is", null),
    admin.from("waitlist_entries").select("performer_name, performer_email").eq("mic_id", mic.id).order("created_at", { ascending: true }),
  ])

  const performers = (slots ?? [])
    .filter((s) => s.performer_email)
    .map((s) => ({ name: s.performer_name ?? "Performer", email: s.performer_email! }))

  const waitlist = (waitlistEntries ?? [])
    .filter((w) => w.performer_email)
    .map((w, i) => ({ name: w.performer_name ?? "Performer", email: w.performer_email!, position: i + 1 }))

  const timeLabel = getReminderTimeLabel(mic.date, mic.start_time, mic.timezone)

  return { mic, performers, waitlist, timeLabel }
}

export async function getMicReminderPreview(slug: string): Promise<{
  success: boolean
  performers: { name: string; email: string }[]
  waitlist: { name: string; email: string; position: number }[]
  lineupSubject: string
  waitlistSubject: string
  timeLabel: string
  error?: string
}> {
  const authed = await checkAdminAuth()
  const empty = { success: false, performers: [], waitlist: [], lineupSubject: "", waitlistSubject: "", timeLabel: "" }
  if (!authed) return { ...empty, error: "Unauthorized" }

  const data = await getMicAndPerformers(slug)
  if (!data) return { ...empty, error: "Mic not found" }

  const { performers, waitlist, timeLabel, mic } = data
  return {
    success: true,
    performers,
    waitlist,
    lineupSubject: `Reminder — ${mic.name} is ${timeLabel}`,
    waitlistSubject: `Reminder — ${mic.name} is ${timeLabel} (you're on the waitlist)`,
    timeLabel,
  }
}

export async function sendMicReminders(slug: string, target: "lineup" | "waitlist"): Promise<{ success: boolean; sent: number; error?: string }> {
  const authed = await checkAdminAuth()
  if (!authed) return { success: false, sent: 0, error: "Unauthorized" }

  const data = await getMicAndPerformers(slug)
  if (!data) return { success: false, sent: 0, error: "Mic not found" }

  const { mic, performers, waitlist, timeLabel } = data

  if (target === "lineup") {
    if (performers.length === 0) return { success: true, sent: 0 }
    await sendPerformerReminderEmails({ performers, micName: mic.name, micSlug: mic.slug, venue: mic.venue, date: mic.date, startTime: mic.start_time, timeLabel })
    return { success: true, sent: performers.length }
  } else {
    if (waitlist.length === 0) return { success: true, sent: 0 }
    await sendWaitlistReminderEmails({ performers: waitlist, micName: mic.name, micSlug: mic.slug, venue: mic.venue, date: mic.date, startTime: mic.start_time, timeLabel })
    return { success: true, sent: waitlist.length }
  }
}

export async function sendTestReminderEmail(slug: string, toEmail: string, target: "lineup" | "waitlist"): Promise<{ success: boolean; error?: string }> {
  const authed = await checkAdminAuth()
  if (!authed) return { success: false, error: "Unauthorized" }

  const data = await getMicAndPerformers(slug)
  if (!data) return { success: false, error: "Mic not found" }

  const { mic, timeLabel } = data
  const testPerformer = [{ name: "You", email: toEmail, position: 1 }]

  if (target === "lineup") {
    await sendPerformerReminderEmails({ performers: testPerformer, micName: mic.name, micSlug: mic.slug, venue: mic.venue, date: mic.date, startTime: mic.start_time, timeLabel })
  } else {
    await sendWaitlistReminderEmails({ performers: testPerformer, micName: mic.name, micSlug: mic.slug, venue: mic.venue, date: mic.date, startTime: mic.start_time, timeLabel })
  }

  return { success: true }
}

export async function getAdminMicDetail(slug: string) {
  const admin = createAdminClient()

  const { data: mic } = await admin
    .from("mics")
    .select("*")
    .eq("slug", slug)
    .single()

  if (!mic) return null

  const [{ data: slots }, { data: waitlist }] = await Promise.all([
    admin
      .from("slots")
      .select("*")
      .eq("mic_id", mic.id)
      .order("slot_number", { ascending: true }),
    admin
      .from("waitlist_entries")
      .select("*")
      .eq("mic_id", mic.id)
      .order("created_at", { ascending: true }),
  ])

  return {
    id: mic.id,
    slug: mic.slug,
    name: mic.name,
    venue: mic.venue,
    date: mic.date,
    startTime: mic.start_time,
    endTime: mic.end_time,
    totalSlots: mic.total_slots,
    hostEmail: mic.host_email,
    createdAt: mic.created_at,
    slots: (slots ?? []).map((s) => ({
      number: s.slot_number,
      taken: s.taken,
      performerName: s.performer_name,
      performerInstagram: s.performer_instagram,
      performerEmail: s.performer_email,
    })),
    waitlist: (waitlist ?? []).map((w, idx) => ({
      id: w.id,
      position: idx + 1,
      performerName: w.performer_name,
      performerInstagram: w.performer_instagram,
      performerEmail: w.performer_email,
      createdAt: w.created_at,
    })),
  }
}
