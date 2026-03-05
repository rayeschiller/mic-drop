"use server"

import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { sendHostPinEmail } from "@/lib/email"
import crypto from "crypto"

// --- Helpers ---

function hashPin(pin: string): string {
  return crypto.createHash("sha256").update(pin).digest("hex")
}

function generateSlug(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim()
  // Short 4-char random suffix to avoid collisions, keeps the URL clean
  const suffix = Math.random().toString(36).substring(2, 6)
  return `${base}-${suffix}`
}

function generatePin(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

// --- Types ---

export interface MicData {
  id: string
  slug: string
  name: string
  venue: string
  date: string
  startTime: string
  endTime: string
  totalSlots: number
  notes: string | null
  slots: SlotData[]
}

export interface SlotData {
  id: string
  number: number
  taken: boolean
  performerName: string | null
  performerInstagram: string | null
  performerEmail?: string | null // Only included for host
}

// --- Actions ---

export async function checkSlugAvailability(slug: string): Promise<{ available: boolean }> {
  const admin = createAdminClient()
  const { data } = await admin.from("mics").select("id").eq("slug", slug).maybeSingle()
  return { available: !data }
}

export async function createMic(formData: {
  name: string
  venue: string
  date: string
  startTime: string
  endTime: string
  slots: number
  notes: string
  slug?: string
  hostEmail?: string
}): Promise<{ success: boolean; slug?: string; hostPin?: string; error?: string }> {
  const admin = createAdminClient()
  const slug = formData.slug?.trim() || generateSlug(formData.name)
  const hostPin = generatePin()
  const hostPinHash = hashPin(hostPin)

  // Insert the mic
  const { data: mic, error: micError } = await admin
    .from("mics")
    .insert({
      slug,
      host_pin_hash: hostPinHash,
      host_email: formData.hostEmail || null,
      name: formData.name,
      venue: formData.venue,
      date: formData.date,
      start_time: formData.startTime,
      end_time: formData.endTime || null,
      total_slots: formData.slots,
      notes: formData.notes || null,
    })
    .select("id")
    .single()

  if (micError || !mic) {
    console.error("Failed to create mic:", micError)
    // Postgres unique constraint violation
    if (micError?.code === "23505") {
      return { success: false, error: "That URL is already taken. Try a different one." }
    }
    return { success: false, error: "Failed to create mic" }
  }

  // Insert empty slots
  const slotsToInsert = Array.from({ length: formData.slots }, (_, i) => ({
    mic_id: mic.id,
    slot_number: i + 1,
    taken: false,
  }))

  const { error: slotsError } = await admin.from("slots").insert(slotsToInsert)

  if (slotsError) {
    console.error("Failed to create slots:", slotsError)
    return { success: false, error: "Failed to create slots" }
  }

  // Send host PIN email if provided (non-blocking — don't fail the request if email fails)
  if (formData.hostEmail) {
    sendHostPinEmail({
      to: formData.hostEmail,
      micName: formData.name,
      micSlug: slug,
      hostPin,
    }).catch((err) => console.error("Failed to send host PIN email:", err))
  }

  return { success: true, slug, hostPin }
}

export async function getMic(slug: string): Promise<{ mic: MicData | null; error?: string }> {
  const supabase = await createClient()

  const { data: mic, error: micError } = await supabase
    .from("mics")
    .select("*")
    .eq("slug", slug)
    .single()

  if (micError || !mic) {
    return { mic: null }
  }

  const { data: slots, error: slotsError } = await supabase
    .from("slots")
    .select("id, slot_number, taken, performer_name, performer_instagram")
    .eq("mic_id", mic.id)
    .order("slot_number", { ascending: true })

  if (slotsError) {
    return { mic: null, error: "Failed to load slots" }
  }

  return {
    mic: {
      id: mic.id,
      slug: mic.slug,
      name: mic.name,
      venue: mic.venue,
      date: mic.date,
      startTime: mic.start_time,
      endTime: mic.end_time,
      totalSlots: mic.total_slots,
      notes: mic.notes,
      slots: (slots || []).map((s) => ({
        id: s.id,
        number: s.slot_number,
        taken: s.taken,
        performerName: s.performer_name,
        performerInstagram: s.performer_instagram,
      })),
    },
  }
}

export async function signupForSlot(
  micSlug: string,
  slotNumber: number,
  name: string,
  instagram: string,
  email: string
): Promise<{ success: boolean; error?: string }> {
  const admin = createAdminClient()

  // Get the mic
  const { data: mic } = await admin
    .from("mics")
    .select("id")
    .eq("slug", micSlug)
    .single()

  if (!mic) return { success: false, error: "Mic not found" }

  // Update the slot - only if not already taken
  const { data: updated, error } = await admin
    .from("slots")
    .update({
      taken: true,
      performer_name: name,
      performer_instagram: instagram || null,
      performer_email: email || null,
    })
    .eq("mic_id", mic.id)
    .eq("slot_number", slotNumber)
    .eq("taken", false)
    .select("id")

  if (error) {
    console.error("Failed to sign up:", error)
    return { success: false, error: "Failed to sign up" }
  }

  if (!updated || updated.length === 0) {
    return { success: false, error: "Slot already taken" }
  }

  return { success: true }
}

export async function removeFromSlot(
  micSlug: string,
  slotNumber: number,
  email: string
): Promise<{ success: boolean; error?: string }> {
  const admin = createAdminClient()

  // Get the mic
  const { data: mic } = await admin
    .from("mics")
    .select("id")
    .eq("slug", micSlug)
    .single()

  if (!mic) return { success: false, error: "Mic not found" }

  // Get the slot and check email match
  const { data: slot } = await admin
    .from("slots")
    .select("id, performer_email")
    .eq("mic_id", mic.id)
    .eq("slot_number", slotNumber)
    .eq("taken", true)
    .single()

  if (!slot) return { success: false, error: "Slot not found" }

  if (slot.performer_email?.toLowerCase() !== email.toLowerCase()) {
    return { success: false, error: "Email does not match" }
  }

  const { error } = await admin
    .from("slots")
    .update({
      taken: false,
      performer_name: null,
      performer_instagram: null,
      performer_email: null,
    })
    .eq("id", slot.id)

  if (error) {
    console.error("Failed to remove:", error)
    return { success: false, error: "Failed to remove" }
  }

  return { success: true }
}

// --- Host-only actions ---

export async function verifyHostPin(
  micSlug: string,
  pin: string
): Promise<{ success: boolean; error?: string }> {
  const admin = createAdminClient()

  const { data: mic } = await admin
    .from("mics")
    .select("host_pin_hash")
    .eq("slug", micSlug)
    .single()

  if (!mic) return { success: false, error: "Mic not found" }

  const pinHash = hashPin(pin)
  if (pinHash !== mic.host_pin_hash) {
    return { success: false, error: "Invalid PIN" }
  }

  return { success: true }
}

export async function getMicWithEmails(
  micSlug: string,
  pin: string
): Promise<{ mic: MicData | null; error?: string }> {
  // Verify host first
  const verified = await verifyHostPin(micSlug, pin)
  if (!verified.success) return { mic: null, error: "Unauthorized" }

  const admin = createAdminClient()

  const { data: mic } = await admin
    .from("mics")
    .select("*")
    .eq("slug", micSlug)
    .single()

  if (!mic) return { mic: null, error: "Mic not found" }

  const { data: slots } = await admin
    .from("slots")
    .select("*")
    .eq("mic_id", mic.id)
    .order("slot_number", { ascending: true })

  return {
    mic: {
      id: mic.id,
      slug: mic.slug,
      name: mic.name,
      venue: mic.venue,
      date: mic.date,
      startTime: mic.start_time,
      endTime: mic.end_time,
      totalSlots: mic.total_slots,
      notes: mic.notes,
      slots: (slots || []).map((s) => ({
        id: s.id,
        number: s.slot_number,
        taken: s.taken,
        performerName: s.performer_name,
        performerInstagram: s.performer_instagram,
        performerEmail: s.performer_email,
      })),
    },
  }
}

export async function hostRemoveSlot(
  micSlug: string,
  pin: string,
  slotNumber: number
): Promise<{ success: boolean; error?: string }> {
  const verified = await verifyHostPin(micSlug, pin)
  if (!verified.success) return { success: false, error: "Unauthorized" }

  const admin = createAdminClient()

  const { data: mic } = await admin
    .from("mics")
    .select("id")
    .eq("slug", micSlug)
    .single()

  if (!mic) return { success: false, error: "Mic not found" }

  const { error } = await admin
    .from("slots")
    .update({
      taken: false,
      performer_name: null,
      performer_instagram: null,
      performer_email: null,
    })
    .eq("mic_id", mic.id)
    .eq("slot_number", slotNumber)

  if (error) {
    console.error("Failed to remove slot:", error)
    return { success: false, error: "Failed to remove" }
  }

  return { success: true }
}

export async function hostUpdateMic(
  micSlug: string,
  pin: string,
  data: {
    name: string
    venue: string
    date: string
    startTime: string
    endTime: string
    notes?: string
    totalSlots: number
    slug?: string
  }
): Promise<{ success: boolean; newSlug?: string; error?: string }> {
  const verified = await verifyHostPin(micSlug, pin)
  if (!verified.success) return { success: false, error: "Unauthorized" }

  const admin = createAdminClient()

  const { data: mic } = await admin
    .from("mics")
    .select("id, total_slots")
    .eq("slug", micSlug)
    .single()

  if (!mic) return { success: false, error: "Mic not found" }

  const newSlug = data.slug?.trim() || micSlug

  // Update mic details
  const { error: updateError } = await admin
    .from("mics")
    .update({
      slug: newSlug,
      name: data.name,
      venue: data.venue,
      date: data.date,
      start_time: data.startTime,
      end_time: data.endTime || null,
      notes: data.notes || null,
      total_slots: data.totalSlots,
    })
    .eq("id", mic.id)

  if (updateError) {
    console.error("Failed to update mic:", updateError)
    if (updateError.code === "23505") {
      return { success: false, error: "That URL is already taken. Try a different one." }
    }
    return { success: false, error: "Failed to update" }
  }

  // Handle slot count changes
  if (data.totalSlots > mic.total_slots) {
    // Add new empty slots
    const newSlots = Array.from(
      { length: data.totalSlots - mic.total_slots },
      (_, i) => ({
        mic_id: mic.id,
        slot_number: mic.total_slots + i + 1,
        taken: false,
      })
    )
    await admin.from("slots").insert(newSlots)
  } else if (data.totalSlots < mic.total_slots) {
    // Remove slots from the end (only untaken)
    await admin
      .from("slots")
      .delete()
      .eq("mic_id", mic.id)
      .gt("slot_number", data.totalSlots)
      .eq("taken", false)
  }

  return { success: true, newSlug: newSlug !== micSlug ? newSlug : undefined }
}
