"use server"

import { createAdminClient } from "@/lib/supabase/admin"
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

  const { data: slots } = await admin
    .from("slots")
    .select("mic_id, taken")

  return mics.map((mic) => {
    const micSlots = (slots ?? []).filter((s) => s.mic_id === mic.id)
    const filledSlots = micSlots.filter((s) => s.taken).length
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
      createdAt: mic.created_at,
      hostEmail: mic.host_email,
      imageUrl: mic.image_url,
    }
  })
}

export async function getAdminMicDetail(slug: string) {
  const admin = createAdminClient()

  const { data: mic } = await admin
    .from("mics")
    .select("*")
    .eq("slug", slug)
    .single()

  if (!mic) return null

  const { data: slots } = await admin
    .from("slots")
    .select("*")
    .eq("mic_id", mic.id)
    .order("slot_number", { ascending: true })

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
  }
}
